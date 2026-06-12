import { getTranslations } from 'next-intl/server'
import { Badge, Heading } from '@evolve/ui'
import { formatDate } from '@evolve/utils'
import type { MemberRole, ProfileData } from '@/lib/data/profile'
import { InstallSection } from './InstallSection'
import { ProfileAvatarUpload } from './ProfileAvatarUpload'

const DASH = '—'

/** Variante de Badge selon le rôle : staff (président/trésorier/admin) = accent, membre = neutre. */
function roleVariant(role: MemberRole): 'neutral' | 'success' {
  return role === 'member' ? 'neutral' : 'success'
}

/**
 * Fiche profil membre (A2) — lecture seule V0. Server Component présentation :
 * en-tête (avatar + nom + rôle + club) puis liste d'infos clé/valeur. Aucun champ ne
 * tombe en NaN/undefined : fallback systématique sur « — ». i18n FR/EN, light/dark via tokens.
 * L'édition du profil (et l'avatar) reste un suivi V1 — ici, pas d'interactivité.
 */
export async function ProfileView({ data }: { data: ProfileData }) {
  const t = await getTranslations('profile')

  const displayName = data.fullName ?? t('unknownName')
  const roleLabel = data.role ? t(`roles.${data.role}`) : null
  const joinedLabel = data.joinedAt ? formatDate(data.joinedAt) : DASH
  const clubLabel = data.club ? [data.club.name, data.club.city].filter(Boolean).join(' · ') : DASH

  const rows: { label: string; value: string }[] = [
    { label: t('fields.email'), value: data.email ?? DASH },
    { label: t('fields.phone'), value: data.phone ?? DASH },
    { label: t('fields.club'), value: clubLabel },
    { label: t('fields.role'), value: roleLabel ?? DASH },
    { label: t('fields.joinedAt'), value: joinedLabel },
  ]

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Heading level="h1">{t('title')}</Heading>
        <p className="font-body text-[14px] text-text-sec">{t('subtitle')}</p>
      </header>

      <section className="rounded-lg border border-border bg-card p-6 shadow-card">
        <div className="flex items-center gap-4">
          {/* Avatar cliquable — ouvre le sélecteur de fichier (ProfileAvatarUpload est client). */}
          <ProfileAvatarUpload initialUrl={data.avatarUrl} name={displayName} />
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="truncate font-display text-[18px] font-bold text-text">{displayName}</p>
            {roleLabel && data.role ? (
              <span>
                <Badge variant={roleVariant(data.role)}>{roleLabel}</Badge>
              </span>
            ) : null}
          </div>
        </div>

        <dl className="mt-6 flex flex-col divide-y divide-border">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <dt className="font-body text-[13px] font-medium text-text-sec">{row.label}</dt>
              <dd className="font-body text-[14px] text-text sm:text-right">{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="font-body text-[13px] text-text-ter">{t('avatarHint')}</p>

      {/* PWA-001 : (ré)installer l'app à la demande (entrée permanente, surtout utile après
          3 refus de la bannière). Masquée si déjà installée (standalone) ou sur desktop. */}
      <InstallSection />
    </div>
  )
}
