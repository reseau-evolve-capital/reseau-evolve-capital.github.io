'use client'

// Fiche club /reseau/clubs/[id] (NET-007) — vue présentationnelle role-aware.
//
// Quatre sections empilées (mobile : empilées telles quelles ; sous-nav réseau déjà en drawer) :
//   1. En-tête + rappel KPI (membres actifs, valo agrégée, dernière sync, matrice).
//   2. Matrice & synchronisation (CŒUR) : sheet_id mono tronqué + copier ; « Relancer la sync »
//      (triggerInitialSync → SyncBanner) ; « Changer la matrice » (data-negative, double/triple
//      confirmation via SensitiveConfirmModal : case + resaisie du slug — réutilise au préalable le
//      dry-run probeSheet sur la nouvelle feuille) ; historique des syncs (date / lignes / statut).
//   3. Paramètres (nom, ville/pays, plafond, courtier — sensibles signalés) → updateNetworkClubSettings.
//   4. Rôles du club : staff actuel + promouvoir (network_provision_first_staff).
//
// Tokens design-system uniquement ; le bouton « Changer la matrice » est en data-negative (#C53030),
// JAMAIS le rouge brand #E93E3A. Formatage via @evolve/utils. i18n next-intl. a11y AA (≥44px,
// focus, clavier). Mutations via Server Actions → RPC SECURITY DEFINER gardées is_network_admin.
// Réf : E-NET §Écran 3, SettingsView (SensitiveConfirmModal), AddClubWizard (SheetConnectionTest/sync).

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { formatEUR, formatDate, formatRelativeTime } from '@evolve/utils'
import {
  Avatar,
  Badge,
  Button,
  FormField,
  Heading,
  Icon,
  Input,
  KPICard,
  SegmentedToggle,
  SensitiveConfirmModal,
  SheetConnectionTest,
  SyncBanner,
  Text,
  useToast,
  type BadgeVariant,
  type SheetConnectionStatus,
  type SheetProbePreview,
} from '@evolve/ui'
import { extractSheetIdFromInput } from '@/lib/data/sheetId'
import {
  type ClubSettingsInput,
  type ValidationErrorCode,
  validateInput,
} from '@/lib/data/clubSettings'
import type { NetworkClubDetail } from '@/lib/data/network'
import {
  deleteClubAction,
  listSheetSnapshots,
  probeSheet,
  provisionFirstStaffAction,
  setClubActiveAction,
  setClubSheetAction,
  triggerInitialSync,
  updateNetworkClubSettings,
  type ProbeResult,
  type SheetSnapshotEntry,
} from '../../actions'

type StaffRole = 'president' | 'treasurer'

/** Tronque un sheet_id long pour l'affichage mono (garde le début + la fin). */
function truncateSheetId(id: string): string {
  if (id.length <= 18) return id
  return `${id.slice(0, 8)}…${id.slice(-7)}`
}

/** Mappe un statut de snapshot → variante de Badge (success/partial/failed). */
function snapshotBadge(status: SheetSnapshotEntry['status']): BadgeVariant {
  if (status === 'failed') return 'error'
  if (status === 'partial') return 'warning'
  return 'success'
}

function errorProp(error: string | undefined): { error?: string } {
  return error ? { error } : {}
}

