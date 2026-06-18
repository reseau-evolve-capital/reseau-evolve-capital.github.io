import type { Meta, StoryObj } from '@storybook/react'
import { fn, within, userEvent, expect } from 'storybook/test'
import { useState } from 'react'
import { SheetConnectionTest, type SheetConnectionTestProps } from './SheetConnectionTest'
import { DEMO_LABELS } from './fixtures'

const SA_EMAIL = 'sync-bot@evolve-capital-prod.iam.gserviceaccount.com'

const meta: Meta<typeof SheetConnectionTest> = {
  title: 'Molecules/SheetConnectionTest',
  component: SheetConnectionTest,
  tags: ['autodocs'],
  args: {
    serviceAccountEmail: SA_EMAIL,
    labels: DEMO_LABELS,
    onChange: fn(),
    onCopyEmail: fn(),
    onTest: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ padding: 16, maxWidth: 640, background: 'var(--color-bg-page)' }}>
        <Story />
      </div>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof SheetConnectionTest>

/** Wrapper contrôlé pour les stories interactives. */
function Controlled(props: Partial<SheetConnectionTestProps>) {
  const [value, setValue] = useState(props.value ?? '')
  return (
    <SheetConnectionTest
      serviceAccountEmail={SA_EMAIL}
      labels={DEMO_LABELS}
      onCopyEmail={fn()}
      onTest={fn()}
      status="idle"
      {...props}
      value={value}
      onChange={(v) => {
        setValue(v)
        props.onChange?.(v)
      }}
    />
  )
}

/** État initial : champ vide, bouton de test désactivé tant qu'aucune valeur. */
export const Idle: Story = {
  render: () => <Controlled />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Sans valeur saisie, le bouton « Tester la connexion » est désactivé.
    await expect(canvas.getByRole('button', { name: /Tester/i })).toBeDisabled()
  },
}

/** Saisie d'une valeur → bouton de test activé ; le bouton « Copier » émet onCopyEmail. */
export const FieldThenCopy: Story = {
  render: (args) => <Controlled onCopyEmail={args.onCopyEmail} />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByRole('textbox'), 'sheet-abc')
    await expect(canvas.getByRole('button', { name: /Tester/i })).toBeEnabled()
    await userEvent.click(canvas.getByRole('button', { name: /Copier/i }))
    await expect(args.onCopyEmail).toHaveBeenCalled()
  },
}

/** Succès : bloc data-positive avec aperçu membres/positions/onglets. */
export const Success: Story = {
  args: {
    value: 'https://docs.google.com/spreadsheets/d/1AbCdEf/edit',
    status: 'success',
    preview: { members: 18, positions: 24, tabsFound: 6 },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('status')).toHaveTextContent(/18 membres/)
    await expect(canvas.getByText(/Connexion réussie/)).toBeVisible()
  },
}

/** Erreur de partage : bloc data-negative citant l'email du Service Account. */
export const NotShared: Story = {
  args: {
    value: 'sheet-notshared',
    status: 'not_shared',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('alert')).toHaveTextContent(SA_EMAIL)
  },
}

/** Erreur de structure : bloc data-warning citant les VRAIS noms d'onglets (POSITIONS). */
export const Structure: Story = {
  args: {
    value: 'sheet-missingtab',
    status: 'structure',
    missingTabs: ['POSITIONS'],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('alert')).toHaveTextContent(/POSITIONS/)
    // Jamais « Portefeuille » : l'onglet réel est POSITIONS.
    await expect(canvas.queryByText(/Portefeuille/)).toBeNull()
  },
}
