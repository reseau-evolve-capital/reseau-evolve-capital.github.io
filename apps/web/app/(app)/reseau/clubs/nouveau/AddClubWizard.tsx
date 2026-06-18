'use client'

// Assistant « Ajouter un club » (NET-006) — wizard 3 étapes, côté client.
//
//   Étape 1 Infos    → createClubAction (RPC network_create_club) → clubId.
//   Étape 2 Matrice  → probeSheet (dry-run Edge sheet-probe, JWT de session forwardé) ; au SUCCÈS,
//                      setClubSheetAction (RPC network_set_club_sheet). « Continuer » est DÉSACTIVÉ
//                      tant que le test n'est pas en succès (critère d'acceptation clé).
//   Étape 3 Import   → triggerInitialSync (Edge sync, gardé network_admin côté action) + SyncBanner
//                      « X membres importés » ; puis désigner le 1er responsable
//                      (Select membre importé + Président/Trésorier → provisionFirstStaffAction).
//
// La voie INVITATION PAR EMAIL est DIFFÉRÉE (NET-003 ne l'a pas implémentée) : affichée « Bientôt »,
// désactivée, sans casser le flux. État local des 3 étapes ici ; chaque mutation passe par une
// Server Action (RLS de session + garde RPC/Edge). Tokens design-system uniquement, i18n next-intl,
// a11y AA (cibles ≥44px, focus, clavier). Réf : E-NET §Écran 2, SheetConnectionTest, Stepper, SyncBanner.

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { slugify } from '@evolve/utils'
import {
  Stepper,
  SheetConnectionTest,
  SyncBanner,
  Button,
  Icon,
  Heading,
  Text,
  Input,
  FormField,
  SegmentedToggle,
  Badge,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectPortal,
  SelectContent,
  SelectItem,
  type SheetConnectionStatus,
  type SheetProbePreview,
} from '@evolve/ui'
import { extractSheetIdFromInput } from '@/lib/data/sheetId'
import {
  createClubAction,
  setClubSheetAction,
  probeSheet,
  triggerInitialSync,
  listClubMembers,
  provisionFirstStaffAction,
  type ProbeResult,
  type ClubMemberOption,
} from '../../actions'

type StaffRole = 'president' | 'treasurer'

// Listes courtes ISO (V0). Le pays/devise par défaut = FR / EUR (cf. RPC network_create_club).
const COUNTRIES = ['FR', 'BE', 'CH', 'CI', 'SN', 'CA'] as const
const CURRENCIES = ['EUR', 'CHF', 'USD', 'XOF', 'CAD'] as const

export function AddClubWizard({ serviceAccountEmail }: { serviceAccountEmail: string | null }) {
  const t = useTranslations('reseau.addClub')
  const router = useRouter()

  const [step, setStep] = React.useState(0)
  const [clubId, setClubId] = React.useState<string | null>(null)

  const steps = React.useMemo(
    () => [
      { id: 'infos', label: t('steps.infos') },
      { id: 'matrix', label: t('steps.matrix') },
      { id: 'import', label: t('steps.import') },
    ],
    [t]
  )

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête + retour. */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => router.push('/reseau/clubs')}
          className="inline-flex w-fit items-center gap-1.5 rounded-md text-[13px] font-semibold text-text-sec outline-none transition-colors hover:text-text focus-visible:shadow-[var(--sh-glow)]"
        >
          <Icon name="ArrowLeft" size={16} aria-hidden="true" />
          {t('back')}
        </button>
        <Heading level="h1" className="text-[20px]">
          {t('title')}
        </Heading>
        <Text className="text-[14px] text-text-sec">{t('subtitle')}</Text>
      </div>

      {/* Stepper. */}
      <Stepper steps={steps} current={step} ariaLabel={t('stepperLabel')} />

      {/* Carte d'étape. */}
      <div className="rounded-md border border-border bg-card p-7 shadow-[var(--sh-card)]">
        {step === 0 && (
          <InfosStep
            onCreated={(id) => {
              setClubId(id)
              setStep(1)
            }}
          />
        )}
        {step === 1 && clubId && (
          <MatrixStep
            clubId={clubId}
            serviceAccountEmail={serviceAccountEmail}
            onConnected={() => setStep(2)}
          />
        )}
        {step === 2 && clubId && (
          <ImportStep clubId={clubId} onFinish={() => router.push(`/reseau/clubs/${clubId}`)} />
        )}
      </div>
    </div>
  )
}

