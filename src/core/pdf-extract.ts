import { toISODate } from "./date-utils";

export interface PdfCandidate {
  text: string;
  date?: string;
  time?: string;
}

const MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

function resolveYear(rawYear: string | undefined, month: number, day: number, now: Date): number {
  if (rawYear) {
    const y = parseInt(rawYear, 10);
    return y < 100 ? 2000 + y : y;
  }
  const candidate = new Date(now.getFullYear(), month, day);
  if (candidate.getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
    return now.getFullYear() + 1;
  }
  return now.getFullYear();
}

function parseDateFromLine(line: string, now: Date): string | undefined {
  const numeric = line.match(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/);
  if (numeric) {
    const day = parseInt(numeric[1], 10);
    const month = parseInt(numeric[2], 10) - 1;
    const year = resolveYear(numeric[3], month, day, now);
    const d = new Date(year, month, day);
    if (!Number.isNaN(d.getTime()) && d.getMonth() === month) {
      return toISODate(d);
    }
  }

  const dayFirst = line.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?\s*(\d{2,4})?\b/
  );
  if (dayFirst) {
    const monthKey = dayFirst[2].toLowerCase();
    const month = MONTHS[monthKey];
    if (month !== undefined) {
      const day = parseInt(dayFirst[1], 10);
      const year = resolveYear(dayFirst[3], month, day, now);
      const d = new Date(year, month, day);
      if (!Number.isNaN(d.getTime()) && day <= 31) {
        return toISODate(d);
      }
    }
  }

  const monthFirst = line.match(
    /\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{2,4})?\b/
  );
  if (monthFirst) {
    const monthKey = monthFirst[1].toLowerCase();
    const month = MONTHS[monthKey];
    if (month !== undefined) {
      const day = parseInt(monthFirst[2], 10);
      const year = resolveYear(monthFirst[3], month, day, now);
      const d = new Date(year, month, day);
      if (!Number.isNaN(d.getTime()) && day <= 31) {
        return toISODate(d);
      }
    }
  }

  return undefined;
}

function parseTimeFromLine(line: string): string | undefined {
  const twelveHour = line.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (twelveHour) {
    let hour = parseInt(twelveHour[1], 10);
    const minute = twelveHour[2] ? parseInt(twelveHour[2], 10) : 0;
    const isPm = twelveHour[3].toLowerCase() === "pm";
    if (hour === 12) hour = 0;
    if (isPm) hour += 12;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  const twentyFourHour = line.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (twentyFourHour) {
    const hour = parseInt(twentyFourHour[1], 10);
    const minute = twentyFourHour[2];
    return `${String(hour).padStart(2, "0")}:${minute}`;
  }

  return undefined;
}

/**
 * Extracts text from a PDF file entirely client-side (via pdfjs-dist, no
 * server upload / paid API) and returns candidate lines that look like they
 * might describe a dated event, so the user can quickly turn them into
 * calendar events.
 */
export async function extractPdfCandidates(file: File): Promise<PdfCandidate[]> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;

  const lines: string[] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    let currentLine = "";
    let lastY: number | null = null;

    for (const item of content.items) {
      if (!("str" in item)) continue;
      const y = item.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        if (currentLine.trim()) lines.push(currentLine.trim());
        currentLine = "";
      }
      currentLine += `${item.str} `;
      lastY = y;
    }
    if (currentLine.trim()) lines.push(currentLine.trim());
  }

  const now = new Date();
  const candidates: PdfCandidate[] = [];
  const seen = new Set<string>();

  for (const rawLine of lines) {
    const cleaned = rawLine.replace(/\s+/g, " ").trim();
    if (cleaned.length < 4 || cleaned.length > 140) continue;

    const date = parseDateFromLine(cleaned, now);
    if (!date) continue;

    const time = parseTimeFromLine(cleaned);
    const key = `${cleaned}|${date}|${time ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);

    candidates.push({ text: cleaned, date, time });
    if (candidates.length >= 20) break;
  }

  return candidates;
}
