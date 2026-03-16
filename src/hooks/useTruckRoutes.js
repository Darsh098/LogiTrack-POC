import { useQuery } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

export const ROUTE_COLORS = [
  "#4f46e5",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#64748b",
];

/**
 * Hook to load route geometry + stops for a list of trip IDs.
 * Returns a map keyed by tripId:
 *   { routeWaypoints: [lat,lng][], startLocation, endLocation, stops, color }
 *
 * Route geometry comes directly from the DB (stored OSRM road points),
 * so no additional API calls are made at render time.
 */
export const useTruckRoutes = (tripIds) => {
  return useQuery({
    queryKey: ["truckRoutes", tripIds],
    queryFn: async () => {
      if (!tripIds || tripIds.length === 0) return {};

      const { data, error } = await supabase
        .from("trips")
        .select("id, route_waypoints, start_location, end_location, trip_stops")
        .in("id", tripIds);

      if (error) throw error;

      const routeMap = {};

      data.forEach((trip, index) => {
        // Parse start location (GeoJSON Point: [lng, lat])
        let startLoc = null;
        if (trip.start_location?.coordinates) {
          startLoc = {
            lat: trip.start_location.coordinates[1],
            lng: trip.start_location.coordinates[0],
          };
        }

        // Parse end location
        let endLoc = null;
        if (trip.end_location?.coordinates) {
          endLoc = {
            lat: trip.end_location.coordinates[1],
            lng: trip.end_location.coordinates[0],
          };
        }

        // Parse stored waypoints (TEXT[] 'lat,lng') — full OSRM road geometry
        let intermediates = [];
        if (trip.route_waypoints?.length > 0) {
          intermediates = trip.route_waypoints
            .map((pt) => {
              const [lat, lng] = pt.split(",").map(Number);
              return [lat, lng];
            })
            .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));
        }

        // Full polyline: start → OSRM geometry → end
        const fullRoute = [];
        if (startLoc) fullRoute.push([startLoc.lat, startLoc.lng]);
        fullRoute.push(...intermediates);
        if (endLoc) fullRoute.push([endLoc.lat, endLoc.lng]);

        // Stops from trip_stops JSONB column
        const stops = Array.isArray(trip.trip_stops) ? trip.trip_stops : [];

        routeMap[trip.id] = {
          routeWaypoints: fullRoute,
          startLocation: startLoc,
          endLocation: endLoc,
          stops,
          color: ROUTE_COLORS[index % ROUTE_COLORS.length],
        };
      });

      return routeMap;
    },
    enabled: !!(tripIds && tripIds.length > 0),
    staleTime: 1000 * 60 * 30,
  });
};

export default useTruckRoutes;