// ── Étape 1 — Infos ──────────────────────────────────────────────────────────
function InfosStep({ onCreated }: { onCreated: (clubId: string) => void }) {
  const t = useTranslations('reseau.addClub.infos')
  const [name, setName] = React.useState('')
  const [slug, setSlug] = React.useState('')
  const [slugTouched, setSlugTouched] = React.useState(false)
  const [city, setCity] = React.useState('')
  const [country, setCountry] = React.useState<string>('FR')
  const [currency, setCurrency] = React.useState<string>('EUR')
  const [minContribution, setMinContribution] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  // Slug auto-dérivé du nom tant que l'utilisateur n'a pas édité le slug manuellement.
  function onNameChange(value: string) {
    setName(value)
    if (!slugTouched) setSlug(slugify(value))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (name.trim() === '') return setError(t('errors.name'))
    if (slug.trim() === '' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim())) {
      return setError(t('errors.slug'))
    }
    const minRaw = minContribution.trim().replace(',', '.')
    const minNum = minRaw === '' ? undefined : Number(minRaw)
    startTransition(async () => {
      const res = await createClubAction({
        name: name.trim(),
        slug: slug.trim(),
        ...(city.trim() !== '' ? { city: city.trim() } : {}),
        country,
        currency,
        ...(minNum != null && Number.isFinite(minNum) ? { minContribution: minNum } : {}),
      })
      if (!res.ok) {
        const key = (['duplicate', 'forbidden', 'invalid'] as const).includes(
          res.error as 'duplicate'
        )
          ? `errors.${res.error}`
          : 'errors.unknown'
        setError(t(key as 'errors.unknown'))
        return
      }
      onCreated(res.clubId)
    })
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Heading level="h2" className="text-[18px]">
          {t('title')}
        </Heading>
        <Text className="text-[13.5px] text-text-sec">{t('description')}</Text>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t('name')} required className="sm:col-span-2">
          {(p) => (
            <Input
              {...p}
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder={t('namePlaceholder')}
              autoComplete="off"
            />
          )}
        </FormField>

        <FormField label={t('slug')} helpText={t('slugHint')} required className="sm:col-span-2">
          {(p) => (
            <Input
              {...p}
              value={slug}
              onChange={(e) => {
                setSlugTouched(true)
                setSlug(e.target.value)
              }}
              className="font-mono"
              autoComplete="off"
              spellCheck={false}
            />
          )}
        </FormField>

        <FormField label={t('city')}>
          {(p) => (
            <Input
              {...p}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={t('cityPlaceholder')}
              autoComplete="off"
            />
          )}
        </FormField>

        <FormField label={t('country')}>
          {(p) => (
            <SelectRoot value={country} onValueChange={setCountry}>
              <SelectTrigger id={p.id} aria-label={t('country')}>
                <SelectValue />
              </SelectTrigger>
              <SelectPortal>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectPortal>
            </SelectRoot>
          )}
        </FormField>

        <FormField label={t('currency')}>
          {(p) => (
            <SelectRoot value={currency} onValueChange={setCurrency}>
              <SelectTrigger id={p.id} aria-label={t('currency')}>
                <SelectValue />
              </SelectTrigger>
              <SelectPortal>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectPortal>
            </SelectRoot>
          )}
        </FormField>

        <FormField label={t('minContribution')}>
          {(p) => (
            <Input
              {...p}
              value={minContribution}
              onChange={(e) => setMinContribution(e.target.value)}
              inputMode="decimal"
              placeholder="100,00"
              autoComplete="off"
            />
          )}
        </FormField>
      </div>

      {error && (
        <p role="alert" aria-live="polite" className="text-[13px] text-data-negative">
          {error}
        </p>
      )}

      <div className="flex justify-end border-t border-border pt-5">
        <Button type="submit" isLoading={pending} disabled={pending} className="min-h-[44px]">
          {t('submit')}
        </Button>
      </div>
    </form>
  )
}

