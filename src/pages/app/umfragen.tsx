import { useEffect, useState, type CSSProperties } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  erstelleUmfrage,
  listUmfragen,
  loescheUmfrage,
  stimmeAbgeben,
  type Umfrage,
} from '../../api/umfragen'
import { hasRole, type LoggedInUser } from '../../api/auth'
 
type OutletContext = { currentUser: LoggedInUser }
 

function Umfragen() {
  const { currentUser } = useOutletContext<OutletContext>()
  const isVorstand = hasRole(currentUser, 'vorstand') || hasRole(currentUser, 'admin')
 
  const [umfragen, setUmfragen] = useState<Umfrage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
 
  const [showForm, setShowForm] = useState(false)
  const [frage, setFrage] = useState('')
  const [mehrfachauswahl, setMehrfachauswahl] = useState(false)
  const [optionen, setOptionen] = useState(['', ''])
 
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
 
  useEffect(() => {
    async function load() {
      try {
        const data = await listUmfragen('allgemein')
        setUmfragen(data)
      } catch {
        setLoadError('Umfragen konnten nicht geladen werden.')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])
 
  function updateOption(index: number, value: string) {
    setOptionen((prev) => prev.map((o, i) => (i === index ? value : o)))
  }
 
  function addOption() {
    setOptionen((prev) => [...prev, ''])
  }
 
  function removeOption(index: number) {
    setOptionen((prev) => prev.filter((_, i) => i !== index))
  }
 
  async function handleCreate() {
    const gueltigeOptionen = optionen.map((o) => o.trim()).filter(Boolean)
    if (!frage.trim() || gueltigeOptionen.length < 2) {
      setLoadError('Eine Umfrage braucht eine Frage und mindestens 2 Optionen.')
      return
    }
    try {
      const neueUmfrage = await erstelleUmfrage({
        frage: frage.trim(),
        mehrfachauswahl,
        kontext: 'allgemein',
        optionen: gueltigeOptionen.map((text) => ({ text })),
      })
      setUmfragen((prev) => [neueUmfrage, ...prev])
      setShowForm(false)
      setFrage('')
      setMehrfachauswahl(false)
      setOptionen(['', ''])
      setLoadError(null)
    } catch {
      setLoadError('Umfrage konnte nicht erstellt werden.')
    }
  }
 
  async function handleVote(umfrage: Umfrage, optionId: number) {
    const bereitsGewaehlt = umfrage.optionen.find((o) => o.id === optionId)?.meine_stimme
    let neueAuswahl: number[]
    if (umfrage.mehrfachauswahl) {
      const aktuelle = umfrage.optionen.filter((o) => o.meine_stimme).map((o) => o.id)
      neueAuswahl = bereitsGewaehlt ? aktuelle.filter((id) => id !== optionId) : [...aktuelle, optionId]
    } else {
      neueAuswahl = bereitsGewaehlt ? [] : [optionId]
    }
    try {
      const aktualisiert = await stimmeAbgeben(umfrage.id, neueAuswahl)
      setUmfragen((prev) => prev.map((u) => (u.id === aktualisiert.id ? aktualisiert : u)))
    } catch {
      setLoadError('Stimme konnte nicht gespeichert werden.')
    }
  }
 
  async function handleConfirmDelete() {
    if (pendingDeleteId === null) return
    try {
      await loescheUmfrage(pendingDeleteId)
      setUmfragen((prev) => prev.filter((u) => u.id !== pendingDeleteId))
    } catch {
      setLoadError('Umfrage konnte nicht gelöscht werden.')
    } finally {
      setPendingDeleteId(null)
    }
  }
 
  return (
    <div>
      <div className="view-header">
        <div>
          <span className="eyebrow">UMFRAGEN</span>
          <h1>Umfragen</h1>
          <p>Stimmungsbilder und Abstimmungen, unabhängig von Forum und Terminen.</p>
        </div>
      </div>
 
      {loadError && <p style={{ color: '#c8102e' }}>{loadError}</p>}
 
      {!showForm && (
        <button className="btn-primary" style={{ marginBottom: '14px' }} onClick={() => setShowForm(true)}>
          + Neue Umfrage
        </button>
      )}
 
      {showForm && (
        <div className="member-card" style={{ marginBottom: '20px' }}>
          <div className="field-row">
            <label>Frage</label>
            <input
              type="text"
              placeholder="z.B. Welches Motiv für das neue Vereins-T-Shirt?"
              value={frage}
              onChange={(e) => setFrage(e.target.value)}
            />
          </div>
          {optionen.map((option, index) => (
            <div className="field-row" key={index}>
              <label>Option {index + 1}</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  style={{ flex: 1 }}
                />
                {optionen.length > 2 && (
                  <button className="btn-mini" onClick={() => removeOption(index)}>
                    Entfernen
                  </button>
                )}
              </div>
            </div>
          ))}
          <button className="btn-mini" onClick={addOption} style={{ marginBottom: '12px' }}>
            + Option hinzufügen
          </button>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={mehrfachauswahl}
              onChange={(e) => setMehrfachauswahl(e.target.checked)}
            />
            Mehrfachauswahl erlauben
          </label>
          <div className="row-actions">
            <button className="btn-primary" onClick={handleCreate}>
              Umfrage erstellen
            </button>
            <button onClick={() => setShowForm(false)}>Abbrechen</button>
          </div>
        </div>
      )}
 
      {isLoading && <p>Umfragen werden geladen …</p>}
 
      {!isLoading && umfragen.length === 0 && !showForm && (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18" />
          </svg>
          <div className="title">Noch keine Umfragen</div>
          <div className="sub">Leg die erste an, um eine Stimmung im Verein einzuholen.</div>
        </div>
      )}
 
      {umfragen.map((umfrage) => {
        const gesamtStimmen = umfrage.optionen.reduce((summe, o) => summe + o.anzahl_stimmen, 0)
        const darfLoeschen = isVorstand || umfrage.ersteller === currentUser.email
 
        return (
          <div className="member-card" style={{ marginBottom: '16px' }} key={umfrage.id}>
            <div className="section-title-row">
              <h3>{umfrage.frage}</h3>
              {umfrage.geschlossen && <span className="post-cat">geschlossen</span>}
            </div>
            {umfrage.mehrfachauswahl && !umfrage.geschlossen && (
              <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '-6px', marginBottom: '10px' }}>
                Mehrfachauswahl möglich
              </p>
            )}
 
            {umfrage.optionen.map((option) => {
              const prozent =
                gesamtStimmen > 0 ? Math.round((option.anzahl_stimmen / gesamtStimmen) * 100) : 0
              const inhalt = (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: `${prozent}%`,
                      background: 'rgba(200,16,46,0.08)',
                      zIndex: 0,
                    }}
                  />
                  <div
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '13px',
                    }}
                  >
                    <span>
                      {option.meine_stimme ? '✓ ' : ''}
                      {option.text}
                    </span>
                    <span style={{ color: 'var(--muted)' }}>
                      {option.anzahl_stimmen} ({prozent}%)
                    </span>
                  </div>
                  {option.waehler.length > 0 && (
                    <div
                      style={{
                        position: 'relative',
                        zIndex: 1,
                        fontSize: '11px',
                        color: 'var(--muted)',
                        marginTop: '4px',
                      }}
                    >
                      {option.waehler.map((w) => w.name).join(', ')}
                    </div>
                  )}
                </>
              )
              const gemeinsamerStil: CSSProperties = {
                display: 'block',
                width: '100%',
                textAlign: 'left',
                border: option.meine_stimme ? '1.5px solid var(--crest-red)' : '1.5px solid #ddd',
                borderRadius: '8px',
                padding: '10px 12px',
                marginBottom: '8px',
                background: option.meine_stimme ? 'rgba(200,16,46,0.06)' : '#fff',
                position: 'relative',
                overflow: 'hidden',
              }
              return umfrage.geschlossen ? (
                <div key={option.id} style={gemeinsamerStil}>
                  {inhalt}
                </div>
              ) : (
                <button
                  key={option.id}
                  onClick={() => handleVote(umfrage, option.id)}
                  style={{ ...gemeinsamerStil, cursor: 'pointer' }}
                >
                  {inhalt}
                </button>
              )
            })}
 
            <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>
              Erstellt von {umfrage.ersteller}
            </p>
 
            {darfLoeschen && (
              <div className="row-actions">
                <button className="danger" onClick={() => setPendingDeleteId(umfrage.id)}>
                  Löschen
                </button>
              </div>
            )}
          </div>
        )
      })}
 
      {/* ===== Delete survey ===== */}
      <div className={`modal-overlay ${pendingDeleteId !== null ? 'open' : ''}`}>
        <div className="modal-box">
          <h3>Umfrage löschen?</h3>
          <p>Alle Stimmen gehen dabei verloren. Das kann nicht rückgängig gemacht werden.</p>
          <div className="modal-actions">
            <button className="cancel" onClick={() => setPendingDeleteId(null)}>
              Abbrechen
            </button>
            <button className="confirm" onClick={handleConfirmDelete}>
              Löschen
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
 
export default Umfragen


