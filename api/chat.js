// Vercel Serverless Function — 统一 AI 代理
// 对应本地 ziwei-proxy/server.js 的 POST /api/chat

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model = 'gemini', system, messages, max_tokens = 4096 } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages 字段缺失或格式错误' });
  }

  try {
    let content = '';

    if (model === 'claude') {
      content = await callClaude(system, messages, max_tokens);
    } else if (model === 'gemini') {
      content = await callGemini(system, messages, max_tokens, false);
    } else if (model === 'gemini-thinking') {
      content = await callGemini(system, messages, max_tokens, true);
    } else if (model === 'deepseek') {
      content = await callDeepSeek(system, messages, max_tokens);
    } else {
      return res.status(400).json({ error: `不支持的模型：${model}` });
    }

    res.json({ content });
  } catch (err) {
    console.error(`[${model}] 调用失败:`, err.message);
    res.status(500).json({ error: err.message });
  }
}

async function callClaude(system, messages, maxTokens) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

  const resp = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: maxTokens,
    system,
    messages,
  });

  return resp.content[0]?.type === 'text' ? resp.content[0].text : '';
}

async function callGemini(system, messages, maxTokens, thinking = false) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  const modelId = thinking ? 'gemini-2.5-flash-thinking-exp-01-21' : 'gemini-2.5-flash';

  const geminiModel = genAI.getGenerativeModel({
    model: modelId,
    systemInstruction: system,
    ...(thinking ? { generationConfig: { thinkingConfig: { thinkingBudget: 8192 } } } : {}),
  });

  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const lastMsg = messages[messages.length - 1].content;

  const chat = geminiModel.startChat({ history });
  const result = await chat.sendMessage(lastMsg);

  const parts = result.response.candidates?.[0]?.content?.parts ?? [];
  const answerPart = parts.find(p => !p.thought);
  return answerPart?.text ?? result.response.text();
}

async function callDeepSeek(system, messages, maxTokens) {
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com',
  });

  const resp = await client.chat.completions.create({
    model: 'deepseek-chat',
    max_tokens: maxTokens,
    messages: [{ role: 'system', content: system }, ...messages],
  });

  return resp.choices[0]?.message?.content ?? '';
}
