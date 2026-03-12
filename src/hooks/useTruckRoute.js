import { useQuery } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

/**
 * Hook to fetch route waypoints for a specific trip
 * @param {string} tripId - The UUID of the trip
 * @returns {Object} - { routeWaypoints, isLoading, error }
 */
export const useTruckRoute = (tripId) => {
  return useQuery({
    queryKey: ["truckRoute", tripId],
    queryFn: async () => {
      if (!tripId) return null;

      try {
        const { data, error } = await supabase
          .from("trips")
          .select("route_waypoints")
          .eq("id", tripId)
          .single();

        if (error) {
          console.error("Error fetching route:", error);
          throw error;
        }

        // Check if waypoints exist
        if (
          !data ||
          !data.route_waypoints ||
          data.route_waypoints.length === 0
        ) {
          return null;
        }

        // Parse 'lat,lng' strings into [lat, lng] arrays for Leaflet
        const parsedRoute = data.route_waypoints.map((point) => {
          const [lat, lng] = point.split(",").map(Number);
          return [lat, lng];
        });

        // Ensure valid mapping
        const validRoute = parsedRoute.filter(
          (pt) => !isNaN(pt[0]) && !isNaN(pt[1]),
        );

        return validRoute;
      } catch (err) {
        console.error("Route fetch error:", err);
        throw err;
      }
    },
    enabled: !!tripId,
    staleTime: 1000 * 60 * 30, // 30 minutes cache
  });
};

export default useTruckRoute;
