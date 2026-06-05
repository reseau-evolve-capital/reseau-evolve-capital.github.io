import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { MembersList, type MemberRow } from './MembersList'

expect.extend(toHaveNoViolations)

// Radix DropdownMenu (menu d'actions) s'appuie sur des API pointer absentes de jsdom.
beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false
  if (!Element.prototype.setPointerCapture) Element.prototype.setPointerCapture = () => undefined
  if (!Element.prototype.releasePointerCapture)
    Element.prototype.releasePointerCapture = () => undefined
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => undefined
})

const MEMBERS: MemberRow[] = [
  {
    id: '1',
    fullName: 'AFOUDAH Ruben',
    email: 'ruben@x.fr',
    role: 'treasurer',
    totalContributed: 4200,
    detentionPct: 0.18,
    monthsCount: 24,
    status: 'ok',
    accessStatus: 'active',
  },
  {
    id: '2',
    fullName: 'BAMBA Inès',
    email: 'ines@x.fr',
    role: 'member',
    totalContributed: 1200,
    detentionPct: 0.05,
    monthsCount: 12,
    status: 'late',
    accessStatus: 'locked',
  },
  {
    id: '3',
    fullName: 'COLY Marc',
    email: 'marc@x.fr',
    role: 'member',
    totalContributed: 800,
    detentionPct: 0.03,
    monthsCount: 8,
    status: null,
    accessStatus: 'active',
  },
]

describe('MembersList — rendu', () => {
  it('rend 1 ligne par membre + en-tête Statut scopé', () => {
    render(<MembersList members={MEMBERS} />)
    const rows = screen.getAllByTestId('member-row')
    expect(rows).toHaveLength(3)

    const headers = screen.getAllByRole('columnheader')
    const statutHeader = headers.find((h) => h.textContent === 'Statut')
    expect(statutHeader).toHaveAttribute('scope', 'col')
  })

  it('formate le total EUR en locale FR', () => {
    render(<MembersList members={MEMBERS} />)
    // formatEUR(4200) — on cherche le texte dans le document
    const container = screen.getByRole('table')
    expect(container.textContent).toMatch(/4\s*200/)
    expect(container.textContent).toMatch(/€/)
  })

  it('formate la quote-part en pourcentage', () => {
    render(<MembersList members={MEMBERS} />)
    // formatPct(0.18, {showSign: false}) → "18 %" ou "18%"
    const container = screen.getByRole('table')
    expect(container.textContent).toMatch(/18/)
    expect(container.textContent).toMatch(/%/)
  })

  it('affiche — pour status null + libellé a11y explicite', () => {
    render(<MembersList members={MEMBERS} />)
    // COLY Marc a status: null
    const rows = screen.getAllByTestId('member-row')
    // Le tri par défaut est totalContributed desc : AFOUDAH(4200), BAMBA(1200), COLY(800)
    expect(rows).toHaveLength(3)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const colyRow = rows[2]!
    expect(within(colyRow).getByText('—')).toBeInTheDocument()
    // F3 : le « — » n'est plus muet → title + aria-label explicites (défaut FR).
    expect(within(colyRow).getByLabelText('Aucune cotisation enregistrée')).toBeInTheDocument()
  })

  it('respecte le libellé i18n du statut « aucune cotisation »', () => {
    render(<MembersList members={MEMBERS} labels={{ statusNone: 'No contribution recorded' }} />)
    const rows = screen.getAllByTestId('member-row')
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const colyRow = rows[2]!
    expect(within(colyRow).getByLabelText('No contribution recorded')).toBeInTheDocument()
  })

  it('état vide → EmptyState « Aucun membre »', () => {
    render(<MembersList members={[]} />)
    expect(screen.getByText('Aucun membre')).toBeInTheDocument()
  })
})

