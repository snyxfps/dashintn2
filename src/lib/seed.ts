import { supabase } from '@/integrations/supabase/client';

export const seedData = async () => {
  // Buscar serviços
  const { data: services } = await supabase.from('services').select('*');
  if (!services || services.length === 0) return;

  const smpId = services.find(s => s.name === 'SMP')?.id;
  const multicadId = services.find(s => s.name === 'Multicadastro')?.id;
  const rcvId = services.find(s => s.name === 'RC-V')?.id;
  const techLogId = services.find(s => s.name === 'Tecnologia Logística')?.id;

  const owners = ['Ana Costa', 'Bruno Lima', 'Carla Rocha', 'Diego Nunes', 'Elisa Matos'];
  const statuses = ['NOVO', 'REUNIAO', 'ANDAMENTO', 'FINALIZADO', 'CANCELADO', 'DEVOLVIDO'] as const;

  const clients = [
    { name: 'Empresa Alpha S.A.', serviceId: smpId },
    { name: 'Grupo Beta Ltda', serviceId: smpId },
    { name: 'Comercial Gama', serviceId: smpId },
    { name: 'Tech Delta Corp', serviceId: smpId },
    { name: 'Inovações Epsilon', serviceId: smpId },
    { name: 'Distribuidora Zeta', serviceId: multicadId },
    { name: 'Logística Eta SA', serviceId: multicadId },
    { name: 'Theta Soluções', serviceId: multicadId },
    { name: 'Iota Sistemas', serviceId: multicadId },
    { name: 'Kappa Network', serviceId: multicadId },
    { name: 'Lambda Tech', serviceId: rcvId },
    { name: 'Mu Consultoria', serviceId: rcvId },
    { name: 'Nu Partners', serviceId: rcvId },
    { name: 'Xi Corporation', serviceId: rcvId },
    { name: 'Omicron Data', serviceId: techLogId },
    { name: 'Pi Logistics', serviceId: techLogId },
    { name: 'Rho Freight', serviceId: techLogId },
    { name: 'Sigma Cargo', serviceId: techLogId },
    { name: 'Tau Express', serviceId: techLogId },
    { name: 'Upsilon Digital', serviceId: smpId },
  ];

  const records = clients
    .filter(c => c.serviceId)
    .map((c, i) => ({
      service_id: c.serviceId!,
      client_name: c.name,
      start_date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: statuses[i % statuses.length],
      owner: owners[i % owners.length],
      notes: i % 3 === 0 ? 'Cliente prioritário - acompanhar semanalmente' : i % 3 === 1 ? 'Aguardando documentação' : '',
    }));

  await supabase.from('records').insert(records);
};
