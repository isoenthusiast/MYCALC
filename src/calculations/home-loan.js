/** Monetary values in the calculation and schedule are integer sen. */
export const LIMITS = Object.freeze({ amountMin: 1000, amountMax: 100_000_000, rateMax: 30, yearsMax: 40, extraMax: 1_000_000 });

export class LoanInputError extends Error {
  constructor(errors) {
    super('Invalid loan inputs');
    this.name = 'LoanInputError';
    this.errors = errors;
  }
}

export function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && value >= '1900-01-01' && value <= '2199-12-31';
}

export function validateLoan(input) {
  const errors = {};
  const hasCents = value => Math.abs(value * 100 - Math.round(value * 100)) < 0.0001;
  if (!Number.isFinite(input.amount) || input.amount < LIMITS.amountMin || input.amount > LIMITS.amountMax || !hasCents(input.amount)) errors.amount = 'errorAmount';
  if (!Number.isFinite(input.annualRate) || input.annualRate < 0 || input.annualRate > LIMITS.rateMax) errors.annualRate = 'errorRate';
  if (!Number.isInteger(input.years) || input.years < 1 || input.years > LIMITS.yearsMax) errors.years = 'errorYears';
  if (!Number.isFinite(input.extraPayment) || input.extraPayment < 0 || input.extraPayment > LIMITS.extraMax || !hasCents(input.extraPayment)) errors.extraPayment = 'errorExtra';
  if (!isValidDate(input.firstPaymentDate)) errors.firstPaymentDate = 'errorDate';
  return errors;
}

/** Keep the original day-of-month, clamping only in shorter months (Jan 31 → Feb 28 → Mar 31). */
export function paymentDate(firstPaymentDate, offset) {
  const [year, month, day] = firstPaymentDate.split('-').map(Number);
  const first = new Date(Date.UTC(year, month - 1 + offset, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(day, lastDay));
  return first.toISOString().slice(0, 10);
}

function decimalFraction(number) {
  const [mantissa, exponent = '0'] = number.toString().toLowerCase().split('e');
  const decimals = mantissa.split('.')[1]?.length || 0;
  const scale = decimals - Number(exponent);
  const digits = BigInt(mantissa.replace('.', ''));
  return scale >= 0 ? [digits, 10n ** BigInt(scale)] : [digits * 10n ** BigInt(-scale), 1n];
}

function makeSchedule(input, extraSen) {
  const principalSen = Math.round(input.amount * 100);
  const months = input.years * 12;
  const monthlyRate = input.annualRate / 1200;
  const [rateNumerator, rateDenominator] = decimalFraction(input.annualRate);
  const interestDenominator = rateDenominator * 1200n;
  // log1p/expm1 avoid cancellation for very small positive rates.
  const denominator = monthlyRate ? -Math.expm1(-months * Math.log1p(monthlyRate)) : months;
  const scheduledPaymentSen = Math.round(monthlyRate ? principalSen * monthlyRate / denominator : principalSen / months);
  let balance = principalSen;
  const rows = [];
  for (let month = 1; month <= months && balance > 0; month += 1) {
    // Decimal-rational arithmetic keeps half-sen boundaries exact.
    const interestNumerator = BigInt(balance) * rateNumerator;
    const interestSen = Number((2n * interestNumerator + interestDenominator) / (2n * interestDenominator));
    // Final scheduled month absorbs accumulated sen-rounding differences.
    const regularPaymentSen = month === months ? balance + interestSen : Math.min(scheduledPaymentSen, balance + interestSen);
    const principalSen = regularPaymentSen - interestSen;
    const extraPaymentSen = Math.min(extraSen, balance - principalSen);
    const closingBalanceSen = balance - principalSen - extraPaymentSen;
    rows.push({
      period: month,
      date: paymentDate(input.firstPaymentDate, month - 1),
      openingBalanceSen: balance,
      regularPaymentSen,
      interestSen,
      principalSen,
      extraPaymentSen,
      totalPaymentSen: regularPaymentSen + extraPaymentSen,
      closingBalanceSen,
    });
    balance = closingBalanceSen;
  }
  const totals = rows.reduce((sum, row) => {
    for (const key of ['regularPaymentSen', 'interestSen', 'principalSen', 'extraPaymentSen', 'totalPaymentSen']) sum[key] += row[key];
    return sum;
  }, { regularPaymentSen: 0, interestSen: 0, principalSen: 0, extraPaymentSen: 0, totalPaymentSen: 0 });
  return { scheduledPaymentSen, rows, totals, principalSen };
}

export function calculateLoan(input) {
  const errors = validateLoan(input);
  if (Object.keys(errors).length) throw new LoanInputError(errors);
  const normalized = { ...input, amount: Math.round(input.amount * 100) / 100, extraPayment: Math.round(input.extraPayment * 100) / 100 };
  const result = makeSchedule(normalized, Math.round(normalized.extraPayment * 100));
  const baseline = normalized.extraPayment ? makeSchedule(normalized, 0) : result;
  return {
    ...result,
    input: normalized,
    months: result.rows.length,
    payoffDate: result.rows.at(-1).date,
    interestSavedSen: baseline.totals.interestSen - result.totals.interestSen,
    monthsSaved: baseline.rows.length - result.rows.length,
    baselineInterestSen: baseline.totals.interestSen,
    annualRows: annualSchedule(result.rows),
  };
}

/** Group by calendar year, including partial first/last years. */
export function annualSchedule(rows) {
  const years = [];
  for (const row of rows) {
    const year = Number(row.date.slice(0, 4));
    let group = years.at(-1);
    if (!group || group.period !== year) {
      group = { period: year, date: String(year), openingBalanceSen: row.openingBalanceSen, regularPaymentSen: 0, interestSen: 0, principalSen: 0, extraPaymentSen: 0, totalPaymentSen: 0, closingBalanceSen: 0, months: 0 };
      years.push(group);
    }
    for (const key of ['regularPaymentSen', 'interestSen', 'principalSen', 'extraPaymentSen', 'totalPaymentSen']) group[key] += row[key];
    group.closingBalanceSen = row.closingBalanceSen;
    group.months += 1;
  }
  return years;
}
