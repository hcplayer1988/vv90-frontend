import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { AxiosError } from 'axios'
import {
  deleteMitglied,
  inviteMitglied,
  listMitglieder,
  listRollen,
  reaktiviereMitglied,
  updateMitglied,
  type Mitglied,
  type MitgliedPayload,
} from '../../api/accounts'
import { hasRole, type LoggedInUser, type Rolle } from '../../api/auth'
 
type OutletContext = { currentUser: LoggedInUser }
 
const INVITE_ROLE_OPTIONS: { value: 'mitglied' | 'vorstand' | 'admin'; label: string }[] = [
  { value: 'mitglied', label: 'Mitglied' },
  { value: 'vorstand', label: 'Vorstandsmitglied' },
  { value: 'admin', label: 'Admin' },
]
 
const EMPTY_EDIT_FORM = {
  first_name: '',
  last_name: '',
  strasse: '',
  hausnummer: '',
  plz: '',
  ort: '',
  geburtstag: '',
  rollenIds: [] as number[],
}
 
/**
 * Verwaltung: member management (list, edit, deactivate/reactivate/delete)
 * and inviting new members. Only reachable in the UI via the sidebar/tabbar
 * for Vorstand/Admin - this component adds its own guard too, since a
 * regular member could otherwise still reach the URL directly.
 */
