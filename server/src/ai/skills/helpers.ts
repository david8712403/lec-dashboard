import { PrismaService } from '../../prisma/prisma.service';

// ---------------------------------------------------------------------------
// Student resolution – accepts an ID or partial name match
// ---------------------------------------------------------------------------
export async function resolveStudent(prisma: PrismaService, input: unknown) {
  const value = String(input ?? '').trim();
  if (!value) throw new Error('缺少學員名稱或 ID。');
  const byId = await prisma.student.findUnique({ where: { id: value } });
  if (byId) return byId;
  const byName = await prisma.student.findFirst({
    where: { name: { contains: value } },
    orderBy: { created_at: 'desc' },
  });
  if (!byName) throw new Error(`找不到學員: ${value}`);
  return byName;
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------
export function parseDateInput(value?: string | null): Date | null {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;

  const today = new Date();
  const midnight = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (['今天', 'today'].includes(text)) return midnight(today);
  if (['明天', 'tomorrow'].includes(text)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return midnight(d);
  }
  if (['昨天', 'yesterday'].includes(text)) {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return midnight(d);
  }

  if (text.includes('下週') || text.includes('上週')) {
    const weekday = extractWeekday(text);
    if (weekday) {
      const todayIndex = (today.getDay() + 6) % 7;
      const targetIndex = weekday - 1;
      if (text.includes('下週')) {
        let daysAhead = targetIndex - todayIndex;
        if (daysAhead <= 0) daysAhead += 7;
        daysAhead += 7;
        const d = new Date(today);
        d.setDate(d.getDate() + daysAhead);
        return midnight(d);
      }
      if (text.includes('上週')) {
        let daysBack = todayIndex - targetIndex;
        if (daysBack <= 0) daysBack += 7;
        daysBack += 7;
        const d = new Date(today);
        d.setDate(d.getDate() - daysBack);
        return midnight(d);
      }
    }
  }

  let normalized = text.replace(/\//g, '-');
  const parts = normalized.split('-').map((part) => part.trim());
  if (parts.length === 2) {
    normalized = `${today.getFullYear()}-${parts[0]}-${parts[1]}`;
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  return midnight(date);
}

function extractWeekday(text: string): number | null {
  const map: Record<string, number> = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 7, '天': 7,
  };
  const match = text.match(/[一二三四五六日天]/);
  if (match && map[match[0]] !== undefined) return map[match[0]];
  return null;
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// Weekday helpers
// ---------------------------------------------------------------------------
export function normalizeWeekday(value: unknown): number {
  if (value === undefined || value === null) return 1;
  const text = String(value);
  const weekdayMap: Record<string, number> = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 7, '天': 7,
    '週一': 1, '週二': 2, '週三': 3, '週四': 4, '週五': 5, '週六': 6, '週日': 7,
    '星期一': 1, '星期二': 2, '星期三': 3, '星期四': 4, '星期五': 5, '星期六': 6, '星期日': 7,
  };
  if (weekdayMap[text] !== undefined) return weekdayMap[text];
  const numeric = Number(text);
  if (!Number.isNaN(numeric)) {
    if (numeric >= 0 && numeric <= 6) return numeric + 1;
    if (numeric >= 1 && numeric <= 7) return numeric;
  }
  return 1;
}

export function weekdayName(weekday: number): string {
  const names = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];
  return names[weekday - 1] ?? `週${weekday}`;
}

// ---------------------------------------------------------------------------
// Time-slot helpers
// ---------------------------------------------------------------------------
export function normalizeTime(value: unknown): string {
  const text = String(value ?? '').trim();
  if (!text) return '00:00';
  if (text.includes(':')) return text;
  if (text.length === 4) return `${text.slice(0, 2)}:${text.slice(2)}`;
  return text;
}

export function inferEndTime(startTime: string): string {
  const [hour, minute] = startTime.split(':').map((v) => Number(v));
  if (Number.isNaN(hour) || Number.isNaN(minute)) return startTime;
  let endHour = hour + 1;
  let endMinute = minute + 40;
  if (endMinute >= 60) {
    endHour += 1;
    endMinute -= 60;
  }
  return `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
}

export function resolveTimeRange(start: unknown, end: unknown): { start: string; end: string } {
  const normalizedStart = normalizeTime(start);
  const normalizedEnd = end ? normalizeTime(end) : inferEndTime(normalizedStart);
  return { start: normalizedStart, end: normalizedEnd };
}

// ---------------------------------------------------------------------------
// Misc helpers
// ---------------------------------------------------------------------------
export function toNullableString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
}
