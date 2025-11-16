const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const DEFAULT_DIGITS = Number(import.meta.env.VITE_AUTHENTICATOR_DIGITS ?? 6) || 6
const DEFAULT_PERIOD = Number(import.meta.env.VITE_AUTHENTICATOR_PERIOD ?? 30) || 30
const MASTER_SECRET =
  import.meta.env.VITE_AUTHENTICATOR_MASTER_SECRET?.trim() || 'personal-management-demo-master-secret'

const textEncoder = new TextEncoder()

function getCrypto(): Crypto | null {
  if (typeof globalThis !== 'undefined' && globalThis.crypto) return globalThis.crypto as Crypto
  return null
}

function bytesToBase32(bytes: Uint8Array) {
  let bits = 0
  let value = 0
  let output = ''

  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  }

  return output
}

async function deriveUserSecretBytes(userId: string) {
  const cryptoInstance = getCrypto()
  const data = textEncoder.encode(`${MASTER_SECRET}:${userId}`)

  if (!cryptoInstance?.subtle) {
    // Fallback: repeat the raw data to ensure minimum length
    const buffer = new Uint8Array(Math.max(20, data.length))
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = data[i % data.length]
    }
    return buffer
  }

  const digest = await cryptoInstance.subtle.digest('SHA-256', data)
  return new Uint8Array(digest)
}

function sanitizeCode(code: string) {
  return code.replace(/\s+/g, '').trim()
}

async function generateHmacSha1(secret: Uint8Array, counter: number) {
  const cryptoInstance = getCrypto()
  const counterBuffer = new ArrayBuffer(8)
  const view = new DataView(counterBuffer)
  // Write big-endian counter
  const high = Math.floor(counter / 2 ** 32)
  const low = counter >>> 0
  view.setUint32(0, high)
  view.setUint32(4, low)

  if (!cryptoInstance?.subtle) {
    throw new Error('Web Crypto API is not available to generate HMAC values')
  }

  // Copy into a plain ArrayBuffer to satisfy the Web Crypto type expectations
  const keyData = new ArrayBuffer(secret.byteLength)
  new Uint8Array(keyData).set(secret)
  const key = await cryptoInstance.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
  const signature = await cryptoInstance.subtle.sign('HMAC', key, counterBuffer)
  return new Uint8Array(signature)
}

async function generateTotpFromSecret({
  secret,
  digits = DEFAULT_DIGITS,
  timestamp = Date.now(),
  period = DEFAULT_PERIOD,
}: {
  secret: Uint8Array
  digits?: number
  timestamp?: number
  period?: number
}) {
  const counter = Math.floor(timestamp / 1000 / period)
  const hmac = await generateHmacSha1(secret, counter)
  const offset = hmac[hmac.length - 1] & 0xf
  const binary = ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  const otp = binary % 10 ** digits
  return otp.toString().padStart(digits, '0')
}

export async function getUserAuthenticatorSecretBase32(userId: string) {
  const secretBytes = await deriveUserSecretBytes(userId)
  return bytesToBase32(secretBytes)
}

export async function getAuthenticatorProvisioningURI({
  userId,
  label,
  issuer = 'Personal Management',
}: {
  userId: string
  label: string
  issuer?: string
}) {
  const secret = await getUserAuthenticatorSecretBase32(userId)
  const encodedLabel = encodeURIComponent(label)
  const encodedIssuer = encodeURIComponent(issuer)
  return `otpauth://totp/${encodedLabel}?secret=${secret}&issuer=${encodedIssuer}&period=${DEFAULT_PERIOD}&digits=${DEFAULT_DIGITS}`
}

export async function verifyAuthenticatorCode({
  code,
  userId,
  window = 1,
}: {
  code: string
  userId: string
  window?: number
}) {
  const sanitized = sanitizeCode(code)
  if (!/^\d{6}$/.test(sanitized)) {
    return false
  }
  const secret = await deriveUserSecretBytes(userId)
  const now = Date.now()

  for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
    const timestamp = now + errorWindow * DEFAULT_PERIOD * 1000
    const token = await generateTotpFromSecret({ secret, timestamp })
    if (token === sanitized) {
      return true
    }
  }
  return false
}