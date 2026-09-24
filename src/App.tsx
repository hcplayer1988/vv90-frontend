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
import Umfragen from './pages/app/umfragen'
import Dateien from './pages/app/dateien'
import Verwaltung from './pages/app/verwaltung'
import Profil from './pages/app/profil'
import { getMe, logout, type LoggedInUser } from './api/auth'
import { setAuthFailureHandler } from './api/client'
 

function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<LoggedInUser | null>(null)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const navigate = useNavigate()
 
  useEffect(() => {
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
      //
    } finally {
      setCurrentUser(null)
      navigate('/')
    }
  }
 
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
              <MemberLayout currentUser={currentUser!} onLogoutClick={handleLogout} />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="termine" element={<Termine />} />
          <Route path="forum" element={<Forum />} />
          <Route path="forum/:id" element={<ForumThread />} />
          <Route path="umfragen" element={<Umfragen />} />
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
 

