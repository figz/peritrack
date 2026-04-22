import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const symptoms = [
  // Sleep
  { key: 'insomnia', label: 'Insomnia', category: 'Sleep', sortOrder: 1 },
  { key: 'night_sweats', label: 'Night sweats', category: 'Sleep', sortOrder: 2 },
  // Mood / Cognitive
  { key: 'anxiety', label: 'Anxiety', category: 'Mood / Cognitive', sortOrder: 10 },
  { key: 'irritability', label: 'Irritability', category: 'Mood / Cognitive', sortOrder: 11 },
  { key: 'crying_spells', label: 'Crying spells', category: 'Mood / Cognitive', sortOrder: 12 },
  { key: 'sadness', label: 'Sadness', category: 'Mood / Cognitive', sortOrder: 13 },
  { key: 'brain_fog', label: 'Brain fog', category: 'Mood / Cognitive', sortOrder: 14 },
  // Head / Sensory
  { key: 'headache', label: 'Headache', category: 'Head / Sensory', sortOrder: 20 },
  { key: 'ear_ringing', label: 'Ringing in ears (tinnitus)', category: 'Head / Sensory', sortOrder: 21 },
  { key: 'ear_pressure', label: 'Pressure in ears', category: 'Head / Sensory', sortOrder: 22 },
  { key: 'blurry_vision', label: 'Blurry vision', category: 'Head / Sensory', sortOrder: 23 },
  { key: 'dizziness', label: 'Dizziness', category: 'Head / Sensory', sortOrder: 24 },
  // Cardiovascular / Autonomic
  { key: 'hot_flashes', label: 'Hot flashes', category: 'Cardiovascular / Autonomic', sortOrder: 30 },
  { key: 'heart_palpitations', label: 'Heart palpitations', category: 'Cardiovascular / Autonomic', sortOrder: 31 },
  { key: 'shakiness', label: 'Shakiness', category: 'Cardiovascular / Autonomic', sortOrder: 32 },
  // Musculoskeletal
  { key: 'muscle_aches', label: 'Muscle aches', category: 'Musculoskeletal', sortOrder: 40 },
  { key: 'back_pain', label: 'Back ache', category: 'Musculoskeletal', sortOrder: 41 },
  { key: 'neck_shoulder_pain', label: 'Neck and shoulder pain', category: 'Musculoskeletal', sortOrder: 42 },
  { key: 'body_tightness', label: 'Body tightness', category: 'Musculoskeletal', sortOrder: 43 },
  // Skin / Hair
  { key: 'dry_skin', label: 'Dry skin', category: 'Skin / Hair', sortOrder: 50 },
  { key: 'acne', label: 'Acne', category: 'Skin / Hair', sortOrder: 51 },
  { key: 'itchy_skin', label: 'Itchy skin', category: 'Skin / Hair', sortOrder: 52 },
  { key: 'crawling_skin', label: 'Crawling skin sensation', category: 'Skin / Hair', sortOrder: 53 },
  { key: 'facial_hair', label: 'Facial hair (increase)', category: 'Skin / Hair', sortOrder: 54 },
  // Digestive / Metabolic
  { key: 'bloating', label: 'Bloating', category: 'Digestive / Metabolic', sortOrder: 60 },
  { key: 'weight_gain', label: 'Weight gain', category: 'Digestive / Metabolic', sortOrder: 61 },
  { key: 'fatigue', label: 'Fatigue', category: 'Digestive / Metabolic', sortOrder: 62 },
  // Reproductive / Urogenital
  { key: 'low_libido', label: 'Low libido', category: 'Reproductive / Urogenital', sortOrder: 70 },
  { key: 'vaginal_dryness', label: 'Dry vagina / vaginal dryness', category: 'Reproductive / Urogenital', sortOrder: 71 },
  { key: 'vaginal_discomfort', label: 'Vaginal discomfort', category: 'Reproductive / Urogenital', sortOrder: 72 },
  { key: 'urinary_frequency', label: 'Urinary frequency', category: 'Reproductive / Urogenital', sortOrder: 73 },
  { key: 'irregular_period', label: 'Irregular period', category: 'Reproductive / Urogenital', sortOrder: 74 },
]

const sideEffects = [
  // Skin / Application Site
  { key: 'skin_irritation', label: 'Skin irritation (patch/gel site)', category: 'Skin / Application Site', sortOrder: 1 },
  { key: 'rash', label: 'Rash', category: 'Skin / Application Site', sortOrder: 2 },
  { key: 'oily_skin', label: 'Oily skin', category: 'Skin / Application Site', sortOrder: 3 },
  // Mood / Cognitive
  { key: 'mood_swings', label: 'Mood swings', category: 'Mood / Cognitive', sortOrder: 10 },
  { key: 'depression', label: 'Depression', category: 'Mood / Cognitive', sortOrder: 11 },
  { key: 'anxiety_increased', label: 'Increased anxiety', category: 'Mood / Cognitive', sortOrder: 12 },
  // Physical
  { key: 'breast_tenderness', label: 'Breast tenderness', category: 'Physical', sortOrder: 20 },
  { key: 'nausea', label: 'Nausea', category: 'Physical', sortOrder: 21 },
  { key: 'bloating_se', label: 'Bloating (side effect)', category: 'Physical', sortOrder: 22 },
  { key: 'water_retention', label: 'Water retention / edema', category: 'Physical', sortOrder: 23 },
  { key: 'headache_se', label: 'Headache (side effect)', category: 'Physical', sortOrder: 24 },
  { key: 'spotting_bleeding', label: 'Spotting / breakthrough bleeding', category: 'Physical', sortOrder: 25 },
  { key: 'cramps', label: 'Cramps', category: 'Physical', sortOrder: 26 },
  { key: 'weight_change', label: 'Weight change', category: 'Physical', sortOrder: 27 },
  { key: 'hair_loss', label: 'Hair loss', category: 'Physical', sortOrder: 28 },
  { key: 'libido_change', label: 'Libido change (increase or decrease)', category: 'Physical', sortOrder: 29 },
  { key: 'sleep_disruption', label: 'Sleep disruption', category: 'Physical', sortOrder: 30 },
  // Cardiovascular
  { key: 'blood_pressure_change', label: 'Blood pressure change', category: 'Cardiovascular', sortOrder: 40 },
  { key: 'heart_palpitations_se', label: 'Heart palpitations (side effect)', category: 'Cardiovascular', sortOrder: 41 },
]

async function main() {
  console.log('Seeding symptom definitions...')
  for (const symptom of symptoms) {
    await prisma.symptomDefinition.upsert({
      where: { key: symptom.key },
      update: { label: symptom.label, category: symptom.category, sortOrder: symptom.sortOrder },
      create: symptom,
    })
  }

  console.log('Seeding side effect definitions...')
  for (const se of sideEffects) {
    await prisma.sideEffectDefinition.upsert({
      where: { key: se.key },
      update: { label: se.label, category: se.category, sortOrder: se.sortOrder },
      create: se,
    })
  }

  console.log('Seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
