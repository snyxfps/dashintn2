-- Evita cliente duplicado por serviço (case-insensitive), exceto para status REUNIAO.
-- Observação: isso permite múltiplos registros REUNIAO para o mesmo cliente.

CREATE UNIQUE INDEX IF NOT EXISTS records_unique_client_per_service_except_reuniao
  ON public.records (service_id, lower(client_name))
  WHERE status <> 'REUNIAO';
