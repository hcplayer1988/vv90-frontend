import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { hasRole, type LoggedInUser } from '../api/auth'
 
interface MemberLayoutProps {
  currentUser: LoggedInUser
  onLogoutClick: () => void
}
 
interface NavItem {
  path: string
  label: string
  end?: boolean
  vorstandOnly?: boolean
  icon: string
}
 
const NAV_ITEMS: NavItem[] = [
  { path: '/app', label: 'Übersicht', end: true, icon: 'M3 11l9-8 9 8M5 10v10h14V10' },
  { path: '/app/termine', label: 'Termine', icon: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4' },
  { path: '/app/forum', label: 'Forum', icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
  { path: '/app/umfragen', label: 'Umfragen', icon: 'M4 20V10M12 20V4M20 20v-6' },
  {
    path: '/app/dateien',
    label: 'Dateien',
    icon: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  },
  {
    path: '/app/verwaltung',
    label: 'Verwaltung',
    vorstandOnly: true,
    icon:
      'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z' +
      'M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1z',
  },
]
 

function MemberLayout({ currentUser, onLogoutClick }: MemberLayoutProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
 
  const isVorstand = hasRole(currentUser, 'vorstand') || hasRole(currentUser, 'admin')
  const visibleItems = NAV_ITEMS.filter((item) => !item.vorstandOnly || isVorstand)
  const initials = currentUser.email.slice(0, 2).toUpperCase()
 
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
 
  const renderIcon = (path: string) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  )
 
  return (
    <div id="member-app">
      <header className="topbar">
        <Link to="/app" className="brand">
          <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
            <circle cx="60" cy="60" r="56" fill="#fff" stroke="#c8102e" strokeWidth="4" />
            <g fill="none" stroke="#141414" strokeWidth="4" strokeLinecap="round">
              <path d="M4,42 Q60,10 116,42" />
              <path d="M4,78 Q60,110 116,78" />
            </g>
          </svg>
          VV90
        </Link>
 
        <div className="user-menu" ref={dropdownRef}>
          <button className="avatar-btn" onClick={() => setIsDropdownOpen((prev) => !prev)}>
            {currentUser.avatar ? (
              <img src={currentUser.avatar} alt="" className="avatar" style={{ objectFit: 'cover' }} />
            ) : (
              <span className="avatar">{initials}</span>
            )}
            <span className="chev">▾</span>
          </button>
 
          {isDropdownOpen && (
            <div className="dropdown">
              <div className="dropdown-head">
                <div className="name">{currentUser.username}</div>
                <div className="email">{currentUser.email}</div>
                <span className={`role-badge ${isVorstand ? 'vorstand' : ''}`}>
                  {isVorstand ? 'Vorstand' : 'Mitglied'}
                </span>
              </div>
              <Link to="/app/profil" className="item" onClick={() => setIsDropdownOpen(false)}>
                👤 Meine Daten
              </Link>
              <div className="divider" />
              <button
                className="item danger"
                onClick={() => {
                  setIsDropdownOpen(false)
                  onLogoutClick()
                }}
              >
                ↪ Abmelden
              </button>
            </div>
          )}
        </div>
      </header>
 
      <aside className="member-sidebar">
        <nav>
          {visibleItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {renderIcon(item.icon)}
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
 
      <main className="member-main">
        <div className="main-inner">
          <Outlet context={{ currentUser }} />
        </div>
      </main>
 
      <nav className="tabbar">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            {renderIcon(item.icon)}
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
 
export default MemberLayout
  
