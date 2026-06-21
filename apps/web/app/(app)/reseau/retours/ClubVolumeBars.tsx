'use client'

// Barres « Volume par club » de la console feedbacks RÉSEAU (NET-019). CSS pur (largeur relative
// au max) — tokens uniquement, jamais de rouge brand. a11y : liste de barres avec valeur textuelle
// visible (pas seulement la longueur de barre).

export interface ClubVolumeDatum {
  /** Libellé déjà résolu (nom du club, ou « Sans club » i18n). */
  label: string
  count: number
}

export function ClubVolumeBars({
  data,
  ariaLabel = 'Volume de retours par club',
}: {
  data: ClubVolumeDatum[]
  ariaLabel?: string
}) {
  const max = data.reduce((m, d) => Math.max(m, d.count), 0)
  if (max === 0) return null

  return (
    <ul className="flex flex-col gap-3" aria-label={ariaLabel}>
      {data.map((d) => {
        const pct = Math.round((d.count / max) * 100)
        return (
          <li key={d.label} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2 text-[13px]">
              <span className="min-w-0 truncate text-text-sec">{d.label}</span>
              <span className="font-semibold text-text [font-feature-settings:'tnum']">
                {d.count}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-card-sub">
              <div
                className="h-full rounded-full bg-brand-yellow"
                style={{ width: `${pct}%` }}
                aria-hidden="true"
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
