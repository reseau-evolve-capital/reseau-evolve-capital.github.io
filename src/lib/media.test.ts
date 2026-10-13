import { describe, expect, it } from 'vitest'
import { imageUrl } from './media'

describe('imageUrl', () => {
  it('prefere le format large', () => {
    expect(imageUrl({ url: '/uploads/o.jpg', formats: { large: { url: '/uploads/l.jpg', width: 1000, height: 600 }, small: { url: '/uploads/s.jpg', width: 500, height: 300 } } })).toBe('http://localhost:1337/uploads/l.jpg')
  })
  it('retombe sur original sans formats (SVG, petite image)', () => {
    expect(imageUrl({ url: '/uploads/logo.svg', formats: null })).toBe('http://localhost:1337/uploads/logo.svg')
  })
  it('null si pas image', () => {
    expect(imageUrl(null)).toBeNull()
  })
})
