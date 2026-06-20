'use client'

// NotificationsSection (PUSH-001 ; spec §2.3 / §6) — réglages Web Push du profil.
//
// - Toggle MASTER : ON déclenche le flux subscribe (requestPermission → subscribe → POST),
//   OFF désabonne l'endpoint courant (unsubscribe SW + DELETE serveur).
// - Toggles PAR TYPE (poll_opened / poll_closed / poll_reminder) : bound à push_preferences
//   (read + upsert via le client Supabase navigateur, RLS owner). Désactivés tant que le
//   master est OFF.
// - iOS hors écran d'accueil (`needs_pwa_install`) → encart « installe l'app » + lien profil
//   PWA (pas de toggle actif). `blocked` → hint d'autorisation navigateur.
//
// Crash-safe : aucune erreur ne remonte (toasts d'erreur, états gardés). En dev (SW prod-only)
// le subscribe renvoie 'unsupported' — c'est attendu ; le vrai push se teste en preview HTTPS.

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'

import { Badge, Icon, Switch, useToast } from '@evolve/ui'

import { useSupabase } from '@/components/providers/SupabaseProvider'
import { canSubscribeOnPlatform } from '@/lib/push/permission'
import { getSubscriptionState, subscribePush, unsubscribePush } from '@/lib/push/subscribe'
import type { PushPlatformCapability } from '@/lib/push/platform-push'

type PrefKey = 'poll_opened' | 'poll_closed' | 'poll_reminder'

type Prefs = {
  enabled: boolean
  poll_opened: boolean
  poll_closed: boolean
  poll_reminder: boolean
}

const DEFAULT_PREFS: Prefs = {
  enabled: true,
  poll_opened: true,
  poll_closed: true,
  poll_reminder: true,
}

const TYPE_KEYS: PrefKey[] = ['poll_opened', 'poll_closed', 'poll_reminder']

// Aide générique « comment réactiver les notifications du navigateur » (lien externe).
const BROWSER_NOTIF_HELP_URL = 'https://support.google.com/chrome/answer/3220216'

/** En-tête de la section : pastille cloche jaune + titre/sous-titre + badge de statut. */
function SectionHeader({ title, body, badge }: { title: string; body: string; badge: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink"
          aria-hidden="true"
        >
          <Icon name="Bell" size={20} />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-[18px] font-bold leading-tight text-text">{title}</h2>
          <p className="mt-0.5 font-body text-[13px] text-text-sec">{body}</p>
        </div>
      </div>
      {badge ? <div className="shrink-0">{badge}</div> : null}
    </div>
  )
}

