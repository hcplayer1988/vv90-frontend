import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { AxiosError } from 'axios'
import {
  deleteMitglied,
  type Einladung,
  inviteMitglied,
  listEinladungen,
  listMitglieder,
  listRollen,
  reaktiviereMitglied,
  resendEinladung,
  revokeEinladung,
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
 
  const [einladungen, setEinladungen] = useState<Einladung[]>([])
  const [isLoadingEinladungen, setIsLoadingEinladungen] = useState(false)
  const [pendingRevokeId, setPendingRevokeId] = useState<number | null>(null)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false)
 
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
 
  async function loadEinladungen() {
    setIsLoadingEinladungen(true)
    try {
      const data = await listEinladungen()
      setEinladungen(data)
    } catch {
      setLoadError('Einladungen konnten nicht geladen werden.')
    } finally {
      setIsLoadingEinladungen(false)
    }
  }
 
  function openEinladungenTab() {
    setSubtab('einladungen')
    if (einladungen.length === 0) {
      loadEinladungen()
    }
  }
 
  async function handleResend(id: number) {
    setResendMessage(null)
    try {
      const updated = await resendEinladung(id)
      setEinladungen((prev) => prev.map((e) => (e.id === id ? updated : e)))
      setResendMessage(`Einladung an ${updated.email} wurde erneut verschickt.`)
    } catch {
      setLoadError('Einladung konnte nicht erneut verschickt werden.')
    }
  }
 
  async function handleConfirmRevoke() {
    if (pendingRevokeId === null) return
    try {
      await revokeEinladung(pendingRevokeId)
      setEinladungen((prev) => prev.filter((e) => e.id !== pendingRevokeId))
    } catch {
      setLoadError('Einladung konnte nicht widerrufen werden.')
    } finally {
      setPendingRevokeId(null)
    }
  }
 
  function einladungStatus(einladung: Einladung): { label: string; className: string } {
    if (einladung.verwendet) return { label: 'Verwendet', className: 'verwendet' }
    if (!einladung.ist_gueltig) return { label: 'Abgelaufen', className: 'abgelaufen' }
    return { label: 'Offen', className: 'offen' }
  }
 
  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
 
  function toggleSelectAll() {
    setSelectedIds((prev) =>
      prev.size === einladungen.length ? new Set() : new Set(einladungen.map((e) => e.id))
    )
  }
 
  async function handleConfirmBulkDelete() {
    const ids = Array.from(selectedIds)
    try {
      await Promise.all(ids.map((id) => revokeEinladung(id)))
      setEinladungen((prev) => prev.filter((e) => !selectedIds.has(e.id)))
      setSelectedIds(new Set())
    } catch {
      setLoadError('Einige Einladungen konnten nicht gelöscht werden.')
      loadEinladungen()
    } finally {
      setPendingBulkDelete(false)
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
      // Liste im Hintergrund neu laden, damit die frische Einladung sofort auftaucht,
      // ohne dass extra auf den Reiter geklickt werden muss.
      loadEinladungen()
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
        <button className={subtab === 'einladungen' ? 'active' : ''} onClick={openEinladungenTab}>
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
 
          {resendMessage && <p style={{ fontSize: '13px', color: '#1f7d38' }}>{resendMessage}</p>}
 
          {einladungen.length > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={selectedIds.size === einladungen.length}
                  onChange={toggleSelectAll}
                />
                Alle auswählen
              </label>
              {selectedIds.size > 0 && (
                <button className="btn-outline" onClick={() => setPendingBulkDelete(true)}>
                  {selectedIds.size} ausgewählte löschen
                </button>
              )}
            </div>
          )}
 
          {isLoadingEinladungen && <p>Einladungen werden geladen …</p>}
 
          {!isLoadingEinladungen && einladungen.length === 0 && (
            <div className="empty-state">
              <div className="title">Noch keine Einladungen verschickt</div>
              <div className="sub">Sobald eine verschickt wird, taucht sie hier auf.</div>
            </div>
          )}
 
          {!isLoadingEinladungen &&
            einladungen.map((einladung) => {
              const status = einladungStatus(einladung)
              return (
                <div className="table-mobile-row" key={einladung.id}>
                  <div className="top">
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(einladung.id)}
                        onChange={() => toggleSelect(einladung.id)}
                        style={{ marginTop: '3px' }}
                      />
                      <div>
                        <div className="name">{einladung.email}</div>
                      <div className="email">
                        {einladung.rolle?.name ?? 'keine Rolle'} · eingeladen von {einladung.erstellt_von} am{' '}
                        {new Date(einladung.erstellt_am).toLocaleDateString('de-DE')}
                        </div>
                      </div>
                    </div>
                    <span className={`status-tag ${status.className}`}>{status.label}</span>
                  </div>
                  <div className="row-actions">
                    {!einladung.verwendet ? (
                      <>
                        <button onClick={() => handleResend(einladung.id)}>Erneut senden</button>
                        <button className="danger" onClick={() => setPendingRevokeId(einladung.id)}>
                          Widerrufen
                        </button>
                      </>
                    ) : (
                      <button className="danger" onClick={() => setPendingRevokeId(einladung.id)}>
                        Löschen
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
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
 
      {/* ===== Einladung widerrufen/löschen - Bestätigung ===== */}
      <div className={`modal-overlay ${pendingRevokeId !== null ? 'open' : ''}`}>
        <div className="modal-box">
          {(() => {
            const target = einladungen.find((e) => e.id === pendingRevokeId)
            const isUsed = target?.verwendet ?? false
            return (
              <>
                <h3>{isUsed ? 'Einladung löschen?' : 'Einladung widerrufen?'}</h3>
                <p>
                  {isUsed
                    ? 'Der Eintrag wird endgültig aus der Liste entfernt.'
                    : 'Der Link in der bereits verschickten E-Mail wird damit ungültig.'}
                </p>
                <div className="modal-actions">
                  <button className="cancel" onClick={() => setPendingRevokeId(null)}>
                    Abbrechen
                  </button>
                  <button className="confirm" onClick={handleConfirmRevoke}>
                    {isUsed ? 'Löschen' : 'Widerrufen'}
                  </button>
                </div>
              </>
            )
          })()}
        </div>
      </div>
      {/* ===== Mehrere Einladungen loeschen - Bestaetigung ===== */}
      <div className={`modal-overlay ${pendingBulkDelete ? 'open' : ''}`}>
        <div className="modal-box">
          <h3>{selectedIds.size} Einladung{selectedIds.size === 1 ? '' : 'en'} löschen?</h3>
          <p>
            Bei noch offenen Einladungen wird damit auch der Link in der bereits verschickten
            E-Mail ungültig. Das kann nicht rückgängig gemacht werden.
          </p>
          <div className="modal-actions">
            <button className="cancel" onClick={() => setPendingBulkDelete(false)}>
              Abbrechen
            </button>
            <button className="confirm" onClick={handleConfirmBulkDelete}>
              Löschen
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
 
export default Verwaltung
 