export function ClubDetailView({
  detail,
  snapshots: initialSnapshots,
  serviceAccountEmail,
  isAdmin,
}: {
  detail: NetworkClubDetail
  snapshots: SheetSnapshotEntry[]
  /** Email du Service Account Google à partager (encart « Changer la matrice »). `null` si non configuré. */
  serviceAccountEmail: string | null
  /** network_admin → actions sensibles (matrice, sync, paramètres, rôles). board → lecture seule. */
  isAdmin: boolean
}) {
  const t = useTranslations('reseau.clubDetail')
  const locale = useLocale()
  const router = useRouter()
  const { club, sheetId, settings, staff } = detail
  // NET-018 — soft-disable. Un club désactivé : bandeau data-negative en tête, sync/matrice
  // verrouillées (on passe le flag à MatrixSection), badge de statut « Désactivé ».
  const isDisabled = club.isActive === false

  return (
    <div className="flex flex-col gap-6">
      {/* Bandeau « club désactivé » (data-negative) en tête de fiche (NET-018, écran 01). */}
      {isDisabled && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-[12px] border border-data-negative bg-data-negative-50 p-4"
        >
          <Icon name="Ban" size={20} className="shrink-0 text-data-negative" aria-hidden="true" />
          <div className="flex flex-col">
            <span className="text-[14px] font-semibold text-data-negative">
              {t('statusSection.banner.title')}
            </span>
            <span className="text-[13px] text-text-sec">{t('statusSection.banner.body')}</span>
          </div>
        </div>
      )}

      {/* Retour + lecture seule (board). */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push('/reseau/clubs')}
          className="inline-flex min-h-[44px] w-fit items-center gap-1.5 rounded-md text-[13px] font-semibold text-text-sec outline-none transition-colors hover:text-text focus-visible:shadow-[var(--sh-glow)]"
        >
          <Icon name="ArrowLeft" size={16} aria-hidden="true" />
          {t('back')}
        </button>
        {!isAdmin && (
          <span className="inline-flex min-h-[36px] items-center gap-2 rounded-full border border-border px-3 py-1 text-[12px] font-semibold uppercase tracking-wide text-text-ter">
            <Icon name="Eye" size={16} aria-hidden="true" />
            {t('readOnly')}
          </span>
        )}
      </div>

      {/* En-tête : avatar + nom + statut + slug · ville · pays. */}
      <header className="flex flex-wrap items-center gap-4">
        <Avatar name={club.name} size="lg" />
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Heading level="h1" className="text-[22px]">
              {club.name}
            </Heading>
            {/* Statut du club : success (actif) / error=data-negative (désactivé, NET-018). */}
            <Badge variant={isDisabled ? 'error' : 'success'}>
              {isDisabled ? t('status.disabled') : t('status.active')}
            </Badge>
          </div>
          <Text className="text-[13.5px] text-text-sec">
            <span className="font-mono">{club.slug}</span>
            {settings.city ? ` · ${settings.city}` : ''}
            {settings.country ? ` · ${settings.country}` : ''}
          </Text>
        </div>
      </header>

      {/* Rappel KPI. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KPICard
          title={t('kpi.members')}
          value={club.activeMembersCount}
          format="raw"
          icon="Users"
        />
        <KPICard
          title={t('kpi.valuation')}
          value={club.aggregatedValuation == null ? '—' : club.aggregatedValuation}
          format={club.aggregatedValuation == null ? 'raw' : 'eur'}
          icon="Wallet"
        />
        <KPICard
          title={t('kpi.lastSync')}
          value={club.lastSyncedAt ? formatRelativeTime(club.lastSyncedAt, undefined, locale) : '—'}
          format="raw"
          icon="RefreshCw"
        />
      </div>

      <MatrixSection
        clubId={club.id}
        clubSlug={club.slug}
        clubName={club.name}
        lastSyncedAt={club.lastSyncedAt}
        sheetId={sheetId}
        initialSnapshots={initialSnapshots}
        isAdmin={isAdmin}
        isDisabled={isDisabled}
        serviceAccountEmail={serviceAccountEmail}
      />

      <SettingsSection clubId={club.id} initialSettings={settings} isAdmin={isAdmin} />

      <RolesSection
        clubId={club.id}
        staff={staff}
        isAdmin={isAdmin}
        onChanged={() => router.refresh()}
      />

      {/* Statut du club (NET-018, écran 01) : désactiver / réactiver (network_admin uniquement). */}
      {isAdmin && (
        <StatusSection
          clubId={club.id}
          clubSlug={club.slug}
          clubName={club.name}
          isDisabled={isDisabled}
          onChanged={() => router.refresh()}
        />
      )}

      {/* Zone de danger : suppression du club (network_admin uniquement). Permet de nettoyer un club
          orphelin (créé puis abandonné à l'étape matrice) ou de retirer définitivement un club. */}
      {isAdmin && <DangerZoneSection clubId={club.id} clubSlug={club.slug} clubName={club.name} />}
    </div>
  )
}

