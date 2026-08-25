export function formatCurrency(
  value: number | string | null | undefined,
  currency = "INR",
  locale = "en-IN",
) {
  const parsedAmount = typeof value === "string" ? Number(value) : value;
  const amount =
    typeof parsedAmount === "number" && Number.isFinite(parsedAmount)
      ? parsedAmount
      : 0;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
