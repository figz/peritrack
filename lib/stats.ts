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

export function pairedTTest(before: number[], after: number[]): { tStat: number; pValue: number } {
  const n = Math.min(before.length, after.length)
  if (n < 2) return { tStat: 0, pValue: 1 }
  const diffs = Array.from({ length: n }, (_, i) => after[i] - before[i])
  const d = mean(diffs)
  const sd = standardDeviation(diffs)
  if (sd === 0) return { tStat: 0, pValue: d === 0 ? 1 : 0 }
  const tStat = d / (sd / Math.sqrt(n))
  const pValue = 2 * (1 - normalCDF(Math.abs(tStat)))
  return { tStat, pValue }
}

export function normalCDF(z: number): number {
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

// --- Multiple linear regression (OLS via normal equations) ---

function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length, n = A[0].length, p = B[0].length
  const C: number[][] = Array.from({ length: m }, () => Array(p).fill(0))
  for (let i = 0; i < m; i++)
    for (let k = 0; k < n; k++)
      for (let j = 0; j < p; j++)
        C[i][j] += A[i][k] * B[k][j]
  return C
}

function matT(A: number[][]): number[][] {
  return A[0].map((_, j) => A.map(row => row[j]))
}

function matInv(A: number[][]): number[][] | null {
  const n = A.length
  const M = A.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (j === i ? 1 : 0))])
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let row = col + 1; row < n; row++)
      if (Math.abs(M[row][col]) > Math.abs(M[pivot][col])) pivot = row
    ;[M[col], M[pivot]] = [M[pivot], M[col]]
    if (Math.abs(M[col][col]) < 1e-12) return null
    const div = M[col][col]
    for (let j = 0; j < 2 * n; j++) M[col][j] /= div
    for (let row = 0; row < n; row++) {
      if (row === col) continue
      const f = M[row][col]
      for (let j = 0; j < 2 * n; j++) M[row][j] -= f * M[col][j]
    }
  }
  return M.map(row => row.slice(n))
}

export interface MultiRegResult {
  r2: number
  adjustedR2: number
  n: number
  predictors: {
    name: string
    key: string
    coefficient: number
    tStat: number
    pValue: number
    significant: boolean
    interpretation: string
  }[]
}

export function multipleLinearRegression(
  y: number[],
  predictors: { key: string; name: string; values: number[] }[]
): MultiRegResult | null {
  const n = y.length
  const p = predictors.length
  if (n < p + 2 || p === 0) return null

  // Design matrix with intercept column
  const Xb = Array.from({ length: n }, (_, i) => [1, ...predictors.map(pr => pr.values[i])])
  const Xt = matT(Xb)
  const XtX = matMul(Xt, Xb)
  const XtXinv = matInv(XtX)
  if (!XtXinv) return null

  const Ycol = y.map(v => [v])
  const beta = matMul(XtXinv, matMul(Xt, Ycol)).map(row => row[0])

  const predicted = Xb.map(row => row.reduce((s, x, i) => s + x * beta[i], 0))
  const residuals = y.map((yi, i) => yi - predicted[i])
  const yMean = mean(y)
  const SST = y.reduce((s, yi) => s + (yi - yMean) ** 2, 0)
  const SSR = residuals.reduce((s, r) => s + r * r, 0)
  const r2 = SST < 1e-10 ? 0 : 1 - SSR / SST
  const adjR2 = n > p + 1 ? 1 - (1 - r2) * (n - 1) / (n - p - 1) : 0
  const MSE = n > p + 1 ? SSR / (n - p - 1) : 0

  const results = predictors.map((pr, i) => {
    const idx = i + 1
    const coef = beta[idx]
    const se = Math.sqrt(Math.max(0, MSE * XtXinv[idx][idx]))
    const tStat = se < 1e-10 ? 0 : coef / se
    const pValue = Math.min(1, 2 * (1 - normalCDF(Math.abs(tStat))))
    const sig = pValue < 0.05
    const strength = Math.abs(tStat) > 3 ? 'strongly' : 'moderately'
    const dir = coef > 0 ? 'associated with higher' : 'associated with lower'
    const interpretation = sig
      ? `${pr.name} is ${strength} ${dir} severity (β=${coef.toFixed(2)}, p=${pValue.toFixed(3)})`
      : `${pr.name} shows no significant association (p=${pValue.toFixed(3)})`
    return {
      name: pr.name,
      key: pr.key,
      coefficient: Math.round(coef * 1000) / 1000,
      tStat: Math.round(tStat * 100) / 100,
      pValue: Math.round(pValue * 1000) / 1000,
      significant: sig,
      interpretation,
    }
  }).sort((a, b) => Math.abs(b.tStat) - Math.abs(a.tStat))

  return { r2: Math.round(r2 * 1000) / 1000, adjustedR2: Math.round(adjR2 * 1000) / 1000, n, predictors: results }
}
