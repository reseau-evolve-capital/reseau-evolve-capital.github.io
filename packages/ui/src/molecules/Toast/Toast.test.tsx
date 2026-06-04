import { render, fireEvent, act, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import * as React from 'react'

import { ToastProvider, useToast, type ToastVariant, type ToastOptions } from './ToastProvider'

expect.extend(toHaveNoViolations)

// Harnais : un bouton par helper impératif. Les options sont injectées par props.
function Harness({
  variant = 'info',
  options = { title: 'Toast' },
}: {
  variant?: ToastVariant
  options?: ToastOptions
}) {
  const toast = useToast()
  return (
    <button type="button" onClick={() => toast[variant](options)}>
      Déclencher
    </button>
  )
}

function renderWithProvider(ui: React.ReactNode) {
  return render(<ToastProvider>{ui}</ToastProvider>)
}

function trigger() {
  fireEvent.click(screen.getByRole('button', { name: 'Déclencher' }))
}

describe('Toast — rendu des variantes', () => {
  it.each<ToastVariant>(['success', 'error', 'info', 'warning'])(
    'variante %s → affiche le titre',
    (variant: ToastVariant) => {
      renderWithProvider(<Harness variant={variant} options={{ title: `Titre ${variant}` }} />)
      trigger()
      expect(screen.getByText(`Titre ${variant}`)).toBeTruthy()
    }
  )

  it('affiche le message court optionnel', () => {
    renderWithProvider(<Harness options={{ title: 'Titre', message: 'Détail' }} />)
    trigger()
    expect(screen.getByText('Détail')).toBeTruthy()
  })

  it('error → role="alert" sur le toast', () => {
    renderWithProvider(<Harness variant="error" options={{ title: 'Erreur' }} />)
    trigger()
    expect(screen.getByRole('alert')).toBeTruthy()
  })

  it('la région des toasts a role="region" + aria-live="polite"', () => {
    renderWithProvider(<Harness options={{ title: 'Info' }} />)
    const region = screen.getByRole('region')
    expect(region.getAttribute('aria-live')).toBe('polite')
  })
})

describe('Toast — fidélité visuelle (réf « Feedback System »)', () => {
  it('variante info → utilise l’accent brand.yellow (PAS data-neutral gris)', () => {
    const { container } = renderWithProvider(<Harness variant="info" options={{ title: 'Info' }} />)
    trigger()
    // L'icône (et la bordure gauche) portent le token jaune, jamais le neutre gris.
    expect(container.querySelector('.text-brand-yellow')).toBeTruthy()
    expect(container.querySelector('.border-l-brand-yellow')).toBeTruthy()
    expect(container.querySelector('.text-data-neutral')).toBeNull()
  })

  it('l’icône est « chipée » : chip 32×32 (h-8 w-8) à fond teinté', () => {
    const { container } = renderWithProvider(
      <Harness variant="success" options={{ title: 'OK' }} />
    )
    trigger()
    const chip = container.querySelector('.h-8.w-8')
    expect(chip).toBeTruthy()
    expect(chip?.className).toContain('bg-data-positive-50')
  })

  it('l’action est en police display, UPPERCASE et à la couleur de la variante', () => {
    renderWithProvider(
      <Harness
        variant="warning"
        options={{ title: 'Attention', action: { label: 'Voir', onClick: vi.fn() } }}
      />
    )
    trigger()
    const action = screen.getByRole('button', { name: 'Voir' })
    expect(action.className).toContain('font-display')
    expect(action.className).toContain('uppercase')
    // warning → texte AA-safe data-warning-strong (pas l'accent jaune unique d'avant).
    expect(action.className).toContain('text-data-warning-strong')
  })

  it('barre de compte à rebours présente pour les variantes auto-dismiss', () => {
    renderWithProvider(<Harness variant="info" options={{ title: 'Info' }} />)
    trigger()
    expect(screen.getByTestId('toast-countdown')).toBeTruthy()
  })

  it('barre de compte à rebours ABSENTE pour error (persistant)', () => {
    renderWithProvider(<Harness variant="error" options={{ title: 'Boom' }} />)
    trigger()
    expect(screen.queryByTestId('toast-countdown')).toBeNull()
  })

  it('duration=null explicite → pas de barre de compte à rebours', () => {
    renderWithProvider(<Harness variant="info" options={{ title: 'Persistant', duration: null }} />)
    trigger()
    expect(screen.queryByTestId('toast-countdown')).toBeNull()
  })

  it('la barre est masquée sous prefers-reduced-motion (motion-reduce:hidden)', () => {
    renderWithProvider(<Harness variant="success" options={{ title: 'OK' }} />)
    trigger()
    // L'animation n'est pas jouée sous motion-reduce : la barre porte motion-reduce:hidden.
    expect(screen.getByTestId('toast-countdown').className).toContain('motion-reduce:hidden')
  })

  it('tous les boutons cliquables sont en cursor-pointer (a11y)', () => {
    renderWithProvider(
      <Harness
        variant="info"
        options={{ title: 'Info', action: { label: 'Agir', onClick: vi.fn() } }}
      />
    )
    trigger()
    expect(screen.getByRole('button', { name: 'Agir' }).className).toContain('cursor-pointer')
    expect(screen.getByRole('button', { name: 'Fermer la notification' }).className).toContain(
      'cursor-pointer'
    )
  })
})

describe('Toast — auto-dismiss', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('success → disparaît après sa durée par défaut (4000ms)', () => {
    renderWithProvider(<Harness variant="success" options={{ title: 'OK' }} />)
    act(() => trigger())
    expect(screen.getByText('OK')).toBeTruthy()
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(screen.queryByText('OK')).toBeNull()
  })

  it('error → NE disparaît PAS automatiquement', () => {
    renderWithProvider(<Harness variant="error" options={{ title: 'Boom' }} />)
    act(() => trigger())
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(screen.getByText('Boom')).toBeTruthy()
  })

  it('duration explicite override la durée par défaut', () => {
    renderWithProvider(<Harness variant="info" options={{ title: 'Court', duration: 1000 }} />)
    act(() => trigger())
    act(() => {
      vi.advanceTimersByTime(999)
    })
    expect(screen.getByText('Court')).toBeTruthy()
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.queryByText('Court')).toBeNull()
  })
})

