import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { LoggedInUser } from '../api/auth'
 
interface NavbarProps {
  currentUser: LoggedInUser | null
  onLoginClick: () => void
  onLogoutClick: () => void
}
 
/**
 * Navbar: sticky/fixed header with the club logo, page navigation and the
 * member login/logout trigger. On mobile the nav links become a fullscreen
 * drawer toggled by the hamburger button. Shows "Mitglieder-Login" when
 * logged out, "Abmelden" once currentUser is set (both in the mobile drawer
 * and the desktop-only button).
 */
function Navbar({ currentUser, onLoginClick, onLogoutClick }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
 
  // Closes the mobile drawer whenever a nav link is clicked - otherwise it
  // would stay open after navigating to the new page.
  const closeMenu = () => setIsOpen(false)
 
  const isActive = (path: string) => location.pathname === path
 
  const handleAuthClick = () => {
    closeMenu()
    if (currentUser) {
      onLogoutClick()
    } else {
      onLoginClick()
    }
  }
 
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
            {/* Login/Logout button duplicated here for the mobile drawer - hidden on desktop via CSS */}
            <li>
              <button
                className={`btn-login ${currentUser ? 'btn-logout' : ''}`}
                onClick={handleAuthClick}
              >
                {currentUser ? 'Abmelden' : 'Mitglieder-Login'}
              </button>
            </li>
          </ul>
        </nav>
 
        {/* Desktop-only login/logout button, shown next to the nav via CSS at >=1024px */}
        <div className="nav-right-desktop">
          <button
            className={`btn-login ${currentUser ? 'btn-logout' : ''}`}
            onClick={handleAuthClick}
          >
            {currentUser ? 'Abmelden' : 'Mitglieder-Login'}
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
 





