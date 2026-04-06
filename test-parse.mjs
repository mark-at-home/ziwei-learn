// Test parseJSON logic with various Gemini responses

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

// Fetch real response from Gemini 2.5 Flash
async function main() {
  const system = `你是命理老师。严格输出JSON，不要markdown代码块包裹。
输出格式：{"summary":"概述","palaceAnalysis":[{"palace":"宫名","stars":["星"],"interpretation":"解读","reasoning":"推理"}],"mutagenAnalysis":"四化","decadalFortune":"大限","eventAnalysis":[],"keyFeatures":["特征"]}`;

  const user = `命盘：公历1985-03-15，寅时，男命。命宫癸丑：紫微旺、天府旺。请简要分析。palaceAnalysis至少命宫。`;

  const res = await fetch('https://ziwei-learn.vercel.app/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gemini', system, messages: [{ role: 'user', content: user }], max_tokens: 4096 }),
  });
  const data = await res.json();
  const raw = data.content;

  console.log('Raw length:', raw.length);
  console.log('Starts with ```:', raw.startsWith('```'));
  console.log('First 100 chars repr:', JSON.stringify(raw.slice(0, 100)));

  try {
    const result = parseJSON(raw);
    console.log('Parse OK, keys:', Object.keys(result));
  } catch (e) {
    console.log('Parse FAIL:', e.message);
    const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    console.log('Stripped first 100:', JSON.stringify(stripped.slice(0, 100)));
    const cleaned = sanitizeJSONString(stripped);
    console.log('Cleaned first 100:', JSON.stringify(cleaned.slice(0, 100)));
  }
}

main();