function Verwaltung() {
  const { currentUser } = useOutletContext<OutletContext>()
  const isVorstand = hasRole(currentUser, 'vorstand') || hasRole(currentUser, 'admin')
 
  const [subtab, setSubtab] = useState<'mitglieder' | 'einladungen'>('mitglieder')
 
  const [mitglieder, setMitglieder] = useState<Mitglied[]>([])
  const [rollen, setRollen] = useState<Rolle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
 
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM)
  const [editError, setEditError] = useState<string | null>(null)
 
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
  const [pendingReactivateId, setPendingReactivateId] = useState<number | null>(null)
 
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRolle, setInviteRolle] = useState<'mitglied' | 'vorstand' | 'admin'>('mitglied')
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isInviting, setIsInviting] = useState(false)
 
  async function loadMitglieder() {
    setIsLoading(true)
    setLoadError(null)
    try {
      const [mitgliederData, rollenData] = await Promise.all([listMitglieder(), listRollen()])
      setMitglieder(mitgliederData)
      setRollen(rollenData)
    } catch {
      setLoadError('Mitgliederliste konnte nicht geladen werden.')
    } finally {
      setIsLoading(false)
    }
  }
 
  /** Turns a role ID (all Mitglied.rollen contains) into its readable name. */
  function rolleName(id: number): string {
    return rollen.find((r) => r.id === id)?.name ?? '—'
  }
 
  useEffect(() => {
    if (isVorstand) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadMitglieder()
    } else {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
 
  function openEditModal(mitglied: Mitglied) {
    setEditingId(mitglied.id)
    setEditForm({
      first_name: mitglied.first_name,
      last_name: mitglied.last_name,
      strasse: mitglied.strasse,
      hausnummer: mitglied.hausnummer,
      plz: mitglied.plz,
      ort: mitglied.ort,
      geburtstag: mitglied.geburtstag ?? '',
      rollenIds: mitglied.rollen,
    })
    setEditError(null)
  }
 
  function toggleRole(roleId: number) {
    setEditForm((prev) => ({
      ...prev,
      rollenIds: prev.rollenIds.includes(roleId)
        ? prev.rollenIds.filter((id) => id !== roleId)
        : [...prev.rollenIds, roleId],
    }))
  }
 
  async function handleSaveEdit() {
    if (editingId === null) return
    setEditError(null)
    const payload: MitgliedPayload = {
      first_name: editForm.first_name,
      last_name: editForm.last_name,
      strasse: editForm.strasse,
      hausnummer: editForm.hausnummer,
      plz: editForm.plz,
      ort: editForm.ort,
      geburtstag: editForm.geburtstag || null,
      rollen: editForm.rollenIds,
    }
    try {
      const updated = await updateMitglied(editingId, payload)
      setMitglieder((prev) => prev.map((m) => (m.id === editingId ? updated : m)))
      setEditingId(null)
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data) {
        const firstError = Object.values(err.response.data)[0]
        setEditError(Array.isArray(firstError) ? firstError[0] : String(firstError))
      } else {
        setEditError('Änderungen konnten nicht gespeichert werden.')
      }
    }
  }
 
  async function handleConfirmDelete() {
    if (pendingDeleteId === null) return
    try {
      const { hardDeleted } = await deleteMitglied(pendingDeleteId)
      if (hardDeleted) {
        setMitglieder((prev) => prev.filter((m) => m.id !== pendingDeleteId))
      } else {
        setMitglieder((prev) => prev.map((m) => (m.id === pendingDeleteId ? { ...m, is_active: false } : m)))
      }
    } catch {
      setLoadError('Mitglied konnte nicht gelöscht/deaktiviert werden.')
    } finally {
      setPendingDeleteId(null)
    }
  }
 
  async function handleConfirmReactivate() {
    if (pendingReactivateId === null) return
    try {
      await reaktiviereMitglied(pendingReactivateId)
      setMitglieder((prev) => prev.map((m) => (m.id === pendingReactivateId ? { ...m, is_active: true } : m)))
    } catch {
      setLoadError('Mitglied konnte nicht reaktiviert werden. (Nur der Owner darf reaktivieren.)')
    } finally {
      setPendingReactivateId(null)
    }
  }
 
  async function handleInvite(event: React.FormEvent) {
    event.preventDefault()
    setInviteMessage(null)
    setIsInviting(true)
    try {
      await inviteMitglied({ email: inviteEmail, rolle: inviteRolle })
      setInviteMessage({ type: 'success', text: `Einladung an ${inviteEmail} verschickt.` })
      setInviteEmail('')
    } catch (err) {
      const text =
        err instanceof AxiosError && err.response?.data
          ? String(Object.values(err.response.data)[0])
          : 'Einladung konnte nicht verschickt werden.'
      setInviteMessage({ type: 'error', text })
    } finally {
      setIsInviting(false)
    }
  }
 
  if (!isVorstand) {
    return (
      <div className="empty-state">
        <div className="title">Kein Zugriff</div>
        <div className="sub">Dieser Bereich ist nur für Vorstand und Admin sichtbar.</div>
      </div>
    )
  }
 
  return (
    <div>
      <div className="view-header">
        <div>
          <span className="eyebrow">VERWALTUNG</span>
          <h1>Vorstandsbereich</h1>
          <p>Nur für Vorstand und Admin sichtbar.</p>
        </div>
      </div>
 
      <div className="subtabs">
        <button className={subtab === 'mitglieder' ? 'active' : ''} onClick={() => setSubtab('mitglieder')}>
          Mitglieder
        </button>
        <button className={subtab === 'einladungen' ? 'active' : ''} onClick={() => setSubtab('einladungen')}>
          Einladungen
        </button>
      </div>
 
      {loadError && <p style={{ color: '#c8102e' }}>{loadError}</p>}
 
      {/* ===== MITGLIEDER ===== */}
      {subtab === 'mitglieder' && (
        <div>
          {isLoading && <p>Mitglieder werden geladen …</p>}
 
          {!isLoading &&
            mitglieder.map((mitglied) => (
              <div className="table-mobile-row" key={mitglied.id}>
                <div className="top">
                  <div>
                    <div className="name">
                      <span className={`status-dot ${mitglied.is_active ? '' : 'offline'}`} style={{ display: 'inline-block' }}></span>
                      {mitglied.full_name}
                    </div>
                    <div className="email">
                      {mitglied.email} ·{' '}
                      {mitglied.rollen.length > 0 ? mitglied.rollen.map(rolleName).join(', ') : 'keine Rolle'}
                      {!mitglied.is_active && ' · Deaktiviert'}
                    </div>
                  </div>
                </div>
                <div className="row-actions">
                  <button onClick={() => openEditModal(mitglied)}>Bearbeiten</button>
                  {mitglied.is_active ? (
                    <button className="danger" onClick={() => setPendingDeleteId(mitglied.id)}>
                      Deaktivieren/Löschen
                    </button>
                  ) : (
                    <button onClick={() => setPendingReactivateId(mitglied.id)}>Reaktivieren</button>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
 
      {/* ===== EINLADUNGEN ===== */}
      {subtab === 'einladungen' && (
        <div>
          <div className="member-card" style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', textTransform: 'none', letterSpacing: 0, fontFamily: "'Work Sans', sans-serif", marginBottom: '12px' }}>
              Neues Mitglied einladen
            </h3>
            <form onSubmit={handleInvite}>
              <div className="field-two">
                <div className="field-row">
                  <label>E-Mail</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="field-row">
                  <label>Rolle</label>
                  <select value={inviteRolle} onChange={(e) => setInviteRolle(e.target.value as typeof inviteRolle)}>
                    {INVITE_ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
 
              {inviteMessage && (
                <p style={{ fontSize: '13px', color: inviteMessage.type === 'error' ? '#c8102e' : '#1f7d38' }}>
                  {inviteMessage.text}
                </p>
              )}
 
              <button type="submit" className="btn-primary" disabled={isInviting}>
                {isInviting ? 'Sendet …' : '+ Einladung senden'}
              </button>
            </form>
          </div>
 
          <div className="empty-state">
            <div className="title">Offene Einladungen einsehen kommt noch</div>
            <div className="sub">
              Dafür fehlt aktuell ein Backend-Endpoint, der bestehende Einladungen auflistet - das
              Versenden oben funktioniert aber schon vollständig.
            </div>
          </div>
        </div>
      )}
 
      {/* ===== Bearbeiten-Modal ===== */}
      <div className={`modal-overlay ${editingId !== null ? 'open' : ''}`}>
        <div className="modal-box wide">
          <h3>Mitglied bearbeiten</h3>
 
          <div className="field-two">
            <div className="field-row">
              <label>Vorname</label>
              <input
                type="text"
                value={editForm.first_name}
                onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
              />
            </div>
            <div className="field-row">
              <label>Nachname</label>
              <input
                type="text"
                value={editForm.last_name}
                onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
              />
            </div>
          </div>
          <div className="field-two">
            <div className="field-row">
              <label>Straße</label>
              <input
                type="text"
                value={editForm.strasse}
                onChange={(e) => setEditForm({ ...editForm, strasse: e.target.value })}
              />
            </div>
            <div className="field-row">
              <label>Hausnummer</label>
              <input
                type="text"
                value={editForm.hausnummer}
                onChange={(e) => setEditForm({ ...editForm, hausnummer: e.target.value })}
              />
            </div>
          </div>
          <div className="field-two">
            <div className="field-row">
              <label>PLZ</label>
              <input
                type="text"
                value={editForm.plz}
                onChange={(e) => setEditForm({ ...editForm, plz: e.target.value })}
              />
            </div>
            <div className="field-row">
              <label>Ort</label>
              <input
                type="text"
                value={editForm.ort}
                onChange={(e) => setEditForm({ ...editForm, ort: e.target.value })}
              />
            </div>
          </div>
          <div className="field-row">
            <label>Geburtstag</label>
            <input
              type="date"
              value={editForm.geburtstag ?? ''}
              onChange={(e) => setEditForm({ ...editForm, geburtstag: e.target.value })}
            />
          </div>
 
          {rollen.length > 0 && (
            <div className="field-row">
              <label>Rollen</label>
              {rollen.map((role) => (
                <label key={role.id} className="checkbox-row" style={{ marginTop: '4px' }}>
                  <input
                    type="checkbox"
                    checked={editForm.rollenIds.includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                  />
                  {role.name}
                </label>
              ))}
            </div>
          )}
 
          {editError && <p style={{ color: '#c8102e', fontSize: '13px' }}>{editError}</p>}
 
          <div className="modal-actions" style={{ marginTop: '8px' }}>
            <button className="cancel" onClick={() => setEditingId(null)}>
              Abbrechen
            </button>
            <button className="confirm" onClick={handleSaveEdit}>
              Änderungen speichern
            </button>
          </div>
        </div>
      </div>
 
      {/* ===== Löschen/Deaktivieren-Bestätigung ===== */}
      <div className={`modal-overlay ${pendingDeleteId !== null ? 'open' : ''}`}>
        <div className="modal-box">
          <h3>Mitglied entfernen?</h3>
          <p>
            Falls du selbst der Owner bist, wird der Account endgültig gelöscht. Sonst wird er nur
            deaktiviert und kann später wieder reaktiviert werden.
          </p>
          <div className="modal-actions">
            <button className="cancel" onClick={() => setPendingDeleteId(null)}>
              Abbrechen
            </button>
            <button className="confirm" onClick={handleConfirmDelete}>
              Bestätigen
            </button>
          </div>
        </div>
      </div>
 
      {/* ===== Reaktivieren-Bestätigung ===== */}
      <div className={`modal-overlay ${pendingReactivateId !== null ? 'open' : ''}`}>
        <div className="modal-box">
          <h3>Mitglied reaktivieren?</h3>
          <p>Der Account kann sich danach wieder einloggen. Nur der Owner darf das.</p>
          <div className="modal-actions">
            <button className="cancel" onClick={() => setPendingReactivateId(null)}>
              Abbrechen
            </button>
            <button className="confirm" onClick={handleConfirmReactivate}>
              Reaktivieren
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
 
export default Verwaltung
 


