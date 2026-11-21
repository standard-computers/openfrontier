export function getMarketPurchaseTotal(baseValue: number, quantityText: string): { quantity: number; total: number } | null {
  if (!/^\d+$/.test(quantityText)) return null;
  const quantity = Number(quantityText);
  const total = baseValue * 2 * quantity;
  if (!Number.isSafeInteger(quantity) || quantity < 1 || !Number.isFinite(total) || total < 0 || total > Number.MAX_SAFE_INTEGER) return null;
  return { quantity, total };
}