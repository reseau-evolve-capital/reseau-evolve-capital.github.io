import * as React from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table'
import { formatEUR, formatPct, formatDate } from '@evolve/utils'
import { AccessBadge, type AccessStatus, type AccessBadgeLabels } from '../../atoms/AccessBadge'
import { Badge, type BadgeVariant } from '../../atoms/Badge'
import { Icon } from '../../atoms/Icon'
import { Pill, type PillStatus } from '../../atoms/Pill'
import { ProgressBar } from '../../atoms/ProgressBar'
import { EmptyState } from '../../molecules/EmptyState'
import { MemberActionsMenu, type MemberActionsMenuLabels } from '../../molecules/MemberActionsMenu'
import { cn } from '../../lib/cn'

export type MemberRoleKey = 'member' | 'treasurer' | 'president' | 'network_admin'
export type MemberContribStatus = 'ok' | 'pending' | 'late' | 'exempt'
/** Statut d'accès d'un membre à l'espace (ADM-007). apps/web ne passe que active|locked. */
export type MemberAccessStatus = Extract<AccessStatus, 'active' | 'locked'>
/** Statut d'adhésion : `left` = membre sorti du club. */
export type MemberMembershipStatus = 'active' | 'left'

/** Ligne membre consommée par la table (déjà mappée par apps/web). */
export interface MemberRow {
  id: string
  fullName: string
  email: string
  /**
   * true = l'email est un placeholder synthétique (membre importé sans email, cf. migration 026).
   * Dans ce cas la table masque l'email et affiche « Email manquant » + propose de le renseigner.
   * Défaut `false` si omis (rétro-compatible).
   */
  emailIsPlaceholder?: boolean
  role: MemberRoleKey
  totalContributed: number
  detentionPct: number // fraction 0..1
  monthsCount: number
  status: MemberContribStatus | null
  /** Statut d'accès à l'espace membre (ADM-007). */
  accessStatus: MemberAccessStatus
  /** Statut d'adhésion (membre sorti vs actif). Défaut `active` si omis. */
  membershipStatus?: MemberMembershipStatus
  /** Date de sortie (ISO ou Date), affichée pour les membres sortis. */
  leaveAt?: string | null
}

/** Libellés des en-têtes de colonnes (aussi injectés dans l'aria-label de tri). */
export interface MembersListColumnLabels {
  fullName: string
  role: string
  totalContributed: string
  detentionPct: string
  monthsCount: string
  status: string
  /** En-tête de la colonne d'accès (ADM-007). */
  access: string
}

/** Toutes les chaînes user-facing/a11y de la liste. Défauts FR byte-exacts. */
export interface MembersListLabels {
  /** En-têtes de colonnes. */
  columns?: Partial<MembersListColumnLabels>
  /** Libellés des rôles (Badge). */
  roles?: Partial<Record<MemberRoleKey, string>>
  /**
   * Libellé du « rôle » affiché pour un membre sorti (`membershipStatus === 'left'`).
   * État purement présentationnel dérivé de la sortie — il remplace le badge rôle de
   * gouvernance (on ne mélange pas gouvernance et état d'adhésion). Défaut FR « Ancien membre ».
   */
  formerRole?: string
  /** Libellés des statuts de cotisation (Pill). */
  statuses?: Partial<Record<MemberContribStatus, string>>
  /**
   * Texte d'accessibilité du statut « aucune cotisation enregistrée » (status `null`).
   * Sert de `title` et d'`aria-label` au « — » muet. Défaut FR « Aucune cotisation enregistrée ».
   */
  statusNone?: string
  /** Libellés des statuts d'accès (AccessBadge). active/locked. */
  access?: Pick<AccessBadgeLabels, 'active' | 'locked'>
  /** Libellés du menu d'actions (MemberActionsMenu). */
  actions?: MemberActionsMenuLabels
  /** Titre de l'état vide. */
  emptyTitle?: string
  /** Description de l'état vide. */
  emptyDescription?: string
  /** aria-label du tableau. */
  tableLabel?: string
  /** aria-label « Trier par {col} » (+ suffixe de direction). */
  sortLabel?: (column: string, direction: 'asc' | 'desc' | false) => string
  /** aria-label de la barre de quote-part « Quote-part de {nom} ». */
  detentionBarLabel?: (name: string) => string
  /** Libellé du badge « Membre sorti » (défaut FR « Sorti »). */
  leftBadge?: string
  /** Texte « Sorti le {date} » sous le nom d'un membre sorti. `date` est déjà formatée. */
  leftSince?: (date: string) => string
  /** Texte affiché à la place de l'email quand c'est un placeholder (défaut FR « Email manquant »). */
  emailMissing?: string
}

