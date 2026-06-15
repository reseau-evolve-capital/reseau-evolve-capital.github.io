'use client'

import dynamic from 'next/dynamic'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

import { PwaInstallSheet, useToast, type IosInstallInstructionsCopy } from '@evolve/ui'

import { analyticsEvents } from '@/lib/analytics'
import { useConsentResolved } from '@/lib/consent/use-consent'
import { dismissStore } from '@/lib/pwa/dismiss-storage'
import { detectIosDevice } from '@/lib/pwa/platform-detection'
import { usePwaInstall } from '@/lib/pwa/use-pwa-install'
import { InstallBannerErrorBoundary } from './InstallBannerErrorBoundary'

// Modale iOS chargée à la demande (case 2 uniquement) → 0 Ko sur le bundle Dashboard initial.
const IosInstallInstructions = dynamic(
  () => import('@evolve/ui').then((m) => m.IosInstallInstructions),
  { ssr: false }
)

function InstallBannerInner() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('pwa')
  const toast = useToast()

  // Arrivée fraîchement connecté en Safari via le lien de handoff (`/dashboard?pwa=ios`) :
  // on force l'affichage immédiat de la bannière (bypass éligibilité + délai 0).
  const forceImmediate = searchParams.get('pwa') === 'ios'

  const {
    pwaCase,
    shouldShowBanner,
    isInstructionModalOpen,
    promptInstall,
    openInstructionModal,
    closeInstructionModal,
    dismiss,
    copyHandoffLink,
  } = usePwaInstall({ forceImmediate })

  // Masquage local après une action terminée (install acceptée, dismiss, modale fermée).
  const [hidden, setHidden] = useState(false)

  // Priorité au consentement RGPD : tant que le visiteur n'a pas tranché les cookies, la
  // bannière de consentement (bottom) est affichée → on supprime le prompt PWA (lui aussi
  // ancré en bas) pour éviter tout chevauchement. Une fois le consentement résolu, le prompt
  // PWA peut apparaître.
  const consentResolved = useConsentResolved()

  // SSR-safe : pwaCase = 'unsupported' au render serveur + pendant l'hydratation
  // (useSyncExternalStore dans usePwaInstall) → promptable false → on ne rend rien.
  const onDashboard = pathname === '/dashboard'
  const promptable =
    pwaCase === 'android-chrome' || pwaCase === 'ios-safari' || pwaCase === 'ios-other'
  const visible = onDashboard && promptable && shouldShowBanner && !hidden && consentResolved

  // Analytics : bannière affichée (une fois).
  useEffect(() => {
    if (!visible) return
    try {
      const state = dismissStore.read()
      analyticsEvents.pwa.bannerShown(pwaCase, state.visitCount, state.dismissCount)
    } catch {
      /* analytics no-op safe */
    }
  }, [visible, pwaCase])

  // Nettoie le paramètre `?pwa=ios` de l'URL après montage, pour qu'un refresh ne re-déclenche
  // pas l'affichage forcé. Strip une seule fois (router.replace même chemin → pas de boucle).
  useEffect(() => {
    if (!onDashboard) return
    if (searchParams.get('pwa') === null) return
    router.replace(pathname)
  }, [onDashboard, searchParams, router, pathname])

  const handleDismiss = useCallback(() => {
    try {
      const state = dismissStore.read()
      analyticsEvents.pwa.dismissed(pwaCase, state.dismissCount)
    } catch {
      /* noop */
    }
    dismiss()
    setHidden(true)
  }, [dismiss, pwaCase])

  const handleCta = useCallback(async () => {
    analyticsEvents.pwa.ctaClicked(pwaCase)
    if (pwaCase === 'android-chrome') {
      const outcome = await promptInstall()
      if (outcome === 'accepted') analyticsEvents.pwa.installCompleted(pwaCase)
      // Quelle que soit l'issue, on retire la bannière (le store gère le cooldown si refusé).
      setHidden(true)
      return
    }
    if (pwaCase === 'ios-safari') {
      openInstructionModal()
      return
    }
    // ios-other : copie un lien de connexion portable (auto-login en Safari) puis invite à
    // coller. Si le handoff échoue, on retombe sur la copie de l'URL courante.
    const { ok, usedHandoff } = await copyHandoffLink()
    if (ok) {
      analyticsEvents.pwa.clipboardCopied()
      if (usedHandoff) {
        toast.success({ title: t('toastCopied.title'), message: t('toastCopied.message') })
      } else {
        toast.success({
          title: t('toastCopiedPlain.title'),
          message: t('toastCopiedPlain.message'),
        })
      }
    }
    setHidden(true)
  }, [pwaCase, promptInstall, openInstructionModal, copyHandoffLink, toast, t])

  // Fermeture de la modale iOS (Done ou Escape) = on a montré les instructions → cooldown + masquage.
  const handleModalClose = useCallback(() => {
    closeInstructionModal()
    dismiss()
    setHidden(true)
  }, [closeInstructionModal, dismiss])

  const onStepView = useCallback(
    (step: number) => analyticsEvents.pwa.iosInstructionsViewed(pwaCase, step),
    [pwaCase]
  )

  if (!promptable) return null

  // Copy par cas avec clés littérales (t() est typé sur fr.json — pas de clé dynamique).
  const caseCopy = {
    'android-chrome': {
      headline: t('androidChrome.headline'),
      subline: t('androidChrome.subline'),
      cta: t('androidChrome.cta'),
    },
    'ios-safari': {
      headline: t('iosSafari.headline'),
      subline: t('iosSafari.subline'),
      cta: t('iosSafari.cta'),
    },
    'ios-other': {
      headline: t('iosOther.headline'),
      subline: t('iosOther.subline'),
      cta: t('iosOther.cta'),
    },
  }[pwaCase as 'android-chrome' | 'ios-safari' | 'ios-other']
  const device = detectIosDevice()

  const modalCopy: IosInstallInstructionsCopy = {
    step1Title: device === 'ipad' ? t('modal.step1TitleIpad') : t('modal.step1TitleIphone'),
    step1Body: t('modal.step1Body'),
    step1Caption: device === 'ipad' ? t('modal.step1CaptionIpad') : t('modal.step1CaptionIphone'),
    step2Title: t('modal.step2Title'),
    step2Body: t('modal.step2Body'),
    step2Caption: t('modal.step2Caption'),
    versionNote: t('modal.versionNote'),
    step2HighlightLabel: t('modal.step2HighlightLabel'),
    firstLoginNote: t('modal.firstLoginNote'),
    next: t('modal.next'),
    done: t('modal.done'),
    close: t('modal.close'),
    stepLabel: (current, total) => t('modal.stepLabel', { current, total }),
  }

  return (
    <>
      <PwaInstallSheet
        open={visible}
        headline={caseCopy.headline}
        subline={caseCopy.subline}
        badge={t('badge')}
        ctaLabel={caseCopy.cta}
        dismissLabel={t('dismiss')}
        closeLabel={t('close')}
        onCta={() => void handleCta()}
        onDismiss={handleDismiss}
      />
      {pwaCase === 'ios-safari' ? (
        <IosInstallInstructions
          open={isInstructionModalOpen}
          device={device}
          onClose={handleModalClose}
          onStepView={onStepView}
          copy={modalCopy}
        />
      ) : null}
    </>
  )
}

/**
 * Point de montage de la bannière PWA (PWA-001). Monté dans le layout (app) (persiste entre
 * onglets) mais ne s'affiche que sur /dashboard. Toute la logique est enrobée d'un
 * ErrorBoundary : une erreur ici ne peut jamais crasher le dashboard. Le `Suspense` est requis
 * par `useSearchParams` (lecture de `?pwa=ios`) — fallback `null`, rien à afficher en attente.
 */
export function InstallBannerMount() {
  return (
    <InstallBannerErrorBoundary>
      <Suspense fallback={null}>
        <InstallBannerInner />
      </Suspense>
    </InstallBannerErrorBoundary>
  )
}
