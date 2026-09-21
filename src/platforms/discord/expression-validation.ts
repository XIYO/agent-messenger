const EMOJI_NAME_PATTERN = /^[A-Za-z0-9_]+$/
const EMOJI_NAME_MIN = 2
const EMOJI_NAME_MAX = 32

const EMOJI_MAX_BYTES = 256 * 1024
const EMOJI_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp']

const STICKER_MAX_BYTES = 512 * 1024
const STICKER_EXTENSIONS = ['.png', '.json']
const STICKER_SIDE = 320

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot === -1 ? '' : filename.slice(dot).toLowerCase()
}

const CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.json': 'application/json',
}

export function contentTypeFor(filename: string): string {
  return CONTENT_TYPES[extensionOf(filename)] ?? 'application/octet-stream'
}

export function validateEmojiName(name: string): string | null {
  if (name.length < EMOJI_NAME_MIN) {
    return `Emoji name must be at least ${EMOJI_NAME_MIN} characters: "${name}"`
  }
  if (name.length > EMOJI_NAME_MAX) {
    return `Emoji name must be at most ${EMOJI_NAME_MAX} characters: "${name}"`
  }
  if (!EMOJI_NAME_PATTERN.test(name)) {
    return `Emoji name may only contain letters, digits, underscores: "${name}"`
  }
  return null
}

export function readPngSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24) return null
  if (PNG_SIGNATURE.some((byte, index) => bytes[index] !== byte)) return null

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return { width: view.getUint32(16), height: view.getUint32(20) }
}

export function validateEmojiImage(filename: string, bytes: Uint8Array): string | null {
  const extension = extensionOf(filename)
  if (!EMOJI_EXTENSIONS.includes(extension)) {
    return `Emoji image must be one of ${EMOJI_EXTENSIONS.join(', ')}, got "${extension}"`
  }
  if (bytes.length > EMOJI_MAX_BYTES) {
    return `Emoji image must be at most 256KB, got ${Math.ceil(bytes.length / 1024)}KB`
  }
  return null
}

export function validateStickerImage(filename: string, bytes: Uint8Array): string | null {
  const extension = extensionOf(filename)
  if (!STICKER_EXTENSIONS.includes(extension)) {
    return `Sticker image must be one of ${STICKER_EXTENSIONS.join(', ')}, got "${extension}"`
  }
  if (bytes.length > STICKER_MAX_BYTES) {
    return `Sticker image must be at most 512KB, got ${Math.ceil(bytes.length / 1024)}KB`
  }

  const size = readPngSize(bytes)
  if (size && (size.width !== STICKER_SIDE || size.height !== STICKER_SIDE)) {
    return `Sticker image must be exactly ${STICKER_SIDE}x${STICKER_SIDE}, got ${size.width}x${size.height}`
  }
  return null
}
