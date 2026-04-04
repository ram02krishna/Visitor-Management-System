/**
 * Shared IST (Asia/Kolkata, UTC+5:30) date utilities.
 * All display formatting and "today" range calculations use this timezone
 * regardless of the browser/OS locale setting.
 */

const IST_LOCALE = "en-IN";
const IST_TZ = "Asia/Kolkata";

/** Format a date string/Date as a full IST date + time (e.g. "4 Apr 2026, 09:15 AM"). */
export function formatIST(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "N/A";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "N/A";
  return date.toLocaleString(IST_LOCALE, {
    timeZone: IST_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/** Format a date string/Date as IST time only (e.g. "09:15 AM"). */
export function formatISTTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "N/A";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "N/A";
  return date.toLocaleTimeString(IST_LOCALE, {
    timeZone: IST_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Returns [todayStartUTC, todayEndUTC] as ISO strings, where "today" is
 * defined by the IST calendar day (midnight–midnight IST).
 *
 * IST = UTC+5:30  →  offset = 5.5 * 3600 * 1000 ms
 */
export function getISTTodayRange(): [string, string] {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5h 30m

  // Current moment shifted into IST "virtual UTC"
  const nowInIST = new Date(Date.now() + IST_OFFSET_MS);

  // Truncate to IST midnight (in UTC terms)
  const istMidnight = new Date(nowInIST);
  istMidnight.setUTCHours(0, 0, 0, 0);

  // Shift back to real UTC
  const todayStartUTC = new Date(istMidnight.getTime() - IST_OFFSET_MS);
  const todayEndUTC = new Date(todayStartUTC.getTime() + 24 * 60 * 60 * 1000);

  return [todayStartUTC.toISOString(), todayEndUTC.toISOString()];
}

/**
 * Returns the IST date string (YYYY-MM-DD) for "today", useful for building
 * date-filter queries where the DB stores dates as date strings.
 */
export function getISTTodayDateString(): string {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowInIST = new Date(Date.now() + IST_OFFSET_MS);
  return nowInIST.toISOString().split("T")[0]; // YYYY-MM-DD
}
