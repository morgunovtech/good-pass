const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours.

/**
 * Fetch HIBP range data for a SHA-1 hash prefix (first 5 hex chars).
 * Returns an array of { suffix, count } objects.
 * Results are cached in memory for 24 hours.
 */
export async function fetchBreachRange(hashPrefix) {
  const prefix = String(hashPrefix).toUpperCase();

  if (!/^[0-9A-F]{5}$/.test(prefix)) {
    throw new Error('Hash prefix must be exactly 5 hexadecimal characters.');
  }

  const cached = cache.get(prefix);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const url = `https://api.pwnedpasswords.com/range/${prefix}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'GoodPass-BreachCheck/1.0' }
  });

  if (!response.ok) {
    throw new Error(`HIBP API returned ${response.status}`);
  }

  const text = await response.text();
  const data = parseRangeResponse(text);

  cache.set(prefix, { data, ts: Date.now() });
  return data;
}

/**
 * Parse the HIBP range response text into structured data.
 * Format: "SUFFIX:COUNT\r\n" per line.
 */
export function parseRangeResponse(text) {
  return text
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [suffix, countStr] = line.split(':');
      return { suffix: suffix.toUpperCase(), count: parseInt(countStr, 10) || 0 };
    });
}

/** Clear the in-memory cache (useful for testing). */
export function clearCache() {
  cache.clear();
}
