/**
 * OSRM (Open Source Routing Machine) utilities
 * Free public API — no key needed. Uses OpenStreetMap road data.
 */

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

/**
 * Fetch road-following routes between ordered waypoints.
 * @param {Array<{ lat: number, lng: number }>} waypoints
 * @param {boolean} alternatives - return multiple route options (up to 3)
 * @returns {Promise<Array<{ geometry: [lat,lng][], distance: number, duration: number }>>}
 */
export const fetchRoutes = async (waypoints, alternatives = true) => {
  if (!waypoints || waypoints.length < 2) return [];

  const coordStr = waypoints.map((p) => `${p.lng},${p.lat}`).join(";");
  const url = `${OSRM_BASE}/${coordStr}?overview=full&geometries=geojson&alternatives=${alternatives}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM error ${res.status}`);

  const json = await res.json();
  if (json.code !== "Ok") throw new Error(`OSRM: ${json.message || json.code}`);

  return json.routes.map((route) => ({
    // GeoJSON is [lng, lat] — flip to [lat, lng] for Leaflet
    geometry: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distance: route.distance, // metres
    duration: route.duration, // seconds
    distanceKm: (route.distance / 1000).toFixed(1),
    durationMin: Math.round(route.duration / 60),
  }));
};

/**
 * Sample a dense OSRM geometry down to at most `maxPoints` evenly-spaced points
 * suitable for storing in route_waypoints TEXT[] or as a PostGIS LINESTRING.
 * @param {Array<[lat,lng]>} geometry
 * @param {number} maxPoints
 * @returns {Array<[lat,lng]>}
 */
export const sampleGeometry = (geometry, maxPoints = 200) => {
  if (!geometry || geometry.length <= maxPoints) return geometry;
  const step = geometry.length / maxPoints;
  const result = [];
  for (let i = 0; i < maxPoints; i++) {
    result.push(geometry[Math.floor(i * step)]);
  }
  // Always keep the last point
  result[result.length - 1] = geometry[geometry.length - 1];
  return result;
};

/**
 * Build a PostGIS LINESTRING WKT from an array of [lat, lng] pairs.
 */
export const toLinestringWKT = (geometry) => {
  const pairs = geometry.map(([lat, lng]) => `${lng} ${lat}`).join(", ");
  return `LINESTRING(${pairs})`;
};

/**
 * Build the route_waypoints TEXT[] ('lat,lng' strings) from geometry.
 */
export const toWaypointStrings = (geometry) =>
  geometry.map(([lat, lng]) => `${lat},${lng}`);
