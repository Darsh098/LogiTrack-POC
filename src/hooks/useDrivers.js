import { useQuery } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

/**
 * Hook to fetch all drivers from the database
 */
export const useDrivers = () => {
  return useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("id, name, phone, email, rating, total_trips, verified")
        .order("name", { ascending: true });

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
};

export default useDrivers;
