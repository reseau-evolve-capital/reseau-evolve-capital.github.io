'use client'
import { Button } from '@evolve/ui'

export default function OnboardingError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 text-center flex flex-col items-center gap-4">
      <h2 className="font-display font-bold text-[18px] text-text">
        On n&apos;a pas pu charger ton inscription. Réessaie ?
      </h2>
      <p className="text-[14px] text-text-sec">
        Ta progression est conservée, tu peux reprendre là où tu en étais.
      </p>
      <Button onClick={() => reset()}>Réessayer</Button>
    </div>
  )
}
