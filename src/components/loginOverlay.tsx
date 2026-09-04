interface LoginOverlayProps {
  isOpen: boolean
  onClose: () => void
}
 
/**
 * LoginOverlay: modal for the member login form. Open/closed state lives in
 * App.tsx (shared with Navbar's login button) and is passed down as props -
 * this component itself has no state of its own.
 */
function LoginOverlay({ isOpen, onClose }: LoginOverlayProps) {
  return (
    <div className={`login-overlay ${isOpen ? 'open' : ''}`}>
      <div className="login-panel">
        <button className="login-close" onClick={onClose} aria-label="Schließen">
          ✕
        </button>
        <h3>Mitglieder-Login</h3>
        <p className="hint">Zugang zu Spielplan, Terminen und Forum.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            // Echte Login-Logik (API-Call gegen /api/accounts/login/) kommt,
            // sobald wir die Auth-Anbindung bauen - aktuell nur das Formular.
          }}
        >
          <label htmlFor="email">E-Mail</label>
          <input type="email" id="email" placeholder="max@example.com" />
          <label htmlFor="password">Passwort</label>
          <input type="password" id="password" placeholder="••••••••" />
          <button type="submit" className="login-submit">
            Einloggen
          </button>
        </form>
      </div>
    </div>
  )
}
 
export default LoginOverlay
 