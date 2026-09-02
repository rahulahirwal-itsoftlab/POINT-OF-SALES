export function calculateExpiryDate(startDateStr: string, durationMonths: number): string {
  if (!startDateStr) return "";
  const parts = startDateStr.split("-");
  if (parts.length !== 3) return "";
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return "";

  const safeDuration = Math.max(1, Math.floor(durationMonths || 1));
  const targetMonthIndex = month + safeDuration;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;

  const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const targetDay = Math.min(day, lastDayOfTargetMonth);

  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${targetYear}-${pad(targetMonth + 1)}-${pad(targetDay)}`;
}

export function calculatePlanFinancials(basePrice: number, gstPercentage: number = 18) {
  const safeBase = Number.isFinite(basePrice) && basePrice >= 0 ? basePrice : 0;
  const safeGstPct = Number.isFinite(gstPercentage) && gstPercentage >= 0 ? gstPercentage : 18;
  const gstAmount = safeBase * (safeGstPct / 100);
  const finalAmount = safeBase + gstAmount;
  return {
    basePrice: safeBase,
    gstPercentage: safeGstPct,
    gstAmount,
    finalAmount,
  };
}
