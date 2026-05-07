/**
 * 模型端到端测试脚本
 * 对每个模型发送一个简单的命理分析请求，验证返回 JSON 合法且内容非空
 *
 * 运行方式：node test-models.mjs
 */

const BASE_URL = 'https://ziwei-learn.vercel.app/api/chat';

/** 与前端 parseJSON 一致的 JSON 字符串内换行转义 */
function sanitizeJSONString(raw) {
  let out = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (escaped) { out += c; escaped = false; continue; }
    if (c === '\\') { out += c; escaped = true; continue; }
    if (c === '"') { inString = !inString; out += c; continue; }
    if (inString && (c === '\n' || c === '\r')) { out += '\\n'; continue; }
    out += c;
  }
  return out;
}

const MODELS = [
  { id: 'claude',          label: 'Claude Sonnet 4.5' },
  { id: 'claude-4-6',      label: 'Claude Sonnet 4.6' },
  { id: 'claude-opus-4-7', label: 'Claude Opus 4.7'   },
  { id: 'gemini-3-flash',  label: 'Gemini 3 Flash'    },
  { id: 'gemini-3-pro',    label: 'Gemini 3.1 Pro'    },
];

const SYSTEM = `你是一位紫微斗数命理分析助手，请严格按 JSON 格式返回结果，不要有任何 markdown 包裹。`;

const USER_MSG = `以下是一张简化的紫微斗数命盘，请生成简短分析。

命盘信息：
- 公历：1985-03-15，寅时，男命
- 命宫：紫微、天府（丑宫）
- 财帛宫：武曲、贪狼（巳宫）
- 官禄宫：廉贞（酉宫）

请返回如下 JSON（字段不得省略）：
{
  "summary": "一句话总结",
  "palaceAnalysis": [{"palace": "命宫", "stars": ["紫微", "天府"], "interpretation": "解读", "reasoning": "推理"}],
  "mutagenAnalysis": "四化分析",
  "decadalFortune": "大限走势",
  "keyFeatures": ["特征1", "特征2"]
}`;

async function testModel(model) {
  const start = Date.now();
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model.id,
        system: SYSTEM,
        messages: [{ role: 'user', content: USER_MSG }],
        max_tokens: 4096,
      }),
      signal: AbortSignal.timeout(120_000), // 2 分钟超时
    });

    const elapsed = Date.now() - start;

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      return { model: model.label, ok: false, elapsed, error: err.error ?? res.statusText };
    }

    const data = await res.json();
    const content = data.content ?? '';

    if (!content || content.trim().length < 10) {
      return { model: model.label, ok: false, elapsed, error: `返回内容为空或过短 (HTTP ${res.status}): "${content.slice(0, 100)}"` };
    }

    // 尝试解析 JSON（与前端保持相同逻辑，包含多行转义）
    let parsed = null;
    try {
      const stripped = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
      const cleaned  = sanitizeJSONString(stripped);
      parsed = JSON.parse(cleaned);
    } catch (e) {
      return { model: model.label, ok: false, elapsed, error: `JSON 解析失败 (${e.message}): ${content.slice(0, 300)}` };
    }

    // 检查必要字段
    const missing = ['summary', 'palaceAnalysis', 'mutagenAnalysis', 'decadalFortune', 'keyFeatures']
      .filter(k => !(k in parsed));
    if (missing.length > 0) {
      return { model: model.label, ok: false, elapsed, error: `缺少字段: ${missing.join(', ')}`, partial: parsed };
    }

    return {
      model: model.label, ok: true, elapsed,
      summary: parsed.summary?.slice(0, 60),
    };
  } catch (e) {
    return { model: model.label, ok: false, elapsed: Date.now() - start, error: e.message };
  }
}

async function main() {
  console.log(`\n== 紫微研习 模型测试 ==\n目标：${BASE_URL}\n`);
  console.log(`并行测试 ${MODELS.length} 个模型...\n`);

  const results = await Promise.all(MODELS.map(testModel));

  console.log('─'.repeat(70));
  let passCount = 0;
  for (const r of results) {
    const status = r.ok ? '✅ PASS' : '❌ FAIL';
    const time   = `${(r.elapsed / 1000).toFixed(1)}s`;
    console.log(`${status}  ${r.model.padEnd(24)} ${time.padStart(6)}`);
    if (r.ok) {
      console.log(`       summary: ${r.summary}`);
      passCount++;
    } else {
      console.log(`       error: ${r.error}`);
    }
  }
  console.log('─'.repeat(70));
  console.log(`\n结果：${passCount}/${MODELS.length} 通过\n`);

  if (passCount < MODELS.length) {
    process.exit(1);
  }
}

main();
