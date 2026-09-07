import { useEffect, useState } from "react";
import { AxiosError } from "axios";
import {
  getMyProfile,
  updateMyProfile,
  type FullProfil,
  type ProfilPayload,
} from "../../api/auth";

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  strasse: "",
  hausnummer: "",
  plz: "",
  ort: "",
  geburtstag: "",
};

/**
 * Profil: self-service page for the logged-in member's own data. Address/
 * name/birthday editing is fully functional (PATCH /accounts/me/ already
 * exists and is tested). Password change and avatar upload are shown as
 * UI-only for now - the backend endpoints for those don't exist yet
 * (tracked as backend follow-up work).
 */
function Profil() {
  const [profil, setProfil] = useState<FullProfil | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [isPasswordSectionOpen, setIsPasswordSectionOpen] = useState(false);

  async function loadProfil() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await getMyProfile();
      setProfil(data);
      setForm({
        first_name: data.first_name,
        last_name: data.last_name,
        strasse: data.strasse,
        hausnummer: data.hausnummer,
        plz: data.plz,
        ort: data.ort,
        geburtstag: data.geburtstag ?? "",
      });
    } catch {
      setLoadError("Profil konnte nicht geladen werden.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProfil();
  }, []);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaveMessage(null);
    setIsSaving(true);

    const payload: ProfilPayload = {
      ...form,
      geburtstag: form.geburtstag || null,
    };

    try {
      const updated = await updateMyProfile(payload);
      setProfil(updated);
      setSaveMessage({ type: "success", text: "Änderungen gespeichert." });
    } catch (err) {
      const text =
        err instanceof AxiosError && err.response?.data
          ? String(Object.values(err.response.data)[0])
          : "Änderungen konnten nicht gespeichert werden.";
      setSaveMessage({ type: "error", text });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <p>Profil wird geladen …</p>;
  if (loadError || !profil)
    return (
      <p style={{ color: "#c8102e" }}>
        {loadError ?? "Profil nicht gefunden."}
      </p>
    );

  return (
    <div>
      <div className="view-header">
        <div>
          <span className="eyebrow">MEINE DATEN</span>
          <h1>Profil verwalten</h1>
          <p>
            Diese Angaben sehen nur Vorstand, Admin und du selber, nicht andere Mitglieder.
          </p>
        </div>
      </div>

      <div className="member-card">
        {/* ===== Avatar (Platzhalter, Backend-Support fehlt noch) ===== */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          <div
            className="avatar"
            style={{ width: "64px", height: "64px", fontSize: "20px" }}
          >
            {profil.email.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <button
              className="btn-outline"
              disabled
              title="Kommt, sobald der Backend-Endpoint dafür existiert"
            >
              Profilbild hochladen
            </button>
            <p
              style={{
                fontSize: "11px",
                color: "var(--muted)",
                marginTop: "4px",
              }}
            >
              Noch nicht verfügbar – kommt in einem späteren Update.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave}>
          <div className="field-two">
            <div className="field-row">
              <label>Vorname</label>
              <input
                type="text"
                value={form.first_name}
                onChange={(e) =>
                  setForm({ ...form, first_name: e.target.value })
                }
              />
            </div>
            <div className="field-row">
              <label>Nachname</label>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) =>
                  setForm({ ...form, last_name: e.target.value })
                }
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
                onChange={(e) =>
                  setForm({ ...form, hausnummer: e.target.value })
                }
              />
            </div>
          </div>

          <div className="field-two">
            <div className="field-row">
              <label>PLZ</label>
              <input
                type="text"
                value={form.plz}
                onChange={(e) => setForm({ ...form, plz: e.target.value })}
              />
            </div>
            <div className="field-row">
              <label>Ort</label>
              <input
                type="text"
                value={form.ort}
                onChange={(e) => setForm({ ...form, ort: e.target.value })}
              />
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
            <p
              style={{
                fontSize: "13px",
                color: saveMessage.type === "error" ? "#c8102e" : "#1f7d38",
              }}
            >
              {saveMessage.text}
            </p>
          )}

          <button type="submit" className="btn-primary" disabled={isSaving}>
            {isSaving ? "Speichert …" : "Änderungen speichern"}
          </button>
        </form>

        {/* ===== Passwort ändern (UI-only, Backend-Endpoint fehlt noch) ===== */}
        <div className="collapsible">
          <button
            className="btn-outline"
            onClick={() => setIsPasswordSectionOpen((prev) => !prev)}
          >
            🔒 Passwort ändern
          </button>

          {isPasswordSectionOpen && (
            <div style={{ marginTop: "12px" }}>
              <div className="field-row">
                <label>Aktuelles Passwort</label>
                <input type="password" disabled />
              </div>
              <div className="field-row">
                <label>Neues Passwort</label>
                <input type="password" disabled />
              </div>
              <div className="field-row">
                <label>Neues Passwort bestätigen</label>
                <input type="password" disabled />
              </div>
              <p style={{ fontSize: "12px", color: "var(--muted)" }}>
                Noch nicht verfügbar – der Backend-Endpoint zum Ändern des
                Passworts im eingeloggten Zustand fehlt noch. Aktuell geht
                Passwort-Vergessen nur über den E-Mail-Link.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profil;
