export interface KnownLabTest {
  key: string
  name: string
  unit: string
  refLow?: number
  refHigh?: number
  category: string
  clinicalNote?: string
}

export const KNOWN_LAB_TESTS: KnownLabTest[] = [
  // Sex hormones — core HRT panel
  { key: 'estradiol', name: 'Estradiol (E2)', unit: 'pg/mL', refLow: 30, refHigh: 400, category: 'Sex Hormones', clinicalNote: 'HRT target: 50–100 pg/mL. <30 often subtherapeutic.' },
  { key: 'fsh', name: 'FSH', unit: 'mIU/mL', refLow: 1, refHigh: 12, category: 'Sex Hormones', clinicalNote: '>25 mIU/mL suggests ovarian decline / perimenopause.' },
  { key: 'lh', name: 'LH', unit: 'mIU/mL', refLow: 1, refHigh: 18, category: 'Sex Hormones' },
  { key: 'progesterone', name: 'Progesterone', unit: 'ng/mL', refLow: 0.1, refHigh: 25, category: 'Sex Hormones' },
  { key: 'testosterone_total', name: 'Total Testosterone', unit: 'ng/dL', refLow: 15, refHigh: 70, category: 'Sex Hormones' },
  { key: 'testosterone_free', name: 'Free Testosterone', unit: 'pg/mL', refLow: 1, refHigh: 8.5, category: 'Sex Hormones' },
  { key: 'dheas', name: 'DHEA-S', unit: 'μg/dL', refLow: 35, refHigh: 430, category: 'Sex Hormones' },
  { key: 'shbg', name: 'SHBG', unit: 'nmol/L', refLow: 18, refHigh: 114, category: 'Sex Hormones', clinicalNote: 'High SHBG reduces bioavailable testosterone/estrogen.' },
  // Thyroid
  { key: 'tsh', name: 'TSH', unit: 'mIU/L', refLow: 0.4, refHigh: 4.0, category: 'Thyroid', clinicalNote: 'Hypothyroidism can mimic perimenopause symptoms.' },
  { key: 'free_t4', name: 'Free T4', unit: 'ng/dL', refLow: 0.8, refHigh: 1.8, category: 'Thyroid' },
  { key: 'free_t3', name: 'Free T3', unit: 'pg/mL', refLow: 2.3, refHigh: 4.2, category: 'Thyroid' },
  // Adrenal / stress
  { key: 'cortisol', name: 'Cortisol (AM)', unit: 'μg/dL', refLow: 6, refHigh: 23, category: 'Adrenal' },
  // Metabolic / bone health
  { key: 'vitamin_d', name: 'Vitamin D (25-OH)', unit: 'ng/mL', refLow: 30, refHigh: 100, category: 'Metabolic', clinicalNote: 'Critical for bone health in perimenopause. Target >40 ng/mL.' },
  { key: 'glucose_fasting', name: 'Fasting Glucose', unit: 'mg/dL', refLow: 70, refHigh: 99, category: 'Metabolic' },
  { key: 'hba1c', name: 'HbA1c', unit: '%', refLow: 4.0, refHigh: 5.6, category: 'Metabolic' },
  { key: 'insulin_fasting', name: 'Fasting Insulin', unit: 'μIU/mL', refLow: 2, refHigh: 19, category: 'Metabolic' },
  // Lipids
  { key: 'cholesterol_total', name: 'Total Cholesterol', unit: 'mg/dL', refHigh: 200, category: 'Lipids' },
  { key: 'ldl', name: 'LDL', unit: 'mg/dL', refHigh: 100, category: 'Lipids' },
  { key: 'hdl', name: 'HDL', unit: 'mg/dL', refLow: 50, category: 'Lipids' },
  { key: 'triglycerides', name: 'Triglycerides', unit: 'mg/dL', refHigh: 150, category: 'Lipids' },
  // CBC
  { key: 'hemoglobin', name: 'Hemoglobin', unit: 'g/dL', refLow: 12, refHigh: 16, category: 'CBC' },
  { key: 'hematocrit', name: 'Hematocrit', unit: '%', refLow: 36, refHigh: 46, category: 'CBC' },
  // Other
  { key: 'other', name: 'Other (custom)', unit: '', category: 'Other' },
]

export const LAB_CATEGORIES = [...new Set(KNOWN_LAB_TESTS.map(t => t.category))]

export function getLabTest(key: string): KnownLabTest | undefined {
  return KNOWN_LAB_TESTS.find(t => t.key === key)
}

export function labStatus(value: number, refLow?: number | null, refHigh?: number | null): 'low' | 'normal' | 'high' | 'unknown' {
  if (refLow == null && refHigh == null) return 'unknown'
  if (refLow != null && value < refLow) return 'low'
  if (refHigh != null && value > refHigh) return 'high'
  return 'normal'
}
