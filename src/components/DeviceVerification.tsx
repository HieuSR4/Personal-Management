import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getAuthenticatorProvisioningURI,
  getUserAuthenticatorSecretBase32,
} from '../services/authenticator.ts'

export function DeviceVerification() {
  const { user, verifyDeviceWithCode, verifyingDevice, deviceError } = useAuth()
  const [code, setCode] = useState('')
  const [secret, setSecret] = useState<string | null>(null)
  const [provisionUri, setProvisionUri] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const hasExistingAuthenticator = useMemo(() => {
    if (!user) return false
    const creationTime = user.metadata?.creationTime
    const lastSignInTime = user.metadata?.lastSignInTime
    if (!creationTime || !lastSignInTime) return false
    return creationTime !== lastSignInTime
  }, [user])

  useEffect(() => {
    let active = true
    if (!user || hasExistingAuthenticator) {
      return () => {
        active = false
      }
    }

    ;(async () => {
      const secretBase32 = await getUserAuthenticatorSecretBase32(user.uid)
      const uri = await getAuthenticatorProvisioningURI({
        userId: user.uid,
        label: user.email ?? user.uid,
      })
      if (active) {
        setSecret(secretBase32)
        setProvisionUri(uri)
      }
    })()

    return () => {
      active = false
    }
  }, [user, hasExistingAuthenticator])

  useEffect(() => {
    if (hasExistingAuthenticator) {
      setSecret(null)
      setProvisionUri(null)
      setCopied(false)
    }
  }, [hasExistingAuthenticator])

  if (!user) {
    return null
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!code) return
    await verifyDeviceWithCode(code)
  }

  const onCopy = async () => {
    if (!secret) return
    try {
      await navigator.clipboard.writeText(secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.warn('Failed to copy secret', error)
    }
  }

  return (
    <section className="card device-verification">
      <div>
        <h2>Xác thực 2FA</h2>
      </div>

      {!hasExistingAuthenticator ? (
        <div className="verification-secret">
          <p className="secret-label">Mã khởi tạo Authenticator</p>
          {secret ? (
            <div className="secret-value">
              <code>{secret}</code>
              <button type="button" onClick={onCopy} className="ghost-btn">
                {copied ? 'Đã sao chép' : 'Sao chép'}
              </button>
            </div>
          ) : (
            <p>Đang tạo mã...</p>
          )}
          {provisionUri ? (
            <p className="helper-text">
              Ban co the them nhanh vao ung dung Authenticator bang cach mo duong dan{' '}
              <a href={provisionUri}>{provisionUri}</a> va tao QR code tu duong dan nay.
            </p>
          ) : null}
        </div>
      ) : null}

      <form className="verification-form" onSubmit={onSubmit}>
        <label>
          Mã xác thực
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, ''))}
            placeholder="123456"
          />
        </label>
        {deviceError ? <p className="error-text">{deviceError}</p> : null}
        <button type="submit" disabled={verifyingDevice || code.length !== 6}>
          {verifyingDevice ? 'Đang xác minh...' : 'Xác minh thiết bị'}
        </button>
      </form>
    </section>
  )
}
