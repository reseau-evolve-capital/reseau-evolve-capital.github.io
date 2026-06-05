import { render, fireEvent } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'

import { Banner, type BannerVariant } from './Banner'

expect.extend(toHaveNoViolations)

const VARIANTS: readonly BannerVariant[] = ['info', 'success', 'warning', 'error', 'sync']

describe('Banner — rendu des variantes', () => {
  it.each(VARIANTS)('variante %s → rend le message et une icône', (variant: BannerVariant) => {
    const { getByText, container } = render(
      <Banner variant={variant} message={`Message ${variant}`} />
    )
    expect(getByText(`Message ${variant}`)).toBeTruthy()
    // L'icône lucide est un <svg> décoratif (aria-hidden).
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('affiche le titre optionnel quand fourni', () => {
    const { getByText } = render(<Banner variant="info" title="Titre" message="Corps du message" />)
    expect(getByText('Titre')).toBeTruthy()
    expect(getByText('Corps du message')).toBeTruthy()
  })

  it('expose role="status" par défaut (info/success/warning/sync)', () => {
    const { getByRole } = render(<Banner variant="info" message="Info" />)
    expect(getByRole('status')).toBeTruthy()
  })

  it('expose role="alert" pour la variante error', () => {
    const { getByRole } = render(<Banner variant="error" message="Erreur" />)
    expect(getByRole('alert')).toBeTruthy()
  })
})

describe('Banner — actions et fermeture', () => {
  it('rend le slot actions', () => {
    const { getByRole } = render(
      <Banner variant="info" message="Info" actions={<button type="button">Agir</button>} />
    )
    expect(getByRole('button', { name: 'Agir' })).toBeTruthy()
  })

  it('dismissible → bouton fermer présent et déclenche onDismiss', () => {
    const onDismiss = vi.fn()
    const { getByRole } = render(
      <Banner variant="warning" message="Attention" dismissible onDismiss={onDismiss} />
    )
    const close = getByRole('button', { name: 'Fermer' })
    fireEvent.click(close)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('non dismissible par défaut → pas de bouton fermer', () => {
    const { queryByRole } = render(<Banner variant="info" message="Info" />)
    expect(queryByRole('button', { name: 'Fermer' })).toBeNull()
  })

  it('aria-label du bouton fermer personnalisable', () => {
    const { getByRole } = render(
      <Banner
        variant="info"
        message="Info"
        dismissible
        onDismiss={vi.fn()}
        dismissAriaLabel="Masquer"
      />
    )
    expect(getByRole('button', { name: 'Masquer' })).toBeTruthy()
  })
})

describe('Banner — fidélité visuelle (réf « Feedback System »)', () => {
  it('variante info → accent brand.yellow (PAS data-neutral gris)', () => {
    const { container } = render(<Banner variant="info" message="Info" />)
    expect(container.querySelector('.text-brand-yellow')).toBeTruthy()
    expect(container.querySelector('.text-data-neutral')).toBeNull()
  })

  it('variante sync → surface thémée (bg-card-sub) et chip bg-border, PAS de neutres bruts (C5b)', () => {
    const { container } = render(<Banner variant="sync" message="Synchronisé il y a 35 minutes" />)
    // C5b : le conteneur et le chip utilisent des tokens sémantiques qui basculent en dark
    // (≠ bg-neutral-100/bg-neutral-200 jamais redéfinis en [data-theme="dark"]).
    expect(container.querySelector('.bg-card-sub')).toBeTruthy()
    expect(container.querySelector('.bg-border')).toBeTruthy()
    expect(container.querySelector('.bg-neutral-100')).toBeNull()
    expect(container.querySelector('.bg-neutral-200')).toBeNull()
  })

  it('l’icône est « chipée » : chip 32×32 (h-8 w-8) à fond teinté', () => {
    const { container } = render(<Banner variant="success" message="OK" />)
    const chip = container.querySelector('.h-8.w-8')
    expect(chip).toBeTruthy()
    expect(chip?.className).toContain('bg-data-positive-50')
  })

  it('bouton fermer en cursor-pointer (a11y)', () => {
    const { getByRole } = render(
      <Banner variant="info" message="Info" dismissible onDismiss={vi.fn()} />
    )
    expect(getByRole('button', { name: 'Fermer' }).className).toContain('cursor-pointer')
  })

  it('actionsLayout="inline" → les actions sont rendues sur la même ligne (justify-between)', () => {
    const { container, getByRole } = render(
      <Banner
        variant="sync"
        message="Synchronisé il y a 5 min"
        actionsLayout="inline"
        actions={<button type="button">Actualiser</button>}
      />
    )
    expect(getByRole('button', { name: 'Actualiser' })).toBeTruthy()
    // Conteneur de ligne inline avec justify-between (≠ bloc mt-2 empilé).
    expect(container.querySelector('.justify-between')).toBeTruthy()
    expect(container.querySelector('.mt-2')).toBeNull()
  })

  it('actionsLayout par défaut (stacked) → actions sous le message (mt-2)', () => {
    const { container } = render(
      <Banner variant="info" message="Info" actions={<button type="button">Agir</button>} />
    )
    expect(container.querySelector('.mt-2')).toBeTruthy()
    expect(container.querySelector('.justify-between')).toBeNull()
  })
})

describe('Banner — accessibilité (jest-axe)', () => {
  it.each(VARIANTS)('variante %s → aucune violation axe', async (variant: BannerVariant) => {
    const { container } = render(
      <Banner
        variant={variant}
        title="Titre"
        message="Message accessible"
        dismissible
        onDismiss={vi.fn()}
        actions={<button type="button">Agir</button>}
      />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
