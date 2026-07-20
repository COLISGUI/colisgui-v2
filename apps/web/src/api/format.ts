export function gnf(v: number | string | null | undefined): string {
  const n = Number(v ?? 0);
  return new Intl.NumberFormat('fr-FR').format(n) + ' GNF';
}
export function dt(v: string | Date | null | undefined): string {
  if (!v) return '—';
  return new Date(v).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export function d(v: string | Date | null | undefined): string {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('fr-FR');
}
