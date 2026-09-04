import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import Navbar from './components/navbar'
import Footer from './components/footer'
import LoginOverlay from './components/loginOverlay'
import Home from './pages/home'
import Trainingszeiten from './pages/trainingszeiten'
import Spielplan from './pages/spielplan'
import Verein from './pages/verein'
 
/**
 * App: overall page layout. Navbar and Footer stay fixed on every page,
 * only the content between them changes based on the current route.
 * isLoginOpen is lifted up here because both Navbar (the trigger button)
 * and LoginOverlay (the modal itself) need to share it.
 */
function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(false)
 
  return (
    <>
      <Navbar onLoginClick={() => setIsLoginOpen(true)} />
 
      <main className="page-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/trainingszeiten" element={<Trainingszeiten />} />
          <Route path="/spielplan" element={<Spielplan />} />
          <Route path="/verein" element={<Verein />} />
        </Routes>
      </main>
 
      <LoginOverlay isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
 
      <Footer />
    </>
  )
}
 
export default App
 