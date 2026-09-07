import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { AxiosError } from 'axios'
import {
  createTermin,
  deleteTermin,
  listTermine,
  updateTermin,
  type Termin,
  type TerminPayload,
  type TerminTyp,
  type WiederholungEinheit,
} from '../../api/termine'
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
 * Termine: fetches the real list from /api/termine/ and offers both a list
 * and a calendar view. Create/edit/delete are only available to Vorstand/
 * Admin (UI-level convenience only - the backend's IsVorstand permission is
 * the actual security boundary).
 */
function Termine() {
  const { currentUser } = useOutletContext<OutletContext>()
  const isVorstand = hasRole(currentUser, 'vorstand') || hasRole(currentUser, 'admin')
 
  const [termine, setTermine] = useState<Termin[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'alle' | TerminTyp>('alle')
  const [view, setView] = useState<'liste' | 'kalender'>('liste')
 
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
 
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
 
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
 
  async function loadTermine() {
    setIsLoading(true)
    setLoadError(null)
    try {
      const data = await listTermine()
      setTermine(data)
    } catch {
      setLoadError('Termine konnten nicht geladen werden.')
    } finally {
      setIsLoading(false)
    }
  }
 
  useEffect(() => {
    // Fetching data on mount is the textbook use case for useEffect - the
    // "setState in effect" lint rule flags this pattern generally, but it's
    // a known, accepted false positive for this exact scenario.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTermine()
  }, [])
 
  const visibleTermine = termine.filter((t) => filter === 'alle' || t.typ === filter)
 
  const monthGrid = useMemo(() => buildMonthGrid(calendarMonth), [calendarMonth])
  const eventsByDay = useMemo(() => {
    const map = new Map<string, Termin[]>()
    monthGrid.forEach((day) => {
      const matches = termine.filter((t) => occursOnDay(t, day))
      if (matches.length > 0) {
        map.set(day.toDateString(), matches)
      }
    })
    return map
  }, [monthGrid, termine])
 
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
        const updated = await updateTermin(editingId, payload)
        setTermine((prev) => prev.map((t) => (t.id === editingId ? updated : t)))
      } else {
        const created = await createTermin(payload)
        setTermine((prev) => [...prev, created])
      }
      setIsModalOpen(false)
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
      setTermine((prev) => prev.filter((t) => t.id !== pendingDeleteId))
    } catch {
      setLoadError('Termin konnte nicht gelöscht werden.')
    } finally {
      setPendingDeleteId(null)
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
      </div>
 
      {isLoading && <p>Termine werden geladen …</p>}
      {loadError && <p style={{ color: '#c8102e' }}>{loadError}</p>}
 
      {/* ===== LISTENANSICHT ===== */}
      {view === 'liste' && !isLoading && !loadError && (
        <>
          {isVorstand && (
            <button className="btn-primary" style={{ marginBottom: '14px' }} onClick={() => openCreateModal()}>
              + Neuer Termin
            </button>
          )}
 
          <div className="filter-chips">
            {FILTERS.map((f) => (
              <button key={f.key} className={filter === f.key ? 'active' : ''} onClick={() => setFilter(f.key)}>
                {f.label}
              </button>
            ))}
          </div>
 
          {visibleTermine.length === 0 && (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M3 10h18" />
              </svg>
              <div className="title">Noch keine Termine in dieser Kategorie</div>
              <div className="sub">Sobald einer angelegt wird, taucht er hier auf.</div>
            </div>
          )}
 
          <div className="grid">
            {visibleTermine.map((termin) => {
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
        </>
      )}
 
      {/* ===== KALENDERANSICHT ===== */}
      {view === 'kalender' && !isLoading && !loadError && (
        <div>
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
    </div>
  )
}
 
export default Termine
  





