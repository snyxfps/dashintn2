export function formatDateOnlyBR(value: string | null | undefined): string {
  if (!value) return '';

  // Se vier ISO com hora, corta
  const datePart = value.includes('T') ? value.split('T')[0] : value;

  // Se vier no formato YYYY-MM-DD, formata para DD/MM/YYYY sem Date()
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (m) {
    const [, yyyy, mm, dd] = m;
    return `${dd}/${mm}/${yyyy}`;
  }

  // Se já estiver DD/MM/YYYY, retorna
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(datePart)) return datePart;

  // fallback: retorna como veio
  return datePart;
}