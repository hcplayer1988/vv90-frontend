import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { listAlleTermine, type Termin } from '../../api/termine'
import { listEinladungen } from '../../api/accounts'
import { listBeitraege, type Beitrag } from '../../api/forum'
import { listUmfragen, type Umfrage } from '../../api/umfragen'
import { hasRole, type LoggedInUser } from '../../api/auth'
import { findNextOccurrence } from '../../utils/terminRecurrence'
 
function formatOccurrence(date: Date, termin: Termin) {
  const dateLabel = date.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })
  const time = new Date(termin.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  return { dateLabel, time }
}
 
function relativeZeit(iso: string): string {
  const diffMinuten = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diffMinuten < 1) return 'gerade eben'
  if (diffMinuten < 60) return `vor ${diffMinuten} Minute${diffMinuten === 1 ? '' : 'n'}`
  const diffStunden = Math.floor(diffMinuten / 60)
  if (diffStunden < 24) return `vor ${diffStunden} Stunde${diffStunden === 1 ? '' : 'n'}`
  const diffTage = Math.floor(diffStunden / 24)
  if (diffTage === 1) return 'gestern'
  if (diffTage < 7) return `vor ${diffTage} Tagen`
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
 
function initialenVon(name: string): string {
  const teile = name.trim().split(/\s+/)
  const initialen = teile
    .slice(0, 2)
    .map((teil) => teil[0]?.toUpperCase() ?? '')
    .join('')
  return initialen || '?'
}
 

function Dashboard() {
  const { currentUser } = useOutletContext<{ currentUser: LoggedInUser }>()
  const isVorstand = hasRole(currentUser, 'vorstand') || hasRole(currentUser, 'admin')
  const navigate = useNavigate()
 
  const [termine, setTermine] = useState<Termin[]>([])
  const [isLoadingTermine, setIsLoadingTermine] = useState(true)
 
  const [offeneEinladungen, setOffeneEinladungen] = useState<number | null>(null)
 
  const [beitraege, setBeitraege] = useState<Beitrag[]>([])
  const [isLoadingBeitraege, setIsLoadingBeitraege] = useState(true)
 
  const [umfragen, setUmfragen] = useState<Umfrage[]>([])
  const [isLoadingUmfragen, setIsLoadingUmfragen] = useState(true)
 
  useEffect(() => {
    async function loadTermine() {
      try {
        const data = await listAlleTermine()
        setTermine(data)
      } catch {
        //
      } finally {
        setIsLoadingTermine(false)
      }
    }
    loadTermine()
  }, [])
 
  useEffect(() => {
    if (!isVorstand) return
    async function loadEinladungen() {
      try {
        const data = await listEinladungen()
        setOffeneEinladungen(data.filter((e) => !e.verwendet && e.ist_gueltig).length)
      } catch {
        //
      }
    }
    loadEinladungen()
  }, [isVorstand])
 
  useEffect(() => {
    async function loadBeitraege() {
      try {
        const data = await listBeitraege({ page_size: 20, ordering: '-erstellt_am' })
        setBeitraege(data.results)
      } catch {
        //
      } finally {
        setIsLoadingBeitraege(false)
      }
    }
    loadBeitraege()
  }, [])
 
  useEffect(() => {
    async function loadUmfragen() {
      try {
        const data = await listUmfragen('allgemein')
        setUmfragen(data)
      } catch {
        //
      } finally {
        setIsLoadingUmfragen(false)
      }
    }
    loadUmfragen()
  }, [])
 
  const nextTraining = findNextOccurrence(termine, 'training')
  const nextSpiel = findNextOccurrence(termine, 'spielplan')
 
  const offeneAbstimmungen = umfragen.filter((u) => !u.geschlossen)
  const nichtBeantwortet = offeneAbstimmungen.filter(
    (u) => !u.optionen.some((o) => o.meine_stimme),
  )
 
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
          {isLoadingTermine ? (
            <span className="sub">Lädt …</span>
          ) : nextTraining ? (
            <>
              <span className="value">
                {formatOccurrence(nextTraining.date, nextTraining.termin).dateLabel} ·{' '}
                {formatOccurrence(nextTraining.date, nextTraining.termin).time}
              </span>
              <span className="sub">{nextTraining.termin.ort || nextTraining.termin.titel}</span>
            </>
          ) : (
            <span className="sub">Kein Training geplant</span>
          )}
        </div>
 
        <div className="member-card stat-card">
          <span className="label">Nächstes Spiel</span>
          {isLoadingTermine ? (
            <span className="sub">Lädt …</span>
          ) : nextSpiel ? (
            <>
              <span className="value">
                {formatOccurrence(nextSpiel.date, nextSpiel.termin).dateLabel} ·{' '}
                {formatOccurrence(nextSpiel.date, nextSpiel.termin).time}
              </span>
              <span className="sub">{nextSpiel.termin.titel}</span>
            </>
          ) : (
            <span className="sub">Kein Spiel geplant</span>
          )}
        </div>
 
        <div
          className="member-card stat-card"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/app/umfragen')}
        >
          <span className="label">Offene Abstimmungen</span>
          {isLoadingUmfragen ? (
            <span className="sub">Lädt …</span>
          ) : (
            <>
              <span className="value">{offeneAbstimmungen.length}</span>
              <span className="sub">
                {offeneAbstimmungen.length === 0
                  ? 'aktuell keine offen'
                  : nichtBeantwortet.length === 0
                    ? 'von dir alle beantwortet'
                    : `${nichtBeantwortet.length} noch nicht beantwortet`}
              </span>
            </>
          )}
        </div>
 
        {isVorstand && (
          <div className="member-card stat-card">
            <span className="label">Offene Einladungen</span>
            <span className="value">{offeneEinladungen === null ? '–' : offeneEinladungen}</span>
            <span className="sub">warten auf Registrierung</span>
          </div>
        )}
      </div>
 
      <div className="grid two">
        <div className="member-card">
          <div className="section-title-row">
            <h3>Neu im Forum</h3>
          </div>
          <style>{`
            .dashboard-forum-feed .feed-item:nth-child(n + 4) {
              display: none;
            }
            @container (min-width: 480px) {
              .dashboard-forum-feed {
                max-height: 340px;
                overflow-y: auto;
              }
              .dashboard-forum-feed .feed-item:nth-child(n + 4) {
                display: flex;
              }
            }
          `}</style>
          {isLoadingBeitraege ? (
            <p className="sub">Lädt …</p>
          ) : beitraege.length === 0 ? (
            <p className="sub">Noch keine Beiträge im Forum.</p>
          ) : (
            <div className="dashboard-forum-feed">
              {beitraege.map((beitrag) => (
                <div
                  className="feed-item"
                  key={beitrag.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/app/forum/${beitrag.id}`)}
                >
                  <div className="feed-avatar">{initialenVon(beitrag.autor)}</div>
                  <div>
                    <div className="feed-text">
                      <b>{beitrag.autor}</b> hat einen neuen Beitrag erstellt: „{beitrag.titel}"
                    </div>
                    <div className="feed-meta">{relativeZeit(beitrag.erstellt_am)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
  






