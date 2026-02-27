import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useLastUpdate() {
  return useQuery({
    queryKey: ["dashboard-last-update"],
    queryFn: async () => {
      const sb: any = supabase;

      const { data, error } = await sb
        .from("record_audit_logs")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      const last = data?.[0]?.created_at as string | undefined;
      return last ?? null;
    },
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
}