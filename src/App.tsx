import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import Navbar from './components/navbar'
import Footer from './components/footer'
import LoginOverlay from './components/loginOverlay'
import Home from './pages/home'
import Trainingszeiten from './pages/trainingszeiten'
import Spielplan from './pages/spielplan'
import Verein from './pages/verein'
import { logout, type LoggedInUser } from './api/auth'
 
/**
 * App: overall page layout. Navbar and Footer stay fixed on every page,
 * only the content between them changes based on the current route.
 * isLoginOpen and currentUser are lifted up here because Navbar (login/
 * logout trigger) and LoginOverlay (the modal + login API call) need to
 * share them.
 */
function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<LoggedInUser | null>(null)
 
  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // Selbst wenn der Server-Call fehlschlägt (z.B. Token schon abgelaufen),
      // soll die Oberfläche trotzdem in den ausgeloggten Zustand wechseln.
    } finally {
      setCurrentUser(null)
    }
  }
 
  return (
    <>
      <Navbar
        currentUser={currentUser}
        onLoginClick={() => setIsLoginOpen(true)}
        onLogoutClick={handleLogout}
      />
 
      <main className="page-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/trainingszeiten" element={<Trainingszeiten />} />
          <Route path="/spielplan" element={<Spielplan />} />
          <Route path="/verein" element={<Verein />} />
        </Routes>
      </main>
 
      <LoginOverlay
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(user) => setCurrentUser(user)}
      />
 
      <Footer />
    </>
  )
}
 
export default App
 



