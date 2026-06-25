'use client'

import * as React from 'react'
import { formatEURWhole, toNumOrNull } from '@evolve/utils'

import { Button } from '../../atoms/Button'
import { Icon } from '../../atoms/Icon'
import { OpChip } from '../../atoms/OpChip'
import { CashDeltaBadge } from '../../atoms/CashDeltaBadge'
import { getOperationType, type OperationTypeKey } from '../../atoms/OperationType/operationTypes'
import { StepHeader } from '../../molecules/StepHeader'
import { OperationField } from '../../molecules/OperationField'
import { CashImpactPanel } from '../../molecules/CashImpactPanel'
import { OperationTypeSelector } from '../../molecules/OperationTypeSelector'
import { cn } from '../../lib/cn'

export interface OperationFormMember {
  id: string
  label: string
}

/** Payload métier émis au submit (l'app le passe à la Server Action). */
export interface OperationFormPayload {
  type: OperationTypeKey
  /** Delta cash signé (€) déjà calculé selon le type. */
  cashDelta: number
  membershipId: string | null
  symbol: string | null
  assetName: string | null
  quantity: number | null
  unitPrice: number | null
  currency: string | null
  fxRate: number | null
  operationDate: string | null
  brokerRef: string | null
  notes: string | null
}

/** Libellés (i18n côté appelant ; défauts FR). */
export interface OperationFormLabels {
  back?: string
  title?: string
  // Étape 1
  step1Caption?: string
  step1Title?: string
  step1Intro?: string
  // Étape 2
  step2Caption?: string
  changeType?: string
  member?: string
  amount?: string
  date?: string
  transferRef?: string
  notes?: string
  symbol?: string
  assetName?: string
  quantity?: string
  unitPrice?: string
  currency?: string
  brokerRef?: string
  optional?: string
  memberPlaceholder?: string
  submit?: string
  cashCaption?: string
  // Étape 3
  successTitle?: string
  newBalanceCaption?: string
  viewOperations?: string
  newOperation?: string
}

const DEFAULT_LABELS: Required<OperationFormLabels> = {
  back: 'Opérations',
  title: 'Nouvelle opération',
  step1Caption: "Étape 1 · Type d'opération",
  step1Title: 'Quelle opération veux-tu enregistrer ?',
  step1Intro:
    'Choisis le type pour adapter les champs. Tu verras l’impact sur le solde espèces avant de valider.',
  step2Caption: "Étape 2 · Détails de l'opération",
  changeType: 'Changer de type',
  member: 'Membre',
  amount: 'Montant',
  date: 'Date',
  transferRef: 'Référence virement',
  notes: 'Notes',
  symbol: 'Titre',
  assetName: 'Nom du titre',
  quantity: 'Quantité',
  unitPrice: 'Prix unitaire',
  currency: 'Devise',
  brokerRef: 'Référence courtier',
  optional: 'Optionnel',
  memberPlaceholder: 'Sélectionner un membre',
  submit: "Enregistrer l'opération",
  cashCaption: 'Impact sur le solde espèces',
  successTitle: 'Opération enregistrée',
  newBalanceCaption: 'Nouveau solde espèces',
  viewOperations: 'Voir les opérations',
  newOperation: 'Nouvelle opération',
}

/** Champs visibles par type (spec §4). */
type FieldKey =
  | 'member'
  | 'amount'
  | 'date'
  | 'transferRef'
  | 'notes'
  | 'symbol'
  | 'assetName'
  | 'quantity'
  | 'unitPrice'
  | 'currency'
  | 'brokerRef'

