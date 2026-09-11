import { useEffect, useState } from 'react'
import { AxiosError } from 'axios'
import {
  changeCredentials,
  getMyProfile,
  updateMyProfile,
  uploadAvatar,
  type FullProfil,
  type ProfilPayload,
} from '../../api/auth'
import PasswordInput from '../../components/passwordInput'
 
const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  strasse: '',
  hausnummer: '',
  plz: '',
  ort: '',
  geburtstag: '',
}
 
const EMPTY_CREDENTIALS_FORM = {
  current_password: '',
  new_email: '',
  new_password: '',
  confirm_new_password: '',
}
 

const MAX_AVATAR_SIZE_MB = 5
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp']
 
/**
 * Profil: self-service page for the logged-in member's own data. Address/
 * name/birthday editing (PATCH /accounts/me/), email/password changes
 * (POST /accounts/change-credentials/) and avatar upload (PATCH /accounts/me/
 * als multipart/form-data) sind jetzt alle voll funktional.
 */
function Profil() {
  const [profil, setProfil] = useState<FullProfil | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
 
  const [form, setForm] = useState(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
 
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
 
  const [isCredentialsSectionOpen, setIsCredentialsSectionOpen] = useState(false)
  const [credentialsForm, setCredentialsForm] = useState(EMPTY_CREDENTIALS_FORM)
  const [credentialsError, setCredentialsError] = useState<string | null>(null)
  const [credentialsSuccess, setCredentialsSuccess] = useState<string | null>(null)
  const [isSavingCredentials, setIsSavingCredentials] = useState(false)
 
  async function loadProfil() {
    setIsLoading(true)
    setLoadError(null)
    try {
      const data = await getMyProfile()
      setProfil(data)
      setForm({
        first_name: data.first_name,
        last_name: data.last_name,
        strasse: data.strasse,
        hausnummer: data.hausnummer,
        plz: data.plz,
        ort: data.ort,
        geburtstag: data.geburtstag ?? '',
      })
      setCredentialsForm((prev) => ({ ...prev, new_email: data.email }))
    } catch {
      setLoadError('Profil konnte nicht geladen werden.')
    } finally {
      setIsLoading(false)
    }
  }
 
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProfil()
  }, [])
 
  function extractFirstError(err: unknown, fallback: string): string {
    if (err instanceof AxiosError && err.response?.data) {
      const firstError = Object.values(err.response.data)[0]
      return Array.isArray(firstError) ? firstError[0] : String(firstError)
    }
    return fallback
  }
 
  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    setSaveMessage(null)
    setIsSaving(true)
 
    const payload: ProfilPayload = {
      ...form,
      geburtstag: form.geburtstag || null,
    }
 
    try {
      const updated = await updateMyProfile(payload)
      setProfil(updated)
      setSaveMessage({ type: 'success', text: 'Änderungen gespeichert.' })
    } catch (err) {
      const text =
        err instanceof AxiosError && err.response?.data
          ? String(Object.values(err.response.data)[0])
          : 'Änderungen konnten nicht gespeichert werden.'
      setSaveMessage({ type: 'error', text })
    } finally {
      setIsSaving(false)
    }
  }
 
  /**
   * NEU: Handles picking a new avatar file. Uploads immediately on
   * selection (no separate "hochladen"-Klick noetig), mit sofortigem
   * clientseitigem Check von Dateityp und -groesse fuer schnelles Feedback.
   */
  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
 
    setAvatarError(null)
 
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setAvatarError('Nur JPEG-, PNG- oder WebP-Bilder sind erlaubt.')
      return
    }
    if (file.size > MAX_AVATAR_SIZE_MB * 1024 * 1024) {
      setAvatarError(`Das Bild darf maximal ${MAX_AVATAR_SIZE_MB}MB groß sein.`)
      return
    }
 
    setIsUploadingAvatar(true)
    try {
      const updated = await uploadAvatar(file)
      setProfil(updated)
    } catch (err) {
      setAvatarError(extractFirstError(err, 'Profilbild konnte nicht hochgeladen werden.'))
    } finally {
      setIsUploadingAvatar(false)
    }
  }
 
  async function handleSaveCredentials(event: React.FormEvent) {
    event.preventDefault()
    setCredentialsError(null)
    setCredentialsSuccess(null)
 
    const { current_password, new_email, new_password, confirm_new_password } = credentialsForm
    const emailChanged = profil !== null && new_email.trim() !== profil.email
    if (!emailChanged && !new_password) {
      setCredentialsError('Gib eine neue E-Mail-Adresse oder ein neues Passwort an.')
      return
    }
 
    setIsSavingCredentials(true)
    try {
      const response = await changeCredentials({
        current_password,
        ...(emailChanged ? { new_email: new_email.trim() } : {}),
        ...(new_password ? { new_password, confirm_new_password } : {}),
      })
      setCredentialsSuccess(response.detail)
      setCredentialsForm({ ...EMPTY_CREDENTIALS_FORM, new_email: profil?.email ?? '' })
    } catch (err) {
      setCredentialsError(extractFirstError(err, 'Änderungen konnten nicht gespeichert werden.'))
    } finally {
      setIsSavingCredentials(false)
    }
  }
 
  if (isLoading) return <p>Profil wird geladen …</p>
  if (loadError || !profil) return <p style={{ color: '#c8102e' }}>{loadError ?? 'Profil nicht gefunden.'}</p>
 
  return (
    <div>
      <div className="view-header">
        <div>
          <span className="eyebrow">MEINE DATEN</span>
          <h1>Profil verwalten</h1>
          <p>Diese Angaben sehen nur Vorstand und Admin, nicht andere Mitglieder.</p>
        </div>
      </div>
 
      <div className="member-card">
        {/* ===== Avatar ===== */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          {profil.avatar ? (
            <img
              src={profil.avatar}
              alt="Profilbild"
              className="avatar"
              style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div className="avatar" style={{ width: '64px', height: '64px', fontSize: '20px' }}>
              {profil.email.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <label className="btn-outline" style={{ cursor: isUploadingAvatar ? 'default' : 'pointer' }}>
              {isUploadingAvatar ? 'Lädt hoch …' : 'Profilbild hochladen'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarChange}
                disabled={isUploadingAvatar}
                style={{ display: 'none' }}
              />
            </label>
            <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
              JPEG, PNG oder WebP, max. {MAX_AVATAR_SIZE_MB}MB.
            </p>
            {avatarError && (
              <p style={{ fontSize: '11px', color: '#c8102e', marginTop: '4px' }}>{avatarError}</p>
            )}
          </div>
        </div>
 
        <form onSubmit={handleSave}>
          <div className="field-two">
            <div className="field-row">
              <label>Vorname</label>
              <input
                type="text"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              />
            </div>
            <div className="field-row">
              <label>Nachname</label>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              />
            </div>
          </div>
 
          <div className="field-row">
            <label>E-Mail</label>
            <input type="email" value={profil.email} disabled />
          </div>
 
          <div className="field-two">
            <div className="field-row">
              <label>Straße</label>
              <input
                type="text"
                value={form.strasse}
                onChange={(e) => setForm({ ...form, strasse: e.target.value })}
              />
            </div>
            <div className="field-row">
              <label>Hausnummer</label>
              <input
                type="text"
                value={form.hausnummer}
                onChange={(e) => setForm({ ...form, hausnummer: e.target.value })}
              />
            </div>
          </div>
 
          <div className="field-two">
            <div className="field-row">
              <label>PLZ</label>
              <input type="text" value={form.plz} onChange={(e) => setForm({ ...form, plz: e.target.value })} />
            </div>
            <div className="field-row">
              <label>Ort</label>
              <input type="text" value={form.ort} onChange={(e) => setForm({ ...form, ort: e.target.value })} />
            </div>
          </div>
 
          <div className="field-row">
            <label>Geburtstag</label>
            <input
              type="date"
              value={form.geburtstag}
              onChange={(e) => setForm({ ...form, geburtstag: e.target.value })}
            />
          </div>
 
          {saveMessage && (
            <p style={{ fontSize: '13px', color: saveMessage.type === 'error' ? '#c8102e' : '#1f7d38' }}>
              {saveMessage.text}
            </p>
          )}
 
          <button type="submit" className="btn-primary" disabled={isSaving}>
            {isSaving ? 'Speichert …' : 'Änderungen speichern'}
          </button>
        </form>
 
        {/* ===== E-Mail/Passwort ändern ===== */}
        <div className="collapsible">
          <button className="btn-outline" onClick={() => setIsCredentialsSectionOpen((prev) => !prev)}>
            🔒 E-Mail / Passwort ändern
          </button>
 
          {isCredentialsSectionOpen && (
            <form onSubmit={handleSaveCredentials} style={{ marginTop: '12px' }}>
              <div className="field-row">
                <label>Neue E-Mail-Adresse (optional)</label>
                <input
                  type="email"
                  value={credentialsForm.new_email}
                  autoComplete="off"
                  onChange={(e) => setCredentialsForm({ ...credentialsForm, new_email: e.target.value })}
                />
              </div>
              <PasswordInput
                label="Neues Passwort (optional)"
                value={credentialsForm.new_password}
                onChange={(value) => setCredentialsForm({ ...credentialsForm, new_password: value })}
                autoComplete="off"
              />
              <PasswordInput
                label="Neues Passwort bestätigen"
                value={credentialsForm.confirm_new_password}
                onChange={(value) => setCredentialsForm({ ...credentialsForm, confirm_new_password: value })}
                autoComplete="off"
              />
              <PasswordInput
                label="Aktuelles Passwort (zur Bestätigung erforderlich)"
                value={credentialsForm.current_password}
                onChange={(value) => setCredentialsForm({ ...credentialsForm, current_password: value })}
                autoComplete="off"
                required
              />
 
              {credentialsError && (
                <p style={{ fontSize: '13px', color: '#c8102e' }}>{credentialsError}</p>
              )}
              {credentialsSuccess && (
                <p style={{ fontSize: '13px', color: '#1f7d38' }}>{credentialsSuccess}</p>
              )}
 
              <button type="submit" className="btn-primary" disabled={isSavingCredentials}>
                {isSavingCredentials ? 'Speichert …' : 'Übernehmen'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
 
export default Profil
 






