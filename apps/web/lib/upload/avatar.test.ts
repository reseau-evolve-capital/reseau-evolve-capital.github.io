import { describe, it, expect, vi } from 'vitest'
import {
  isAcceptedAvatarType,
  assertAvatarFile,
  avatarObjectPath,
  staleAvatarObjectNames,
  deleteStaleAvatars,
} from './avatar'

describe('isAcceptedAvatarType', () => {
  it('accepte jpeg / png / webp', () => {
    expect(isAcceptedAvatarType('image/jpeg')).toBe(true)
    expect(isAcceptedAvatarType('image/png')).toBe(true)
    expect(isAcceptedAvatarType('image/webp')).toBe(true)
  })
  it('refuse heic et autres', () => {
    expect(isAcceptedAvatarType('image/heic')).toBe(false)
    expect(isAcceptedAvatarType('application/pdf')).toBe(false)
    expect(isAcceptedAvatarType('')).toBe(false)
  })
})

describe('assertAvatarFile', () => {
  const fileOf = (type: string, size: number) => ({ type, size }) as File

  it('passe pour une image valide', () => {
    expect(() => assertAvatarFile(fileOf('image/png', 1024))).not.toThrow()
  })
  it('rejette un format non supporté', () => {
    expect(() => assertAvatarFile(fileOf('image/heic', 1024))).toThrow(/Format non supporté/)
  })
  it('rejette un fichier trop lourd (> 25 Mo)', () => {
    expect(() => assertAvatarFile(fileOf('image/jpeg', 26 * 1024 * 1024))).toThrow(/trop lourde/)
  })
})

describe('avatarObjectPath', () => {
  it('produit une clé unique {userId}/{id}.webp', () => {
    expect(avatarObjectPath('u-1', 'abc')).toBe('u-1/abc.webp')
  })
})

describe('staleAvatarObjectNames', () => {
  it('retourne tous les .webp sauf celui à garder', () => {
    const files = [{ name: 'old.webp' }, { name: 'avatar.webp' }, { name: 'keep.webp' }]
    expect(staleAvatarObjectNames(files, 'keep.webp')).toEqual(['old.webp', 'avatar.webp'])
  })
  it('ignore le placeholder de dossier vide et les non-webp', () => {
    const files = [
      { name: '.emptyFolderPlaceholder' },
      { name: 'notes.txt' },
      { name: 'keep.webp' },
    ]
    expect(staleAvatarObjectNames(files, 'keep.webp')).toEqual([])
  })
  it('liste vide → rien à supprimer', () => {
    expect(staleAvatarObjectNames([], 'keep.webp')).toEqual([])
  })
})

describe('deleteStaleAvatars', () => {
  function makeSupabase(list: { data: unknown; error: unknown }) {
    const remove = vi.fn().mockResolvedValue({ data: [], error: null })
    const from = vi.fn().mockReturnValue({
      list: vi.fn().mockResolvedValue(list),
      remove,
    })
    return { storage: { from }, remove }
  }

  it('supprime les anciennes images sauf celle conservée', async () => {
    const sb = makeSupabase({
      data: [{ name: 'old.webp' }, { name: 'keep.webp' }],
      error: null,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await deleteStaleAvatars(sb as any, 'u-1', 'keep.webp')
    expect(sb.remove).toHaveBeenCalledWith(['u-1/old.webp'])
  })

  it("n'appelle pas remove s'il n'y a aucune image périmée", async () => {
    const sb = makeSupabase({ data: [{ name: 'keep.webp' }], error: null })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await deleteStaleAvatars(sb as any, 'u-1', 'keep.webp')
    expect(sb.remove).not.toHaveBeenCalled()
  })

  it('best-effort : une erreur de list ne lève pas (upload déjà réussi)', async () => {
    const sb = makeSupabase({ data: null, error: { message: 'boom' } })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(deleteStaleAvatars(sb as any, 'u-1', 'keep.webp')).resolves.toBeUndefined()
    expect(sb.remove).not.toHaveBeenCalled()
  })
})
