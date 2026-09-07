import { useEffect, useState } from 'react'
import { listTermine, type Termin } from '../../api/termine'
import { findNextOccurrence } from '../../utils/terminRecurrence'
 
function formatOccurrence(date: Date, termin: Termin) {
  const dateLabel = date.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })
  const time = new Date(termin.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  return { dateLabel, time }
}
 
/**
 * Dashboard: landing page of the member area. The two Termin-cards
 * (training/match) are wired up to the real /api/termine/ data via
 * findNextOccurrence(), which accounts for recurring events. "Offene
 * Einladungen" stays static for now - there's no backend endpoint yet to
 * list open invites (only POST /invite/ to create one exists).
 */
function Dashboard() {
  const [termine, setTermine] = useState<Termin[]>([])
  const [isLoading, setIsLoading] = useState(true)
 
  async function loadTermine() {
    try {
      const data = await listTermine()
      setTermine(data)
    } catch {
      // Silently falls back to "Kein Termin geplant" below - the dashboard
      // isn't the place for a loud error, Termine itself shows one.
    } finally {
      setIsLoading(false)
    }
  }
 
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTermine()
  }, [])
 
  const nextTraining = findNextOccurrence(termine, 'training')
  const nextSpiel = findNextOccurrence(termine, 'spielplan')
 
  return (
    <div>
      <div className="view-header">
        <div>
          <span className="eyebrow">ÜBERSICHT</span>
          <h1>Hallo 👋</h1>
          <p>Das ist gerade los bei VV90.</p>
        </div>
      </div>
 
      <div className="grid three" style={{ marginBottom: '16px' }}>
        <div className="member-card stat-card">
          <span className="label">Nächstes Training</span>
          {isLoading ? (
            <span className="sub">Lädt …</span>
          ) : nextTraining ? (
            <>
              <span className="value">{formatOccurrence(nextTraining.date, nextTraining.termin).dateLabel} · {formatOccurrence(nextTraining.date, nextTraining.termin).time}</span>
              <span className="sub">{nextTraining.termin.ort || nextTraining.termin.titel}</span>
            </>
          ) : (
            <span className="sub">Kein Training geplant</span>
          )}
        </div>
 
        <div className="member-card stat-card">
          <span className="label">Nächstes Spiel</span>
          {isLoading ? (
            <span className="sub">Lädt …</span>
          ) : nextSpiel ? (
            <>
              <span className="value">{formatOccurrence(nextSpiel.date, nextSpiel.termin).dateLabel} · {formatOccurrence(nextSpiel.date, nextSpiel.termin).time}</span>
              <span className="sub">{nextSpiel.termin.titel}</span>
            </>
          ) : (
            <span className="sub">Kein Spiel geplant</span>
          )}
        </div>
 
        <div className="member-card stat-card">
          <span className="label">Offene Einladungen</span>
          <span className="value">2</span>
          <span className="sub">warten auf Registrierung</span>
        </div>
      </div>
 
      <div className="grid two">
        <div className="member-card">
          <div className="section-title-row">
            <h3>Neu im Forum</h3>
          </div>
          <div className="feed-item">
            <div className="feed-avatar">MS</div>
            <div>
              <div className="feed-text">
                <b>Marie S.</b> hat auf „Vollexballnacht" geantwortet
              </div>
              <div className="feed-meta">vor 2 Stunden</div>
            </div>
          </div>
          <div className="feed-item">
            <div className="feed-avatar">TK</div>
            <div>
              <div className="feed-text">
                <b>Tom K.</b> hat einen neuen Beitrag erstellt: „Trikots bestellen?"
              </div>
              <div className="feed-meta">gestern</div>
            </div>
          </div>
        </div>
 
        <div className="member-card">
          <div className="section-title-row">
            <h3>Wer ist online</h3>
          </div>
          <div className="member-row">
            <span className="status-dot"></span>
            <span className="m-name">Marie Schulze</span>
            <span className="m-sub">online</span>
          </div>
          <div className="member-row">
            <span className="status-dot"></span>
            <span className="m-name">Tom Krause</span>
            <span className="m-sub">online</span>
          </div>
          <div className="member-row">
            <span className="status-dot offline"></span>
            <span className="m-name">Anna Voigt</span>
            <span className="m-sub">vor 3 Std.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
 
export default Dashboard
  



