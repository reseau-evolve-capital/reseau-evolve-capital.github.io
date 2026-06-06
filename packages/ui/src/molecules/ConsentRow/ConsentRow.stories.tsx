import type { Meta, StoryObj } from '@storybook/react'
import { fn, within, userEvent, expect } from 'storybook/test'
import { ConsentRow } from './ConsentRow'

const meta: Meta<typeof ConsentRow> = {
  title: 'Molecules/ConsentRow',
  component: ConsentRow,
  tags: ['autodocs'],
  args: {
    onCheckedChange: fn(),
  },
}
export default meta
type Story = StoryObj<typeof ConsentRow>

export const Default: Story = {
  args: {
    checked: false,
    label: "J'accepte les conditions générales d'utilisation",
  },
}

export const Checked: Story = {
  args: {
    checked: true,
    label: "J'accepte les conditions générales d'utilisation",
  },
}

export const Required: Story = {
  args: {
    checked: false,
    required: true,
    label: 'Consentement obligatoire',
  },
}

export const WithLink: Story = {
  args: {
    checked: false,
    label: "J'accepte les conditions générales",
    linkHref: 'https://example.com/cgu',
    linkLabel: 'lire',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    // Clique sur le texte du label (pas le lien) — doit toggler la checkbox
    const labelEl = canvas.getByText("J'accepte les conditions générales")
    await userEvent.click(labelEl)
    expect(args.onCheckedChange).toHaveBeenCalledWith(true)
    // Clique sur [lire] — le lien est sibling du label, NE doit pas toggler la checkbox
    const linkEl = canvas.getByRole('link', { name: '[lire]' })
    ;(args.onCheckedChange as ReturnType<typeof fn>).mockClear()
    await userEvent.click(linkEl)
    expect(args.onCheckedChange).not.toHaveBeenCalled()
  },
}

/**
 * `linkTarget="_blank"` : le lien de détail s'ouvre dans un nouvel onglet
 * (avec `rel="noopener noreferrer"`). Utile dans un flux à état volatile
 * (onboarding) où une navigation pleine page viderait le store en mémoire.
 */
export const ExternalTab: Story = {
  args: {
    checked: false,
    label: "J'accepte la charte du réseau",
    linkHref: '/legal/charter',
    linkLabel: 'lire',
    linkTarget: '_blank',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const linkEl = canvas.getByRole('link', { name: '[lire]' })
    expect(linkEl).toHaveAttribute('target', '_blank')
    expect(linkEl).toHaveAttribute('rel', 'noopener noreferrer')
  },
}
