import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateXirr } from './calculateXirr.js'

test('returns null when the first investment is less than one year old', () => {
  const result = calculateXirr(
    [{ date: '2026-11-05', amount: -1000 }],
    1110.97,
    '11-11-2026'
  )

  assert.equal(result, null)
})

test('calculates XIRR when the first investment is exactly one year old', () => {
  const result = calculateXirr(
    [{ date: '2025-11-11', amount: -1000 }],
    1100,
    '11-11-2026'
  )

  assert.ok(Math.abs(result - 0.1) < 0.000001)
})

test('uses the earliest non-zero cash flow to determine the holding period', () => {
  const result = calculateXirr(
    [
      { date: '2025-11-11', amount: -1000 },
      { date: '2026-11-10', amount: 0 }
    ],
    1100,
    '11-11-2026'
  )

  assert.ok(Math.abs(result - 0.1) < 0.000001)
})
