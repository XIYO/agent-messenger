/**
 * Decide an expression's format from its bytes, not its filename.
 *
 * The upload declares a media type in its multipart part, and Discord answers
 * a part whose declared type does not match its content with a bare
 * "Invalid Asset" — the same opaque rejection a missing type produces. A
 * filename is unverified input, so deriving the type from the extension means
 * one mislabelled file in a batch fails without saying which, or why.
 *
 * This deliberately does not check dimensions. Discord's documentation gives
 * 320x320 for stickers, but a 408x408 PNG uploads and registers fine, so a
 * local size check would refuse files the API accepts.
 */

export type ExpressionFormat = 'png' | 'gif' | 'jpeg' | 'webp' | 'lottie'

const MEDIA_TYPES: Record<ExpressionFormat, string> = {
  png: 'image/png',
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  lottie: 'application/json',
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff]

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return bytes.length >= signature.length && signature.every((byte, index) => bytes[index] === byte)
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length))
}

export function mediaTypeOf(format: ExpressionFormat): string {
  return MEDIA_TYPES[format]
}

export function sniffFormat(bytes: Uint8Array): ExpressionFormat | null {
  // APNG carries the PNG signature too; Discord takes both as image/png.
  if (startsWith(bytes, PNG_SIGNATURE)) return 'png'
  if (startsWith(bytes, JPEG_SIGNATURE)) return 'jpeg'

  if (bytes.length >= 6 && ascii(bytes, 0, 3) === 'GIF') {
    const version = ascii(bytes, 3, 3)
    if (version === '87a' || version === '89a') return 'gif'
  }

  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
    return 'webp'
  }

  // Lottie is a JSON document. Look past leading whitespace and a BOM.
  for (let index = 0; index < Math.min(bytes.length, 8); index += 1) {
    const byte = bytes[index]
    if (byte === 0x7b) return 'lottie'
    const skippable =
      byte === 0x20 ||
      byte === 0x09 ||
      byte === 0x0a ||
      byte === 0x0d ||
      byte === 0xef ||
      byte === 0xbb ||
      byte === 0xbf
    if (!skippable) break
  }

  return null
}
