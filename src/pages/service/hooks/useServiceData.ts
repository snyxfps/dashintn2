import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Service, ServiceRecord, RecordStatus } from "@/types";
import { serviceKeys } from "./serviceKeys";

async function fetchServiceByName(serviceName: string): Promise<Service | null> {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("name", serviceName)
    .maybeSingle();

  if (error) throw error;
  return (data as Service) ?? null;
}

async function fetchRecordsByServiceId(serviceId: string): Promise<ServiceRecord[]> {
  const { data, error } = await supabase
    .from("records")
    .select("*")
    .eq("service_id", serviceId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as ServiceRecord[]) ?? [];
}

export function useServiceData(serviceName: string) {
  const qc = useQueryClient();

  const serviceQuery = useQuery({
    queryKey: serviceKeys.service(serviceName),
    queryFn: () => fetchServiceByName(serviceName),
    staleTime: 30_000,
  });

  const service = serviceQuery.data ?? null;
  const serviceMissing = !serviceQuery.isLoading && !serviceQuery.isError && !service;

  const recordsQuery = useQuery({
    queryKey: serviceKeys.records(serviceName),
    enabled: !!service?.id,
    queryFn: () => fetchRecordsByServiceId(service!.id),
    staleTime: 10_000,
  });

  const createService = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("services").insert({ name: serviceName, description: null });
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: serviceKeys.service(serviceName) });
    },
  });

  const createRecord = useMutation({
    mutationFn: async (payload: Omit<ServiceRecord, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase.from("records").insert(payload).select("*").single();
      if (error) throw error;
      return data as ServiceRecord;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: serviceKeys.records(serviceName) });
    },
  });

  const updateRecord = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ServiceRecord> }) => {
      const { data, error } = await supabase.from("records").update(patch).eq("id", id).select("*").single();
      if (error) throw error;
      return data as ServiceRecord;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: serviceKeys.records(serviceName) });
    },
  });

  const deleteRecord = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("records").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: serviceKeys.records(serviceName) });
    },
  });

  const moveStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: RecordStatus }) => {
      const { data, error } = await supabase.from("records").update({ status }).eq("id", id).select("*").single();
      if (error) throw error;
      return data as ServiceRecord;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: serviceKeys.records(serviceName) });
    },
  });

  return {
    service,
    serviceMissing,
    serviceQuery,
    records: recordsQuery.data ?? [],
    recordsQuery,
    isLoading: serviceQuery.isLoading || recordsQuery.isLoading,
    isError: serviceQuery.isError || recordsQuery.isError,
    error: (serviceQuery.error ?? recordsQuery.error) as unknown,
    createService,
    createRecord,
    updateRecord,
    deleteRecord,
    moveStatus,
    refetchAll: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: serviceKeys.service(serviceName) }),
        qc.invalidateQueries({ queryKey: serviceKeys.records(serviceName) }),
      ]);
    },
  };
}
