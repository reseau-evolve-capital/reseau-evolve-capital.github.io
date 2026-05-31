import type { Meta, StoryObj } from '@storybook/react'
import { OnboardingShell } from './OnboardingShell'
import { Heading } from '../../atoms/Heading'
import { Text } from '../../atoms/Text'
import { Button } from '../../atoms/Button'

const meta: Meta<typeof OnboardingShell> = {
  title: 'Organisms/OnboardingShell',
  component: OnboardingShell,
  tags: ['autodocs'],
  parameters: {
    // La hauteur min-h-screen nécessite un viewport suffisant en Storybook
    layout: 'fullscreen',
  },
}
export default meta
type Story = StoryObj<typeof OnboardingShell>

/** Rendu complet avec header, contenu et footer */
export const Default: Story = {
  args: {
    header: (
      <div className="flex flex-col gap-1">
        <Text variant="caption" color="text-ter">
          Étape 1 sur 4
        </Text>
        <Heading level="h3">Bienvenue dans le club</Heading>
      </div>
    ),
    children: (
      <Text variant="body" color="text-sec">
        Quelques informations pour personnaliser votre expérience Evolve Capital.
      </Text>
    ),
    footer: (
      <div className="flex justify-end gap-3">
        <Button variant="secondary" size="md">
          Retour
        </Button>
        <Button variant="primary" size="md">
          Continuer
        </Button>
      </div>
    ),
  },
}

/** Sans footer — dernière étape ou étape de confirmation */
export const WithoutFooter: Story = {
  args: {
    header: <Heading level="h3">Profil complété</Heading>,
    children: (
      <Text variant="body" color="text-sec">
        Votre profil membre est prêt. Vous allez être redirigé vers le tableau de bord.
      </Text>
    ),
  },
}
