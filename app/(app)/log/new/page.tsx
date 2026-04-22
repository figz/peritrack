import { Suspense } from 'react'
import { CheckInForm } from '@/components/forms/CheckInForm'

export default function NewLogPage() {
  return (
    <Suspense fallback={<div className="animate-pulse text-gray-400 p-8">Loading…</div>}>
      <CheckInForm />
    </Suspense>
  )
}
