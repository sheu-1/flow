export function formatCurrency(amount: number, currency: string = 'KES'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}
