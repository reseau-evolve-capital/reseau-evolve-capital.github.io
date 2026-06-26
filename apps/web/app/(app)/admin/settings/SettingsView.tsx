'use client'

// Vue « Paramètres du club » (admin/président). Lecture + formulaire d'édition des champs
// de la feuille PARAMETRAGES : nom, ville, pays, identifiant chez le courtier, plafond annuel.
//
// Double-warning « opération sensible » : modifier l'identifiant du club chez le courtier
// (broker_account_ref) — et le plafond annuel d'investissement — exige une 2ᵉ confirmation
// explicite (SensitiveConfirmModal + case d'acquittement) AVANT l'appel à la Server Action.
// Les champs non sensibles (nom, ville, pays) s'enregistrent directement.
//
// Mutation via Server Action updateClubSettingsAction → RPC SECURITY DEFINER staff-scopée.
// Feedback via toast (ToastProvider monté au layout) + invalidation TanStack ['admin'].
// Réf : E-ADM, migration 025, CLAUDE.md (a11y AA, tokens only, formatage @evolve/utils, i18n).

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { formatCurrency } from '@evolve/utils'
import {
  Heading,
  Text,
  Button,
  FormField,
  Input,
  SensitiveConfirmModal,
  useToast,
  type SensitiveChange,
} from '@evolve/ui'
import {
  brokerRefChanged,
  parseAmount,
  validateInput,
  type ClubSettings,
  type ClubSettingsInput,
  type ValidationErrorCode,
} from '@/lib/data/clubSettings'
import { updateClubSettingsAction } from '../actions'

/** ClubSettings (lecture) → état initial du formulaire (chaînes). */
function toFormState(s: ClubSettings): ClubSettingsInput {
  return {
    name: s.name,
    city: s.city ?? '',
    country: s.country ?? '',
    brokerAccountRef: s.brokerAccountRef ?? '',
    annualInvestmentCap: s.annualInvestmentCap === null ? '' : String(s.annualInvestmentCap),
    minContribution: String(s.minContribution),
  }
}

/** Le plafond annuel est-il considéré comme un changement sensible ? */
function capChanged(current: number | null, next: string): boolean {
  const parsed = parseAmount(next)
  const nextVal = parsed !== null && !Number.isNaN(parsed) ? parsed : null
  return (current ?? null) !== nextVal
}