describe('Toast — interactions', () => {
  it('action déclenche onClick', () => {
    const onClick = vi.fn()
    renderWithProvider(
      <Harness options={{ title: 'Avec action', action: { label: 'Annuler', onClick } }} />
    )
    trigger()
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('bouton fermer retire le toast', () => {
    renderWithProvider(<Harness options={{ title: 'À fermer' }} />)
    trigger()
    fireEvent.click(screen.getByRole('button', { name: 'Fermer la notification' }))
    expect(screen.queryByText('À fermer')).toBeNull()
  })

  it('Escape ferme le toast le plus récent', () => {
    renderWithProvider(<Harness variant="error" options={{ title: 'Échap' }} />)
    trigger()
    expect(screen.getByText('Échap')).toBeTruthy()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByText('Échap')).toBeNull()
  })

  it('empilement : plusieurs toasts coexistent', () => {
    renderWithProvider(<Harness options={{ title: 'Empilé' }} />)
    trigger()
    trigger()
    trigger()
    expect(screen.getAllByText('Empilé')).toHaveLength(3)
  })
})

describe('Toast — accessibilité (jest-axe)', () => {
  it.each<ToastVariant>(['success', 'error', 'info', 'warning'])(
    'variante %s → aucune violation axe',
    async (variant: ToastVariant) => {
      const { container } = renderWithProvider(
        <Harness
          variant={variant}
          options={{
            title: `Titre ${variant}`,
            message: 'Message accessible',
            action: { label: 'Agir', onClick: vi.fn() },
          }}
        />
      )
      trigger()
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    }
  )
})
