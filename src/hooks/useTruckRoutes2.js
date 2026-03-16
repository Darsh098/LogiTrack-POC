import { useQuery } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

// Map of distinct colors to use for different truck routes
export const ROUTE_COLORS = [
  "#4f46e5", // Indigo
  "#0ea5e9", // Sky Blue
  "#10b981", // Emerald Green
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#14b8a6", // Teal
  "#f97316", // Orange
  "#64748b", // Slate
];

/**
 * Hook to fetch route waypoints and locations for an array of trips
 * @param {Array<string>} tripIds - Array of UUIDs for the trips
 * @returns {Object} - { truckRoutes, isLoading, error }
 * Return structure is mapped by tripId pointing to:
 * {
 *    routeWaypoints: Array<[lat, lng]>,
 *    startLocation: { lat, lng },
 *    endLocation: { lat, lng },
 *    color: string
 * }
 */
export const useTruckRoutes = (tripIds) => {
  return useQuery({
    queryKey: ["truckRoutes", tripIds],
    queryFn: async () => {
      if (!tripIds || tripIds.length === 0) return {};

      try {
        // Use PostGIS ST_AsGeoJSON functions to parse geography types if needed,
        // but since start_location and end_location are geography types, Supabase usually returns them in GeoJSON format.
        // E.g., { "type": "Point", "coordinates": [lng, lat] }
        const { data, error } = await supabase
          .from("trips")
          .select("id, route_waypoints, start_location, end_location")
          .in("id", tripIds);

        if (error) {
          console.error("Error fetching routes:", error);
          throw error;
        }

        const routeMap = {};

        data.forEach((trip, index) => {
          // Parse start and end locations (GeoJSON Point format: [lng, lat])
          let startLoc = null;
          if (trip.start_location && trip.start_location.coordinates) {
            startLoc = {
              lat: trip.start_location.coordinates[1],
              lng: trip.start_location.coordinates[0],
            };
          }

          let endLoc = null;
          if (trip.end_location && trip.end_location.coordinates) {
            endLoc = {
              lat: trip.end_location.coordinates[1],
              lng: trip.end_location.coordinates[0],
            };
          }

          // Parse intermediate waypoints from route_waypoints TEXT[] ('lat,lng' format)
          let intermediates = [];
          if (trip.route_waypoints && trip.route_waypoints.length > 0) {
            intermediates = trip.route_waypoints
              .map((point) => {
                const [lat, lng] = point.split(",").map(Number);
                return [lat, lng];
              })
              .filter((pt) => !isNaN(pt[0]) && !isNaN(pt[1]));
          }

          // Build the full polyline: start → intermediates → end
          // This guarantees at least 2 points even when route_waypoints is empty
          const fullRoute = [];
          if (startLoc) fullRoute.push([startLoc.lat, startLoc.lng]);
          fullRoute.push(...intermediates);
          if (endLoc) fullRoute.push([endLoc.lat, endLoc.lng]);

          routeMap[trip.id] = {
            routeWaypoints: fullRoute,
            startLocation: startLoc,
            endLocation: endLoc,
            color: ROUTE_COLORS[index % ROUTE_COLORS.length],
          };
        });

        return routeMap;
      } catch (err) {
        console.error("Route fetch error:", err);
        throw err;
      }
    },
    enabled: !!(tripIds && tripIds.length > 0),
    staleTime: 1000 * 60 * 30, // 30 minutes cache
  });
};

export default useTruckRoutes;