const FIELDS_BY_TYPE: Record<OperationTypeKey, FieldKey[]> = {
  contribution: ['member', 'amount', 'date', 'transferRef', 'notes'],
  buy: ['symbol', 'assetName', 'quantity', 'unitPrice', 'date', 'currency', 'brokerRef'],
  sell: ['symbol', 'assetName', 'quantity', 'unitPrice', 'date', 'currency', 'brokerRef'],
  dividend_cash: ['symbol', 'amount', 'date'],
  fee: ['amount', 'date', 'notes'],
  penalty: ['member', 'amount', 'date'],
  // Types complémentaires : champs génériques sûrs.
  dividend_stock: ['symbol', 'quantity', 'date'],
  member_exit: ['member', 'amount', 'date'],
  capital_call: ['member', 'amount', 'date'],
  distribution: ['member', 'amount', 'date'],
  valuation: ['amount', 'date'],
  correction: ['amount', 'date', 'notes'],
}

interface FormState {
  membershipId: string
  amount: string
  date: string
  transferRef: string
  notes: string
  symbol: string
  assetName: string
  quantity: string
  unitPrice: string
  currency: string
  brokerRef: string
}

const EMPTY_STATE: FormState = {
  membershipId: '',
  amount: '',
  date: '',
  transferRef: '',
  notes: '',
  symbol: '',
  assetName: '',
  quantity: '',
  unitPrice: '',
  currency: '',
  brokerRef: '',
}

/** Calcule le delta cash signé selon le type. Renvoie null si entrées insuffisantes. */
function computeCashDelta(type: OperationTypeKey, s: FormState): number | null {
  const meta = getOperationType(type)
  // L'assistant ne capture pas de taux de change → fxRate = 1 (devise informative).
  if (type === 'buy' || type === 'sell') {
    const qty = toNumOrNull(s.quantity)
    const price = toNumOrNull(s.unitPrice)
    if (qty === null || price === null) return null
    const gross = qty * price
    return meta.cashSign * Math.abs(gross)
  }
  const amount = toNumOrNull(s.amount)
  if (amount === null) return null
  if (meta.cashSign === 0) return 0
  return meta.cashSign * Math.abs(amount)
}

export interface OperationFormProps {
  members?: OperationFormMember[]
  /** Cotisation minimale du club (€). Sous ce seuil → hint NON bloquant. Défaut 100. */
  minContribution?: number
  /** Type pré-sélectionné → démarre à l'étape 2. */
  initialType?: OperationTypeKey
  /** Solde espèces avant opération (€) pour la transition de l'étape 3. */
  balanceBefore?: number | null
  onSubmit?: (payload: OperationFormPayload) => void
  onBack?: () => void
  onCancel?: () => void
  /** Étape 3 : « Voir les opérations ». */
  onViewOperations?: () => void
  /** Étape 3 : « Nouvelle opération » (réinitialise l'assistant). */
  onNewOperation?: () => void
  labels?: OperationFormLabels
  className?: string
}

/**
 * OperationForm (OPS-204) — assistant « Nouvelle opération » en 3 étapes, contrôlé en interne.
 *
 * Étape 1 sélecteur de type → Étape 2 formulaire adaptatif (impact cash en direct,
 * avertissement cotisation < min NON bloquant) → Étape 3 confirmation (récap + transition
 * de solde). N'effectue AUCUN appel réseau : émet `OperationFormPayload` via `onSubmit`.
 * Token-driven (aucun hex), i18n par props, a11y AA. Spec : E-OPS-2 §4.
 */
