export function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0
  const avg = mean(values)
  const squareDiffs = values.map((v) => Math.pow(v - avg, 2))
  return Math.sqrt(mean(squareDiffs))
}

export function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length)
  if (n < 2) return 0
  const mx = mean(x.slice(0, n))
  const my = mean(y.slice(0, n))
  let num = 0, dx = 0, dy = 0
  for (let i = 0; i < n; i++) {
    const xi = x[i] - mx
    const yi = y[i] - my
    num += xi * yi
    dx += xi * xi
    dy += yi * yi
  }
  const denom = Math.sqrt(dx * dy)
  return denom === 0 ? 0 : num / denom
}

// Simple paired t-test, returns p-value approximation
export function pairedTTest(before: number[], after: number[]): { tStat: number; pValue: number } {
  const n = Math.min(before.length, after.length)
  if (n < 2) return { tStat: 0, pValue: 1 }
  const diffs = Array.from({ length: n }, (_, i) => after[i] - before[i])
  const d = mean(diffs)
  const sd = standardDeviation(diffs)
  if (sd === 0) return { tStat: 0, pValue: d === 0 ? 1 : 0 }
  const tStat = d / (sd / Math.sqrt(n))
  // Approximation using normal distribution for large n; use t-distribution table approximation
  const pValue = 2 * (1 - normalCDF(Math.abs(tStat)))
  return { tStat, pValue }
}

function normalCDF(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989423 * Math.exp(-z * z / 2)
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.8212560 + t * 1.3302744))))
  return z > 0 ? 1 - p : p
}

export function rollingAverage(values: number[], window: number): number[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1)
    const slice = values.slice(start, i + 1)
    return mean(slice)
  })
}

export function trendDirection(values: number[]): 'improving' | 'stable' | 'worsening' {
  if (values.length < 4) return 'stable'
  const firstHalf = mean(values.slice(0, Math.floor(values.length / 2)))
  const secondHalf = mean(values.slice(Math.floor(values.length / 2)))
  const delta = secondHalf - firstHalf
  if (delta > 0.2) return 'worsening'
  if (delta < -0.2) return 'improving'
  return 'stable'
}

export function linearRegression(x: number[], y: number[]): { slope: number; intercept: number; r2: number } {
  const n = Math.min(x.length, y.length)
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 }
  const mx = mean(x.slice(0, n))
  const my = mean(y.slice(0, n))
  let num = 0, denom = 0
  for (let i = 0; i < n; i++) {
    num += (x[i] - mx) * (y[i] - my)
    denom += (x[i] - mx) ** 2
  }
  const slope = denom === 0 ? 0 : num / denom
  const intercept = my - slope * mx
  const predicted = x.slice(0, n).map((xi) => slope * xi + intercept)
  const ssTot = y.slice(0, n).reduce((a, yi) => a + (yi - my) ** 2, 0)
  const ssRes = y.slice(0, n).reduce((a, yi, i) => a + (yi - predicted[i]) ** 2, 0)
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot
  return { slope, intercept, r2 }
}
