'use client'

/**
 * Wrapper applicatif du LocaleSwitcher présentationnel (@evolve/ui).
 *
 * Lit la locale active (next-intl), pose le cookie via la Server Action `setLocale`,
 * puis `router.refresh()` pour re-rendre l'arbre serveur avec le nouveau catalogue.
 * Le composant @evolve/ui reste i18n-agnostique : toute la logique vit ici.
 */
import { useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { LocaleSwitcher } from '@evolve/ui'
import { locales, isLocale } from '@/i18n/config'
import { setLocale } from '@/lib/i18n/locale'

const LABELS: Record<string, string> = { fr: 'FR', en: 'EN' }

export function LocaleSwitcherClient({ className }: { className?: string }) {
  const current = useLocale()
  const t = useTranslations('common')
  const router = useRouter()
  const [, startTransition] = useTransition()

  return (
    <LocaleSwitcher
      locales={locales.map((l) => ({ value: l, label: LABELS[l] ?? l.toUpperCase() }))}
      current={current}
      ariaLabel={t('changeLanguage')}
      className={className}
      onSelect={(value) => {
        if (value === current || !isLocale(value)) return
        startTransition(async () => {
          await setLocale(value)
          router.refresh()
        })
      }}
    />
  )
}
