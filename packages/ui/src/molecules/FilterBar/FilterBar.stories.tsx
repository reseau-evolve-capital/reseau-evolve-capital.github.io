import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { expect, userEvent, within } from 'storybook/test'
import type { PortfolioSort, PortfolioDir } from '@evolve/types'
import { FilterBar } from './FilterBar'

const meta: Meta<typeof FilterBar> = {
  title: 'Molecules/FilterBar',
  component: FilterBar,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-2xl p-4 bg-bg-page">
        <Story />
      </div>
    ),
  ],
}
export default meta
type Story = StoryObj<typeof FilterBar>

export const Interactive: Story = {
  render: () => {
    const [sector, setSector] = React.useState<string | null>(null)
    const [typologie, setTypologie] = React.useState<string | null>(null)
    const [sort, setSort] = React.useState<PortfolioSort>('value')
    const [dir, setDir] = React.useState<PortfolioDir>('desc')
    return (
      <FilterBar
        sectors={['Technologie', 'Santé', 'Industrie']}
        sector={sector}
        typologies={['Offensif', 'Défensif', 'Autres']}
        typologie={typologie}
        sort={sort}
        dir={dir}
        onSectorChange={setSector}
        onTypologyChange={setTypologie}
        onSortChange={setSort}
        onDirChange={setDir}
      />
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const tech = canvas.getByRole('button', { name: 'Technologie' })
    await userEvent.click(tech)
    await expect(tech).toHaveAttribute('aria-pressed', 'true')
    // 2e axe : la typologie est indépendante du secteur (filtre combiné côté appelant).
    const offensif = canvas.getByRole('button', { name: 'Offensif' })
    await userEvent.click(offensif)
    await expect(offensif).toHaveAttribute('aria-pressed', 'true')
    await expect(tech).toHaveAttribute('aria-pressed', 'true')
  },
}

export const AvecTypologie: Story = {
  args: {
    sectors: ['Technologie', 'Santé', 'Industrie'],
    sector: 'Technologie',
    typologies: ['Offensif', 'Défensif', 'Autres'],
    typologie: 'Offensif',
    sort: 'value',
    dir: 'desc',
    onSectorChange: () => {},
    onTypologyChange: () => {},
    onSortChange: () => {},
    onDirChange: () => {},
  },
}

export const SecteurActif: Story = {
  args: {
    sectors: ['Technologie', 'Santé', 'Industrie'],
    sector: 'Santé',
    sort: 'performance',
    dir: 'desc',
    onSectorChange: () => {},
    onSortChange: () => {},
    onDirChange: () => {},
  },
}

export const TriParNom: Story = {
  args: {
    sectors: ['Technologie', 'Santé'],
    sector: null,
    sort: 'name',
    dir: 'asc',
    onSectorChange: () => {},
    onSortChange: () => {},
    onDirChange: () => {},
  },
}