// ── Zone de danger : suppression du club ──────────────────────────────────────
function DangerZoneSection({
  clubId,
  clubSlug,
  clubName,
}: {
  clubId: string
  clubSlug: string
  clubName: string
}) {
  const t = useTranslations('reseau.clubDetail.delete')
  const tc = useTranslations('common')
  const router = useRouter()
  const toast = useToast()
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [pending, startTransition] = React.useTransition()

  function confirmDelete() {
    startTransition(async () => {
      const res = await deleteClubAction(clubId)
      if (!res.ok) {
        toast.error({ title: t('toastErrorTitle'), message: t('toastErrorMessage') })
        return
      }
      setConfirmOpen(false)
      toast.success({ title: t('toastSuccessTitle'), message: t('toastSuccessMessage') })
      router.push('/reseau/clubs')
      router.refresh()
    })
  }

  return (
    <section className="flex flex-col gap-4 rounded-[12px] border border-data-negative-50 bg-card p-5">
      <Heading level="h2" className="text-[16px] text-data-negative">
        {t('sectionTitle')}
      </Heading>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text className="max-w-prose text-[13px] text-text-sec">{t('confirmDesc')}</Text>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] border border-data-negative px-4 py-2 text-[14px] font-semibold text-data-negative transition-colors duration-[150ms] hover:bg-data-negative-50 focus:outline-none focus-visible:shadow-[var(--sh-glow)]"
        >
          <Icon name="Trash2" size={16} aria-hidden="true" />
          {t('button')}
        </button>
      </div>

      <SensitiveConfirmModal
        open={confirmOpen}
        onOpenChange={(o) => {
          if (!o) setConfirmOpen(false)
        }}
        title={t('confirmTitle', { name: clubName })}
        description={t('confirmDesc')}
        acknowledgeLabel={t('acknowledge')}
        confirmationText={clubSlug}
        confirmationLabel={t('typeToConfirm', { slug: clubSlug })}
        confirmationPlaceholder={clubSlug}
        cancelLabel={tc('cancel')}
        confirmLabel={t('button')}
        closeLabel={tc('close')}
        isPending={pending}
        onConfirm={confirmDelete}
      />
    </section>
  )
}

// ── Section Statut du club (NET-018, écran 01) ───────────────────────────────
// Club actif : statut data-positive + bouton « Désactiver » (data-negative) → SensitiveConfirmModal
// (acquittement « Aucune donnée supprimée. Accès bloqué jusqu'à réactivation. » + resaisie du slug).
// Club désactivé : statut data-negative + bouton « Réactiver » (action non destructive → directe).
function StatusSection({
  clubId,
  clubSlug,
  clubName,
  isDisabled,
  onChanged,
}: {
  clubId: string
  clubSlug: string
  clubName: string
  isDisabled: boolean
  onChanged: () => void
}) {
  const t = useTranslations('reseau.clubDetail.statusSection')
  const tc = useTranslations('common')
  const toast = useToast()
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [pending, startTransition] = React.useTransition()

  /** Désactivation : action sensible (confirmée). Réactivation : directe (non destructive). */
  function applyActive(active: boolean) {
    startTransition(async () => {
      const res = await setClubActiveAction(clubId, active)
      if (!res.ok) {
        toast.error({ title: t('toast.errorTitle'), message: t('toast.errorMessage') })
        return
      }
      setConfirmOpen(false)
      toast.success({
        title: active ? t('toast.enabledTitle') : t('toast.disabledTitle'),
        message: active ? t('toast.enabledMessage') : t('toast.disabledMessage'),
      })
      onChanged()
    })
  }

  return (
    <section className="flex flex-col gap-4 rounded-[12px] border border-border bg-card p-5">
      <Heading level="h2" className="text-[16px]">
        {t('title')}
      </Heading>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={
                isDisabled
                  ? 'h-2.5 w-2.5 shrink-0 rounded-full bg-data-negative'
                  : 'h-2.5 w-2.5 shrink-0 rounded-full bg-data-positive'
              }
            />
            <span className="text-[14px] font-semibold text-text">
              {isDisabled ? t('disabledLabel') : t('activeLabel')}
            </span>
          </span>
          <Text className="max-w-prose text-[13px] text-text-sec">
            {isDisabled ? t('disabledHint') : t('activeHint')}
          </Text>
        </div>

        {isDisabled ? (
          // Réactivation : action NON destructive → bouton primaire direct (pas de confirmation).
          <Button
            type="button"
            onClick={() => applyActive(true)}
            isLoading={pending}
            disabled={pending}
            iconLeft={pending ? undefined : <Icon name="Power" size={16} aria-hidden="true" />}
            className="min-h-[44px]"
          >
            {t('enableButton')}
          </Button>
        ) : (
          // Désactivation : action sensible → bouton data-negative + SensitiveConfirmModal.
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] border border-data-negative px-4 py-2 text-[14px] font-semibold text-data-negative transition-colors duration-[150ms] hover:bg-data-negative-50 focus:outline-none focus-visible:shadow-[var(--sh-glow)]"
          >
            <Icon name="Ban" size={16} aria-hidden="true" />
            {t('disableButton')}
          </button>
        )}
      </div>

      {/* Modale de confirmation de DÉSACTIVATION : acquittement + resaisie du slug. */}
      <SensitiveConfirmModal
        open={confirmOpen}
        onOpenChange={(o) => {
          if (!o) setConfirmOpen(false)
        }}
        title={t('confirm.title', { name: clubName })}
        description={t('confirm.description')}
        acknowledgeLabel={t('confirm.acknowledge')}
        confirmationText={clubSlug}
        confirmationLabel={t('confirm.typeToConfirm', { slug: clubSlug })}
        confirmationPlaceholder={clubSlug}
        cancelLabel={tc('cancel')}
        confirmLabel={t('disableButton')}
        closeLabel={tc('close')}
        isPending={pending}
        onConfirm={() => applyActive(false)}
      />
    </section>
  )
}

