import { afterEach, describe, expect, it, vi } from 'vitest'

import { copyHandoffLink } from './use-pwa-install'

const HANDOFF_URL = 'https://evolve.example/login/verify?token_hash=abc&type=email&pwa=ios'
const CURRENT_URL = 'https://evolve.example/dashboard'

// `navigator` est un getter en lecture seule sur Node → on passe par vi.stubGlobal
// (gère le défini/non-défini et restaure proprement via unstubAllGlobals).
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** `ClipboardItem` factice : conserve la map d'items pour pouvoir résoudre la Promise<Blob>. */
class FakeClipboardItem {
  items: Record<string, Promise<Blob> | Blob>
  constructor(items: Record<string, Promise<Blob> | Blob>) {
    this.items = items
  }
}

describe('copyHandoffLink', () => {
  it('palier 1 (ClipboardItem) : succès → usedHandoff true, lien du serveur copié', async () => {
    vi.stubGlobal('ClipboardItem', FakeClipboardItem)
    let copiedText: string | null = null
    const write = vi.fn(async (items: FakeClipboardItem[]) => {
      // Reproduit Safari : résout la Promise<Blob> tout en préservant le geste utilisateur.
      const blob = (await items[0]!.items['text/plain']) as Blob
      copiedText = await blob.text()
    })
    vi.stubGlobal('navigator', { clipboard: { write } })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ url: HANDOFF_URL }) }))
    )

    const res = await copyHandoffLink()

    expect(res).toEqual({ ok: true, usedHandoff: true })
    expect(write).toHaveBeenCalledTimes(1)
    expect(copiedText).toBe(HANDOFF_URL)
  })

  it('palier 1 : fetch non-200 → bascule fallback (writeText) puis dernier recours URL', async () => {
    vi.stubGlobal('ClipboardItem', FakeClipboardItem)
    // write attend la Promise<Blob> qui rejette (handoff_failed) → write rejette → fallback.
    const write = vi.fn(async (items: FakeClipboardItem[]) => {
      await items[0]!.items['text/plain']
    })
    const writeText = vi.fn(async () => undefined)
    vi.stubGlobal('navigator', { clipboard: { write, writeText } })
    // fetch 401 aux deux paliers → dernier recours = copie de l'URL courante.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, json: async () => ({}) }))
    )
    vi.stubGlobal('window', { location: { href: CURRENT_URL } })

    const res = await copyHandoffLink()

    expect(res).toEqual({ ok: true, usedHandoff: false })
    expect(writeText).toHaveBeenCalledWith(CURRENT_URL)
  })

  it('palier 2 (pas de ClipboardItem) : fetch + writeText → usedHandoff true', async () => {
    vi.stubGlobal('ClipboardItem', undefined)
    const writeText = vi.fn(async () => undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ url: HANDOFF_URL }) }))
    )

    const res = await copyHandoffLink()

    expect(res).toEqual({ ok: true, usedHandoff: true })
    expect(writeText).toHaveBeenCalledWith(HANDOFF_URL)
  })

  it('palier 2 : fetch non-200 → dernier recours URL courante, usedHandoff false', async () => {
    vi.stubGlobal('ClipboardItem', undefined)
    const writeText = vi.fn(async () => undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, json: async () => ({}) }))
    )
    vi.stubGlobal('window', { location: { href: CURRENT_URL } })

    const res = await copyHandoffLink()

    expect(res).toEqual({ ok: true, usedHandoff: false })
    expect(writeText).toHaveBeenLastCalledWith(CURRENT_URL)
  })

  it('clipboard totalement indisponible → ok false, usedHandoff false', async () => {
    vi.stubGlobal('ClipboardItem', undefined)
    vi.stubGlobal('navigator', {}) // pas de clipboard du tout
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ url: HANDOFF_URL }) }))
    )

    const res = await copyHandoffLink()

    expect(res).toEqual({ ok: false, usedHandoff: false })
  })

  it('SSR-safe : navigator absent → ok false, pas de crash', async () => {
    vi.stubGlobal('ClipboardItem', undefined)
    vi.stubGlobal('navigator', undefined)
    vi.stubGlobal('fetch', undefined)

    const res = await copyHandoffLink()

    expect(res).toEqual({ ok: false, usedHandoff: false })
  })

  it('palier 1 : fetch rejette (réseau) → bascule fallback puis dernier recours', async () => {
    vi.stubGlobal('ClipboardItem', FakeClipboardItem)
    const write = vi.fn(async (items: FakeClipboardItem[]) => {
      await items[0]!.items['text/plain']
    })
    const writeText = vi.fn(async () => undefined)
    vi.stubGlobal('navigator', { clipboard: { write, writeText } })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network')
      })
    )
    vi.stubGlobal('window', { location: { href: CURRENT_URL } })

    const res = await copyHandoffLink()

    expect(res).toEqual({ ok: true, usedHandoff: false })
    expect(writeText).toHaveBeenCalledWith(CURRENT_URL)
  })
})
