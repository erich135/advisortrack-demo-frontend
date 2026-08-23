import { ProductionCase } from '../domain/types';

const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function normalizeStatus(row: any): 'submitted' | 'issued' | 'lapsed' {
  const s = String(row.status ?? row.current_stage ?? '').toLowerCase();
  const issuedKeywords = ['issued', 'completed', 'active', 'won', 'approved'];
  const lapsedKeywords = ['lapsed', 'cancelled', 'canceled', 'declined', 'lost', 'rejected'];
  if (issuedKeywords.some((k) => s.includes(k))) return 'issued';
  if (lapsedKeywords.some((k) => s.includes(k))) return 'lapsed';
  return 'submitted';
}

function mapRowToProductionCase(row: any): ProductionCase {
  const id = row.id != null ? String(row.id) : String(row.id ?? '');
  const advisorId = row.user_id ?? row.advisorId ?? '';
  const clientName = row.client_name ?? row.clientName ?? row.title ?? `Case ${id}`;
  const product = row.quote_product_type ?? row.product ?? row.simple_goal_product ?? 'Unknown';
  const submittedAt = row.created_at ?? row.submitted_at ?? new Date().toISOString();

  const status = normalizeStatus(row);

  const issuedAt = status === 'issued' ? (row.updated_at ?? row.issued_at ?? undefined) : undefined;

  const potentialCommission = Number(row.estimated_commission ?? row.potential_commission ?? row.quote_premium ?? 0) || 0;

  let issuedCommission: number | undefined = undefined;
  if (status === 'issued') {
    const val = row.estimated_commission ?? row.issued_commission ?? null;
    if (val != null) {
      const n = Number(val);
      if (!Number.isNaN(n)) issuedCommission = n;
    }
  }

  return {
    id,
    advisorId: advisorId != null ? String(advisorId) : '',
    clientName: String(clientName),
    product: String(product),
    submittedAt: String(submittedAt),
    issuedAt: issuedAt != null ? String(issuedAt) : undefined,
    status,
    potentialCommission,
    issuedCommission,
  };
}

export const fetchDataService = {
  async getProductionCases(limit = 100): Promise<ProductionCase[]> {
    try {
      const capped = Math.min(limit || 100, 100);
      const url = (API || '') + `/api/client-cases?limit=${encodeURIComponent(String(capped))}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) {
        const txt = await res.text().catch(() => '<no body>');
        console.error('fetchDataService.getProductionCases: bad response', res.status, txt);
        return [];
      }
      const rows = await res.json();
      if (!Array.isArray(rows)) {
        console.error('fetchDataService.getProductionCases: unexpected response shape', rows);
        return [];
      }
      return rows.map(mapRowToProductionCase);
    } catch (err) {
      console.error('fetchDataService.getProductionCases error', err);
      return [];
    }
  },
};
