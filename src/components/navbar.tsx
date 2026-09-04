import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
 
/**
 * Navbar: sticky/fixed header with the club logo, page navigation and the
 * member login trigger. On mobile the nav links become a fullscreen drawer
 * toggled by the hamburger button (replaces the classList.toggle from the
 * HTML mockup with real React state).
 */
function Navbar({ onLoginClick }: { onLoginClick: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
 
  // Closes the mobile drawer whenever a nav link is clicked - otherwise it
  // would stay open after navigating to the new page.
  const closeMenu = () => setIsOpen(false)
 
  const isActive = (path: string) => location.pathname === path
 
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand" onClick={closeMenu}>
          <svg className="ball" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
            <circle cx="60" cy="60" r="56" fill="#ffffff" stroke="#c8102e" strokeWidth="4" />
            <g fill="none" stroke="#141414" strokeWidth="4" strokeLinecap="round">
              <path d="M4,42 Q60,10 116,42" />
              <path d="M4,78 Q60,110 116,78" />
              <path d="M30,4 Q0,60 30,116" />
              <path d="M90,4 Q120,60 90,116" />
            </g>
          </svg>
          <span>
            VV90
            <small>HOBBYVOLLEYBALLVEREIN</small>
          </span>
        </Link>
 
        <nav>
          <ul className={`nav-links ${isOpen ? 'open' : ''}`}>
            <li>
              <Link to="/" className={isActive('/') ? 'active' : ''} onClick={closeMenu}>
                Home
              </Link>
            </li>
            <li>
              <Link
                to="/trainingszeiten"
                className={isActive('/trainingszeiten') ? 'active' : ''}
                onClick={closeMenu}
              >
                Trainingszeiten
              </Link>
            </li>
            <li>
              <Link
                to="/spielplan"
                className={isActive('/spielplan') ? 'active' : ''}
                onClick={closeMenu}
              >
                Spielplan
              </Link>
            </li>
            <li>
              <Link to="/verein" className={isActive('/verein') ? 'active' : ''} onClick={closeMenu}>
                Verein
              </Link>
            </li>
            {/* Login button duplicated here for the mobile drawer - hidden on desktop via CSS */}
            <li>
              <button
                className="btn-login"
                onClick={() => {
                  closeMenu()
                  onLoginClick()
                }}
              >
                Mitglieder-Login
              </button>
            </li>
          </ul>
        </nav>
 
        {/* Desktop-only login button, shown next to the nav via CSS at >=1024px */}
        <div className="nav-right-desktop">
          <button className="btn-login" onClick={onLoginClick}>
            Mitglieder-Login
          </button>
        </div>
 
        <button
          className="nav-toggle"
          aria-label="Menü öffnen"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          ☰
        </button>
      </div>
    </header>
  )
}
 
export default Navbar
 