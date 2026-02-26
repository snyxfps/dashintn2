export const serviceKeys = {
  service: (serviceName: string) => ["service", serviceName] as const,
  records: (serviceName: string) => ["records", serviceName] as const,
};