export interface MembersListProps {
  members: MemberRow[]
  isLoading?: boolean
  /**
   * Action « Bloquer l'accès » sur une ligne active (ADM-007). Si aucun des trois
   * callbacks d'accès n'est fourni, la colonne « Actions » (menu) est omise — la
   * pastille d'accès reste affichée. Rétro-compatible.
   */
  onLockMember?: (member: MemberRow) => void
  /** Action « Débloquer » sur une ligne bloquée (ADM-007). */
  onUnlockMember?: (member: MemberRow) => void
  /** Action « Voir la fiche » d'un membre (ADM-007). */
  onViewMember?: (member: MemberRow) => void
  /**
   * Action « Renseigner l'email » d'un membre. Si fournie, l'entrée n'apparaît dans le
   * menu que pour les membres dont l'email est un placeholder (`emailIsPlaceholder`).
   */
  onEditMemberEmail?: (member: MemberRow) => void
  /** Chaînes user-facing/a11y (i18n). Tout défaut est FR. */
  labels?: MembersListLabels
}

const DEFAULT_ROLE_LABEL: Record<MemberRoleKey, string> = {
  member: 'Membre',
  treasurer: 'Trésorier',
  president: 'Président',
  network_admin: 'Admin réseau',
}
const ROLE_VARIANT: Record<MemberRoleKey, BadgeVariant> = {
  member: 'neutral',
  treasurer: 'brand',
  president: 'warning',
  network_admin: 'error',
}
const STATUS_PILL: Record<MemberContribStatus, PillStatus> = {
  ok: 'cotisation-ok',
  pending: 'cotisation-pending',
  late: 'cotisation-late',
  exempt: 'cotisation-exempt',
}
const DEFAULT_STATUS_LABEL: Record<MemberContribStatus, string> = {
  ok: 'À jour',
  pending: 'En attente',
  late: 'En retard',
  exempt: 'Exempté',
}
/** Libellé du « rôle » d'un membre sorti (remplace le badge rôle). */
const DEFAULT_FORMER_ROLE_LABEL = 'Ancien membre'
/** a11y du statut `null` (membre sans ligne de cotisation enregistrée). */
const DEFAULT_STATUS_NONE_LABEL = 'Aucune cotisation enregistrée'

const DEFAULT_COLUMN_LABELS: MembersListColumnLabels = {
  fullName: 'Membre',
  role: 'Rôle',
  totalContributed: 'Total cotisé',
  detentionPct: 'Quote-part',
  monthsCount: 'Mois cotisés',
  status: 'Statut',
  access: 'Accès',
}

const DEFAULT_EMPTY_TITLE = 'Aucun membre'
const DEFAULT_EMPTY_DESCRIPTION = "Ce club n'a pas encore de membre correspondant à ce filtre."
const DEFAULT_TABLE_LABEL = 'Membres du club'
const DEFAULT_EMAIL_MISSING = 'Email manquant'
const DEFAULT_LEFT_BADGE = 'Sorti'
const defaultLeftSince: NonNullable<MembersListLabels['leftSince']> = (date) => `Sorti le ${date}`

const defaultSortLabel: NonNullable<MembersListLabels['sortLabel']> = (column, direction) =>
  `Trier par ${column}${
    direction === 'asc' ? ', tri croissant' : direction === 'desc' ? ', tri décroissant' : ''
  }`