// ── Étape 2 — Matrice ────────────────────────────────────────────────────────
function MatrixStep({
  clubId,
  serviceAccountEmail,
  onConnected,
}: {
  clubId: string
  serviceAccountEmail: string | null
  onConnected: () => void
}) {
  const t = useTranslations('reseau.addClub.matrix')
  const [value, setValue] = React.useState('')
  const [status, setStatus] = React.useState<SheetConnectionStatus>('idle')
  const [preview, setPreview] = React.useState<SheetProbePreview | undefined>(undefined)
  const [missingTabs, setMissingTabs] = React.useState<string[]>([])
  const [copied, setCopied] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  function applyProbe(res: ProbeResult) {
    setStatus(res.status)
    if (res.status === 'success') setPreview(res.preview)
    else setPreview(undefined)
    setMissingTabs(res.status === 'structure' ? res.missingTabs : [])
  }

  function runTest() {
    setSaveError(null)
    setStatus('testing')
    // L'Edge ré-extrait l'ID, mais on l'extrait aussi côté UI (l'utilisateur peut coller une URL).
    const sheetId = extractSheetIdFromInput(value) ?? value.trim()
    startTransition(async () => {
      const res = await probeSheet(sheetId)
      applyProbe(res)
    })
  }

  async function copyEmail() {
    if (!serviceAccountEmail) return
    try {
      await navigator.clipboard.writeText(serviceAccountEmail)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard indispo : le bouton reste sans feedback, l'email est lisible à l'écran */
    }
  }

  function onContinue() {
    if (status !== 'success') return
    setSaveError(null)
    const sheetId = extractSheetIdFromInput(value) ?? value.trim()
    startTransition(async () => {
      const res = await setClubSheetAction(clubId, sheetId)
      if (!res.ok) {
        setSaveError(t('saveError'))
        return
      }
      onConnected()
    })
  }

  // Quand le champ change après un test, on réinitialise le résultat (le test précédent ne vaut
  // plus pour la nouvelle valeur → « Continuer » se re-verrouille).
  function onValueChange(v: string) {
    setValue(v)
    if (status !== 'idle' && status !== 'testing') {
      setStatus('idle')
      setPreview(undefined)
      setMissingTabs([])
    }
  }

  const canContinue = status === 'success' && !pending

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Heading level="h2" className="text-[18px]">
          {t('title')}
        </Heading>
        <Text className="text-[13.5px] text-text-sec">{t('description')}</Text>
      </div>

      <SheetConnectionTest
        value={value}
        onChange={onValueChange}
        serviceAccountEmail={serviceAccountEmail}
        onCopyEmail={() => void copyEmail()}
        copied={copied}
        status={status}
        preview={preview}
        missingTabs={missingTabs}
        onTest={runTest}
        labels={{
          fieldLabel: t('fieldLabel'),
          fieldHint: t('fieldHint'),
          placeholder: t('placeholder'),
          shareTitle: t('shareTitle'),
          shareHint: t('shareHint'),
          copyEmail: t('copyEmail'),
          copied: t('copied'),
          testConnection: t('testConnection'),
          testing: t('testing'),
          successTitle: t('successTitle'),
          successPreview: (p) =>
            t('successPreview', { members: p.members, positions: p.positions, tabs: p.tabsFound }),
          dryRunBadge: t('dryRunBadge'),
          notSharedTitle: t('notSharedTitle'),
          notSharedBody: (sa) =>
            sa ? t('notSharedBodyWithEmail', { email: sa }) : t('notSharedBody'),
          structureTitle: t('structureTitle'),
          structureBody: (tabs) => t('structureBody', { tabs: tabs.join(', ') }),
          invalidTitle: t('invalidTitle'),
          invalidBody: t('invalidBody'),
          errorTitle: t('errorTitle'),
          errorBody: t('errorBody'),
        }}
      />

      {saveError && (
        <p role="alert" aria-live="polite" className="text-[13px] text-data-negative">
          {saveError}
        </p>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-border pt-5">
        {/* Repère : « Continuer » bloqué tant que le test n'est pas en succès. */}
        <span aria-hidden={canContinue} className="text-[12.5px] text-text-ter">
          {!canContinue ? t('gateHint') : ''}
        </span>
        <Button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          isLoading={pending && status === 'success'}
          className="min-h-[44px]"
        >
          {t('submit')}
        </Button>
      </div>
    </div>
  )
}

// ── Étape 3 — Import + responsable ───────────────────────────────────────────
function ImportStep({ clubId, onFinish }: { clubId: string; onFinish: () => void }) {
  const t = useTranslations('reseau.addClub.import')
  const [importedCount, setImportedCount] = React.useState<number | null>(null)
  const [members, setMembers] = React.useState<ClubMemberOption[]>([])
  const [syncError, setSyncError] = React.useState<string | null>(null)
  const [selectedUser, setSelectedUser] = React.useState<string>('')
  const [role, setRole] = React.useState<StaffRole>('president')
  const [provisionError, setProvisionError] = React.useState<string | null>(null)
  const [syncing, startSync] = React.useTransition()
  const [finishing, startFinish] = React.useTransition()

  function runSync() {
    setSyncError(null)
    startSync(async () => {
      const res = await triggerInitialSync(clubId)
      if (!res.ok) {
        setSyncError(t('syncError'))
        return
      }
      setImportedCount(res.members)
      const list = await listClubMembers(clubId)
      if (list.ok) {
        setMembers(list.members)
        if (list.members[0]) setSelectedUser(list.members[0].userId)
      }
    })
  }

  function finish() {
    setProvisionError(null)
    startFinish(async () => {
      // Provisionner le responsable est requis pour ne pas laisser un club orphelin (sans staff).
      if (selectedUser !== '') {
        const res = await provisionFirstStaffAction(clubId, selectedUser, role)
        if (!res.ok) {
          setProvisionError(t('provisionError'))
          return
        }
      }
      onFinish()
    })
  }

  const synced = importedCount != null
  const canFinish = synced && selectedUser !== '' && !finishing

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Heading level="h2" className="text-[18px]">
          {t('title')}
        </Heading>
        <Text className="text-[13.5px] text-text-sec">{t('description')}</Text>
      </div>

      {/* Bloc import initial : SyncBanner réutilisé. Avant le 1er import, on propose le bouton. */}
      <section className="flex flex-col gap-3">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-ter">
          {t('syncTitle')}
        </h3>
        {synced ? (
          <SyncBanner
            syncedAt={new Date()}
            userRole="network_admin"
            isSyncing={syncing}
            onSync={runSync}
            syncedAtTemplate={() => t('syncedTemplate', { members: importedCount ?? 0 })}
            refreshLabel={t('runSync')}
            refreshAriaLabel={t('runSync')}
          />
        ) : (
          <div className="flex flex-col gap-3 rounded-md border border-border bg-card-sub px-5 py-4">
            <Text className="text-[13.5px] text-text-sec">{t('syncNever')}</Text>
            <Button
              type="button"
              variant="secondary"
              onClick={runSync}
              isLoading={syncing}
              disabled={syncing}
              iconLeft={
                syncing ? undefined : <Icon name="RefreshCw" size={16} aria-hidden="true" />
              }
              className="w-fit min-h-[44px]"
            >
              {syncing ? t('syncing') : t('runSync')}
            </Button>
          </div>
        )}
        {syncError && (
          <p role="alert" aria-live="polite" className="text-[13px] text-data-negative">
            {syncError}
          </p>
        )}
      </section>

      {/* Bloc désigner le premier responsable. */}
      <section className="flex flex-col gap-4 rounded-md border border-border bg-card p-5">
        <div className="flex flex-col gap-1">
          <h3 className="font-display text-[15px] font-bold text-text">{t('staffTitle')}</h3>
          <Text className="text-[13px] text-text-sec">{t('staffDescription')}</Text>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.4fr_1fr]">
          <FormField label={t('memberLabel')}>
            {(p) =>
              members.length === 0 ? (
                <Text className="text-[13px] text-text-ter">{t('noMembers')}</Text>
              ) : (
                <SelectRoot value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger id={p.id} aria-label={t('memberLabel')}>
                    <SelectValue placeholder={t('memberPlaceholder')} />
                  </SelectTrigger>
                  <SelectPortal>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.userId} value={m.userId}>
                          {m.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectPortal>
                </SelectRoot>
              )
            }
          </FormField>

          <FormField label={t('roleLabel')}>
            {() => (
              <SegmentedToggle
                value={role}
                onChange={(v) => setRole(v as StaffRole)}
                ariaLabel={t('roleLabel')}
                options={[
                  { value: 'president', label: t('rolePresident') },
                  { value: 'treasurer', label: t('roleTreasurer') },
                ]}
              />
            )}
          </FormField>
        </div>

        {/* Voie email-invite : DIFFÉRÉE (NET-003 ne l'a pas implémentée) → « Bientôt », désactivée. */}
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-border px-4 py-3 opacity-70">
          <Icon name="Mail" size={16} className="text-text-ter" aria-hidden="true" />
          <span className="text-[13px] font-semibold text-text-sec">{t('inviteSoonTitle')}</span>
          <Badge variant="neutral">{t('inviteSoonBadge')}</Badge>
          <span className="basis-full text-[12.5px] text-text-ter">{t('inviteSoonHint')}</span>
        </div>

        {provisionError && (
          <p role="alert" aria-live="polite" className="text-[13px] text-data-negative">
            {provisionError}
          </p>
        )}
      </section>

      <div className="flex justify-end border-t border-border pt-5">
        <Button
          type="button"
          onClick={finish}
          disabled={!canFinish}
          isLoading={finishing}
          className="min-h-[44px]"
        >
          {t('finish')}
        </Button>
      </div>
    </div>
  )
}
