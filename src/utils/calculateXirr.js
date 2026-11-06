function toTimestamp(date) {
  const value = String(date || '')
  let isoDate = value
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value)
  if (match) {
    const [, day, month, year] = match
    isoDate = `${year}-${month}-${day}`
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null
  const timestamp = Date.parse(`${isoDate}T00:00:00Z`)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === isoDate
    ? timestamp
    : null
}

export function calculateXirr(cashFlows, terminalValue, valuationDate) {
  if (!Array.isArray(cashFlows) || cashFlows.length === 0 || !Number.isFinite(terminalValue) || terminalValue <= 0) {
    return null
  }

  const valuationTime = toTimestamp(valuationDate)
  if (valuationTime === null) return null

  const normalizedFlows = cashFlows.map(flow => {
    const timestamp = toTimestamp(flow.date)
    const amount = Number(flow.amount)
    return timestamp === null || !Number.isFinite(amount) ? null : { timestamp, amount }
  })
  if (normalizedFlows.some(flow => flow === null || flow.timestamp > valuationTime)) return null

  const startTime = Math.min(...normalizedFlows.map(flow => flow.timestamp))
  if (valuationTime <= startTime) return null

  const flows = [
    ...normalizedFlows.filter(flow => flow.amount !== 0),
    { timestamp: valuationTime, amount: terminalValue }
  ]
  if (!flows.some(flow => flow.amount < 0) || !flows.some(flow => flow.amount > 0)) return null

  const netPresentValue = rate => flows.reduce((total, flow) => {
    const years = (flow.timestamp - startTime) / (365 * 24 * 60 * 60 * 1000)
    return total + flow.amount * Math.exp(-years * Math.log1p(rate))
  }, 0)

  let low = -0.999999
  let high = 0.1
  const lowValue = netPresentValue(low)
  let highValue = netPresentValue(high)
  for (let attempt = 0; attempt < 40 && Math.sign(lowValue) === Math.sign(highValue); attempt += 1) {
    high = high * 2 + 0.1
    highValue = netPresentValue(high)
  }
  if (!Number.isFinite(lowValue) || !Number.isFinite(highValue) || Math.sign(lowValue) === Math.sign(highValue)) {
    return null
  }

  let lowBoundaryValue = lowValue
  for (let iteration = 0; iteration < 100; iteration += 1) {
    const middle = (low + high) / 2
    const middleValue = netPresentValue(middle)
    if (Math.abs(middleValue) < 0.000001) return middle
    if (Math.sign(middleValue) === Math.sign(lowBoundaryValue)) {
      low = middle
      lowBoundaryValue = middleValue
    } else {
      high = middle
    }
  }
  return (low + high) / 2
}
