import type { Astrolabe } from './iztro-wrapper';
import { getChartId, getChartLabel } from './iztro-wrapper';

const CHART_LIB_KEY = 'ziwei_chart_library';
const CHAT_KEY      = 'ziwei_chat_history';

// ─── 命盘库 ─────────────────────────────────────────────────────

export interface ChartRecord {
  chartId:    string;
  label:      string;
  nickname?:  string;
  solarDate:  string;
  savedAt:    string;
  astrolabe:  Astrolabe;
}

export function loadChartLibrary(): ChartRecord[] {
  try {
    const raw = localStorage.getItem(CHART_LIB_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveChartRecord(chart: Astrolabe): void {
  const lib   = loadChartLibrary();
  const id    = getChartId(chart);
  const label = getChartLabel(chart);
  const exists = lib.findIndex(r => r.chartId === id);

  const record: ChartRecord = {
    chartId:   id,
    label,
    solarDate: chart.solarDate,
    savedAt:   exists >= 0 ? lib[exists].savedAt : new Date().toISOString(),
    astrolabe: chart,
  };

  if (exists >= 0) {
    lib[exists] = record;
  } else {
    lib.unshift(record);
  }
  localStorage.setItem(CHART_LIB_KEY, JSON.stringify(lib.slice(0, 50)));
}

export function loadChartRecord(chartId: string): ChartRecord | undefined {
  return loadChartLibrary().find(r => r.chartId === chartId);
}

export function updateChartNickname(chartId: string, nickname: string): void {
  const lib = loadChartLibrary();
  const idx = lib.findIndex(r => r.chartId === chartId);
  if (idx >= 0) {
    lib[idx].nickname = nickname;
    localStorage.setItem(CHART_LIB_KEY, JSON.stringify(lib));
  }
}

export function deleteChartRecord(chartId: string): void {
  const lib = loadChartLibrary().filter(r => r.chartId !== chartId);
  localStorage.setItem(CHART_LIB_KEY, JSON.stringify(lib));
}

// ─── 对话记录 ────────────────────────────────────────────────────

export interface ChatRecord {
  chartId:  string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  updatedAt: string;
}

export function loadChatHistory(chartId: string): ChatRecord | null {
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    const all: ChatRecord[] = raw ? JSON.parse(raw) : [];
    return all.find(c => c.chartId === chartId) ?? null;
  } catch {
    return null;
  }
}

export function saveChatHistory(chartId: string, messages: { role: 'user' | 'assistant'; content: string }[]): void {
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    const all: ChatRecord[] = raw ? JSON.parse(raw) : [];
    const idx = all.findIndex(c => c.chartId === chartId);
    const record: ChatRecord = { chartId, messages, updatedAt: new Date().toISOString() };
    if (idx >= 0) {
      all[idx] = record;
    } else {
      all.unshift(record);
    }
    localStorage.setItem(CHAT_KEY, JSON.stringify(all.slice(0, 30)));
  } catch { /* 静默 */ }
}

export function deleteChatHistory(chartId: string): void {
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    const all: ChatRecord[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem(CHAT_KEY, JSON.stringify(all.filter(c => c.chartId !== chartId)));
  } catch { /* 静默 */ }
}
