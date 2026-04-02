/** Normalizes order amount from list/API rows for totals and PDFs. */
export function parseOrderAmountNumeric(amount: number | string | undefined | null): number {
  if (amount == null) return 0;
  if (typeof amount === 'number') return Number.isFinite(amount) ? amount : 0;
  const n = parseFloat(String(amount).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function sumOrderAmounts<T extends { amount?: number | string }>(orders: T[]): number {
  return orders.reduce((sum, o) => sum + parseOrderAmountNumeric(o.amount), 0);
}

export function averageOrderValue<T extends { amount?: number | string }>(orders: T[]): number {
  if (orders.length === 0) return 0;
  return sumOrderAmounts(orders) / orders.length;
}
