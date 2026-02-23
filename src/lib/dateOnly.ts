// Helpers para campos DATE (sem hora) vindos do Postgres/Supabase.
// IMPORTANTÍSSIMO: NÃO usar `new Date('YYYY-MM-DD')` para exibir, pois o JS interpreta
// como UTC e pode “voltar um dia” em fusos negativos (ex.: Brasil -03).

/**
 * Normaliza um valor de data para o formato YYYY-MM-DD.
 * Aceita: YYYY-MM-DD | YYYY-MM-DDTHH:mm:ssZ | DD/MM/YYYY
 */
export function normalizeDateOnly(value: string | null | undefined): string {
  if (!value) return '';

  const v = String(value).trim();
  if (!v) return '';

  // ISO com hora -> corta somente a parte da data
  const isoDate = v.includes('T') ? v.split('T')[0] : v;

  // Já no formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;

  // Formato BR DD/MM/YYYY
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(isoDate);
  if (m) {
    const [, dd, mm, yyyy] = m;
    return `${yyyy}-${mm}-${dd}`;
  }

  return isoDate;
}

/**
 * Formata uma data YYYY-MM-DD (ou ISO) para DD/MM/YYYY sem timezone.
 */
export function formatDateOnlyBR(value: string | null | undefined): string {
  const ymd = normalizeDateOnly(value);
  if (!ymd) return '';

  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return ymd;
  const [, yyyy, mm, dd] = m;
  return `${dd}/${mm}/${yyyy}`;
}

export function todayDateOnlyLocal(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
