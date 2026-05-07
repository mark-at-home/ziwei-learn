// Vercel Serverless Function — 统一 AI 代理

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model = 'claude-4-6', system, messages, max_tokens = 4096 } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages 字段缺失或格式错误' });
  }

  try {
    let content = '';

    if (model === 'claude' || model === 'claude-4-5') {
      content = await callClaude(system, messages, max_tokens, 'claude-sonnet-4-5');
    } else if (model === 'claude-4-6') {
      content = await callClaude(system, messages, max_tokens, 'claude-sonnet-4-6');
    } else if (model === 'claude-opus-4-7') {
      content = await callClaude(system, messages, max_tokens, 'claude-opus-4-7');
    } else if (model === 'gemini-3-flash') {
      content = await callGemini(system, messages, max_tokens, 'gemini-3-flash-preview', false);
    } else if (model === 'gemini-3-pro') {
      content = await callGemini(system, messages, max_tokens, 'gemini-3.1-pro-preview', false);
    } else {
      return res.status(400).json({ error: `不支持的模型：${model}` });
    }

    res.json({ content });
  } catch (err) {
    console.error(`[${model}] 调用失败:`, err.message);
    res.status(500).json({ error: err.message });
  }
}

async function callClaude(system, messages, maxTokens, modelId = 'claude-sonnet-4-5') {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

  const resp = await client.messages.create({
    model: modelId,
    max_tokens: maxTokens,
    system,
    messages,
  });

  return resp.content[0]?.type === 'text' ? resp.content[0].text : '';
}

async function callGemini(system, messages, maxTokens, modelId, thinking) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  // 检测系统提示词是否要求 JSON 输出
  const wantsJSON = system && (system.includes('JSON') || system.includes('json'));

  const generationConfig = {
    maxOutputTokens: maxTokens,
    ...(thinking ? { thinkingConfig: { thinkingBudget: 8192 } } : {}),
    ...(wantsJSON && !thinking ? { responseMimeType: 'application/json' } : {}),
  };

  const geminiModel = genAI.getGenerativeModel({
    model: modelId,
    systemInstruction: system,
    generationConfig,
  });

  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const lastMsg = messages[messages.length - 1].content;

  const chat = geminiModel.startChat({ history });
  const result = await chat.sendMessage(lastMsg);

  // 检查是否被安全过滤器拦截
  const candidate = result.response.candidates?.[0];
  if (!candidate) {
    const reason = result.response.promptFeedback?.blockReason ?? 'NO_CANDIDATES';
    throw new Error(`Gemini 无候选结果 (${modelId}): ${reason}`);
  }

  // 过滤掉思考过程，只返回最终答案
  const parts = candidate.content?.parts ?? [];
  const answerPart = parts.find(p => !p.thought);
  const text = answerPart?.text ?? result.response.text();
  if (!text) {
    const info = {
      finishReason: candidate.finishReason,
      partsCount: parts.length,
      parts: parts.map(p => ({ thought: !!p.thought, textLen: p.text?.length ?? 0 })),
    };
    throw new Error(`Gemini 返回空内容 (${modelId}): ${JSON.stringify(info)}`);
  }
  return text;
}

