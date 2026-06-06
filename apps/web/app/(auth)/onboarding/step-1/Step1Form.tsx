'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { z } from 'zod'
import { FormField, Input, Button, Badge, Icon } from '@evolve/ui'
import { useOnboardingStore } from '@/lib/stores/onboarding'

// Téléphone facultatif (F8) : accepté vide ; si rempli, format souple international.
// Regex permissive : chiffres, espaces, +, parenthèses, point, tiret — 6 à 20 caractères.
// NB : le message d'erreur affiché est résolu via i18n (t('step1.phoneInvalid')) côté handleSubmit ;
// la chaîne ci-dessous n'est jamais montrée à l'utilisateur.
const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+0-9 ().-]{6,20}$/)
  .optional()
  .or(z.literal(''))

/** Étape du rail « PROGRESSION » (réf desktop, colonne gauche). */
const RAIL_STEPS = [
  { n: 1, key: 'profile', state: 'current' },
  { n: 2, key: 'consents', state: 'upcoming' },
  { n: 3, key: 'tour', state: 'upcoming' },
] as const

/** Initiales pour l'aperçu d'avatar — placeholder visuel (upload réel = V1, F8). */
function initials(firstname: string, lastname: string): string {
  const a = firstname.trim()[0] ?? ''
  const b = lastname.trim()[0] ?? ''
  return (a + b).toUpperCase()
}

