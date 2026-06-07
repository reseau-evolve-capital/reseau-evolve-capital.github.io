import { describe, it, expect, vi, beforeEach } from 'vitest'

const valuesGet = vi.fn()
vi.mock('googleapis', () => ({
  google: {
    auth: { GoogleAuth: vi.fn().mockImplementation(() => ({})) },
    sheets: () => ({ spreadsheets: { values: { get: valuesGet } } }),
  },
}))

describe('readSheet', () => {
  beforeEach(() => {
    vi.resetModules()
    valuesGet.mockReset()
    process.env.GOOGLE_SA_KEY_BASE64 = Buffer.from(
      JSON.stringify({ client_email: 'x@y.iam', private_key: 'k' })
    ).toString('base64')
  })

  it('coerce chaque cellule en string', async () => {
    valuesGet.mockResolvedValue({
      data: {
        values: [
          ['a', 1],
          [null, 'b'],
        ],
      },
    })
    const { readSheet } = await import('./client.ts')
    const out = await readSheet('sheet-id', 'Base')
    expect(out).toEqual([
      ['a', '1'],
      ['', 'b'],
    ])
  })

  it('throw descriptif si GOOGLE_SA_KEY_BASE64 manquante', async () => {
    delete process.env.GOOGLE_SA_KEY_BASE64
    vi.resetModules()
    const { readSheet } = await import('./client.ts')
    await expect(readSheet('s', 'Base')).rejects.toThrow(/GOOGLE_SA_KEY_BASE64/)
  })

  it('retourne [] si la feuille est vide', async () => {
    valuesGet.mockResolvedValue({ data: { values: null } })
    const { readSheet } = await import('./client.ts')
    await expect(readSheet('s', 'Base')).resolves.toEqual([])
  })
})
