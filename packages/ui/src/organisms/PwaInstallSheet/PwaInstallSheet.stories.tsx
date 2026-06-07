import type { Meta, StoryObj } from '@storybook/react'
import { fn, within, userEvent, expect, waitFor } from 'storybook/test'
import * as React from 'react'

import { PwaInstallSheet, type PwaInstallSheetProps } from './PwaInstallSheet'

// Copy d'exemple (spec §5). Le composant est présentationnel : aucune string n'est
// codée en dur dedans, les stories fournissent le copy comme le fait apps/web (i18n).
const BADGE = 'Web app · sans App Store'
const DISMISS = 'Plus tard'

const COPY = {
  android: {
    headline: 'Garde-la sous la main.',
    subline:
      "Installe Evolve Capital sur ton écran d'accueil. Ouvre ta part d'un geste, sans passer par le navigateur.",
    ctaLabel: 'Installer',
  },
  iosSafari: {
    headline: 'Ta part. Toujours avec toi.',
    subline: "Ajoute Evolve Capital à ton écran d'accueil en deux étapes. On te montre où appuyer.",
    ctaLabel: 'Voir comment',
  },
  iosOther: {
    headline: 'Ouvre-la dans Safari.',
    subline:
      "L'installation se fait depuis Safari sur iPhone. On copie l'adresse — tu n'as qu'à la coller.",
    ctaLabel: 'Continuer dans Safari',
  },
} as const

// Décorateur : cadre l'aperçu façon viewport mobile pour voir la bannière ancrée en bas.
const PhoneFrame = (Story: React.ComponentType) => (
  <div className="relative h-[420px] w-full overflow-hidden rounded-[14px] bg-bg-page">
    <Story />
  </div>
)

const meta: Meta<typeof PwaInstallSheet> = {
  title: 'Organisms/PwaInstallSheet',
  component: PwaInstallSheet,
  tags: ['autodocs'],
  args: {
    open: true,
    badge: BADGE,
    dismissLabel: DISMISS,
    onCta: fn(),
    onDismiss: fn(),
    // Reduced-motion par défaut dans les stories : transitions instantanées →
    // les play functions n'ont pas à attendre le slide (et axe scanne un état stable).
    reducedMotion: true,
  },
  decorators: [PhoneFrame],
}
export default meta
type Story = StoryObj<typeof PwaInstallSheet>

/** Android Chrome : CTA « Installer » → déclenche le prompt natif. */
export const AndroidChrome: Story = {
  args: { ...COPY.android },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    // role=dialog présent + aria-labelledby résout vers le headline.
    const dialog = canvas.getByRole('dialog')
    const labelledby = dialog.getAttribute('aria-labelledby')
    await expect(labelledby).toBeTruthy()
    await expect(canvasElement.querySelector(`#${labelledby}`)?.textContent).toBe(
      COPY.android.headline
    )
    // Clic CTA → onCta.
    await userEvent.click(canvas.getByRole('button', { name: COPY.android.ctaLabel }))
    await expect(args.onCta).toHaveBeenCalledTimes(1)
    // Clic « Plus tard » → onDismiss.
    await userEvent.click(canvas.getByRole('button', { name: DISMISS }))
    await expect(args.onDismiss).toHaveBeenCalled()
  },
}

/** iOS Safari : CTA « Voir comment » ouvre la modale d'instructions (côté app). */
export const IosSafari: Story = {
  args: { ...COPY.iosSafari },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    // Tab jusqu'au CTA puis Entrée (clavier).
    const cta = canvas.getByRole('button', { name: COPY.iosSafari.ctaLabel })
    cta.focus()
    await expect(cta).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    await expect(args.onCta).toHaveBeenCalledTimes(1)
  },
}

/** iOS autre navigateur (CriOS/FxiOS) : CTA « Continuer dans Safari » copie l'URL. */
export const IosOther: Story = {
  args: { ...COPY.iosOther },
}

/** CTA en chargement : spinner, largeur conservée, bouton non cliquable. */
export const CtaLoading: Story = {
  args: { ...COPY.android, ctaState: 'loading' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const cta = canvas.getByRole('button', { name: COPY.android.ctaLabel })
    await expect(cta).toBeDisabled()
    await expect(cta).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(cta)
    await expect(args.onCta).not.toHaveBeenCalled()
  },
}

/** CTA désactivé : attribut disabled + opacité réduite. */
export const CtaDisabled: Story = {
  args: { ...COPY.android, ctaState: 'disabled' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const cta = canvas.getByRole('button', { name: COPY.android.ctaLabel })
    await expect(cta).toBeDisabled()
    await userEvent.click(cta)
    await expect(args.onCta).not.toHaveBeenCalled()
  },
}

/** Variante sombre : data-theme="dark" sur un wrapper. */
export const Dark: Story = {
  args: { ...COPY.iosSafari },
  decorators: [
    (Story) => (
      <div
        data-theme="dark"
        className="relative h-[420px] w-full overflow-hidden rounded-[14px] bg-bg-page"
      >
        <Story />
      </div>
    ),
  ],
  // PhoneFrame est remplacé par le décorateur local (sinon double-wrap).
  parameters: { layout: 'fullscreen' },
}

/** Animée (sans reduced-motion) : vérifie l'apparition/disparition au toggle open. */
export const Animated: Story = {
  args: { ...COPY.android, reducedMotion: false },
  render: (args: PwaInstallSheetProps) => {
    const [open, setOpen] = React.useState(args.open)
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="m-4 rounded-md bg-accent px-4 py-2 text-[14px] font-semibold text-accent-ink"
        >
          Toggle
        </button>
        <PwaInstallSheet {...args} open={open} onDismiss={() => setOpen(false)} />
      </>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => expect(canvas.getByRole('dialog')).toBeTruthy())
  },
}
