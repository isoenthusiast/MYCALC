import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLoan, paymentDate, validateLoan, LoanInputError } from '../src/calculations/home-loan.js';

const example = { amount: 450000, annualRate: 4, years: 30, extraPayment: 0, firstPaymentDate: '2026-01-31' };

function assertBalances(result) {
  assert.equal(result.rows.at(-1).closingBalanceSen, 0);
  assert.equal(result.totals.principalSen + result.totals.extraPaymentSen, result.principalSen);
  assert.equal(result.totals.totalPaymentSen, result.principalSen + result.totals.interestSen);
  let balance = result.principalSen;
  for (const row of result.rows) {
    assert.equal(row.openingBalanceSen, balance);
    assert.equal(row.regularPaymentSen, row.principalSen + row.interestSen);
    assert.equal(row.totalPaymentSen, row.regularPaymentSen + row.extraPaymentSen);
    assert.equal(row.closingBalanceSen, row.openingBalanceSen - row.principalSen - row.extraPaymentSen);
    assert.ok(row.closingBalanceSen >= 0);
    assert.ok(row.closingBalanceSen <= row.openingBalanceSen);
    for (const [key, value] of Object.entries(row)) if (key.endsWith('Sen')) assert.ok(Number.isSafeInteger(value), key);
    balance = row.closingBalanceSen;
  }
  for (const key of ['regularPaymentSen', 'interestSen', 'principalSen', 'extraPaymentSen', 'totalPaymentSen']) {
    assert.equal(result.annualRows.reduce((total, row) => total + row[key], 0), result.totals[key]);
  }
}

test('standard RM450,000 loan has known instalment, first period and cleared final balance', () => {
  const loan = calculateLoan(example);
  assert.equal(loan.scheduledPaymentSen, 214837);
  assert.equal(loan.rows[0].interestSen, 150000);
  assert.equal(loan.rows[0].principalSen, 64837);
  assert.equal(loan.rows[0].closingBalanceSen, 44935163);
  assert.equal(loan.months, 360);
  assertBalances(loan);
});

test('zero interest handles remainder sen and adjusts the last instalment', () => {
  const loan = calculateLoan({ ...example, amount: 1000, annualRate: 0, years: 1 });
  assert.equal(loan.scheduledPaymentSen, 8333);
  assert.equal(loan.rows.at(-1).regularPaymentSen, 8337);
  assert.equal(loan.totals.interestSen, 0);
  assertBalances(loan);
});

test('extra payments shorten the term without changing the scheduled instalment', () => {
  const base = calculateLoan(example);
  const loan = calculateLoan({ ...example, extraPayment: 500 });
  assert.equal(loan.scheduledPaymentSen, base.scheduledPaymentSen);
  assert.ok(loan.months < base.months);
  assert.ok(loan.interestSavedSen > 0);
  assert.equal(loan.monthsSaved, base.months - loan.months);
  assert.ok(loan.rows.at(-1).extraPaymentSen <= 50000);
  assertBalances(loan);
});

test('oversized extra payment is capped to the remaining principal', () => {
  const loan = calculateLoan({ ...example, amount: 1000, extraPayment: 1000000 });
  assert.equal(loan.months, 1);
  assert.equal(loan.rows[0].totalPaymentSen, 100333);
  assertBalances(loan);
});

test('half-sen interest is rounded upward using exact decimal arithmetic', () => {
  const loan = calculateLoan({ ...example, amount: 1000, annualRate: 0.006, years: 1 });
  assert.equal(loan.rows[0].interestSen, 1);
  assertBalances(loan);
});

test('very small positive rates do not cause NaN or infinity', () => {
  const loan = calculateLoan({ ...example, annualRate: 1e-12 });
  assert.equal(loan.totals.interestSen, 0);
  assertBalances(loan);
});

test('month-end dates do not drift after February and include leap years', () => {
  assert.equal(paymentDate('2026-01-31', 1), '2026-02-28');
  assert.equal(paymentDate('2026-01-31', 2), '2026-03-31');
  assert.equal(paymentDate('2028-01-31', 1), '2028-02-29');
  assert.equal(paymentDate('2026-12-31', 1), '2027-01-31');
});

test('annual summary uses calendar years, including partial years', () => {
  const loan = calculateLoan({ ...example, years: 1, firstPaymentDate: '2026-11-15' });
  assert.equal(loan.annualRows.length, 2);
  assert.equal(loan.annualRows[0].months, 2);
  assert.equal(loan.annualRows[1].months, 10);
  assert.equal(loan.annualRows[0].period, 2026);
  assert.equal(loan.annualRows[1].openingBalanceSen, loan.annualRows[0].closingBalanceSen);
  assertBalances(loan);
});

test('invalid dates, amounts, rate and term are rejected', () => {
  const cases = [
    ['amount', NaN], ['amount', Infinity], ['amount', 999], ['amount', 100000001], ['amount', 1000.001],
    ['annualRate', -1], ['annualRate', 31], ['years', 0], ['years', 41], ['years', 1.5],
    ['extraPayment', -1], ['extraPayment', 1000001], ['extraPayment', 0.001],
    ['firstPaymentDate', '2026-02-30'], ['firstPaymentDate', ''], ['firstPaymentDate', '1899-01-01'],
  ];
  for (const [key, value] of cases) {
    assert.ok(validateLoan({ ...example, [key]: value })[key], `${key}: ${value}`);
    assert.throws(() => calculateLoan({ ...example, [key]: value }), LoanInputError);
  }
});

test('balance conservation holds across the supported range', () => {
  for (const amount of [1000, 1000.01, 450000, 100000000]) {
    for (const annualRate of [0, 0.05, 4.35, 30]) {
      for (const years of [1, 30, 40]) {
        for (const extraPayment of [0, 500, 1000000]) {
          assertBalances(calculateLoan({ ...example, amount, annualRate, years, extraPayment }));
        }
      }
    }
  }
});
