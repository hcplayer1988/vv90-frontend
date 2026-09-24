import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useOutletContext } from 'react-router-dom'
import { AxiosError } from 'axios'
import {
  createTermin,
  deleteTermin,
  listAlleTermine,
  listTermine,
  listTermineAbstimmungen,
  umwandelnAbstimmung,
  updateTermin,
  type Termin,
  type TerminPayload,
  type TerminTyp,
  type WiederholungEinheit,
} from '../../api/termine'
import {
  erstelleUmfrage,
  loescheUmfrage,
  stimmeAbgeben,
  type Umfrage,
} from '../../api/umfragen'
import { hasRole, type LoggedInUser } from '../../api/auth'
import { occursOnDay } from '../../utils/terminRecurrence'
 
type OutletContext = { currentUser: LoggedInUser }
 
const TYP_LABELS: Record<TerminTyp, string> = {
  spielplan: 'Spielplan',
  mitgliederversammlung: 'Mitgliederversammlung',
  turnier: 'Turnier',
  training: 'Training',
  sonstiges: 'Sonstiges',
}
 
// CSS class per type for the colored calendar dots (see .cal-dot.* in global.css)
const TYP_DOT_CLASS: Record<TerminTyp, string> = {
  spielplan: 'spielplan',
  mitgliederversammlung: 'versammlung',
  turnier: 'turnier',
  training: 'training',
  sonstiges: 'versammlung',
}
 
const FILTERS: { key: 'alle' | TerminTyp; label: string }[] = [
  { key: 'alle', label: 'Alle' },
  { key: 'training', label: 'Training' },
  { key: 'spielplan', label: 'Spielplan' },
  { key: 'turnier', label: 'Turnier' },
  { key: 'mitgliederversammlung', label: 'Versammlung' },
]
 
const EMPTY_FORM = {
  titel: '',
  typ: 'training' as TerminTyp,
  ort: '',
  start: '',
  ende: '',
  beschreibung: '',
  ist_wiederkehrend: false,
  wiederholung_abstand: 1,
  wiederholung_einheit: 'wochen' as WiederholungEinheit,
}
 
function formatDate(iso: string) {
  const date = new Date(iso)
  return {
    day: date.toLocaleDateString('de-DE', { day: '2-digit' }),
    month: date.toLocaleDateString('de-DE', { month: 'short' }).toUpperCase(),
    time: date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
  }
}
 
/** Builds a Monday-first 6-week grid for the given month, including the
 *  trailing/leading days from adjacent months needed to fill full weeks. */
function buildMonthGrid(monthDate: Date): Date[] {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7 // 0 = Monday
 
  const gridStart = new Date(year, month, 1 - firstWeekday)
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + i)
    return date
  })
}
 
/**
 * Termine: offers a list, a calendar and a poll view.
 *
 * The three views use three different data sources:
 * - "Liste" fetches one real, server-paginated page at a time (?page=&
 *   page_size=, plus ?typ= for the filter chips) via listTermine().
 * - "Kalender" always fetches the COMPLETE, unfiltered set via
 *   listAlleTermine() (?alle=1) - it computes recurring occurrences
 *   client-side (utils/terminRecurrence.ts) and therefore needs every
 *   Termin at once, not just one page. It's reloaded after every
 *   create/update/delete so a new Termin shows up there immediately.
 * - "Umfragen" fetches the standalone (Doodle-style) Termine-Abstimmungen
 *   via listTermineAbstimmungen() (GET /api/termine/abstimmungen/) - an
 *   unpaginated list, same reasoning as elsewhere in the project (the
 *   number of concurrently open polls in a club stays small). Only
 *   Vorstand/Admin can create one or turn a winning option into a real
 *   Termin (umwandelnAbstimmung); any member can vote. Creating, voting on
 *   and deleting a poll itself goes through the shared /api/umfragen/
 *   endpoints (same ones the Forum poll feature uses) - only the listing
 *   and the "turn into a real Termin" action are Termine-specific.
 *
 * Create/edit/delete of Termine (and creating/managing Abstimmungen) are
 * only available to Vorstand/Admin (UI-level convenience only - the
 * backend's IsVorstand permission is the actual security boundary).
 */