// ── Section Matrice & synchronisation ───────────────────────────────────────
function MatrixSection({
  clubId,
  clubSlug,
  clubName,
  lastSyncedAt,
  sheetId,
  initialSnapshots,
  isAdmin,
  isDisabled,
  serviceAccountEmail,
}: {
  clubId: string
  clubSlug: string
  clubName: string
  lastSyncedAt: string | null
  sheetId: string | null
  initialSnapshots: SheetSnapshotEntry[]
  isAdmin: boolean
  /** Club désactivé (NET-018) → sync & changement de matrice verrouillés (tooltip « Club désactivé »). */
  isDisabled: boolean
  serviceAccountEmail: string | null
}) {
  const t = useTranslations('reseau.clubDetail')
  const tc = useTranslations('common')
  const locale = useLocale()
  const toast = useToast()

  const [snapshots, setSnapshots] = React.useState<SheetSnapshotEntry[]>(initialSnapshots)
  const [syncedAt, setSyncedAt] = React.useState<string | null>(lastSyncedAt)
  const [syncing, startSync] = React.useTransition()
  const [syncError, setSyncError] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)
  const [copiedEmail, setCopiedEmail] = React.useState(false)

  // État du changement de matrice (modale).
  const [changeOpen, setChangeOpen] = React.useState(false)
  const [newValue, setNewValue] = React.useState('')
  const [probeStatus, setProbeStatus] = React.useState<SheetConnectionStatus>('idle')
  const [preview, setPreview] = React.useState<SheetProbePreview | undefined>(undefined)
  const [missingTabs, setMissingTabs] = React.useState<string[]>([])
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [changing, startChange] = React.useTransition()

  async function refreshSnapshots() {
    const res = await listSheetSnapshots(clubId)
    if (res.ok) setSnapshots(res.snapshots)
  }

  function relaunchSync() {
    setSyncError(null)
    startSync(async () => {
      const res = await triggerInitialSync(clubId)
      if (!res.ok) {
        setSyncError(t('matrix.syncError'))
        toast.error({ title: t('matrix.syncErrorTitle'), message: t('matrix.syncError') })
        return
      }
      setSyncedAt(new Date().toISOString())
      await refreshSnapshots()
      toast.success({
        title: t('matrix.syncDoneTitle'),
        message: t('matrix.syncDone', { members: res.members }),
      })
    })
  }

  async function copySheetId() {
    if (!sheetId) return
    try {
      await navigator.clipboard.writeText(sheetId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard indispo : l'ID reste lisible à l'écran (tronqué) */
    }
  }

  async function copyServiceAccountEmail() {
    if (!serviceAccountEmail) return
    try {
      await navigator.clipboard.writeText(serviceAccountEmail)
      setCopiedEmail(true)
      setTimeout(() => setCopiedEmail(false), 2000)
    } catch {
      /* clipboard indispo : l'email reste lisible à l'écran */
    }
  }

  function applyProbe(res: ProbeResult) {
    setProbeStatus(res.status)
    setPreview(res.status === 'success' ? res.preview : undefined)
    setMissingTabs(res.status === 'structure' ? res.missingTabs : [])
  }

  function runProbe() {
    setProbeStatus('testing')
    const id = extractSheetIdFromInput(newValue) ?? newValue.trim()
    startChange(async () => {
      const res = await probeSheet(id)
      applyProbe(res)
    })
  }

  function onChangeValue(v: string) {
    setNewValue(v)
    if (probeStatus !== 'idle' && probeStatus !== 'testing') {
      setProbeStatus('idle')
      setPreview(undefined)
      setMissingTabs([])
    }
  }

  /** Confirme le changement (après double/triple confirmation) → network_set_club_sheet. */
  function confirmChange() {
    const id = extractSheetIdFromInput(newValue) ?? newValue.trim()
    startChange(async () => {
      const res = await setClubSheetAction(clubId, id)
      if (!res.ok) {
        toast.error({ title: t('matrix.changeErrorTitle'), message: t('matrix.changeError') })
        return
      }
      setConfirmOpen(false)
      setChangeOpen(false)
      setNewValue('')
      setProbeStatus('idle')
      toast.success({ title: t('matrix.changeDoneTitle'), message: t('matrix.changeDone') })
    })
  }

  const newSheetId = extractSheetIdFromInput(newValue) ?? newValue.trim()
  const canConfirm = probeStatus === 'success' && !changing

  return (
    <section className="flex flex-col gap-5 rounded-[12px] border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading level="h2" className="text-[16px]">
          {t('matrix.title')}
        </Heading>
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={relaunchSync}
              isLoading={syncing}
              // NET-018 — club désactivé : sync verrouillée (tooltip « Club désactivé »).
              disabled={syncing || !sheetId || isDisabled}
              title={isDisabled ? t('matrix.disabledTooltip') : undefined}
              iconLeft={
                syncing ? undefined : <Icon name="RefreshCw" size={16} aria-hidden="true" />
              }
              className="min-h-[44px]"
            >
              {t('matrix.relaunchSync')}
            </Button>
            {/* « Changer la matrice » = action sensible → bouton data-negative (#C53030), JAMAIS
                le rouge brand. Ouvre le flux dry-run + double/triple confirmation.
                Club désactivé (NET-018) : verrouillé (tooltip « Club désactivé »). */}
            <button
              type="button"
              onClick={() => setChangeOpen((o) => !o)}
              aria-expanded={changeOpen}
              disabled={isDisabled}
              title={isDisabled ? t('matrix.disabledTooltip') : undefined}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] border border-data-negative px-4 py-2 text-[14px] font-semibold text-data-negative transition-colors duration-[150ms] hover:bg-data-negative-50 focus:outline-none focus-visible:shadow-[var(--sh-glow)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="RefreshCw" size={16} aria-hidden="true" />
              {t('matrix.changeMatrix')}
            </button>
          </div>
        )}
      </div>

      {/* sheet_id actuel : mono tronqué + copier + état de connexion. */}
      <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-border bg-bg p-4">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-text-ter">
          {t('matrix.sheetId')}
        </span>
        {sheetId ? (
          <>
            <code className="rounded-[6px] bg-card-sub px-2 py-1 font-mono text-[13px] text-text">
              {truncateSheetId(sheetId)}
            </code>
            <button
              type="button"
              onClick={() => void copySheetId()}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-[12.5px] font-semibold text-text-sec outline-none hover:text-text focus-visible:shadow-[var(--sh-glow)]"
            >
              <Icon name={copied ? 'Check' : 'Copy'} size={16} aria-hidden="true" />
              {copied ? t('matrix.copied') : t('matrix.copy')}
            </button>
            <Badge variant="success">{t('matrix.connected')}</Badge>
          </>
        ) : (
          <Badge variant="neutral">{t('matrix.disconnected')}</Badge>
        )}
      </div>

      {/* Flux « Changer la matrice » : dry-run sur la nouvelle feuille avant confirmation. */}
      {isAdmin && changeOpen && (
        <div className="flex flex-col gap-4 rounded-[10px] border border-data-negative-50 bg-bg p-4">
          <Text className="text-[13px] text-text-sec">{t('matrix.changeHint')}</Text>
          <SheetConnectionTest
            value={newValue}
            onChange={onChangeValue}
            serviceAccountEmail={serviceAccountEmail}
            onCopyEmail={() => void copyServiceAccountEmail()}
            copied={copiedEmail}
            status={probeStatus}
            preview={preview}
            missingTabs={missingTabs}
            onTest={runProbe}
            labels={{
              fieldLabel: t('matrix.probe.fieldLabel'),
              fieldHint: t('matrix.probe.fieldHint'),
              placeholder: t('matrix.probe.placeholder'),
              shareTitle: t('matrix.probe.shareTitle'),
              shareHint: t('matrix.probe.shareHint'),
              copyEmail: t('matrix.probe.copyEmail'),
              copied: t('matrix.probe.copied'),
              testConnection: t('matrix.probe.testConnection'),
              testing: t('matrix.probe.testing'),
              successTitle: t('matrix.probe.successTitle'),
              successPreview: (p) =>
                t('matrix.probe.successPreview', {
                  members: p.members,
                  positions: p.positions,
                  tabs: p.tabsFound,
                }),
              dryRunBadge: t('matrix.probe.dryRunBadge'),
              notSharedTitle: t('matrix.probe.notSharedTitle'),
              notSharedBody: (sa) =>
                sa
                  ? t('matrix.probe.notSharedBodyWithEmail', { email: sa })
                  : t('matrix.probe.notSharedBody'),
              structureTitle: t('matrix.probe.structureTitle'),
              structureBody: (tabs) => t('matrix.probe.structureBody', { tabs: tabs.join(', ') }),
              invalidTitle: t('matrix.probe.invalidTitle'),
              invalidBody: t('matrix.probe.invalidBody'),
              errorTitle: t('matrix.probe.errorTitle'),
              errorBody: t('matrix.probe.errorBody'),
            }}
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12.5px] text-text-ter">
              {!canConfirm ? t('matrix.probe.gateHint') : ''}
            </span>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={!canConfirm}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] border border-data-negative px-4 py-2 text-[14px] font-semibold text-data-negative transition-colors duration-[150ms] hover:bg-data-negative-50 focus:outline-none focus-visible:shadow-[var(--sh-glow)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('matrix.changeMatrix')}
            </button>
          </div>
        </div>
      )}

      {/* État de la dernière sync (SyncBanner, role network_admin). */}
      <SyncBanner
        syncedAt={syncedAt}
        userRole={isAdmin ? 'network_admin' : 'member'}
        isSyncing={syncing}
        canSync={!!sheetId}
        onSync={relaunchSync}
        locale={locale}
        // Jamais synchronisé → on affiche le libellé seul (pas « Synchronisé Jamais synchronisé »).
        syncedAtTemplate={(rel) => (syncedAt ? t('matrix.syncedTemplate', { time: rel }) : rel)}
        neverSyncedLabel={t('matrix.neverSynced')}
        refreshLabel={t('matrix.relaunchSync')}
        refreshAriaLabel={t('matrix.relaunchSync')}
        {...(syncError ? { errorMessage: syncError } : {})}
      />

      {/* Historique des synchronisations. */}
      <div className="flex flex-col gap-3">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-ter">
          {t('matrix.history.title')}
        </h3>
        {snapshots.length === 0 ? (
          <Text className="text-[13px] text-text-ter">{t('matrix.history.empty')}</Text>
        ) : (
          // `[contain:layout]` : confine la largeur min-content de la <table> (anti scroll de page mobile).
          <div className="min-w-0 max-w-full overflow-x-auto [contain:layout]">
            <table className="w-full border-collapse text-left text-[13px]">
              <caption className="sr-only">{t('matrix.history.tableLabel')}</caption>
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-text-ter">
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    {t('matrix.history.columns.date')}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    {t('matrix.history.columns.rows')}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    {t('matrix.history.columns.status')}
                  </th>
                  <th scope="col" className="py-2 font-semibold">
                    {t('matrix.history.columns.detail')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map((s) => (
                  <tr key={s.syncedAt} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-4 text-text">{formatDate(s.syncedAt, locale)}</td>
                    <td className="py-2.5 pr-4 text-text-sec">
                      {t('matrix.history.rowsValue', { count: s.totalRows })}
                    </td>
                    <td className="py-2.5 pr-4">
                      <Badge variant={snapshotBadge(s.status)}>
                        {t(`matrix.history.status.${s.status}`)}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-text-ter">{s.firstError ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modale de confirmation : case d'acquittement + resaisie du slug (triple confirmation). */}
      <SensitiveConfirmModal
        open={confirmOpen}
        onOpenChange={(o) => {
          if (!o) setConfirmOpen(false)
        }}
        title={t('matrix.confirm.title', { name: clubName })}
        description={t('matrix.confirm.description')}
        acknowledgeLabel={t('matrix.confirm.acknowledge')}
        confirmationText={clubSlug}
        confirmationLabel={t('matrix.confirm.typeToConfirm', { slug: clubSlug })}
        confirmationPlaceholder={clubSlug}
        changes={[
          {
            label: t('matrix.sheetId'),
            before: sheetId ? truncateSheetId(sheetId) : '—',
            after: newSheetId ? truncateSheetId(newSheetId) : '—',
          },
        ]}
        beforeLabel={t('matrix.confirm.before')}
        afterLabel={t('matrix.confirm.after')}
        cancelLabel={tc('cancel')}
        confirmLabel={t('matrix.changeMatrix')}
        closeLabel={tc('close')}
        isPending={changing}
        onConfirm={confirmChange}
      />
    </section>
  )
}

// ── Section Paramètres ───────────────────────────────────────────────────────
function SettingsSection({
  clubId,
  initialSettings,
  isAdmin,
}: {
  clubId: string
  initialSettings: NetworkClubDetail['settings']
  isAdmin: boolean
}) {
  const t = useTranslations('reseau.clubDetail.settings')
  const tc = useTranslations('common')
  const router = useRouter()
  const toast = useToast()
  const [isPending, startTransition] = React.useTransition()

  const [form, setForm] = React.useState<ClubSettingsInput>(() => ({
    name: initialSettings.name,
    city: initialSettings.city ?? '',
    country: initialSettings.country ?? '',
    brokerAccountRef: initialSettings.brokerAccountRef ?? '',
    annualInvestmentCap:
      initialSettings.annualInvestmentCap === null
        ? ''
        : String(initialSettings.annualInvestmentCap),
    minContribution: String(initialSettings.minContribution),
  }))
  const [errors, setErrors] = React.useState<ValidationErrorCode[]>([])

  const set = (key: keyof ClubSettingsInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  function fieldError(code: ValidationErrorCode): string | undefined {
    return errors.includes(code) ? t(`errors.${code}`) : undefined
  }

  function persist() {
    startTransition(async () => {
      const res = await updateNetworkClubSettings(clubId, form)
      if (res.ok) {
        toast.success({ title: t('toast.successTitle'), message: t('toast.successMessage') })
        router.refresh()
      } else if (res.error === 'forbidden' || res.error === 'unauthorized') {
        toast.error({ title: t('toast.forbiddenTitle'), message: t('toast.forbiddenMessage') })
      } else {
        toast.error({ title: t('toast.errorTitle'), message: t('toast.errorMessage') })
      }
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationErrors = validateInput(form)
    setErrors(validationErrors)
    if (validationErrors.length > 0) return
    persist()
  }

  return (
    <section className="flex flex-col gap-5 rounded-[12px] border border-border bg-card p-5">
      <Heading level="h2" className="text-[16px]">
        {t('title')}
      </Heading>

      {!isAdmin ? (
        // Lecture seule (board) : on affiche les valeurs sans formulaire éditable.
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ReadOnlyField label={t('fields.name')} value={initialSettings.name} />
          <ReadOnlyField
            label={t('fields.location')}
            value={
              [initialSettings.city, initialSettings.country].filter(Boolean).join(' · ') || '—'
            }
          />
          <ReadOnlyField
            label={t('fields.annualInvestmentCap')}
            value={
              initialSettings.annualInvestmentCap === null
                ? '—'
                : formatEUR(initialSettings.annualInvestmentCap)
            }
            sensitive
          />
          <ReadOnlyField
            label={t('fields.brokerAccountRef')}
            value={initialSettings.brokerAccountRef ?? '—'}
            sensitive
          />
        </dl>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label={t('fields.name')}
              required
              className="sm:col-span-2"
              {...errorProp(fieldError('name_required'))}
            >
              {(p) => (
                <Input {...p} value={form.name} onChange={set('name')} disabled={isPending} />
              )}
            </FormField>

            <FormField label={t('fields.city')}>
              {(p) => (
                <Input {...p} value={form.city} onChange={set('city')} disabled={isPending} />
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
                  disabled={isPending}
                />
              )}
            </FormField>
          </div>

          {/* Champs sensibles (signalés). */}
          <div className="flex flex-col gap-4 rounded-[10px] border border-data-warning-50 p-4">
            <div className="flex items-center gap-2">
              <Icon
                name="TriangleAlert"
                size={16}
                className="text-data-warning-strong"
                aria-hidden="true"
              />
              <span className="text-[12px] font-semibold uppercase tracking-wide text-data-warning-strong">
                {t('sensitiveBadge')}
              </span>
            </div>

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
                  disabled={isPending}
                />
              )}
            </FormField>

            <FormField label={t('fields.brokerAccountRef')} helpText={t('hints.brokerAccountRef')}>
              {(p) => (
                <Input
                  {...p}
                  value={form.brokerAccountRef}
                  onChange={set('brokerAccountRef')}
                  disabled={isPending}
                />
              )}
            </FormField>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              isLoading={isPending}
              disabled={isPending}
              className="min-h-[44px]"
            >
              {tc('save')}
            </Button>
          </div>
        </form>
      )}
    </section>
  )
}

function ReadOnlyField({
  label,
  value,
  sensitive = false,
}: {
  label: string
  value: string
  sensitive?: boolean
}) {
  const t = useTranslations('reseau.clubDetail.settings')
  return (
    <div className="flex flex-col gap-1">
      <dt className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-text-ter">
        {label}
        {sensitive && <Badge variant="warning">{t('sensitiveBadge')}</Badge>}
      </dt>
      <dd className="text-[14px] text-text">{value}</dd>
    </div>
  )
}

// ── Section Rôles du club ─────────────────────────────────────────────────────
function RolesSection({
  clubId,
  staff,
  isAdmin,
  onChanged,
}: {
  clubId: string
  staff: NetworkClubDetail['staff']
  isAdmin: boolean
  onChanged: () => void
}) {
  const t = useTranslations('reseau.clubDetail.roles')
  const toast = useToast()
  const [pendingUser, setPendingUser] = React.useState<string | null>(null)
  const [, startTransition] = React.useTransition()

  /** Promotion / mise à jour de rôle staff (network_provision_first_staff upserte le rôle). */
  function setRole(userId: string, role: StaffRole) {
    setPendingUser(userId)
    startTransition(async () => {
      const res = await provisionFirstStaffAction(clubId, userId, role)
      setPendingUser(null)
      if (!res.ok) {
        toast.error({ title: t('toast.errorTitle'), message: t('toast.errorMessage') })
        return
      }
      toast.success({ title: t('toast.successTitle'), message: t('toast.successMessage') })
      onChanged()
    })
  }

  return (
    <section className="flex flex-col gap-5 rounded-[12px] border border-border bg-card p-5">
      <Heading level="h2" className="text-[16px]">
        {t('title')}
      </Heading>

      {staff.length === 0 ? (
        <Text className="text-[13px] text-text-ter">{t('empty')}</Text>
      ) : (
        <ul className="flex flex-col gap-3">
          {staff.map((m) => (
            <li
              key={m.userId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-border bg-bg p-3"
            >
              <div className="flex items-center gap-3">
                <Avatar name={m.fullName} size="md" />
                <div className="flex flex-col">
                  <span className="text-[14px] font-semibold text-text">{m.fullName}</span>
                  <span className="text-[12.5px] text-text-ter">
                    {m.role === 'president' ? t('role.president') : t('role.treasurer')}
                  </span>
                </div>
              </div>
              {isAdmin && (
                <div
                  className={
                    pendingUser === m.userId
                      ? 'flex items-center gap-2 opacity-60'
                      : 'flex items-center gap-2'
                  }
                  aria-busy={pendingUser === m.userId}
                >
                  <SegmentedToggle
                    value={m.role === 'president' ? 'president' : 'treasurer'}
                    onChange={(v) => setRole(m.userId, v as StaffRole)}
                    ariaLabel={t('changeRoleLabel', { name: m.fullName })}
                    options={[
                      { value: 'president', label: t('role.president') },
                      { value: 'treasurer', label: t('role.treasurer') },
                    ]}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {/* Rétrogradation fine (retrait de staff) différée — note de suivi (NET-007). */}
    </section>
  )
}
