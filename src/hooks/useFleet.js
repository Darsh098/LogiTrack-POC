import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

/**
 * Hook to fetch all trips joined with truck and driver data
 */
export const useFleet = () => {
  return useQuery({
    queryKey: ["fleet"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select(
          `
          id,
          trip_status,
          start_time,
          estimated_end_time,
          total_weight_tons,
          total_volume_m3,
          remaining_weight_tons,
          remaining_volume_m3,
          base_price_eur,
          price_per_kg,
          price_per_m3,
          notes,
          route_waypoints,
          start_location,
          end_location,
          trip_stops,
          created_at,
          trucks (
            id,
            truck_type,
            license_plate,
            max_weight_tons,
            max_volume_m3,
            status
          ),
          drivers (
            id,
            name,
            phone,
            email,
            rating
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 2,
  });
};

/**
 * Mutation to update a trip's status
 */
export const useUpdateTripStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, status }) => {
      const { data, error } = await supabase
        .from("trips")
        .update({ trip_status: status })
        .eq("id", tripId)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fleet"] });
    },
  });
};

/**
 * Mutation to delete a trip
 */
export const useDeleteTrip = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tripId) => {
      const { error } = await supabase.from("trips").delete().eq("id", tripId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fleet"] });
    },
  });
};

/**
 * Mutation to create a new truck + trip
 * @param {Object} payload - { truckData, tripData }
 */
export const useCreateTruckTrip = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ truckData, tripData }) => {
      // 1. Insert the truck
      const { data: truck, error: truckError } = await supabase
        .from("trucks")
        .insert([truckData])
        .select()
        .single();

      if (truckError) throw truckError;

      // 2. Use prebuilt geometry from AddTruckForm (OSRM road route)
      //    If not provided (legacy path), build straight-line fallback
      const startPoint = `POINT(${tripData.startLng} ${tripData.startLat})`;
      const endPoint = `POINT(${tripData.endLng} ${tripData.endLat})`;

      const waypoints = tripData.routeWaypointStrings ?? [
        `${tripData.startLat},${tripData.startLng}`,
        ...(tripData.waypoints ?? []).map(([lat, lng]) => `${lat},${lng}`),
        `${tripData.endLat},${tripData.endLng}`,
      ];

      const linestring =
        tripData.linestringWKT ??
        (() => {
          const pts = [
            [tripData.startLng, tripData.startLat],
            ...(tripData.waypoints ?? []).map(([lat, lng]) => [lng, lat]),
            [tripData.endLng, tripData.endLat],
          ];
          return `LINESTRING(${pts.map((p) => p.join(" ")).join(", ")})`;
        })();

      // 3. Insert the trip with stops
      const { data: trip, error: tripError } = await supabase
        .from("trips")
        .insert([
          {
            truck_id: truck.id,
            driver_id: truckData.driver_id,
            start_location: startPoint,
            end_location: endPoint,
            route_polyline: linestring,
            route_waypoints: waypoints,
            trip_stops: tripData.tripStops ?? [],
            total_weight_tons: tripData.totalWeightTons,
            total_volume_m3: tripData.totalVolumeM3,
            remaining_weight_tons: tripData.totalWeightTons,
            remaining_volume_m3: tripData.totalVolumeM3,
            base_price_eur: tripData.basePriceEur,
            price_per_kg: tripData.pricePerKg,
            price_per_m3: tripData.pricePerM3,
            start_time: tripData.startTime,
            estimated_end_time: tripData.estimatedEndTime,
            notes: tripData.notes,
            trip_status: "ACTIVE",
          },
        ])
        .select()
        .single();

      if (tripError) throw tripError;

      return { truck, trip };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fleet"] });
    },
  });
};

export default useFleet;
