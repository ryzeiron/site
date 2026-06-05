export function formatPrice(euros: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(euros);
}

export function formatCents(cents: number): string {
  return formatPrice(cents / 100);
}