export function Step1Form({ invited = false }: { invited?: boolean }) {
  const router = useRouter()
  const t = useTranslations('onboarding')
  const tCommon = useTranslations('common')
  const store = useOnboardingStore()

  const [firstname, setFirstname] = useState(store.firstname)
  const [lastname, setLastname] = useState(store.lastname)
  const [phone, setPhone] = useState(store.phone)
  const [phoneError, setPhoneError] = useState<string | undefined>()

  // Le téléphone est facultatif : le CTA reste actif tant que prénom/nom sont remplis.
  const isValid = firstname.trim().length > 0 && lastname.trim().length > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return

    const trimmedPhone = phone.trim()
    // Validation souple uniquement si un numéro a été saisi (vide = accepté).
    const result = phoneSchema.safeParse(trimmedPhone)
    if (!result.success) {
      setPhoneError(t('step1.phoneInvalid'))
      return
    }
    setPhoneError(undefined)

    store.patch({
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      phone: trimmedPhone,
    })
    router.push('/onboarding/step-2')
  }

  const previewInitials = initials(firstname, lastname)
  // « Bienvenue, {prénom} » — fallback neutre tant que le prénom n'est pas saisi
  // (jamais « undefined » à l'écran). Le prénom vient de la saisie temps réel.
  const welcomeName = firstname.trim() || t('step1.welcomeFallback')

  return (
    <div className="mx-auto grid w-full max-w-[1200px] flex-1 grid-cols-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)_280px] lg:gap-12 lg:py-12">
      {/* COLONNE GAUCHE — rail progression + carte « 3 minutes » (desktop only). */}
      <aside className="hidden flex-col justify-between gap-8 lg:flex">
        <nav aria-label={t('rail.aria')}>
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.16em] text-text-ter">
            {t('rail.title')}
          </p>
          <ol className="flex flex-col gap-1">
            {RAIL_STEPS.map((s) => {
              const current = s.state === 'current'
              return (
                <li
                  key={s.n}
                  className="flex items-center gap-3 border-b border-border py-3 last:border-b-0"
                  aria-current={current ? 'step' : undefined}
                >
                  <span
                    className={
                      current
                        ? 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-yellow font-mono text-[12px] font-semibold text-neutral-900'
                        : 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border font-mono text-[12px] text-text-ter'
                    }
                  >
                    {s.n}
                  </span>
                  <span className="flex flex-col">
                    <span
                      className={
                        current
                          ? 'text-[14px] font-semibold text-text'
                          : 'text-[14px] text-text-sec'
                      }
                    >
                      {t(`rail.${s.key}.label`)}
                    </span>
                    <span className="text-[12px] text-text-ter">
                      {current ? t('rail.statusCurrent') : t('rail.statusUpcoming')}
                    </span>
                  </span>
                </li>
              )
            })}
          </ol>
        </nav>

        <div className="rounded-lg border border-border bg-card p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-ter">
            {t('timeCard.eyebrow')}
          </p>
          <p className="mt-1 font-display text-[28px] font-bold leading-none text-text">
            {t('timeCard.value')}
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-text-sec">{t('timeCard.body')}</p>
        </div>
      </aside>

      {/* COLONNE CENTRE — accueil + avatar placeholder + champs + CTA. */}
      <div className="flex min-w-0 flex-col">
        <div className="mx-auto w-full max-w-[560px]">
          {invited && (
            <div className="mb-5 flex flex-col gap-1.5 rounded-[10px] border border-border bg-brand-yellow-light p-3">
              <Badge variant="brand">{t('invitedWelcome.badge')}</Badge>
              <p className="text-[13px] text-text-sec">{t('invitedWelcome.text')}</p>
            </div>
          )}

          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-text-ter">
            {t('step1.eyebrow')}
          </p>
          <h1 className="mt-2 font-display text-[32px] font-bold leading-tight text-text sm:text-[36px]">
            {t('step1.welcome', { name: welcomeName })} <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-text-sec">{t('step1.subtitle')}</p>

          {/* Zone avatar — placeholder visuel (upload réel = étape 2 / V1, F8). */}
          <div className="mt-6 flex items-center gap-4 rounded-lg border border-dashed border-border bg-card-sub p-4">
            <span
              role="img"
              aria-label={t('step1.avatarPreviewAria')}
              className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-neutral-900 font-display text-[20px] font-black tracking-wide text-brand-yellow"
            >
              {previewInitials || (
                <Icon name="User" size={24} aria-hidden="true" className="text-brand-yellow" />
              )}
              <span
                aria-hidden="true"
                className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-brand-yellow text-neutral-900"
              >
                <Icon name="Plus" size={16} aria-hidden="true" />
              </span>
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-[14px] font-semibold text-text">{t('step1.avatarTitle')}</p>
              <p className="text-[12px] text-text-ter">{t('step1.avatarHint')}</p>
            </div>
          </div>

          <form id="step1" onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label={t('step1.firstname')} required>
                {({ id, ...ariaProps }) => (
                  <Input
                    id={id}
                    {...ariaProps}
                    value={firstname}
                    onChange={(e) => setFirstname(e.target.value)}
                    autoComplete="given-name"
                    placeholder={t('step1.firstnamePlaceholder')}
                  />
                )}
              </FormField>

              <FormField label={t('step1.lastname')} required>
                {({ id, ...ariaProps }) => (
                  <Input
                    id={id}
                    {...ariaProps}
                    value={lastname}
                    onChange={(e) => setLastname(e.target.value)}
                    autoComplete="family-name"
                    placeholder={t('step1.lastnamePlaceholder')}
                  />
                )}
              </FormField>
            </div>

            <FormField label={t('step1.phone')} helpText={t('step1.phoneHint')} error={phoneError}>
              {({ id, ...ariaProps }) => (
                <Input
                  id={id}
                  {...ariaProps}
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value)
                    if (phoneError) setPhoneError(undefined)
                  }}
                  autoComplete="tel"
                  placeholder={t('phonePlaceholder')}
                />
              )}
            </FormField>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={!isValid}
              className="mt-2 w-full sm:w-auto sm:self-start"
            >
              {tCommon('continue')}
            </Button>
          </form>
        </div>
      </div>

      {/* COLONNE DROITE — témoignage (desktop only). */}
      <aside className="hidden flex-col justify-between lg:flex">
        <blockquote className="font-display text-[20px] font-bold leading-snug text-text">
          {t('testimonial.lead')}{' '}
          <span className="box-decoration-clone bg-brand-yellow px-1 text-neutral-900">
            {t('testimonial.highlight')}
          </span>{' '}
          {t('testimonial.tail')}
        </blockquote>
        <figcaption className="mt-6 flex flex-col">
          <span className="text-[14px] font-semibold text-text">{t('testimonial.author')}</span>
          <span className="text-[13px] text-text-ter">{t('testimonial.role')}</span>
        </figcaption>
      </aside>
    </div>
  )
}
