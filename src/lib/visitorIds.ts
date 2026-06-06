/**
 * Shared visitor ID helper — memoized per email per page session.
 *
 * Multiple components (Dashboard, VisitLogs, useVisitStats) all need the
 * same query: "which visitor profile IDs belong to this email?".
 * Without this helper they each fire a sequential Supabase round-trip
 * before their main query can run.
 *
 * This module caches the result in memory for the lifetime of the page
 * so the query runs at most once per email, no matter how many components
 * request it simultaneously.
 */
import { supabase } from "./supabase";
import { normalizeEmail } from "./sanitize";

// In-memory cache: email → Promise<string[]>
// Using a Promise lets concurrent callers await the *same* in-flight request
// instead of each firing their own.
const cache = new Map<string, Promise<string[]>>();

/**
 * Returns the visitor profile IDs for a given email.
 * Result is memoized in memory for the current page session.
 *
 * @param email - The visitor's email address
 * @returns Array of visitor `id` strings (may be empty if no profile found)
 */
export function getVisitorIds(email: string): Promise<string[]> {
  const key = normalizeEmail(email);
  if (cache.has(key)) return cache.get(key)!;

  const promise: Promise<string[]> = (async () => {
    const { data } = await supabase
      .from("visitors")
      .select("id")
      .eq("email", key);
    return data?.map((v) => v.id) ?? [];
  })();

  cache.set(key, promise);
  return promise;
}

/**
 * Clears the in-memory visitor ID cache.
 * Call on logout so a new user starts fresh.
 */
export function clearVisitorIdCache(): void {
  cache.clear();
}

/**
 * Returns a Supabase-safe array of visitor IDs, or a sentinel UUID
 * that will match nothing if the array is empty. This avoids an `.in([])`
 * which some DB drivers treat as an error.
 */
export async function getSafeVisitorIds(email: string): Promise<string[]> {
  const ids = await getVisitorIds(email);
  return ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"];
}
