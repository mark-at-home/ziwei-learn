/**
 * 真实流程测试：模拟前端 generateAnalysis 的完整调用
 * 使用真实的 prompt 模板 + 模拟命盘数据
 */

const BASE_URL = 'https://ziwei-learn.vercel.app/api/chat';

const MODELS = [
  { id: 'gemini',          label: 'Gemini 2.5 Flash'     },
  { id: 'gemini-pro',      label: 'Gemini 2.5 Pro'       },
  { id: 'gemini-3-flash',  label: 'Gemini 3 Flash'       },
  { id: 'claude',          label: 'Claude Sonnet 4.5'    },
  { id: 'claude-4-6',      label: 'Claude Sonnet 4.6'    },
  { id: 'gemini-thinking', label: 'Gemini 2.5 Thinking'  },
  { id: 'gemini-3-pro',    label: 'Gemini 3.1 Pro'       },
];

// ── 与 prompts.ts 完全一致的 system prompt ──
const ANALYSIS_SYSTEM = `你是一位精通紫微斗数的命理老师，专门帮助学习者理解命盘。
你的分析需要：
1. 以教学为导向，每段分析都要标注推理依据，让学习者能理解逻辑
2. 语言简洁清晰，避免玄学术语堆砌
3. 严格按照给定的 JSON 格式输出，不要有其他内容
4. 分析必须紧扣命盘数据，不能泛泛而谈

输出格式（严格 JSON，无 markdown 代码块）：
{
  "summary": "整体命格概述，2-3句",
  "palaceAnalysis": [
    {
      "palace": "宫位名称",
      "stars": ["星名"],
      "interpretation": "该宫位的解读",
      "reasoning": "推理依据，如：命宫主星紫微居旺，主贵气..."
    }
  ],
  "mutagenAnalysis": "四化飞星的综合分析",
  "decadalFortune": "大限走势分析",
  "eventAnalysis": [
    {
      "dimension": "维度key",
      "content": "该维度的分析内容",
      "reasoning": "推理依据"
    }
  ],
  "keyFeatures": ["命盘核心特征1", "特征2", "特征3"]
}`;

// ── 模拟 chartToPromptText 生成的命盘文字 ──
const CHART_TEXT = `【基础信息】公历1985-03-15，农历一九八五年正月廿四，寅时，男命
【命主】命主星：贪狼，身主星：天相，五行局：金四局
【命宫】[★命宫] 癸丑宫，主星：紫微（旺）、天府（旺），辅星：天魁、恩光、天寿、天刑，大限：2-11岁
【兄弟】壬子宫，主星：无（空宫），辅星：天钺、龙池、天巫、阴煞，大限：12-21岁
【夫妻】辛亥宫，主星：天机（旺·化权）、天梁（庙·化科），辅星：文昌（陷·化忌）、右弼、天姚、三台，大限：22-31岁
【子女】庚戌宫，主星：七杀（旺），辅星：火星（旺）、铃星、天空、天月，大限：32-41岁
【财帛】己酉宫，主星：廉贞（旺）、天相（庙），辅星：左辅、封诰、台辅、天官，大限：42-51岁
【疾厄】戊申宫，主星：无（空宫），辅星：地劫、天哭、天虚、破碎，大限：52-61岁
【迁移】己未宫，主星：破军（旺·化禄），辅星：文曲（旺）、凤阁、蜚廉、天伤，大限：62-71岁
【仆役】庚午宫，主星：天同（不得地），辅星：擎羊（陷）、解神、天才、华盖，大限：72-81岁
【官禄】辛巳宫，主星：武曲（旺）、贪狼（旺），辅星：陀罗（庙）、地空、天福、红鸾，大限：82-91岁
【田宅】[☆身宫] 壬辰宫，主星：太阳（旺）、巨门（旺），辅星：天马、八座、天使、孤辰，大限：92-101岁
【福德】癸卯宫，主星：天相（庙），辅星：禄存、天喜、天德、月德，大限：102-111岁
【父母】甲寅宫，主星：太阴（庙），辅星：天哭、截空、旬空、寡宿，大限：112-121岁
【本命四化】天机化权（落夫妻），天梁化科（落夫妻），破军化禄（落迁移），文昌化忌（落夫妻）`;

