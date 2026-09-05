import { useState } from 'react'
import { AxiosError } from 'axios'
import { login, type LoggedInUser } from '../api/auth'
 
interface LoginOverlayProps {
  isOpen: boolean
  onClose: () => void
  onLoginSuccess: (user: LoggedInUser) => void
}
 
/**
 * LoginOverlay: modal for the member login form, now wired up against
 * POST /api/accounts/login/. Open/closed state still lives in App.tsx
 * (shared with Navbar's login button); only the form's own input/error/
 * loading state lives here, since nothing outside this component needs it.
 */
function LoginOverlay({ isOpen, onClose, onLoginSuccess }: LoginOverlayProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
 
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
 
    try {
      const response = await login({ email, password })
      onLoginSuccess(response.user)
      setEmail('')
      setPassword('')
      onClose()
    } catch (err) {
      // Der Login-Serializer liefert bei falschen Daten immer die gleiche,
      // bewusst unspezifische Fehlermeldung (kein "Email nicht gefunden" vs.
      // "Passwort falsch" - das würde verraten, welche E-Mails existieren).
      if (err instanceof AxiosError && err.response?.status === 400) {
        setError('E-Mail oder Passwort ist falsch.')
      } else {
        setError('Etwas ist schiefgelaufen. Bitte versuch es später erneut.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }
 
  return (
    <div className={`login-overlay ${isOpen ? 'open' : ''}`}>
      <div className="login-panel">
        <button className="login-close" onClick={onClose} aria-label="Schließen">
          ✕
        </button>
        <h3>Mitglieder-Login</h3>
        <p className="hint">Zugang zu Spielplan, Terminen und Forum.</p>
 
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">E-Mail</label>
          <input
            type="email"
            id="email"
            placeholder="max@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
 
          <label htmlFor="password">Passwort</label>
          <input
            type="password"
            id="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
 
          {error && (
            <p style={{ color: '#c8102e', fontSize: '13px', marginTop: '10px' }}>{error}</p>
          )}
 
          <button type="submit" className="login-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Einloggen …' : 'Einloggen'}
          </button>
        </form>
      </div>
    </div>
  )
}
 
export default LoginOverlay
 


