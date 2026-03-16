/**
 * Nominatim (OpenStreetMap) utilities
 * Free, no API key required.
 * Rate limit: 1 req/sec — use debouncing on search inputs.
 */

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const HEADERS = { "Accept-Language": "en", "User-Agent": "LogiTrack-POC/1.0" };

/**
 * Search for a place by text query.
 * @param {string} query
 * @returns {Promise<Array<{ name: string, lat: number, lng: number, displayName: string }>>}
 */
export const searchPlace = async (query) => {
  if (!query || query.trim().length < 2) return [];

  const params = new URLSearchParams({
    q: query,
    format: "json",
    addressdetails: 1,
    limit: 6,
  });

  const res = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
    headers: HEADERS,
  });
  if (!res.ok) throw new Error(`Nominatim search failed: ${res.status}`);

  const data = await res.json();
  return data.map((item) => ({
    name: formatPlaceName(item),
    displayName: item.display_name,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
  }));
};

/**
 * Reverse geocode a point to a human-readable city/town name.
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<string>} city or town name
 */
export const reverseGeocode = async (lat, lng) => {
  const params = new URLSearchParams({
    lat,
    lon: lng,
    format: "json",
    addressdetails: 1,
    zoom: 10, // city-level detail
  });

  try {
    const res = await fetch(`${NOMINATIM_BASE}/reverse?${params}`, {
      headers: HEADERS,
    });
    if (!res.ok) return null;

    const data = await res.json();
    const addr = data.address;

    // Pick the most useful label in order of preference
    const name =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.county ||
      addr.state ||
      data.display_name?.split(",")[0];

    const country = addr.country || "";
    return name ? `${name}, ${country}`.trim().replace(/,\s*$/, "") : null;
  } catch {
    return null;
  }
};

/**
 * Extract meaningful city stops from a route geometry by sampling
 * every N points, reverse geocoding in batches with 1 req/sec rate limit.
 * @param {Array<[lat, lng]>} geometry - dense polyline from OSRM
 * @param {number} maxSamples - how many points to sample (default 12)
 * @returns {Promise<Array<{ name: string, lat: number, lng: number }>>}
 */
export const extractCitiesFromRoute = async (geometry, maxSamples = 12) => {
  if (!geometry || geometry.length < 2) return [];

  // Sample evenly-spaced points along the route
  const step = Math.max(1, Math.floor(geometry.length / maxSamples));
  const sampled = [];
  for (let i = 0; i < geometry.length; i += step) {
    sampled.push(geometry[i]);
  }
  // Always include last point
  if (sampled[sampled.length - 1] !== geometry[geometry.length - 1]) {
    sampled.push(geometry[geometry.length - 1]);
  }

  // Reverse geocode each sample with 200ms between requests (rate limit)
  const results = [];
  for (const [lat, lng] of sampled) {
    const name = await reverseGeocode(lat, lng);
    if (name) results.push({ name, lat, lng });
    await sleep(220); // ~1 req/sec safe
  }

  // Deduplicate by city name (keep first occurrence)
  const seen = new Set();
  return results.filter(({ name }) => {
    const key = name.split(",")[0].trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// ─── helpers ───────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const formatPlaceName = (item) => {
  const addr = item.address;
  const city =
    addr?.city ||
    addr?.town ||
    addr?.village ||
    addr?.municipality ||
    addr?.county;
  const country = addr?.country;
  if (city && country) return `${city}, ${country}`;
  return (
    item.display_name?.split(",").slice(0, 2).join(",").trim() ||
    item.display_name
  );
};
