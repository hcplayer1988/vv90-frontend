import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AxiosError } from 'axios'
import { confirmEmailChange } from '../api/auth'
 
/**
 * EmailBestaetigen: public page the confirmation link in the email-change
 * mail points to. Reads the token from the URL, calls the backend once on
 * mount, and shows the result - this is the page that actually makes a
 * pending email change real (see EmailChangeConfirmView on the backend).
 * Public route: no login required, since the token alone identifies the
 * request, matching how password-reset confirmation works too.
 */
function EmailBestaetigen() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
 
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
 
  async function confirm(currentToken: string) {
    try {
      const result = await confirmEmailChange(currentToken)
      setMessage(result.detail)
      setStatus('success')
    } catch (err) {
      const text =
        err instanceof AxiosError && err.response?.data?.detail
          ? String(err.response.data.detail)
          : 'Der Bestätigungslink ist ungültig oder abgelaufen.'
      setMessage(text)
      setStatus('error')
    }
  }
 
  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('error')
      setMessage('Kein Bestätigungstoken in diesem Link gefunden.')
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    confirm(token)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])
 
  return (
    <section style={{ padding: '80px 24px', textAlign: 'center' }}>
      <div style={{ maxWidth: '420px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>E-Mail-Adresse bestätigen</h1>
 
        {status === 'loading' && <p>Wird geprüft …</p>}
 
        {status === 'success' && (
          <>
            <p style={{ color: '#1f7d38', marginBottom: '20px' }}>{message}</p>
            <Link to="/" className="btn-primary" style={{ display: 'inline-flex' }}>
              Zur Startseite
            </Link>
          </>
        )}
 
        {status === 'error' && (
          <>
            <p style={{ color: '#c8102e', marginBottom: '20px' }}>{message}</p>
            <Link to="/" className="btn-outline" style={{ display: 'inline-flex' }}>
              Zur Startseite
            </Link>
          </>
        )}
      </div>
    </section>
  )
}
 
export default EmailBestaetigen
  