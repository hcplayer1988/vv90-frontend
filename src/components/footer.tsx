import { Link } from 'react-router-dom'
 
/**
 * Footer: shown on every page via App.tsx's layout. Pure JSX, no state -
 * only the internal nav links use <Link> instead of <a href> so navigation
 * stays client-side instead of triggering a full page reload.
 */
function Footer() {
  return (
    <footer>
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
              <circle cx="60" cy="60" r="56" fill="none" stroke="#ffffff" strokeWidth="4" />
              <g fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity={0.8}>
                <path d="M4,42 Q60,10 116,42" />
                <path d="M4,78 Q60,110 116,78" />
              </g>
            </svg>
            VV90 e. V.
          </div>
          <ul className="footer-links">
            <li>
              <Link to="/trainingszeiten">Trainingszeiten</Link>
            </li>
            <li>
              <Link to="/spielplan">Spielplan</Link>
            </li>
            <li>
              <Link to="/verein">Verein</Link>
            </li>
          </ul>
        </div>
        <div className="footer-bottom">
          <span>
            <a href="#">Impressum</a> · <a href="#">Datenschutzerklärung</a>
          </span>
          <span>© 2026 VV90 e. V. Alle Rechte vorbehalten.</span>
        </div>
      </div>
    </footer>
  )
}
 
export default Footer
 