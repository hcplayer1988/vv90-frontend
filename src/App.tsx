import { useEffect, useState } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'
import Navbar from './components/navbar'
import Footer from './components/footer'
import LoginOverlay from './components/loginOverlay'
import ProtectedRoute from './components/protectedRoute'
import MemberLayout from './components/memberLayout'
import Home from './pages/home'
import Trainingszeiten from './pages/trainingszeiten'
import Spielplan from './pages/spielplan'
import Verein from './pages/verein'
import EmailBestaetigen from './pages/emailBestaetigen'
import Dashboard from './pages/app/dashboard'
import Termine from './pages/app/termine'
import Forum from './pages/app/forum'
import ForumThread from './pages/app/forumThread'
import Dateien from './pages/app/dateien'
import Verwaltung from './pages/app/verwaltung'
import Profil from './pages/app/profil'
import { getMe, logout, type LoggedInUser } from './api/auth'
import { setAuthFailureHandler } from './api/client'
 
/**
 * App: overall page layout. The public pages (Home/Trainingszeiten/
 * Spielplan/Verein) keep the site-wide Navbar and Footer. The member area
 * under /app has its own layout (MemberLayout) with a different navigation
 * pattern (topbar + sidebar/tabbar) and is wrapped in ProtectedRoute so it
 * can't be reached without being logged in.
 */
function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<LoggedInUser | null>(null)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const navigate = useNavigate()
 
  // Check once on app start whether the access_token cookie from a
  // previous session is still valid - otherwise the user would appear
  // "logged out" after every page reload, even though the cookie is
  // still active on the backend.
  useEffect(() => {
    // If a refresh attempt ever fails after the initial session check (i.e.
    // the refresh token itself expired, typically after 7 days), client.ts
    // calls this to reset the logged-in state - it has no way to touch
    // React state directly, so this indirection is how the two connect.
    setAuthFailureHandler(() => setCurrentUser(null))
 
    getMe()
      .then((user) => setCurrentUser(user))
      .catch(() => setCurrentUser(null))
      .finally(() => setIsCheckingSession(false))
  }, [])
 
  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // Even if the server call fails (e.g. token already expired), the
      // UI should still switch to the logged-out state.
    } finally {
      setCurrentUser(null)
      navigate('/')
    }
  }
 
  // While the session check is running, render nothing yet - this avoids
  // a brief flash of "Mitglieder-Login" before it's confirmed that the
  // user is actually already logged in.
  if (isCheckingSession) {
    return null
  }
 
  return (
    <>
      <Routes>
        {/* ===== Public site ===== */}
        <Route
          path="/"
          element={
            <>
              <Navbar
                currentUser={currentUser}
                onLoginClick={() => setIsLoginOpen(true)}
                onLogoutClick={handleLogout}
              />
              <main className="page-main">
                <Home />
              </main>
              <Footer />
            </>
          }
        />
        <Route
          path="/trainingszeiten"
          element={
            <>
              <Navbar
                currentUser={currentUser}
                onLoginClick={() => setIsLoginOpen(true)}
                onLogoutClick={handleLogout}
              />
              <main className="page-main">
                <Trainingszeiten />
              </main>
              <Footer />
            </>
          }
        />
        <Route
          path="/spielplan"
          element={
            <>
              <Navbar
                currentUser={currentUser}
                onLoginClick={() => setIsLoginOpen(true)}
                onLogoutClick={handleLogout}
              />
              <main className="page-main">
                <Spielplan />
              </main>
              <Footer />
            </>
          }
        />
        <Route
          path="/verein"
          element={
            <>
              <Navbar
                currentUser={currentUser}
                onLoginClick={() => setIsLoginOpen(true)}
                onLogoutClick={handleLogout}
              />
              <main className="page-main">
                <Verein />
              </main>
              <Footer />
            </>
          }
        />
        <Route
          path="/email-bestaetigen"
          element={
            <>
              <Navbar
                currentUser={currentUser}
                onLoginClick={() => setIsLoginOpen(true)}
                onLogoutClick={handleLogout}
              />
              <main className="page-main">
                <EmailBestaetigen />
              </main>
              <Footer />
            </>
          }
        />
 
        {/* ===== Member area ===== */}
        <Route
          path="/app"
          element={
            <ProtectedRoute currentUser={currentUser}>
              {/* currentUser is guaranteed non-null here: ProtectedRoute only
                  renders these children once it has confirmed that. TypeScript
                  can't see that across the component boundary, hence the
                  non-null assertion. */}
              <MemberLayout currentUser={currentUser!} onLogoutClick={handleLogout} />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="termine" element={<Termine />} />
          <Route path="forum" element={<Forum />} />
          <Route path="forum/:id" element={<ForumThread />} />
          <Route path="dateien" element={<Dateien />} />
          <Route path="verwaltung" element={<Verwaltung />} />
          <Route path="profil" element={<Profil />} />
        </Route>
      </Routes>
 
      <LoginOverlay
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user)
          navigate('/app')
        }}
      />
    </>
  )
}
 
export default App
 

