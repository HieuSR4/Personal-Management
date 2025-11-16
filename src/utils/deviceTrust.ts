const STORAGE_KEY = 'pm.trustedDevices'

type TrustedDeviceMap = Record<string, { trustedAt: number }>

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

function readTrustedMap(): TrustedDeviceMap {
  const storage = getStorage()
  if (!storage) return {}
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'object' && parsed) {
      return parsed as TrustedDeviceMap
    }
    return {}
  } catch (error) {
    console.warn('Failed to parse trusted device map', error)
    return {}
  }
}

function writeTrustedMap(map: TrustedDeviceMap) {
  const storage = getStorage()
  if (!storage) return
  storage.setItem(STORAGE_KEY, JSON.stringify(map))
}

export function isDeviceTrusted(userId: string) {
  const map = readTrustedMap()
  return Boolean(map[userId])
}

export function markDeviceTrusted(userId: string) {
  const map = readTrustedMap()
  map[userId] = { trustedAt: Date.now() }
  writeTrustedMap(map)
}

export function removeTrustedDevice(userId: string) {
  const map = readTrustedMap()
  if (map[userId]) {
    delete map[userId]
    writeTrustedMap(map)
  }
}

export function clearAllTrustedDevices() {
  const storage = getStorage()
  storage?.removeItem(STORAGE_KEY)
}