export function SettingsView({
  initialSettings,
  currency = 'EUR',
  canManage = true,
}: {
  initialSettings: ClubSettings
  /** Code ISO 4217 de la devise du club actif (ex. 'EUR', 'XOF'). Défaut 'EUR'. */
  currency?: string
  /** false = secrétaire (LECTURE SEULE) → champs désactivés + bouton Enregistrer masqué. */
  canManage?: boolean
}) {
  const t = useTranslations('admin.settings')
  const tc = useTranslations('common')
  const toast = useToast()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()

  const [form, setForm] = useState<ClubSettingsInput>(() => toFormState(initialSettings))
  const [errors, setErrors] = useState<ValidationErrorCode[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)

  // LECTURE SEULE (secrétaire) : champs désactivés et bouton Enregistrer masqué. Les champs sont
  // désactivés dès qu'on enregistre (isPending) OU si l'utilisateur n'a pas le droit de gérer.
  const fieldsDisabled = isPending || !canManage

  const set = (key: keyof ClubSettingsInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }))
  }

  function fieldError(code: ValidationErrorCode): string | undefined {
    return errors.includes(code) ? t(`errors.${code}`) : undefined
  }

  // Un champ SENSIBLE a-t-il changé ? → impose la double-confirmation.
  const sensitiveChanged = useMemo(
    () =>
      brokerRefChanged(initialSettings.brokerAccountRef, form.brokerAccountRef) ||
      capChanged(initialSettings.annualInvestmentCap, form.annualInvestmentCap),
    [
      initialSettings.brokerAccountRef,
      initialSettings.annualInvestmentCap,
      form.brokerAccountRef,
      form.annualInvestmentCap,
    ]
  )

  /** Résumé des changements sensibles affiché dans la modale de double-confirmation. */
  const sensitiveChanges = useMemo<SensitiveChange[]>(() => {
    const dash = '—'
    const list: SensitiveChange[] = []
    if (brokerRefChanged(initialSettings.brokerAccountRef, form.brokerAccountRef)) {
      list.push({
        label: t('fields.brokerAccountRef'),
        before: initialSettings.brokerAccountRef ?? dash,
        after: form.brokerAccountRef.trim() || dash,
      })
    }
    if (capChanged(initialSettings.annualInvestmentCap, form.annualInvestmentCap)) {
      const parsed = parseAmount(form.annualInvestmentCap)
      list.push({
        label: t('fields.annualInvestmentCap'),
        before:
          initialSettings.annualInvestmentCap === null
            ? dash
            : formatCurrency(initialSettings.annualInvestmentCap, currency),
        after: parsed !== null && !Number.isNaN(parsed) ? formatCurrency(parsed, currency) : dash,
      })
    }
    return list
  }, [
    initialSettings.brokerAccountRef,
    initialSettings.annualInvestmentCap,
    form.brokerAccountRef,
    form.annualInvestmentCap,
    t,
    currency,
  ])

  /** Exécute la mutation (après validation + éventuelle double-confirmation). */
  function persist() {
    startTransition(async () => {
      const res = await updateClubSettingsAction(form)
      if (res.ok) {
        toast.success({ title: t('toast.successTitle'), message: t('toast.successMessage') })
        setConfirmOpen(false)
        // Invalide tout le préfixe ['admin', …] + rafraîchit le RSC (relit les paramètres).
        await queryClient.invalidateQueries({ queryKey: ['admin'] })
        router.refresh()
      } else if (res.error === 'forbidden' || res.error === 'unauthorized') {
        toast.error({ title: t('toast.forbiddenTitle'), message: t('toast.forbiddenMessage') })
        setConfirmOpen(false)
      } else {
        toast.error({ title: t('toast.errorTitle'), message: t('toast.errorMessage') })
        setConfirmOpen(false)
      }
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationErrors = validateInput(form)
    setErrors(validationErrors)
    if (validationErrors.length > 0) return
    // Champ sensible modifié → double-confirmation avant la mutation.
    if (sensitiveChanged) {
      setConfirmOpen(true)
      return
    }
    persist()
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Heading level="h1" className="text-[20px]">
          {t('title')}
        </Heading>
        <Text className="text-[14px] text-text-sec">{t('subtitle')}</Text>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
        {/* Paramètres généraux (non sensibles). */}
        <section className="flex flex-col gap-4 rounded-[10px] border border-border bg-card p-5">
          <Heading level="h2" className="text-[16px]">
            {t('sections.general')}
          </Heading>

          <FormField label={t('fields.name')} required {...errorProp(fieldError('name_required'))}>
            {(p) => (
              <Input {...p} value={form.name} onChange={set('name')} disabled={fieldsDisabled} />
            )}
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t('fields.city')} helpText={t('hints.city')}>
              {(p) => (
                <Input {...p} value={form.city} onChange={set('city')} disabled={fieldsDisabled} />
              )}
            </FormField>

            <FormField
              label={t('fields.country')}
              helpText={t('hints.country')}
              {...errorProp(fieldError('country_invalid'))}
            >
              {(p) => (
                <Input
                  {...p}
                  value={form.country}
                  onChange={set('country')}
                  maxLength={2}
                  placeholder="FR"
                  autoCapitalize="characters"
                  disabled={fieldsDisabled}
                />
              )}
            </FormField>
          </div>

          {/* Cotisation minimale du club (EUR) — éditable par le staff, défaut 100. Non sensible. */}
          <FormField
            label={t('fields.minContribution')}
            helpText={t('hints.minContribution')}
            required
            {...errorProp(fieldError('min_contribution_invalid'))}
          >
            {(p) => (
              <Input
                {...p}
                inputMode="decimal"
                value={form.minContribution}
                onChange={set('minContribution')}
                placeholder="100"
                disabled={fieldsDisabled}
              />
            )}
          </FormField>
        </section>

        {/* Paramètres sensibles (double-confirmation). */}
        <section className="flex flex-col gap-4 rounded-[10px] border border-data-warning-50 bg-card p-5">
          <div className="flex flex-col gap-1">
            <Heading level="h2" className="text-[16px]">
              {t('sections.sensitive')}
            </Heading>
            <Text className="text-[13px] text-text-ter">{t('sections.sensitiveHint')}</Text>
          </div>

          <FormField label={t('fields.brokerAccountRef')} helpText={t('hints.brokerAccountRef')}>
            {(p) => (
              <Input
                {...p}
                value={form.brokerAccountRef}
                onChange={set('brokerAccountRef')}
                disabled={fieldsDisabled}
              />
            )}
          </FormField>

          <FormField
            label={t('fields.annualInvestmentCap')}
            helpText={t('hints.annualInvestmentCap')}
            {...errorProp(fieldError('cap_invalid'))}
          >
            {(p) => (
              <Input
                {...p}
                inputMode="decimal"
                value={form.annualInvestmentCap}
                onChange={set('annualInvestmentCap')}
                placeholder="0"
                disabled={fieldsDisabled}
              />
            )}
          </FormField>

          {/* Nom du courtier : lecture seule (issu de settings.broker_name de la matrice). */}
          {initialSettings.brokerName && (
            <Text className="text-[13px] text-text-ter">
              {t('readonly.brokerName', { value: initialSettings.brokerName })}
            </Text>
          )}
        </section>

        {/* Enregistrer = ÉCRITURE → masqué pour le secrétaire (lecture seule). */}
        {canManage && (
          <div className="flex items-center justify-end gap-2">
            <Button type="submit" isLoading={isPending} disabled={fieldsDisabled}>
              {tc('save')}
            </Button>
          </div>
        )}
      </form>

      <SensitiveConfirmModal
        open={confirmOpen}
        onOpenChange={(o) => {
          if (!o) setConfirmOpen(false)
        }}
        title={t('confirm.title')}
        description={t('confirm.description')}
        acknowledgeLabel={t('confirm.acknowledge')}
        changes={sensitiveChanges}
        beforeLabel={t('confirm.before')}
        afterLabel={t('confirm.after')}
        cancelLabel={tc('cancel')}
        confirmLabel={t('confirm.submit')}
        closeLabel={tc('close')}
        isPending={isPending}
        onConfirm={persist}
      />
    </div>
  )
}

/** Helper : n'ajoute la prop `error` au FormField que si une erreur est présente
 *  (exactOptionalPropertyTypes : on ne passe pas `error={undefined}`). */
function errorProp(error: string | undefined): { error?: string } {
  return error ? { error } : {}
}
