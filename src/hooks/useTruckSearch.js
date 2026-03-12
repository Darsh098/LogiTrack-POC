import { useQuery } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/**
 * Hook to search for matching trucks
 * @param {Object} pickup - {lat: number, lng: number}
 * @param {Object} delivery - {lat: number, lng: number}
 * @param {number} weight - package weight in kg
 * @param {number} volume - package volume in m³
 * @param {number} threshold - distance threshold in km (default 5)
 * @returns {Object} - { data, isLoading, error, isSuccess }
 */
export const useTruckSearch = (
  pickup,
  delivery,
  weight,
  volume,
  threshold = 5
) => {
  return useQuery({
    queryKey: ["trucks", pickup, delivery, weight, volume, threshold],
    queryFn: async () => {
      if (!pickup || !delivery || !weight || !volume) {
        console.log("Missing parameters:", {
          pickup,
          delivery,
          weight,
          volume,
        });
        return [];
      }

      try {
        // Convert to proper types
        const pickupLat = parseFloat(pickup.lat);
        const pickupLng = parseFloat(pickup.lng);
        const deliveryLat = parseFloat(delivery.lat);
        const deliveryLng = parseFloat(delivery.lng);
        const packageWeight = parseFloat(weight);
        const packageVolume = parseFloat(volume);
        const distanceThreshold = parseInt(threshold);

        console.log("Calling find_matching_trucks with:", {
          pickupLat,
          pickupLng,
          deliveryLat,
          deliveryLng,
          packageWeight,
          packageVolume,
          distanceThreshold,
        });

        // IMPORTANT: Pass parameters in correct order with exact names
        // The function signature is:
        // find_matching_trucks(
        //   user_pickup_lat DECIMAL,
        //   user_pickup_lng DECIMAL,
        //   user_delivery_lat DECIMAL,
        //   user_delivery_lng DECIMAL,
        //   package_weight_kg DECIMAL,
        //   package_volume_m3 DECIMAL,
        //   distance_threshold_km INT
        // )

        const { data, error } = await supabase.rpc("find_matching_trucks", {
          user_pickup_lat: pickupLat,
          user_pickup_lng: pickupLng,
          user_delivery_lat: deliveryLat,
          user_delivery_lng: deliveryLng,
          package_weight_kg: packageWeight,
          package_volume_m3: packageVolume,
          distance_threshold_km: distanceThreshold,
        });

        console.log("RPC Response:", { data, error });

        if (error) {
          console.error("RPC Error:", error);
          throw error;
        }

        console.log(`Found ${data?.length || 0} trucks`);
        return data || [];
      } catch (err) {
        console.error("Search error:", err);
        throw err;
      }
    },
    enabled: !!(pickup && delivery && weight && volume),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 1,
  });
};

export default useTruckSearch;
