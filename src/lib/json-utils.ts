/** 将 JSON 字符串内部的原始换行符转义为 \n，避免 JSON.parse 失败 */
export function sanitizeJSONString(raw: string): string {
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

/** 尝试修复被截断的 JSON（逐步补全尾部括号） */
export function repairTruncatedJSON(raw: string): string {
  try { JSON.parse(raw); return raw; } catch { /* continue */ }

  let s = raw
    .replace(/,\s*"[^"]*$/, '')
    .replace(/,\s*"[^"]*":\s*$/, '')
    .replace(/,\s*"[^"]*":\s*"[^"]*$/, '"')
    .replace(/,\s*$/, '');

  const stack: string[] = [];
  let inStr = false, esc = false;
  for (const c of s) {
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{' || c === '[') stack.push(c);
    if (c === '}' || c === ']') stack.pop();
  }

  while (stack.length > 0) {
    const open = stack.pop()!;
    s += open === '{' ? '}' : ']';
  }
  return s;
}

/** 从可能含有 markdown 包裹或前后缀文字的 LLM 输出中提取 JSON */
function extractJSONBlock(raw: string): string {
  // 去掉 markdown 代码块
  let s = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  // 截取首个 { 或 [ 到末尾，丢弃前置散文
  const firstBrace = s.indexOf('{');
  const firstBracket = s.indexOf('[');
  let start = -1;
  if (firstBrace >= 0 && firstBracket >= 0) {
    start = Math.min(firstBrace, firstBracket);
  } else if (firstBrace >= 0) {
    start = firstBrace;
  } else if (firstBracket >= 0) {
    start = firstBracket;
  }
  if (start > 0) s = s.slice(start);
  return s;
}

/** 解析 LLM 返回的 JSON：支持 markdown 包裹、前置散文、内部换行、末尾截断 */
export function parseLLMJSON<T>(raw: string, fallback: T): T {
  const stripped = extractJSONBlock(raw);
  const cleaned  = sanitizeJSONString(stripped);

  try {
    return JSON.parse(cleaned) as T;
  } catch { /* try repair */ }

  try {
    const repaired = repairTruncatedJSON(cleaned);
    console.warn('JSON 截断已修复，原始长度:', raw.length);
    return JSON.parse(repaired) as T;
  } catch {
    console.error('JSON 解析失败（含修复尝试），原始内容前300字：', raw.slice(0, 300));
    return fallback;
  }
}
