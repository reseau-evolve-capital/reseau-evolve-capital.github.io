import { render, fireEvent, within } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'

import { SyncBanner } from './SyncBanner'

expect.extend(toHaveNoViolations)

const SYNCED = new Date(Date.now() - 35 * 60 * 1000)

describe('SyncBanner — visibilité selon le rôle', () => {
  it('rôle membre → ne rend rien (null)', () => {
    const { container } = render(<SyncBanner syncedAt={SYNCED} userRole="member" />)
    expect(container.firstChild).toBeNull()
  })

  it('rôle trésorier → bandeau visible avec "Synchronisé …" et bouton Actualiser', () => {
    const { getByText, getByRole } = render(<SyncBanner syncedAt={SYNCED} userRole="treasurer" />)
    expect(getByText(/Synchronisé/)).toBeTruthy()
    expect(getByRole('button', { name: 'Actualiser les données' })).toBeTruthy()
  })

  it('rôles président et network_admin → bandeau visible', () => {
    const president = render(<SyncBanner syncedAt={SYNCED} userRole="president" />)
    expect(
      within(president.container).getByRole('button', { name: 'Actualiser les données' })
    ).toBeTruthy()

    const admin = render(<SyncBanner syncedAt={SYNCED} userRole="network_admin" />)
    expect(
      within(admin.container).getByRole('button', { name: 'Actualiser les données' })
    ).toBeTruthy()
  })
})

describe('SyncBanner — interactions', () => {
  it('clic sur Actualiser appelle onSync', () => {
    const onSync = vi.fn()
    const { getByRole } = render(
      <SyncBanner syncedAt={SYNCED} userRole="treasurer" onSync={onSync} />
    )
    fireEvent.click(getByRole('button', { name: 'Actualiser les données' }))
    expect(onSync).toHaveBeenCalledTimes(1)
  })

  it('isSyncing → bouton désactivé et spinner affiché', () => {
    const { getByRole } = render(<SyncBanner syncedAt={SYNCED} userRole="treasurer" isSyncing />)
    const button = getByRole('button', { name: 'Actualiser les données' })
    expect(button).toBeDisabled()
    // Spinner (role="status") rendu dans le bouton à la place de l'icône.
    expect(button.querySelector('[role="status"]')).toBeTruthy()
  })

  it('canSync=false → bouton désactivé', () => {
    const onSync = vi.fn()
    const { getByRole } = render(
      <SyncBanner syncedAt={SYNCED} userRole="treasurer" canSync={false} onSync={onSync} />
    )
    const button = getByRole('button', { name: 'Actualiser les données' })
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(onSync).not.toHaveBeenCalled()
  })

  it('syncedAt null → affiche le fallback "—"', () => {
    const { getByText } = render(<SyncBanner syncedAt={null} userRole="treasurer" />)
    expect(getByText(/—/)).toBeTruthy()
  })

  it('errorMessage → message inline affiché', () => {
    const { getByText } = render(
      <SyncBanner
        syncedAt={SYNCED}
        userRole="treasurer"
        errorMessage="Rate limit atteint. Réessaie dans quelques minutes."
      />
    )
    expect(getByText(/Rate limit atteint/)).toBeTruthy()
  })
})

describe('SyncBanner — accessibilité (jest-axe)', () => {
  it('pas de violations axe (trésorier)', async () => {
    const { container } = render(<SyncBanner syncedAt={SYNCED} userRole="treasurer" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