function Termine() {
  const { currentUser } = useOutletContext<OutletContext>()
  const isVorstand = hasRole(currentUser, 'vorstand') || hasRole(currentUser, 'admin')
 
  const [termine, setTermine] = useState<Termin[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
 
  const [alleTermine, setAlleTermine] = useState<Termin[]>([])
  const [isLoadingAlle, setIsLoadingAlle] = useState(true)
 
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'alle' | TerminTyp>('alle')
  const [view, setView] = useState<'liste' | 'kalender' | 'umfragen'>('liste')
 
  const [pageSize, setPageSize] = useState<10 | 20 | 50>(10)
  const [currentPage, setCurrentPage] = useState(1)
 
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
 
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
 
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
 
  const [abstimmungen, setAbstimmungen] = useState<Umfrage[]>([])
  const [isLoadingAbstimmungen, setIsLoadingAbstimmungen] = useState(true)
 
  const [showAbstimmungForm, setShowAbstimmungForm] = useState(false)
  const [abstimmungFrage, setAbstimmungFrage] = useState('')
  // Mehrfachauswahl ist bei einer Doodle-artigen Terminabstimmung die Norm
  // (mehrere Zeitslots ankreuzen) - deshalb hier standardmaessig an, anders
  // als bei der Forum-Umfrage, die standardmaessig Einzelauswahl ist.
  const [abstimmungMehrfachauswahl, setAbstimmungMehrfachauswahl] = useState(true)
  const [abstimmungSlots, setAbstimmungSlots] = useState<string[]>(['', ''])
  const [pendingDeleteAbstimmungId, setPendingDeleteAbstimmungId] = useState<number | null>(null)
 
  const [umwandelnUmfrage, setUmwandelnUmfrage] = useState<Umfrage | null>(null)
  const [umwandelnOptionId, setUmwandelnOptionId] = useState<number | null>(null)
  const [umwandelnTitel, setUmwandelnTitel] = useState('')
  const [umwandelnTyp, setUmwandelnTyp] = useState<TerminTyp>('sonstiges')
  const [umwandelnOrt, setUmwandelnOrt] = useState('')
  const [umwandelnBeschreibung, setUmwandelnBeschreibung] = useState('')
  const [umwandelnError, setUmwandelnError] = useState<string | null>(null)
  const [istUmwandeln, setIstUmwandeln] = useState(false)
 
  async function loadTermine() {
    setIsLoading(true)
    setLoadError(null)
    try {
      const data = await listTermine({
        page: currentPage,
        page_size: pageSize,
        typ: filter !== 'alle' ? filter : undefined,
      })
      setTermine(data.results)
      setTotalCount(data.count)
    } catch {
      setLoadError('Termine konnten nicht geladen werden.')
    } finally {
      setIsLoading(false)
    }
  }
 
  async function loadAlleTermine() {
    setIsLoadingAlle(true)
    try {
      const data = await listAlleTermine()
      setAlleTermine(data)
    } catch {
      setLoadError('Termine konnten nicht geladen werden.')
    } finally {
      setIsLoadingAlle(false)
    }
  }
 
  /** Laedt die eigenstaendigen (Doodle-artigen) Termine-Abstimmungen -
   *  unpaginiert, wie schon Antworten oder Kategorien anderswo im Projekt,
   *  da die Anzahl gleichzeitig offener Abstimmungen in einem Vereinsumfeld
   *  klein bleibt. */
  async function loadAbstimmungen() {
    setIsLoadingAbstimmungen(true)
    try {
      const data = await listTermineAbstimmungen()
      setAbstimmungen(data)
    } catch {
      setLoadError('Abstimmungen konnten nicht geladen werden.')
    } finally {
      setIsLoadingAbstimmungen(false)
    }
  }
 
  useEffect(() => {
    // Fetching data on mount is the textbook use case for useEffect - the
    // "setState in effect" lint rule flags this pattern generally, but it's
    // a known, accepted false positive for this exact scenario.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTermine()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, filter])
 
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAlleTermine()
  }, [])
 
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAbstimmungen()
  }, [])
 
  // If a delete (or a narrower filter) pushes currentPage past the new
  // last page, step back rather than showing an empty page or hitting the
  // backend's page-out-of-range check.
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
    if (currentPage > totalPages) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentPage(totalPages)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCount, pageSize])
 
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
 
  const monthGrid = useMemo(() => buildMonthGrid(calendarMonth), [calendarMonth])
  const eventsByDay = useMemo(() => {
    const map = new Map<string, Termin[]>()
    monthGrid.forEach((day) => {
      const matches = alleTermine.filter((t) => occursOnDay(t, day))
      if (matches.length > 0) {
        map.set(day.toDateString(), matches)
      }
    })
    return map
  }, [monthGrid, alleTermine])
 
  function openCreateModal(prefillDate?: Date) {
    setEditingId(null)
    setForm(
      prefillDate
        ? { ...EMPTY_FORM, start: `${prefillDate.toISOString().slice(0, 10)}T18:00` }
        : EMPTY_FORM
    )
    setFormError(null)
    setIsModalOpen(true)
  }
 
  function openEditModal(termin: Termin) {
    setEditingId(termin.id)
    setForm({
      titel: termin.titel,
      typ: termin.typ,
      ort: termin.ort,
      start: termin.start.slice(0, 16),
      ende: termin.ende ? termin.ende.slice(0, 16) : '',
      beschreibung: termin.beschreibung,
      ist_wiederkehrend: termin.ist_wiederkehrend,
      wiederholung_abstand: termin.wiederholung_abstand ?? 1,
      wiederholung_einheit: termin.wiederholung_einheit || 'wochen',
    })
    setFormError(null)
    setIsModalOpen(true)
  }
 
  async function handleSave() {
    setFormError(null)
    setIsSaving(true)
 
    const payload: TerminPayload = {
      titel: form.titel,
      typ: form.typ,
      ort: form.ort,
      start: form.start,
      ende: form.ende || null,
      beschreibung: form.beschreibung,
      ist_wiederkehrend: form.ist_wiederkehrend,
      wiederholung_abstand: form.ist_wiederkehrend ? form.wiederholung_abstand : null,
      wiederholung_einheit: form.ist_wiederkehrend ? form.wiederholung_einheit : '',
    }
 
    try {
      if (editingId) {
        await updateTermin(editingId, payload)
      } else {
        await createTermin(payload)
      }
      setIsModalOpen(false)
      // Reload both data sources - the change may affect the currently
      // viewed list page, and the calendar always needs to reflect it
      // immediately either way.
      await Promise.all([loadTermine(), loadAlleTermine()])
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data) {
        const data = err.response.data
        const firstError = Object.values(data)[0]
        setFormError(Array.isArray(firstError) ? firstError[0] : String(firstError))
      } else {
        setFormError('Termin konnte nicht gespeichert werden.')
      }
    } finally {
      setIsSaving(false)
    }
  }
 
  async function handleConfirmDelete() {
    if (pendingDeleteId === null) return
    try {
      await deleteTermin(pendingDeleteId)
      await Promise.all([loadTermine(), loadAlleTermine()])
    } catch {
      setLoadError('Termin konnte nicht gelöscht werden.')
    } finally {
      setPendingDeleteId(null)
    }
  }
 
  /** Reine Anzeige-Formatierung einer Datetime-local-Eingabe zu einem
   *  lesbaren Zeitslot-Label ("Sa., 14.11.2026, 18:00 Uhr"), das als
   *  Options-Text gespeichert wird - der Vorstand tippt also nur Datum/Uhrzeit,
   *  nicht zusaetzlich noch einen redundanten Freitext. */
  function formatSlotLabel(datetimeLocal: string): string {
    const date = new Date(datetimeLocal)
    const tag = date.toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    const uhrzeit = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    return `${tag}, ${uhrzeit} Uhr`
  }
 
  function updateAbstimmungSlot(index: number, value: string) {
    setAbstimmungSlots((prev) => prev.map((s, i) => (i === index ? value : s)))
  }
 
  function addAbstimmungSlot() {
    setAbstimmungSlots((prev) => [...prev, ''])
  }
 
  function removeAbstimmungSlot(index: number) {
    setAbstimmungSlots((prev) => prev.filter((_, i) => i !== index))
  }
 
  async function handleCreateAbstimmung() {
    const gueltigeSlots = abstimmungSlots.filter(Boolean)
    if (!abstimmungFrage.trim() || gueltigeSlots.length < 2) {
      setLoadError('Eine Terminabstimmung braucht eine Frage und mindestens 2 Zeitslots.')
      return
    }
    try {
      await erstelleUmfrage({
        frage: abstimmungFrage.trim(),
        mehrfachauswahl: abstimmungMehrfachauswahl,
        // kontext="termine" -> UmfrageCreateSerializer.validate() im Backend
        // prueft dafuer die Vorstand-Berechtigung (kein beitrag-Feld noetig).
        kontext: 'termine',
        optionen: gueltigeSlots.map((slot) => ({
          text: formatSlotLabel(slot),
          // Wie beim normalen Termin-Formular unten wird der rohe
          // datetime-local-Wert direkt durchgereicht, nicht in ISO/UTC
          // umgewandelt - konsistent mit handleSave() weiter unten.
          start: slot,
        })),
      })
      setShowAbstimmungForm(false)
      setAbstimmungFrage('')
      setAbstimmungMehrfachauswahl(true)
      setAbstimmungSlots(['', ''])
      await loadAbstimmungen()
    } catch {
      setLoadError('Terminabstimmung konnte nicht erstellt werden.')
    }
  }
 
  /** Sendet die neue Gesamtauswahl statt nur der geklickten Option - siehe
   *  die Doku am Backend-Endpoint (UmfrageViewSet.abstimmen). */
  async function handleVoteAbstimmung(umfrage: Umfrage, optionId: number) {
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
      setAbstimmungen((prev) => prev.map((u) => (u.id === aktualisiert.id ? aktualisiert : u)))
    } catch {
      setLoadError('Stimme konnte nicht gespeichert werden.')
    }
  }
 
  async function handleConfirmDeleteAbstimmung() {
    if (pendingDeleteAbstimmungId === null) return
    try {
      await loescheUmfrage(pendingDeleteAbstimmungId)
      setAbstimmungen((prev) => prev.filter((u) => u.id !== pendingDeleteAbstimmungId))
    } catch {
      setLoadError('Abstimmung konnte nicht gelöscht werden.')
    } finally {
      setPendingDeleteAbstimmungId(null)
    }
  }
 
  function openUmwandelnModal(umfrage: Umfrage) {
    setUmwandelnUmfrage(umfrage)
    setUmwandelnOptionId(null)
    setUmwandelnTitel(umfrage.frage)
    setUmwandelnTyp('sonstiges')
    setUmwandelnOrt('')
    setUmwandelnBeschreibung('')
    setUmwandelnError(null)
  }
 
  async function handleConfirmUmwandeln() {
    if (!umwandelnUmfrage || umwandelnOptionId === null) {
      setUmwandelnError('Bitte eine Gewinner-Option auswählen.')
      return
    }
    if (!umwandelnTitel.trim()) {
      setUmwandelnError('Bitte einen Titel für den Termin angeben.')
      return
    }
    setIstUmwandeln(true)
    try {
      await umwandelnAbstimmung(umwandelnUmfrage.id, {
        option: umwandelnOptionId,
        titel: umwandelnTitel.trim(),
        typ: umwandelnTyp,
        ort: umwandelnOrt,
        beschreibung: umwandelnBeschreibung,
      })
      setUmwandelnUmfrage(null)
      await Promise.all([loadAbstimmungen(), loadTermine(), loadAlleTermine()])
    } catch {
      setUmwandelnError('Umwandlung fehlgeschlagen.')
    } finally {
      setIstUmwandeln(false)
    }
  }
 
  function goToPreviousMonth() {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
    setSelectedDay(null)
  }
  function goToNextMonth() {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
    setSelectedDay(null)
  }
 
  const selectedDayEvents = selectedDay ? eventsByDay.get(selectedDay.toDateString()) ?? [] : []
 
  function renderPaginationButtons() {
    if (totalPages <= 1) return null
    return (
      <div
        style={{
          display: 'flex',
          gap: '8px',
          justifyContent: 'center',
          margin: '14px 0',
          alignItems: 'center',
        }}
      >
        <button className="btn-mini" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>
          « Erste
        </button>
        <button className="btn-mini" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
          ‹ Zurück
        </button>
        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
          Seite {currentPage} von {totalPages}
        </span>
        <button
          className="btn-mini"
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage((p) => p + 1)}
        >
          Weiter ›
        </button>
        <button className="btn-mini" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}>
          Letzte »
        </button>
      </div>
    )
  }
 
  return (
    <div>
      <div className="view-header">
        <div>
          <span className="eyebrow">TERMINE</span>
          <h1>Alle Termine</h1>
          <p>Trainings, Spiele, Turniere und Vereinstermine an einem Ort.</p>
        </div>
      </div>
 
      <div className="view-switch">
        <button className={view === 'liste' ? 'active' : ''} onClick={() => setView('liste')}>
          Liste
        </button>
        <button className={view === 'kalender' ? 'active' : ''} onClick={() => setView('kalender')}>
          Kalender
        </button>
        <button className={view === 'umfragen' ? 'active' : ''} onClick={() => setView('umfragen')}>
          Umfragen
        </button>
      </div>
 
      {loadError && <p style={{ color: '#c8102e' }}>{loadError}</p>}
 
      {/* ===== LISTENANSICHT ===== */}
      {view === 'liste' && (
        <>
          {isVorstand && (
            <button className="btn-primary" style={{ marginBottom: '14px' }} onClick={() => openCreateModal()}>
              + Neuer Termin
            </button>
          )}
 
          <div className="filter-chips">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={filter === f.key ? 'active' : ''}
                onClick={() => {
                  setFilter(f.key)
                  setCurrentPage(1)
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
 
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: '10px',
            }}
          >
            <label
              style={{
                fontSize: '12px',
                color: 'var(--muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              Pro Seite:
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value) as 10 | 20 | 50)
                  setCurrentPage(1)
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </label>
          </div>
 
          {isLoading && <p>Termine werden geladen …</p>}
 
          {!isLoading && termine.length === 0 && (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M3 10h18" />
              </svg>
              <div className="title">Noch keine Termine in dieser Kategorie</div>
              <div className="sub">Sobald einer angelegt wird, taucht er hier auf.</div>
            </div>
          )}
 
          {renderPaginationButtons()}
 
          <div className="grid">
            {termine.map((termin) => {
              const { day, month, time } = formatDate(termin.start)
              return (
                <div className="member-card termin-card" key={termin.id}>
                  <div className="termin-date-box">
                    <div className="day">{day}</div>
                    <div className="month">{month}</div>
                  </div>
                  <div className="termin-info">
                    <span className="tag">{TYP_LABELS[termin.typ]}</span>
                    <h3>{termin.titel}</h3>
                    <div className="meta">
                      {time}
                      {termin.ort ? ` · ${termin.ort}` : ''}
                    </div>
                    {termin.ist_wiederkehrend && (
                      <div className="recurring-pill">↻ wiederholt sich {termin.recurrence_label}</div>
                    )}
                    {isVorstand && (
                      <div className="row-actions">
                        <button onClick={() => openEditModal(termin)}>Bearbeiten</button>
                        <button className="danger" onClick={() => setPendingDeleteId(termin.id)}>
                          Löschen
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
 
          {renderPaginationButtons()}
        </>
      )}
 
      {/* ===== KALENDERANSICHT ===== */}
      {view === 'kalender' && (
        <div>
          {isLoadingAlle && <p>Termine werden geladen …</p>}
 
          {!isLoadingAlle && (
            <>
              <div className="cal-nav">
                <button onClick={goToPreviousMonth}>‹</button>
                <span className="month-label">
                  {calendarMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={goToNextMonth}>›</button>
              </div>
 
              <div className="cal-grid">
                {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => (
                  <div className="cal-weekday" key={d}>
                    {d}
                  </div>
                ))}
                {monthGrid.map((day) => {
                  const isCurrentMonth = day.getMonth() === calendarMonth.getMonth()
                  const dayEvents = eventsByDay.get(day.toDateString()) ?? []
                  const isSelected = selectedDay?.toDateString() === day.toDateString()
                  const clickable = isCurrentMonth && (dayEvents.length > 0 || isVorstand)
 
                  return (
                    <div
                      key={day.toISOString()}
                      className={[
                        'cal-day',
                        !isCurrentMonth ? 'muted' : '',
                        clickable ? 'clickable' : '',
                        isSelected ? 'selected' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => clickable && setSelectedDay(day)}
                    >
                      {day.getDate()}
                      {dayEvents.length > 0 && (
                        <div className="cal-dots">
                          {dayEvents.map((e) => (
                            <span key={e.id} className={`cal-dot ${TYP_DOT_CLASS[e.typ]}`}></span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
 
              <div className="cal-legend">
                <span>
                  <span className="cal-dot training"></span>Training
                </span>
                <span>
                  <span className="cal-dot spielplan"></span>Spielplan
                </span>
                <span>
                  <span className="cal-dot versammlung"></span>Versammlung
                </span>
                <span>
                  <span className="cal-dot turnier"></span>Turnier
                </span>
              </div>
 
              <div className="cal-day-details">
                {!selectedDay && <p className="placeholder">Tag mit Punkt anklicken, um die Termine zu sehen.</p>}
 
                {selectedDay && (
                  <>
                    {selectedDayEvents.map((termin) => (
                      <div className="member-card termin-card" style={{ marginBottom: '8px' }} key={termin.id}>
                        <div className="termin-date-box">
                          <div className="day">{selectedDay.getDate()}</div>
                          <div className="month">
                            {selectedDay.toLocaleDateString('de-DE', { month: 'short' }).toUpperCase()}
                          </div>
                        </div>
                        <div className="termin-info">
                          <span className="tag">{TYP_LABELS[termin.typ]}</span>
                          <h3>{termin.titel}</h3>
                          <div className="meta">
                            {formatDate(termin.start).time}
                            {termin.ort ? ` · ${termin.ort}` : ''}
                          </div>
                          {isVorstand && (
                            <div className="row-actions">
                              <button onClick={() => openEditModal(termin)}>Bearbeiten</button>
                              <button className="danger" onClick={() => setPendingDeleteId(termin.id)}>
                                Löschen
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
 
                    {selectedDayEvents.length === 0 && (
                      <p className="placeholder">
                        Noch keine Termine am {selectedDay.toLocaleDateString('de-DE')}.
                      </p>
                    )}
 
                    {isVorstand && (
                      <button className="btn-outline add-day-btn" onClick={() => openCreateModal(selectedDay)}>
                        + Termin für den {selectedDay.toLocaleDateString('de-DE')} anlegen
                      </button>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}
 
      {/* ===== UMFRAGEN (Doodle-artige Terminabstimmung) ===== */}
      {view === 'umfragen' && (
        <div>
          {isVorstand && !showAbstimmungForm && (
            <button
              className="btn-primary"
              style={{ marginBottom: '14px' }}
              onClick={() => setShowAbstimmungForm(true)}
            >
              + Neue Terminabstimmung
            </button>
          )}
 
          {showAbstimmungForm && (
            <div className="member-card" style={{ marginBottom: '20px' }}>
              <div className="field-row">
                <label>Frage</label>
                <input
                  type="text"
                  placeholder="z.B. Wann soll das Auswärtsspiel stattfinden?"
                  value={abstimmungFrage}
                  onChange={(e) => setAbstimmungFrage(e.target.value)}
                />
              </div>
              {abstimmungSlots.map((slot, index) => (
                <div className="field-row" key={index}>
                  <label>Zeitslot {index + 1}</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="datetime-local"
                      value={slot}
                      onChange={(e) => updateAbstimmungSlot(index, e.target.value)}
                      style={{ flex: 1 }}
                    />
                    {abstimmungSlots.length > 2 && (
                      <button className="btn-mini" onClick={() => removeAbstimmungSlot(index)}>
                        Entfernen
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button className="btn-mini" onClick={addAbstimmungSlot} style={{ marginBottom: '12px' }}>
                + Zeitslot hinzufügen
              </button>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={abstimmungMehrfachauswahl}
                  onChange={(e) => setAbstimmungMehrfachauswahl(e.target.checked)}
                />
                Mehrfachauswahl erlauben
              </label>
              <div className="row-actions">
                <button className="btn-primary" onClick={handleCreateAbstimmung}>
                  Abstimmung erstellen
                </button>
                <button onClick={() => setShowAbstimmungForm(false)}>Abbrechen</button>
              </div>
            </div>
          )}
 
          {isLoadingAbstimmungen && <p>Abstimmungen werden geladen …</p>}
 
          {!isLoadingAbstimmungen && abstimmungen.length === 0 && !showAbstimmungForm && (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M3 10h18" />
              </svg>
              <div className="title">Noch keine Terminabstimmungen</div>
              <div className="sub">
                {isVorstand
                  ? 'Lege eine an, damit Mitglieder Zeitslots ankreuzen können.'
                  : 'Sobald der Vorstand eine anlegt, taucht sie hier auf.'}
              </div>
            </div>
          )}
 
          {abstimmungen.map((umfrage) => {
            const gesamtStimmen = umfrage.optionen.reduce((summe, o) => summe + o.anzahl_stimmen, 0)
            return (
              <div className="member-card" style={{ marginBottom: '16px' }} key={umfrage.id}>
                <div className="section-title-row">
                  <h3>{umfrage.frage}</h3>
                  {umfrage.geschlossen && <span className="post-cat">umgewandelt</span>}
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
                        <div style={{ position: 'relative', zIndex: 1, fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
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
                      onClick={() => handleVoteAbstimmung(umfrage, option.id)}
                      style={{ ...gemeinsamerStil, cursor: 'pointer' }}
                    >
                      {inhalt}
                    </button>
                  )
                })}
 
                <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>
                  Erstellt von {umfrage.ersteller}
                </p>
 
                {isVorstand && !umfrage.geschlossen && (
                  <div className="row-actions">
                    <button onClick={() => openUmwandelnModal(umfrage)}>
                      Gewinner auswählen &amp; Termin anlegen
                    </button>
                    <button className="danger" onClick={() => setPendingDeleteAbstimmungId(umfrage.id)}>
                      Löschen
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
 
      {/* ===== Anlegen/Bearbeiten-Modal ===== */}
      <div className={`modal-overlay ${isModalOpen ? 'open' : ''}`}>
        <div className="modal-box wide">
          <h3>{editingId ? 'Termin bearbeiten' : 'Neuen Termin anlegen'}</h3>
 
          <div className="field-row">
            <label>Titel</label>
            <input type="text" value={form.titel} onChange={(e) => setForm({ ...form, titel: e.target.value })} />
          </div>
 
          <div className="field-two">
            <div className="field-row">
              <label>Typ</label>
              <select value={form.typ} onChange={(e) => setForm({ ...form, typ: e.target.value as TerminTyp })}>
                {Object.entries(TYP_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-row">
              <label>Ort</label>
              <input type="text" value={form.ort} onChange={(e) => setForm({ ...form, ort: e.target.value })} />
            </div>
          </div>
 
          <div className="field-two">
            <div className="field-row">
              <label>Start</label>
              <input
                type="datetime-local"
                value={form.start}
                onChange={(e) => setForm({ ...form, start: e.target.value })}
              />
            </div>
            <div className="field-row">
              <label>Ende (optional)</label>
              <input
                type="datetime-local"
                value={form.ende}
                onChange={(e) => setForm({ ...form, ende: e.target.value })}
              />
            </div>
          </div>
 
          <div className="field-row">
            <label>Beschreibung (optional)</label>
            <input
              type="text"
              value={form.beschreibung}
              onChange={(e) => setForm({ ...form, beschreibung: e.target.value })}
            />
          </div>
 
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.ist_wiederkehrend}
              onChange={(e) => setForm({ ...form, ist_wiederkehrend: e.target.checked })}
            />
            Wiederkehrender Termin
          </label>
 
          {form.ist_wiederkehrend && (
            <div className="field-two">
              <div className="field-row">
                <label>Abstand</label>
                <input
                  type="number"
                  min={1}
                  value={form.wiederholung_abstand}
                  onChange={(e) => setForm({ ...form, wiederholung_abstand: Number(e.target.value) })}
                />
              </div>
              <div className="field-row">
                <label>Einheit</label>
                <select
                  value={form.wiederholung_einheit}
                  onChange={(e) => setForm({ ...form, wiederholung_einheit: e.target.value as WiederholungEinheit })}
                >
                  <option value="tage">Tage</option>
                  <option value="wochen">Wochen</option>
                  <option value="monate">Monate</option>
                </select>
              </div>
            </div>
          )}
 
          {formError && <p style={{ color: '#c8102e', fontSize: '13px' }}>{formError}</p>}
 
          <div className="modal-actions" style={{ marginTop: '8px' }}>
            <button className="cancel" onClick={() => setIsModalOpen(false)}>
              Abbrechen
            </button>
            <button className="confirm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Speichert …' : editingId ? 'Änderungen speichern' : 'Termin speichern'}
            </button>
          </div>
        </div>
      </div>
 
      {/* ===== Löschen-Bestätigung ===== */}
      <div className={`modal-overlay ${pendingDeleteId !== null ? 'open' : ''}`}>
        <div className="modal-box">
          <h3>Termin löschen?</h3>
          <p>Diese Aktion kann nicht rückgängig gemacht werden.</p>
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
 
      {/* ===== Abstimmung löschen ===== */}
      <div className={`modal-overlay ${pendingDeleteAbstimmungId !== null ? 'open' : ''}`}>
        <div className="modal-box">
          <h3>Abstimmung löschen?</h3>
          <p>Alle Stimmen gehen dabei verloren. Das kann nicht rückgängig gemacht werden.</p>
          <div className="modal-actions">
            <button className="cancel" onClick={() => setPendingDeleteAbstimmungId(null)}>
              Abbrechen
            </button>
            <button className="confirm" onClick={handleConfirmDeleteAbstimmung}>
              Löschen
            </button>
          </div>
        </div>
      </div>
 
      {/* ===== Gewinner auswählen & in Termin umwandeln ===== */}
      <div className={`modal-overlay ${umwandelnUmfrage ? 'open' : ''}`}>
        <div className="modal-box wide">
          <h3>Abstimmung umwandeln</h3>
          <p className="hint">
            Wähle die Gewinner-Option aus und ergänze die restlichen Termin-Angaben - der Termin wird
            damit sofort für alle sichtbar angelegt, die Abstimmung wird danach geschlossen.
          </p>
 
          {umwandelnUmfrage?.optionen.map((option) => (
            <label
              key={option.id}
              className="checkbox-row"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <input
                type="radio"
                name="umwandeln-option"
                checked={umwandelnOptionId === option.id}
                onChange={() => setUmwandelnOptionId(option.id)}
              />
              {option.text} ({option.anzahl_stimmen} Stimme{option.anzahl_stimmen === 1 ? '' : 'n'})
            </label>
          ))}
 
          <div className="field-row" style={{ marginTop: '12px' }}>
            <label>Titel</label>
            <input type="text" value={umwandelnTitel} onChange={(e) => setUmwandelnTitel(e.target.value)} />
          </div>
 
          <div className="field-two">
            <div className="field-row">
              <label>Typ</label>
              <select value={umwandelnTyp} onChange={(e) => setUmwandelnTyp(e.target.value as TerminTyp)}>
                {Object.entries(TYP_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-row">
              <label>Ort (optional)</label>
              <input type="text" value={umwandelnOrt} onChange={(e) => setUmwandelnOrt(e.target.value)} />
            </div>
          </div>
 
          <div className="field-row">
            <label>Beschreibung (optional)</label>
            <input
              type="text"
              value={umwandelnBeschreibung}
              onChange={(e) => setUmwandelnBeschreibung(e.target.value)}
            />
          </div>
 
          {umwandelnError && <p style={{ color: '#c8102e', fontSize: '13px' }}>{umwandelnError}</p>}
 
          <div className="modal-actions" style={{ marginTop: '8px' }}>
            <button className="cancel" onClick={() => setUmwandelnUmfrage(null)}>
              Abbrechen
            </button>
            <button className="confirm" onClick={handleConfirmUmwandeln} disabled={istUmwandeln}>
              {istUmwandeln ? 'Wird angelegt …' : 'Termin anlegen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
 
export default Termine
    





