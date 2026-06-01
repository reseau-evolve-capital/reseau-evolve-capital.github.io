'use client'
import { Button } from '@evolve/ui'

export default function AdminCotisationsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 text-center flex flex-col items-center gap-4">
      <h2 className="font-display font-bold text-[18px] text-text">
        On n&apos;a pas pu charger les cotisations du club. Réessaie ?
      </h2>
      <Button onClick={() => reset()}>Réessayer</Button>
    </div>
  )
}