const USER_PROMPT = `以下是待分析的命盘数据：

${CHART_TEXT}

请分析此命盘，重点分析命宫、财帛宫、官禄宫三宫，并结合三方四正和四化。

要求：
- palaceAnalysis 至少包含命宫、财帛宫、官禄宫
- 每个 reasoning 字段必须引用命盘中的具体星曜数据
- keyFeatures 列出3-5个最突出的命盘特征，用于后续出题`;

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

function parseJSON(raw) {
  const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  const cleaned = sanitizeJSONString(stripped);
  return JSON.parse(cleaned);
}

async function testModel(model) {
  const start = Date.now();
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model.id,
        system: ANALYSIS_SYSTEM,
        messages: [{ role: 'user', content: USER_PROMPT }],
        max_tokens: 8192,
      }),
      signal: AbortSignal.timeout(120_000),
    });

    const elapsed = Date.now() - start;

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      return { model: model.label, ok: false, elapsed, error: `HTTP ${res.status}: ${err.error ?? res.statusText}` };
    }

    const data = await res.json();
    const content = data.content ?? '';

    if (!content || content.trim().length < 20) {
      return { model: model.label, ok: false, elapsed, error: `空/过短内容: "${content.slice(0, 100)}"` };
    }

    // 输出原始内容前 500 字符用于诊断
    const rawPreview = content.slice(0, 500).replace(/\n/g, '\\n');

    let parsed;
    try {
      parsed = parseJSON(content);
    } catch (e) {
      return {
        model: model.label, ok: false, elapsed,
        error: `JSON 解析失败: ${e.message}`,
        raw: rawPreview,
      };
    }

    // 校验必须字段
    const required = ['summary', 'palaceAnalysis', 'mutagenAnalysis', 'decadalFortune', 'keyFeatures'];
    const missing = required.filter(k => !(k in parsed));
    if (missing.length > 0) {
      return { model: model.label, ok: false, elapsed, error: `缺少字段: ${missing.join(', ')}` };
    }

    // 校验 palaceAnalysis 至少有命宫
    const hasMingGong = parsed.palaceAnalysis?.some(p => p.palace === '命宫');
    if (!hasMingGong) {
      return { model: model.label, ok: false, elapsed, error: `palaceAnalysis 中缺少命宫` };
    }

    return {
      model: model.label, ok: true, elapsed,
      summary: parsed.summary?.slice(0, 80),
      palaces: parsed.palaceAnalysis?.length,
      features: parsed.keyFeatures?.length,
    };
  } catch (e) {
    return { model: model.label, ok: false, elapsed: Date.now() - start, error: e.message };
  }
}

async function main() {
  console.log(`\n== 紫微研习 真实流程测试（命理分析）==`);
  console.log(`目标：${BASE_URL}\n`);
  console.log(`并行测试 ${MODELS.length} 个模型...\n`);

  const results = await Promise.all(MODELS.map(testModel));

  console.log('─'.repeat(80));
  let passCount = 0;
  for (const r of results) {
    const status = r.ok ? '✅ PASS' : '❌ FAIL';
    const time = `${(r.elapsed / 1000).toFixed(1)}s`;
    console.log(`${status}  ${r.model.padEnd(24)} ${time.padStart(7)}`);
    if (r.ok) {
      console.log(`       summary: ${r.summary}`);
      console.log(`       palaces: ${r.palaces}, features: ${r.features}`);
      passCount++;
    } else {
      console.log(`       error: ${r.error}`);
      if (r.raw) console.log(`       raw: ${r.raw}`);
    }
  }
  console.log('─'.repeat(80));
  console.log(`\n结果：${passCount}/${MODELS.length} 通过\n`);

  if (passCount < MODELS.length) process.exit(1);
}

main();
