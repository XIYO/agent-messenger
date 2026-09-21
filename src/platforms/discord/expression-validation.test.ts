import { describe, expect, it } from 'bun:test'

import {
  readPngSize,
  validateEmojiImage,
  validateEmojiName,
  validateStickerImage,
  validateStickerName,
} from './expression-validation'

function pngBytes(width: number, height: number, padding = 0): Uint8Array {
  const bytes = new Uint8Array(24 + padding)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)
  bytes.set([0x00, 0x00, 0x00, 0x0d], 8)
  bytes.set([0x49, 0x48, 0x44, 0x52], 12)
  new DataView(bytes.buffer).setUint32(16, width)
  new DataView(bytes.buffer).setUint32(20, height)
  return bytes
}

describe('validateEmojiName', () => {
  it('accepts letters, digits and underscores', () => {
    expect(validateEmojiName('potato_13')).toBeNull()
  })

  it('rejects a hyphen, naming the allowed characters', () => {
    expect(validateEmojiName('potato-13')).toContain('letters, digits, underscores')
  })

  it('rejects a name shorter than 2 characters', () => {
    expect(validateEmojiName('a')).toContain('2')
  })

  it('rejects a name longer than 32 characters', () => {
    expect(validateEmojiName('p'.repeat(33))).toContain('32')
  })
})

describe('readPngSize', () => {
  it('reads width and height from the IHDR header', () => {
    expect(readPngSize(pngBytes(320, 320))).toEqual({ width: 320, height: 320 })
  })

  it('returns null when the file is not a PNG', () => {
    expect(readPngSize(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00]))).toBeNull()
  })
})

describe('validateEmojiImage', () => {
  it('accepts a PNG under 256KB', () => {
    expect(validateEmojiImage('potato_13.png', pngBytes(128, 128))).toBeNull()
  })

  it('rejects a file over 256KB, naming the limit', () => {
    expect(validateEmojiImage('potato_13.png', new Uint8Array(256 * 1024 + 1))).toContain('256')
  })

  it('rejects an unsupported extension', () => {
    expect(validateEmojiImage('potato_13.bmp', pngBytes(128, 128))).toContain('.bmp')
  })
})

describe('validateStickerImage', () => {
  it('accepts a 320x320 PNG under 512KB', () => {
    expect(validateStickerImage('potato_13.png', pngBytes(320, 320))).toBeNull()
  })

  it('rejects a PNG that is not exactly 320x320, naming the actual size', () => {
    expect(validateStickerImage('potato_13.png', pngBytes(408, 408))).toContain('408x408')
  })

  it('rejects a file over 512KB, naming the limit', () => {
    expect(validateStickerImage('potato_13.png', new Uint8Array(512 * 1024 + 1))).toContain('512')
  })

  it('rejects an unsupported extension', () => {
    expect(validateStickerImage('potato_13.gif', pngBytes(320, 320))).toContain('.gif')
  })

  it('accepts a Lottie JSON without checking dimensions', () => {
    expect(validateStickerImage('potato_13.json', new Uint8Array([0x7b, 0x7d]))).toBeNull()
  })
})

describe('validateStickerName', () => {
  it('accepts a two-character name', () => {
    expect(validateStickerName('빼액')).toBeNull()
  })

  it('rejects a single character, naming the minimum', () => {
    // Discord answers a one-character sticker name with a bare "Invalid Form Body".
    expect(validateStickerName('흥')).toContain('2')
  })

  it('rejects a name longer than 30 characters', () => {
    expect(validateStickerName('가'.repeat(31))).toContain('30')
  })
})