describe('MembersList — colonne Accès (ADM-007)', () => {
  it('rend l’en-tête « Accès » juste après « Statut »', () => {
    render(<MembersList members={MEMBERS} />)
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent)
    const statutIdx = headers.indexOf('Statut')
    const accesIdx = headers.indexOf('Accès')
    expect(statutIdx).toBeGreaterThan(-1)
    expect(accesIdx).toBe(statutIdx + 1)
  })

  it('rend une pastille d’accès par membre (Actif / Bloqué)', () => {
    render(<MembersList members={MEMBERS} />)
    expect(screen.getByRole('status', { name: 'Bloqué' })).toBeInTheDocument()
    expect(screen.getAllByRole('status', { name: 'Actif' }).length).toBe(2)
  })

  it('rétro-compatible : sans callback d’accès, AUCUN menu d’actions', () => {
    render(<MembersList members={MEMBERS} />)
    expect(screen.queryByRole('button', { name: 'Actions' })).toBeNull()
  })

  it('avec callbacks : menu « ··· » par ligne + onLockMember(row)', async () => {
    const u = userEvent.setup()
    const onLockMember = vi.fn()
    render(<MembersList members={MEMBERS} onLockMember={onLockMember} onViewMember={() => {}} />)
    const triggers = screen.getAllByRole('button', { name: 'Actions' })
    expect(triggers).toHaveLength(3)
    // 1re ligne (tri desc total) = AFOUDAH, accessStatus active → « Bloquer l'accès »
    await u.click(triggers[0]!)
    await u.click(await screen.findByRole('menuitem', { name: /Bloquer l'accès/i }))
    expect(onLockMember).toHaveBeenCalledTimes(1)
    expect(onLockMember.mock.calls[0]![0]).toMatchObject({ fullName: 'AFOUDAH Ruben' })
  })

  it('ligne bloquée : le menu propose « Débloquer » → onUnlockMember(row)', async () => {
    const u = userEvent.setup()
    const onUnlockMember = vi.fn()
    render(<MembersList members={MEMBERS} onUnlockMember={onUnlockMember} />)
    // BAMBA Inès (locked) est la 2e ligne (total 1200, tri desc)
    const triggers = screen.getAllByRole('button', { name: 'Actions' })
    await u.click(triggers[1]!)
    await u.click(await screen.findByRole('menuitem', { name: /Débloquer/i }))
    expect(onUnlockMember).toHaveBeenCalledTimes(1)
    expect(onUnlockMember.mock.calls[0]![0]).toMatchObject({ fullName: 'BAMBA Inès' })
  })
})

describe('MembersList — email placeholder (membre importé sans email)', () => {
  const WITH_PLACEHOLDER: MemberRow[] = [
    {
      id: '9',
      fullName: 'ZZZ Sortant',
      email: 'sans-email.zzz@club.local',
      emailIsPlaceholder: true,
      role: 'member',
      totalContributed: 5000, // 1re ligne (tri desc)
      detentionPct: 0.2,
      monthsCount: 30,
      status: null,
      accessStatus: 'active',
    },
    ...MEMBERS,
  ]

  it('masque le placeholder et affiche « Email manquant »', () => {
    render(<MembersList members={WITH_PLACEHOLDER} />)
    expect(screen.getByText('Email manquant')).toBeInTheDocument()
    expect(screen.queryByText('sans-email.zzz@club.local')).toBeNull()
  })

  it('respecte le libellé i18n du placeholder manquant', () => {
    render(<MembersList members={WITH_PLACEHOLDER} labels={{ emailMissing: 'Missing email' }} />)
    expect(screen.getByText('Missing email')).toBeInTheDocument()
  })

  it('propose « Renseigner l’email » seulement pour les placeholders', async () => {
    const u = userEvent.setup()
    const onEdit = vi.fn()
    render(<MembersList members={WITH_PLACEHOLDER} onEditMemberEmail={onEdit} />)
    const triggers = screen.getAllByRole('button', { name: 'Actions' })
    // 1re ligne = placeholder → l'entrée existe
    await u.click(triggers[0]!)
    await u.click(await screen.findByRole('menuitem', { name: /Renseigner l'email/i }))
    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onEdit.mock.calls[0]![0]).toMatchObject({ fullName: 'ZZZ Sortant' })
  })

  it('PAS d’entrée « Renseigner l’email » pour un membre avec email réel', async () => {
    const u = userEvent.setup()
    render(<MembersList members={WITH_PLACEHOLDER} onEditMemberEmail={() => {}} />)
    const triggers = screen.getAllByRole('button', { name: 'Actions' })
    // 2e ligne (total 4200) = AFOUDAH, email réel → pas d'entrée d'édition email
    await u.click(triggers[1]!)
    await screen.findByRole('menu')
    expect(screen.queryByRole('menuitem', { name: /Renseigner l'email/i })).toBeNull()
  })

  it('pas de violations axe avec un placeholder', async () => {
    const { container } = render(
      <MembersList members={WITH_PLACEHOLDER} onEditMemberEmail={() => {}} />
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('MembersList — membres sortis', () => {
  const WITH_LEFT: MemberRow[] = [
    ...MEMBERS,
    {
      id: '4',
      fullName: 'DIOP Awa',
      email: 'awa@x.fr',
      // « treasurer » : prouve que le rôle de gouvernance est bien remplacé (pas seulement
      // le cas par défaut « Membre »).
      role: 'treasurer',
      totalContributed: 600,
      detentionPct: 0.02,
      monthsCount: 6,
      status: null,
      accessStatus: 'active',
      membershipStatus: 'left',
      leaveAt: '2023-12-31',
    },
  ]

  it('affiche un badge « Sorti » sur un membre sorti (perceptible par texte)', () => {
    render(<MembersList members={WITH_LEFT} />)
    expect(screen.getByText('Sorti')).toBeInTheDocument()
  })

  it('affiche la date de sortie formatée FR sous le membre sorti', () => {
    render(<MembersList members={WITH_LEFT} />)
    // formatDate('2023-12-31') → 31/12/2023
    expect(screen.getByText(/Sorti le\s+31\/12\/2023/)).toBeInTheDocument()
  })

  it('marque la ligne d’un membre sorti via data-member-status', () => {
    render(<MembersList members={WITH_LEFT} />)
    const rows = screen.getAllByTestId('member-row')
    const leftRow = rows.find((r) => within(r).queryByText('Sorti'))
    expect(leftRow).toHaveAttribute('data-member-status', 'left')
  })

  it('ne marque PAS « Sorti » un membre actif (défaut)', () => {
    render(<MembersList members={MEMBERS} />)
    expect(screen.queryByText('Sorti')).toBeNull()
    const rows = screen.getAllByTestId('member-row')
    rows.forEach((r) => expect(r).toHaveAttribute('data-member-status', 'active'))
  })

  it('remplace le badge rôle par « Ancien membre » (F4)', () => {
    render(<MembersList members={WITH_LEFT} />)
    const rows = screen.getAllByTestId('member-row')
    const leftRow = rows.find((r) => within(r).queryByText('Sorti'))
    expect(leftRow).toBeDefined()
    expect(within(leftRow!).getByText('Ancien membre')).toBeInTheDocument()
    // Le rôle de gouvernance d'origine (Trésorier) n'est plus affiché pour ce membre.
    expect(within(leftRow!).queryByText('Trésorier')).toBeNull()
  })

  it('garde le badge rôle pour les membres actifs', () => {
    render(<MembersList members={WITH_LEFT} />)
    // AFOUDAH (treasurer, actif) garde « Trésorier » ; « Ancien membre » n'apparaît qu'une fois.
    expect(screen.getByText('Trésorier')).toBeInTheDocument()
    expect(screen.getAllByText('Ancien membre')).toHaveLength(1)
  })

  it('respecte le libellé i18n « Ancien membre »', () => {
    render(<MembersList members={WITH_LEFT} labels={{ formerRole: 'Former member' }} />)
    expect(screen.getByText('Former member')).toBeInTheDocument()
    expect(screen.queryByText('Ancien membre')).toBeNull()
  })

  it('respecte les libellés i18n du badge et de la date', () => {
    render(
      <MembersList
        members={WITH_LEFT}
        labels={{ leftBadge: 'Left', leftSince: (d) => `Left on ${d}` }}
      />
    )
    expect(screen.getByText('Left')).toBeInTheDocument()
    expect(screen.getByText('Left on 31/12/2023')).toBeInTheDocument()
  })
})

describe('MembersList — accessibilité (jest-axe)', () => {
  it('pas de violations axe', async () => {
    const { container } = render(<MembersList members={MEMBERS} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('pas de violations axe avec un membre sorti', async () => {
    const withLeft: MemberRow[] = [
      ...MEMBERS,
      {
        id: '4',
        fullName: 'DIOP Awa',
        email: 'awa@x.fr',
        role: 'member',
        totalContributed: 600,
        detentionPct: 0.02,
        monthsCount: 6,
        status: null,
        accessStatus: 'active',
        membershipStatus: 'left',
        leaveAt: '2023-12-31',
      },
    ]
    const { container } = render(<MembersList members={withLeft} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