export function NotificationsSection() {
  const t = useTranslations('push')
  const toast = useToast()
  const supabase = useSupabase()

  // Résolu après hydratation (SSR-safe : capability 'unsupported' au render serveur).
  const [capability, setCapability] = useState<PushPlatformCapability>('unsupported')
  // Abonné sur CET appareil (subscription présente dans le PushManager) → pilote le master.
  const [subscribed, setSubscribed] = useState(false)
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)

  // Chargement initial : capacité plateforme + état subscription + préférences (RLS owner).
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        setCapability(canSubscribeOnPlatform())
        const state = await getSubscriptionState()
        if (cancelled) return
        setSubscribed(state.subscribed)

        const { data: auth } = await supabase.auth.getUser()
        if (auth.user) {
          const { data } = await supabase
            .from('push_preferences')
            .select('enabled, poll_opened, poll_closed, poll_reminder')
            .eq('user_id', auth.user.id)
            .maybeSingle()
          if (!cancelled && data) setPrefs({ ...DEFAULT_PREFS, ...data })
        }
      } catch {
        /* dégrade silencieusement vers les défauts */
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [supabase])

  /** Upsert d'un sous-ensemble des préférences (RLS owner via le client navigateur). */
  const persistPrefs = useCallback(
    async (next: Partial<Prefs>) => {
      try {
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) return
        await supabase
          .from('push_preferences')
          .upsert(
            { user_id: auth.user.id, ...next, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' }
          )
      } catch {
        /* non bloquant : l'état local reste ; l'Edge appliquera les défauts si absent */
      }
    },
    [supabase]
  )

  // Master ON → subscribe ; OFF → unsubscribe. L'état local suit l'issue réelle.
  const handleMasterToggle = useCallback(
    async (checked: boolean) => {
      if (busy) return
      setBusy(true)
      try {
        if (checked) {
          const result = await subscribePush()
          if (result === 'subscribed') {
            setSubscribed(true)
            setPrefs((p) => ({ ...p, enabled: true }))
            await persistPrefs({ enabled: true })
            toast.success({ title: t('toastSuccess.title'), message: t('toastSuccess.message') })
          } else if (result === 'denied') {
            setSubscribed(false)
            toast.error({ title: t('toastBlocked.title'), message: t('toastBlocked.message') })
          } else {
            setSubscribed(false)
            toast.error({ title: t('toastError.title'), message: t('toastError.message') })
          }
        } else {
          await unsubscribePush()
          setSubscribed(false)
          setPrefs((p) => ({ ...p, enabled: false }))
          await persistPrefs({ enabled: false })
          toast.success({ title: t('toastDisabled.title'), message: t('toastDisabled.message') })
        }
      } catch {
        toast.error({ title: t('toastError.title'), message: t('toastError.message') })
      } finally {
        setBusy(false)
      }
    },
    [busy, persistPrefs, toast, t]
  )

  const handleTypeToggle = useCallback(
    (key: PrefKey, checked: boolean) => {
      setPrefs((p) => ({ ...p, [key]: checked }))
      void persistPrefs({ [key]: checked })
    },
    [persistPrefs]
  )

  // SSR-safe : tant qu'on n'a pas résolu côté client, on ne rend rien (évite un flash de l'encart
  // iOS sur desktop ou inversement).
  if (!ready) return null

  // iOS hors écran d'accueil : on n'affiche PAS de toggle (impossible de s'abonner) → encart
  // d'installation pointant vers la section PWA du profil.
  if (capability === 'needs_pwa_install' || capability === 'needs_safari') {
    return (
      <section
        id="notifications"
        className="rounded-lg border border-border bg-card p-6 shadow-card"
      >
        <SectionHeader
          title={t('section.title')}
          body={t('section.body')}
          badge={<Badge variant="neutral">{t('section.statusOff')}</Badge>}
        />
        {/* Encart ambre : notifications indisponibles → renvoie vers l'installation de l'app. */}
        <div className="mt-5 rounded-[12px] border border-data-warning bg-data-warning-50 p-4">
          <div className="flex items-start gap-3">
            <Icon
              name="Smartphone"
              size={20}
              className="mt-0.5 shrink-0 text-data-warning-strong"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="font-body text-[14px] font-semibold text-data-warning-strong">
                {t('section.iosTitle')}
              </p>
              <p className="mt-1 font-body text-[13px] leading-relaxed text-text-sec">
                {t('section.iosHint')}
              </p>
              <a
                href="/profil"
                className="mt-3 inline-flex h-11 items-center justify-center rounded-[var(--r-md)] bg-accent px-4 font-body text-[14px] font-semibold text-accent-ink transition-opacity duration-[150ms] hover:opacity-90 focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)]"
              >
                {t('section.iosCta')}
              </a>
            </div>
          </div>
        </div>
      </section>
    )
  }

  // unsupported : navigateur sans support → on masque la section (rien d'actionnable).
  if (capability === 'unsupported') return null

  // Master « actif » du point de vue UI = abonné sur cet appareil ET préférence enabled.
  const masterOn = subscribed && prefs.enabled
  const blocked = capability === 'blocked'

  // Badge de statut (haut-droite de l'en-tête) : actif / refusé / non configuré.
  const statusBadge = blocked ? (
    <Badge variant="warning">{t('section.statusBlocked')}</Badge>
  ) : masterOn ? (
    <Badge variant="success">{t('section.statusActive')}</Badge>
  ) : (
    <Badge variant="neutral">{t('section.statusOff')}</Badge>
  )

  // Copy par type avec clés littérales (t() est typé sur fr.json — pas de clé dynamique).
  const typeCopy: Record<PrefKey, { label: string; hint: string }> = {
    poll_opened: {
      label: t('section.types.pollOpened.label'),
      hint: t('section.types.pollOpened.hint'),
    },
    poll_closed: {
      label: t('section.types.pollClosed.label'),
      hint: t('section.types.pollClosed.hint'),
    },
    poll_reminder: {
      label: t('section.types.pollReminder.label'),
      hint: t('section.types.pollReminder.hint'),
    },
  }

  return (
    <section id="notifications" className="rounded-lg border border-border bg-card p-6 shadow-card">
      <SectionHeader title={t('section.title')} body={t('section.body')} badge={statusBadge} />

      {/* Master */}
      <div className="mt-5 flex items-start justify-between gap-4 border-t border-border pt-5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <label htmlFor="push-master" className="font-body text-[14px] font-medium text-text">
            {t('section.masterLabel')}
          </label>
          <p className="font-body text-[13px] text-text-ter">{t('section.masterHint')}</p>
        </div>
        <Switch
          id="push-master"
          checked={masterOn}
          disabled={busy || blocked}
          onCheckedChange={(c) => void handleMasterToggle(c)}
          aria-label={t('section.masterLabel')}
        />
      </div>

      {blocked ? (
        <p className="mt-3 flex items-center gap-2 font-body text-[13px] text-text-sec">
          <Icon
            name="TriangleAlert"
            size={16}
            className="shrink-0 text-data-warning-strong"
            aria-hidden="true"
          />
          <span>
            {t('section.blockedHintPre')}{' '}
            <a
              href={BROWSER_NOTIF_HELP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-accent underline underline-offset-2 transition-opacity duration-[150ms] hover:opacity-80 focus-visible:outline-none focus-visible:shadow-[var(--sh-glow)]"
            >
              {t('section.blockedHintLink')}
            </a>
          </span>
        </p>
      ) : null}

      {/* Sous-préférences par type */}
      <fieldset
        className="mt-5 flex flex-col gap-4 border-t border-border pt-5"
        disabled={!masterOn}
      >
        <legend className="font-body text-[13px] font-medium text-text-sec">
          {t('section.typesLabel')}
        </legend>
        {TYPE_KEYS.map((key) => (
          <div key={key} className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-0.5">
              <label htmlFor={`push-${key}`} className="font-body text-[14px] text-text">
                {typeCopy[key].label}
              </label>
              <p className="font-body text-[13px] text-text-ter">{typeCopy[key].hint}</p>
            </div>
            <Switch
              id={`push-${key}`}
              checked={masterOn && prefs[key]}
              disabled={!masterOn}
              onCheckedChange={(c) => handleTypeToggle(key, c)}
              aria-label={typeCopy[key].label}
            />
          </div>
        ))}
      </fieldset>
    </section>
  )
}
