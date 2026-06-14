'use client'

import dynamic from 'next/dynamic'
import { useCallback } from 'react'
import { useTranslations } from 'next-intl'

import { useToast, type IosInstallInstructionsCopy } from '@evolve/ui'

import { analyticsEvents } from '@/lib/analytics'
import { detectIosDevice } from '@/lib/pwa/platform-detection'
import { usePwaActions } from '@/lib/pwa/use-pwa-install'

const IosInstallInstructions = dynamic(
  () => import('@evolve/ui').then((m) => m.IosInstallInstructions),
  { ssr: false }
)

const HANDOFF_ENDPOINT = '/api/auth/handoff-link'

/**
 * Ouvre le lien de connexion directement dans Safari via le scheme x-safari-https://.
 * Sur iOS, cette redirection force l'ouverture du lien dans Safari (peu importe le navigateur courant),
 * ce qui permet à l'utilisateur d'être connecté automatiquement et d'installer la PWA depuis Safari.
 * Fallback sur la copie dans le presse-papier si la redirection échoue.
 */
async function openHandoffInSafari(): Promise<'redirected' | 'copied' | 'failed'> {
  try {
    const r = await fetch(HANDOFF_ENDPOINT, { method: 'POST' })
    if (!r.ok) return 'failed'
    const { url } = (await r.json()) as { url: string }
    // x-safari-https:// force Safari à s'ouvrir sur iOS (Chrome, Firefox, etc.).
    const safariUrl = url.replace(/^https:\/\//, 'x-safari-https://')
    window.location.href = safariUrl
    return 'redirected'
  } catch {
    // Dernier recours : copie dans le presse-papier (ancien comportement).
    try {
      const r = await fetch(HANDOFF_ENDPOINT, { method: 'POST' })
      if (r.ok) {
        const { url } = (await r.json()) as { url: string }
        await navigator.clipboard.writeText(url)
        return 'copied'
      }
    } catch {
      /* noop */
    }
    return 'failed'
  }
}

/**
 * Section « Installer l'app sur ton téléphone » de /profil (PWA-001). Entrée permanente
 * pour (ré)installer à la demande — utile notamment après 3 refus (migration permanente de
 * la bannière). Masquée si déjà en standalone ou sur desktop. Reprend le flow du cas courant.
 */
export function InstallSection() {
  const t = useTranslations('pwa')
  const toast = useToast()
  const {
    pwaCase,
    isInstructionModalOpen,
    promptInstall,
    openInstructionModal,
    closeInstructionModal,
  } = usePwaActions()

  // SSR-safe : pwaCase = 'unsupported' au render serveur + hydratation → promptable false → null.
  const promptable =
    pwaCase === 'android-chrome' || pwaCase === 'ios-safari' || pwaCase === 'ios-other'

  const handleClick = useCallback(async () => {
    analyticsEvents.pwa.ctaClicked(pwaCase)
    if (pwaCase === 'android-chrome') {
      const outcome = await promptInstall()
      if (outcome === 'accepted') analyticsEvents.pwa.installCompleted(pwaCase)
      return
    }
    if (pwaCase === 'ios-safari') {
      openInstructionModal()
      return
    }
    // ios-other (Chrome, Firefox iOS…) : ouvre Safari directement avec le lien de handoff.
    // L'utilisateur atterrit sur Safari connecté et peut installer la PWA depuis l'écran d'accueil.
    const outcome = await openHandoffInSafari()
    if (outcome === 'redirected') {
      analyticsEvents.pwa.ctaClicked('ios-other')
    } else if (outcome === 'copied') {
      analyticsEvents.pwa.clipboardCopied()
      toast.success({ title: t('toastCopied.title'), message: t('toastCopied.message') })
    }
  }, [pwaCase, promptInstall, openInstructionModal, toast, t])

  if (!promptable) return null

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
    next: t('modal.next'),
    done: t('modal.done'),
    close: t('modal.close'),
    stepLabel: (current, total) => t('modal.stepLabel', { current, total }),
  }

  return (
    <section className="rounded-lg border border-border bg-card p-6 shadow-card">
      <h2 className="font-display text-[18px] font-bold text-text">{t('profileSection.title')}</h2>
      <p className="mt-1 font-body text-[14px] text-text-sec">{t('profileSection.body')}</p>
      <button
        type="button"
        onClick={() => void handleClick()}
        className="mt-4 inline-flex h-12 items-center justify-center rounded-(--r-md) bg-accent px-6 font-body text-[16px] font-semibold text-accent-ink transition-opacity hover:opacity-90"
      >
        {pwaCase === 'ios-other' ? t('iosOther.cta') : t('profileSection.button')}
      </button>
      {pwaCase === 'ios-safari' ? (
        <IosInstallInstructions
          open={isInstructionModalOpen}
          device={device}
          onClose={closeInstructionModal}
          onStepView={(step) => analyticsEvents.pwa.iosInstructionsViewed(pwaCase, step)}
          copy={modalCopy}
        />
      ) : null}
    </section>
  )
}