const defaultDetentionBarLabel: NonNullable<MembersListLabels['detentionBarLabel']> = (name) =>
  `Quote-part de ${name}`

const col = createColumnHelper<MemberRow>()
const numClass = "text-right [font-feature-settings:'tnum']"

/** Config du menu d'actions par ligne (ADM-007). `enabled=false` → colonne omise. */
interface ActionsConfig {
  enabled: boolean
  labels?: MemberActionsMenuLabels
  onLock?: (member: MemberRow) => void
  onUnlock?: (member: MemberRow) => void
  onViewProfile?: (member: MemberRow) => void
  /** Édition de l'email : n'est proposée que pour les membres au email placeholder. */
  onEditEmail?: (member: MemberRow) => void
}

/** Libellés liés au statut « membre sorti ». */
interface LeftLabels {
  badge: string
  since: (date: string) => string
}

/** Construit les colonnes avec les libellés fournis (défauts FR). */
function buildColumns(
  columnLabels: MembersListColumnLabels,
  roleLabels: Record<MemberRoleKey, string>,
  formerRoleLabel: string,
  statusLabels: Record<MemberContribStatus, string>,
  statusNoneLabel: string,
  accessLabels: Pick<AccessBadgeLabels, 'active' | 'locked'>,
  detentionBarLabel: (name: string) => string,
  leftLabels: LeftLabels,
  emailMissingLabel: string,
  actions: ActionsConfig
) {
  const baseColumns = [
    col.accessor('fullName', {
      header: columnLabels.fullName,
      cell: (c) => {
        const left = c.row.original.membershipStatus === 'left'
        const leaveAt = c.row.original.leaveAt
        return (
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Nom atténué pour un membre sorti (la couleur seule n'est jamais le seul signal). */}
              <span className={cn('font-semibold', left ? 'text-text-sec' : 'text-text')}>
                {c.getValue()}
              </span>
              {left && (
                // Badge neutre + icône « LogOut » : perceptible sans la couleur (texte + icône).
                <Badge variant="neutral">
                  <Icon name="LogOut" size={16} className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                  {leftLabels.badge}
                </Badge>
              )}
            </div>
            {c.row.original.emailIsPlaceholder ? (
              // Email placeholder (membre importé sans email) : on masque le synthétique et on
              // signale clairement l'absence (token text-ter atténué + icône, jamais le rouge brand).
              <span className="inline-flex items-center gap-1 text-[12px] text-text-ter italic">
                <Icon name="MailX" size={16} className="h-3.5 w-3.5" aria-hidden="true" />
                {emailMissingLabel}
              </span>
            ) : (
              <span className="text-[12px] text-text-ter">{c.row.original.email}</span>
            )}
            {left && leaveAt && (
              <span className="text-[12px] text-text-ter">
                {leftLabels.since(formatDate(leaveAt))}
              </span>
            )}
          </div>
        )
      },
    }),
    col.accessor('role', {
      header: columnLabels.role,
      enableSorting: false,
      cell: (c) => {
        // Membre sorti : on affiche « Ancien membre » (état d'adhésion) À LA PLACE du badge
        // rôle de gouvernance — on ne mélange pas les deux notions (décision lead).
        if (c.row.original.membershipStatus === 'left') {
          return <Badge variant="neutral">{formerRoleLabel}</Badge>
        }
        return <Badge variant={ROLE_VARIANT[c.getValue()]}>{roleLabels[c.getValue()]}</Badge>
      },
    }),
    col.accessor('totalContributed', {
      header: columnLabels.totalContributed,
      cell: (c) => <span className={cn(numClass, 'font-semibold')}>{formatEUR(c.getValue())}</span>,
    }),
    col.accessor('detentionPct', {
      header: columnLabels.detentionPct,
      cell: (c) => (
        <div className="flex flex-col items-end gap-1">
          <span className={numClass}>{formatPct(c.getValue(), { showSign: false })}</span>
          <ProgressBar
            value={c.getValue() * 100}
            label={detentionBarLabel(c.row.original.fullName)}
            className="w-20"
          />
        </div>
      ),
    }),
    col.accessor('monthsCount', {
      header: columnLabels.monthsCount,
      cell: (c) => <span className={numClass}>{c.getValue()}</span>,
    }),
    col.accessor('status', {
      header: columnLabels.status,
      enableSorting: false,
      cell: (c) => {
        const s = c.getValue()
        // status `null` → tiret muet, mais on explicite le sens (title + aria-label) pour
        // que l'AT et le survol ne laissent pas un « — » ambigu. `—` reste aria-hidden.
        return s ? (
          <Pill status={STATUS_PILL[s]}>{statusLabels[s]}</Pill>
        ) : (
          // `role="img"` rend l'aria-label permis (un span nu l'interdit) : le « — » devient
          // une image textuelle au sens « aucune cotisation », et `title` sert l'infobulle.
          <span role="img" title={statusNoneLabel} aria-label={statusNoneLabel}>
            <span aria-hidden="true">—</span>
          </span>
        )
      },
    }),
    // Colonne « Accès » (ADM-007), juste après « Statut ».
    col.accessor('accessStatus', {
      header: columnLabels.access,
      enableSorting: false,
      cell: (c) => {
        // Membre sorti : l'accès reste sémantiquement « actif » (aucune sémantique modifiée),
        // mais on atténue visuellement la pastille pour rester cohérent avec la ligne grisée
        // (F2/F4). L'opacité n'est qu'un signal secondaire — le libellé du badge demeure lisible.
        const left = c.row.original.membershipStatus === 'left'
        return (
          <AccessBadge
            status={c.getValue()}
            labels={accessLabels}
            className={left ? 'opacity-60' : undefined}
          />
        )
      },
    }),
  ]

  if (!actions.enabled) return baseColumns

  return [
    ...baseColumns,
    // Colonne d'actions (menu « ··· »). En-tête présent pour l'a11y (scope col),
    // mais visuellement masqué (cohérent avec la réf : pas de libellé visible).
    col.display({
      id: 'actions',
      header: () => <span className="sr-only">{actions.labels?.trigger ?? 'Actions'}</span>,
      cell: (c) => (
        <div className="flex justify-end">
          <MemberActionsMenu
            accessStatus={c.row.original.accessStatus}
            labels={actions.labels}
            onLock={actions.onLock ? () => actions.onLock?.(c.row.original) : undefined}
            onUnlock={actions.onUnlock ? () => actions.onUnlock?.(c.row.original) : undefined}
            onViewProfile={
              actions.onViewProfile ? () => actions.onViewProfile?.(c.row.original) : undefined
            }
            // « Renseigner l'email » : uniquement pour les membres au email placeholder.
            onEditEmail={
              actions.onEditEmail && c.row.original.emailIsPlaceholder
                ? () => actions.onEditEmail?.(c.row.original)
                : undefined
            }
          />
        </div>
      ),
    }),
  ]
}

const ariaSort = (dir: false | 'asc' | 'desc'): 'none' | 'ascending' | 'descending' =>
  dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'

/** Tableau des membres du club (vue trésorier). Présentationnel : tri interne TanStack,
 *  le filtre « impayé » est géré par l'app (URL state). Modèle = PortfolioTable. */
export function MembersList({
  members,
  isLoading,
  onLockMember,
  onUnlockMember,
  onViewMember,
  onEditMemberEmail,
  labels,
}: MembersListProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'totalContributed', desc: true },
  ])

  const columnLabels = React.useMemo(
    () => ({ ...DEFAULT_COLUMN_LABELS, ...labels?.columns }),
    [labels?.columns]
  )
  const roleLabels = React.useMemo(
    () => ({ ...DEFAULT_ROLE_LABEL, ...labels?.roles }),
    [labels?.roles]
  )
  const statusLabels = React.useMemo(
    () => ({ ...DEFAULT_STATUS_LABEL, ...labels?.statuses }),
    [labels?.statuses]
  )
  const formerRoleLabel = labels?.formerRole ?? DEFAULT_FORMER_ROLE_LABEL
  const statusNoneLabel = labels?.statusNone ?? DEFAULT_STATUS_NONE_LABEL
  const accessLabels = labels?.access ?? {}
  const detentionBarLabel = labels?.detentionBarLabel ?? defaultDetentionBarLabel
  const sortLabel = labels?.sortLabel ?? defaultSortLabel
  const tableLabel = labels?.tableLabel ?? DEFAULT_TABLE_LABEL
  const emailMissingLabel = labels?.emailMissing ?? DEFAULT_EMAIL_MISSING
  const leftLabels = React.useMemo<LeftLabels>(
    () => ({
      badge: labels?.leftBadge ?? DEFAULT_LEFT_BADGE,
      since: labels?.leftSince ?? defaultLeftSince,
    }),
    [labels?.leftBadge, labels?.leftSince]
  )

  // Le menu d'actions n'apparaît que si au moins un callback d'action est fourni
  // (rétro-compatibilité : sans callbacks, on garde la pastille sans le menu).
  const actionsEnabled = Boolean(
    onLockMember || onUnlockMember || onViewMember || onEditMemberEmail
  )
  const actionsLabels = labels?.actions

  const columns = React.useMemo(
    () =>
      buildColumns(
        columnLabels,
        roleLabels,
        formerRoleLabel,
        statusLabels,
        statusNoneLabel,
        accessLabels,
        detentionBarLabel,
        leftLabels,
        emailMissingLabel,
        {
          enabled: actionsEnabled,
          labels: actionsLabels,
          onLock: onLockMember,
          onUnlock: onUnlockMember,
          onViewProfile: onViewMember,
          onEditEmail: onEditMemberEmail,
        }
      ),
    [
      columnLabels,
      roleLabels,
      formerRoleLabel,
      statusLabels,
      statusNoneLabel,
      accessLabels,
      detentionBarLabel,
      leftLabels,
      emailMissingLabel,
      actionsEnabled,
      actionsLabels,
      onLockMember,
      onUnlockMember,
      onViewMember,
      onEditMemberEmail,
    ]
  )

  const table = useReactTable({
    data: members,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (!isLoading && members.length === 0) {
    return (
      <EmptyState
        icon="Users"
        title={labels?.emptyTitle ?? DEFAULT_EMPTY_TITLE}
        description={labels?.emptyDescription ?? DEFAULT_EMPTY_DESCRIPTION}
      />
    )
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse" aria-label={tableLabel}>
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b border-border">
              {hg.headers.map((h) => {
                const sortable = h.column.getCanSort()
                return (
                  <th
                    key={h.id}
                    scope="col"
                    aria-sort={sortable ? ariaSort(h.column.getIsSorted()) : undefined}
                    className="text-left text-[12px] font-semibold text-text-ter py-2 px-3 first:pl-0"
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={h.column.getToggleSortingHandler()}
                        aria-label={sortLabel(
                          String(h.column.columnDef.header),
                          h.column.getIsSorted()
                        )}
                        className="inline-flex items-center gap-1 focus-visible:shadow-[var(--sh-glow)] focus-visible:outline-none rounded"
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        <span aria-hidden="true">
                          {h.column.getIsSorted() === 'asc'
                            ? '↑'
                            : h.column.getIsSorted() === 'desc'
                              ? '↓'
                              : '↕'}
                        </span>
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {columns.map((_c, j) => (
                    <td key={j} className="py-3 px-3 first:pl-0">
                      <div className="h-4 rounded bg-card-sub motion-safe:animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            : table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  data-testid="member-row"
                  data-member-status={row.original.membershipStatus ?? 'active'}
                  className={cn(
                    'border-b border-border align-middle',
                    // Membre sorti : fond atténué (signal secondaire, jamais le seul — cf. badge + date).
                    row.original.membershipStatus === 'left' && 'bg-card-sub/40'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="py-3 px-3 first:pl-0 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  )
}
