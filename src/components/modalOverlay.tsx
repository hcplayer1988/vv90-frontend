import type { ReactNode } from 'react'
 
interface ModalOverlayProps {
  onClose: () => void
  children: ReactNode
}
 
/**
 * ModalOverlay: generic centered dialog box on a dimmed backdrop. Used for
 * every small popup in the member area (delete confirmations, "neuer
 * Ordner"/"umbenennen" forms, "Datei verschieben" picker) instead of the
 * browser's own confirm()/prompt(), which can't be styled and reads as
 * jarring. Clicking the backdrop closes the dialog; clicking inside the box
 * does not (stopPropagation).
 */
function ModalOverlay({ onClose, children }: ModalOverlayProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(20, 20, 20, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: '10px',
          padding: '24px',
          width: '100%',
          maxWidth: '420px',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25)',
        }}
      >
        {children}
      </div>
    </div>
  )
}
 
export default ModalOverlay
 