export function OperationForm({
  members = [],
  minContribution = 100,
  initialType,
  balanceBefore = null,
  onSubmit,
  onBack,
  onCancel,
  onViewOperations,
  onNewOperation,
  labels,
  className,
}: OperationFormProps) {
  const t = { ...DEFAULT_LABELS, ...labels }
  const [step, setStep] = React.useState<1 | 2 | 3>(initialType ? 2 : 1)
  const [type, setType] = React.useState<OperationTypeKey | null>(initialType ?? null)
  const [state, setState] = React.useState<FormState>(EMPTY_STATE)
  const [errors, setErrors] = React.useState<Partial<Record<FieldKey, string>>>({})
  const [submitted, setSubmitted] = React.useState<OperationFormPayload | null>(null)

  const set = (k: keyof FormState) => (v: string) => {
    setState((s) => ({ ...s, [k]: v }))
  }

  const fields = type ? FIELDS_BY_TYPE[type] : []
  const cashDelta = type ? computeCashDelta(type, state) : null

  // Avertissement cotisation sous le minimum (DÉCISION OWNER : warn, jamais reject).
  const amountNum = toNumOrNull(state.amount)
  const contributionWarn =
    type === 'contribution' && amountNum !== null && amountNum < minContribution
      ? `Sous la cotisation minimale du club (${formatEURWhole(minContribution)}).`
      : undefined

  function selectType(next: OperationTypeKey) {
    setType(next)
    setErrors({})
    setStep(2)
  }

  function validate(): boolean {
    if (!type) return false
    const required: Partial<Record<FieldKey, boolean>> = {}
    if (type === 'contribution') {
      required.member = true
      required.amount = true
      required.date = true
    } else if (type === 'buy' || type === 'sell') {
      required.symbol = true
      required.quantity = true
      required.unitPrice = true
      required.date = true
    } else if (type === 'dividend_cash') {
      required.symbol = true
      required.amount = true
      required.date = true
    } else if (type === 'fee') {
      required.amount = true
      required.date = true
    } else if (type === 'penalty') {
      required.member = true
      required.amount = true
      required.date = true
    } else {
      required.amount = true
      required.date = true
    }

    const next: Partial<Record<FieldKey, string>> = {}
    const valueOf = (k: FieldKey): string => {
      if (k === 'member') return state.membershipId
      const v = (state as unknown as Record<string, string>)[k]
      return typeof v === 'string' ? v : ''
    }
    for (const k of Object.keys(required) as FieldKey[]) {
      if (!valueOf(k).trim()) next[k] = 'Champ obligatoire.'
    }
    // Montants numériques.
    if (
      (type === 'buy' || type === 'sell') &&
      state.quantity &&
      toNumOrNull(state.quantity) === null
    )
      next.quantity = 'Valeur invalide.'
    if (
      (type === 'buy' || type === 'sell') &&
      state.unitPrice &&
      toNumOrNull(state.unitPrice) === null
    )
      next.unitPrice = 'Valeur invalide.'
    if (required.amount && state.amount && toNumOrNull(state.amount) === null)
      next.amount = 'Montant invalide.'

    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!type) return
    if (!validate()) return
    const delta = computeCashDelta(type, state) ?? 0
    const payload: OperationFormPayload = {
      type,
      cashDelta: delta,
      membershipId: state.membershipId || null,
      symbol: state.symbol.trim() || null,
      assetName: state.assetName.trim() || null,
      quantity: toNumOrNull(state.quantity),
      unitPrice: toNumOrNull(state.unitPrice),
      currency: state.currency.trim() || null,
      fxRate: null,
      operationDate: state.date || null,
      brokerRef: state.brokerRef.trim() || null,
      notes: state.notes.trim() || null,
    }
    setSubmitted(payload)
    onSubmit?.(payload)
    setStep(3)
  }

  function resetForNew() {
    setState(EMPTY_STATE)
    setErrors({})
    setType(null)
    setSubmitted(null)
    setStep(1)
    onNewOperation?.()
  }

  const meta = type ? getOperationType(type) : null

  return (
    <div className={cn('flex flex-col', className)}>
      <StepHeader
        step={step}
        total={3}
        title={t.title}
        backLabel={t.back}
        onBack={step === 1 ? onBack : () => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2) : 1))}
      />

      {step === 1 && (
        <div className="mx-auto w-full max-w-[720px] px-8 pb-16 pt-11">
          <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-text-ter">
            {t.step1Caption}
          </p>
          <h1 className="font-display text-[30px] font-extrabold leading-[1.05] tracking-[-0.03em] text-text">
            {t.step1Title}
          </h1>
          <p className="mb-7 mt-2.5 max-w-[52ch] text-[15px] leading-[1.55] text-text-sec">
            {t.step1Intro}
          </p>
          <OperationTypeSelector onSelect={selectType} />
        </div>
      )}

      {step === 2 && type && meta && (
        <form
          onSubmit={handleSubmit}
          className="mx-auto w-full max-w-[720px] px-8 pb-16 pt-10"
          noValidate
        >
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.05em] text-text-ter">
            {t.step2Caption}
          </p>
          <div className="mb-[26px] flex items-center gap-3.5">
            <OpChip type={type} size={48} />
            <div className="min-w-0">
              <h1 className="font-display text-[26px] font-extrabold tracking-[-0.025em] text-text">
                {meta.label}
              </h1>
              <p className="text-[13.5px] text-text-sec">{meta.description}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setType(null)
                setErrors({})
                setStep(1)
              }}
              className="ml-auto rounded-sm text-[13px] font-semibold text-text-sec transition-colors duration-[150ms] hover:text-text focus:outline-none focus-visible:shadow-[var(--sh-glow)]"
            >
              {t.changeType}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-[18px] rounded-lg border border-border bg-card p-[26px] shadow-[var(--sh-card)] md:grid-cols-2">
            {fields.includes('member') && (
              <OperationField
                variant="select"
                label={t.member}
                required
                className="md:col-span-2"
                value={state.membershipId}
                onChange={(e) => set('membershipId')(e.target.value)}
                error={errors.member}
              >
                <option value="">{t.memberPlaceholder}</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </OperationField>
            )}

            {fields.includes('symbol') && (
              <OperationField
                label={t.symbol}
                required
                className={type === 'buy' || type === 'sell' ? 'md:col-span-2' : undefined}
                value={state.symbol}
                onChange={(e) => set('symbol')(e.target.value)}
                placeholder="ex. NASDAQ:NVDA"
                hint={
                  type === 'buy' || type === 'sell'
                    ? 'Auto-complété depuis les positions et les marchés.'
                    : undefined
                }
                error={errors.symbol}
              />
            )}

            {fields.includes('assetName') && (
              <OperationField
                label={t.assetName}
                value={state.assetName}
                onChange={(e) => set('assetName')(e.target.value)}
                placeholder="ex. NVIDIA Corp."
              />
            )}

            {fields.includes('quantity') && (
              <OperationField
                label={t.quantity}
                required
                value={state.quantity}
                onChange={(e) => set('quantity')(e.target.value)}
                placeholder="0"
                error={errors.quantity}
              />
            )}

            {fields.includes('unitPrice') && (
              <OperationField
                variant="amount"
                label={t.unitPrice}
                required
                value={state.unitPrice}
                onChange={(e) => set('unitPrice')(e.target.value)}
                placeholder="0,00"
                error={errors.unitPrice}
              />
            )}

            {fields.includes('amount') && (
              <OperationField
                variant="amount"
                label={t.amount}
                required
                value={state.amount}
                onChange={(e) => set('amount')(e.target.value)}
                placeholder="0"
                hint={contributionWarn}
                error={errors.amount}
              />
            )}

            {fields.includes('date') && (
              <OperationField
                label={t.date}
                required
                type="date"
                value={state.date}
                onChange={(e) => set('date')(e.target.value)}
                error={errors.date}
              />
            )}

            {fields.includes('currency') && (
              <OperationField
                label={t.currency}
                value={state.currency}
                onChange={(e) => set('currency')(e.target.value)}
                placeholder="EUR"
              />
            )}

            {fields.includes('transferRef') && (
              <OperationField
                label={t.transferRef}
                value={state.transferRef}
                onChange={(e) => set('transferRef')(e.target.value)}
                placeholder="ex. VIR-2026-0618"
              />
            )}

            {fields.includes('brokerRef') && (
              <OperationField
                label={t.brokerRef}
                value={state.brokerRef}
                onChange={(e) => set('brokerRef')(e.target.value)}
                placeholder="ex. BD-NVDA-0622"
              />
            )}

            {fields.includes('notes') && (
              <OperationField
                variant="textarea"
                label={t.notes}
                value={state.notes}
                onChange={(e) => set('notes')(e.target.value)}
                placeholder={t.optional}
              />
            )}

            <CashImpactPanel
              value={cashDelta}
              caption={t.cashCaption}
              note={cashImpactNote(type, state)}
              className="md:col-span-2"
            />
          </div>

          <Button type="submit" variant="primary" size="lg" className="mt-6 w-full rounded-pill">
            {t.submit}
          </Button>
        </form>
      )}

      {step === 3 && submitted && meta && type && (
        <div className="mx-auto w-full max-w-[640px] px-8 pb-16 pt-[52px]">
          <div className="text-center">
            <span
              aria-hidden="true"
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-data-positive-50 text-data-positive"
            >
              <Icon name="Check" size={24} strokeWidth={2.4} />
            </span>
            <h1 className="mt-4 font-display text-[28px] font-extrabold tracking-[-0.025em] text-text">
              {t.successTitle}
            </h1>
          </div>

          <div className="mt-8 overflow-hidden rounded-md border border-border bg-card shadow-[var(--sh-card)]">
            <div className="flex items-center gap-3 border-b border-border px-[22px] py-[18px]">
              <OpChip type={type} size={40} />
              <div className="min-w-0 flex-1">
                <p className="font-display text-[15px] font-bold text-text">{meta.label}</p>
                {submitted.operationDate && (
                  <p className="font-mono text-[11px] text-text-ter">{submitted.operationDate}</p>
                )}
              </div>
              <CashDeltaBadge value={submitted.cashDelta} size="lg" />
            </div>

            <div className="bg-card-sub px-[22px] py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-text-ter">
                {t.newBalanceCaption}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {typeof balanceBefore === 'number' && Number.isFinite(balanceBefore) ? (
                  <>
                    <span className="font-display text-[22px] font-bold text-text-ter line-through">
                      {formatEURWhole(balanceBefore)}
                    </span>
                    <Icon
                      name="ArrowRight"
                      size={16}
                      aria-hidden="true"
                      className="text-text-ter"
                    />
                    <span className="font-display text-[30px] font-extrabold text-text [font-feature-settings:'tnum','lnum']">
                      {formatEURWhole(balanceBefore + submitted.cashDelta)}
                    </span>
                  </>
                ) : (
                  <span className="font-display text-[30px] font-extrabold text-text-ter">—</span>
                )}
                <span className="ml-auto">
                  <CashDeltaBadge value={submitted.cashDelta} />
                </span>
              </div>
            </div>
          </div>

          <div className="mt-[26px] flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="flex-1 rounded-pill"
              onClick={onViewOperations}
            >
              {t.viewOperations}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="flex-1 rounded-pill"
              iconLeft={<Icon name="Plus" size={16} aria-hidden="true" />}
              onClick={resetForNew}
            >
              {t.newOperation}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Note explicative de l'impact cash, contextualisée par type (spec §4). */
function cashImpactNote(type: OperationTypeKey, s: FormState): string {
  const qty = toNumOrNull(s.quantity)
  const price = toNumOrNull(s.unitPrice)
  switch (type) {
    case 'contribution':
      return 'Cotisation encaissée → entre au solde espèces.'
    case 'penalty':
      return 'Pénalité débitée → sort du solde espèces.'
    case 'fee':
      return 'Frais débités → sortent du solde espèces.'
    case 'dividend_cash':
      return 'Dividende encaissé → entre au solde espèces.'
    case 'buy':
      return qty !== null && price !== null
        ? `${qty} titres × ${formatEURWhole(price)} — sort du solde espèces.`
        : 'Quantité × prix unitaire — sort du solde espèces.'
    case 'sell':
      return qty !== null && price !== null
        ? `${qty} titres × ${formatEURWhole(price)} — entre au solde espèces.`
        : 'Quantité × prix unitaire — entre au solde espèces.'
    default:
      return 'Impact estimé sur le solde espèces du club.'
  }
}
