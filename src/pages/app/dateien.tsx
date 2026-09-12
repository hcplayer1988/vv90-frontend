import { useEffect, useMemo, useState } from "react";
import { AxiosError } from "axios";
import ModalOverlay from "../../components/modalOverlay";
import {
  createOrdner,
  deleteDatei,
  deleteOrdner,
  getSpeicher,
  listAlleOrdner,
  listDateien,
  renameOrdner,
  uploadDatei,
  verschiebeDatei,
  type Datei,
  type Ordner,
  type SpeicherInfo,
} from "../../api/dateien";

// Client-seitige Vorabpruefung, spiegelt die Grenzen aus
// dateien/api/serializers.py (ALLOWED_EXTENSIONS, MAX_DATEI_GROESSE_MB).
// Das Backend validiert zusaetzlich noch einmal serverseitig.
const MAX_DATEI_GROESSE_MB = 10;
const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".doc",
  ".docx",
  ".odt",
  ".txt",
  ".xls",
  ".xlsx",
  ".ods",
];

// Alle Popups (neuer Ordner, umbenennen, löschen, verschieben) laufen über
// diesen einen State statt über mehrere boolesche Flags - so kann immer nur
// ein Dialog gleichzeitig offen sein und jeder Dialog trägt genau die Daten,
// die er braucht.
type ModalState =
  | { type: "neuerOrdner" }
  | { type: "ordnerUmbenennen"; ordner: Ordner }
  | { type: "ordnerLoeschen"; ordner: Ordner }
  | { type: "dateienLoeschen"; ids: number[] }
  | { type: "dateienVerschieben"; ids: number[] }
  | null;

function formatiereDatum(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function extractFirstError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError && err.response?.data) {
    const firstError = Object.values(err.response.data)[0];
    return Array.isArray(firstError) ? firstError[0] : String(firstError);
  }
  return fallback;
}

/** Baut den Pfad vom Hauptverzeichnis bis zum aktuellen Ordner (für die
 *  Breadcrumb-Leiste), indem die parent-Kette rückwärts durchlaufen wird. */
function baueOrdnerPfad(
  alleOrdner: Ordner[],
  aktuelleId: number | null,
): Ordner[] {
  const pfad: Ordner[] = [];
  let id = aktuelleId;
  while (id !== null) {
    const ordner = alleOrdner.find((o) => o.id === id);
    if (!ordner) break;
    pfad.unshift(ordner);
    id = ordner.parent;
  }
  return pfad;
}

/**
 * Dateien: private per-member file storage (PDFs, images, common office
 * documents), organisierbar in beliebig tief verschachtelten Ordnern.
 * Strictly private for now - sharing a file with other members (e.g. via
 * the planned live chat) is a separate, later feature.
 */
function Dateien() {
  const [alleOrdner, setAlleOrdner] = useState<Ordner[]>([]);
  const [aktuellerOrdnerId, setAktuellerOrdnerId] = useState<number | null>(
    null,
  );
  const [dateien, setDateien] = useState<Datei[]>([]);
  const [speicher, setSpeicher] = useState<SpeicherInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [modal, setModal] = useState<ModalState>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalInput, setModalInput] = useState("");
  const [isModalBusy, setIsModalBusy] = useState(false);

  async function ladeOrdnerUndSpeicher() {
    const [ordnerData, speicherData] = await Promise.all([
      listAlleOrdner(),
      getSpeicher(),
    ]);
    setAlleOrdner(ordnerData);
    setSpeicher(speicherData);
  }

  async function ladeDateien(ordnerId: number | null) {
    const dateienData = await listDateien(ordnerId);
    setDateien(dateienData);
  }

  async function ladeAlles(ordnerId: number | null) {
    setIsLoading(true);
    setLoadError(null);
    try {
      await Promise.all([ladeOrdnerUndSpeicher(), ladeDateien(ordnerId)]);
    } catch {
      setLoadError("Dateien konnten nicht geladen werden.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    ladeAlles(aktuellerOrdnerId);
    setSelectedIds(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aktuellerOrdnerId]);

  const ordnerPfad = useMemo(
    () => baueOrdnerPfad(alleOrdner, aktuellerOrdnerId),
    [alleOrdner, aktuellerOrdnerId],
  );
  const unterordner = useMemo(
    () => alleOrdner.filter((o) => o.parent === aktuellerOrdnerId),
    [alleOrdner, aktuellerOrdnerId],
  );

  function navigiereZu(ordnerId: number | null) {
    setAktuellerOrdnerId(ordnerId);
  }

  function schliesseModal() {
    setModal(null);
    setModalError(null);
    setModalInput("");
    setIsModalBusy(false);
  }

  function oeffneNeuerOrdnerModal() {
    setModalInput("");
    setModalError(null);
    setModal({ type: "neuerOrdner" });
  }

  function oeffneUmbenennenModal(ordner: Ordner) {
    setModalInput(ordner.name);
    setModalError(null);
    setModal({ type: "ordnerUmbenennen", ordner });
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Input-Wert zuruecksetzen, damit onChange auch feuert, wenn dieselbe
    // Datei ein zweites Mal ausgewaehlt wird.
    event.target.value = "";
    if (!file) return;

    setUploadError(null);

    const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setUploadError(
        "Dieser Dateityp ist nicht erlaubt. Erlaubt sind PDF, Bilder (JPEG/PNG/WebP) sowie Text- und Tabellendateien (Word, OpenDocument, TXT, Excel).",
      );
      return;
    }
    if (file.size > MAX_DATEI_GROESSE_MB * 1024 * 1024) {
      setUploadError(
        `Die Datei darf maximal ${MAX_DATEI_GROESSE_MB}MB groß sein.`,
      );
      return;
    }

    setIsUploading(true);
    try {
      await uploadDatei(file, aktuellerOrdnerId);
      // Liste und Speicher-Anzeige neu laden, statt lokal zu raten - so
      // bleibt die Quota-Anzeige immer exakt wie vom Backend berechnet.
      await ladeAlles(aktuellerOrdnerId);
    } catch (err) {
      setUploadError(
        extractFirstError(err, "Datei konnte nicht hochgeladen werden."),
      );
    } finally {
      setIsUploading(false);
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) =>
      prev.size === dateien.length
        ? new Set()
        : new Set(dateien.map((d) => d.id)),
    );
  }

  async function handleModalSubmit() {
    if (!modal) return;
    setModalError(null);

    if (modal.type === "neuerOrdner") {
      const name = modalInput.trim();
      if (!name) {
        setModalError("Bitte einen Namen eingeben.");
        return;
      }
      setIsModalBusy(true);
      try {
        await createOrdner(name, aktuellerOrdnerId);
        await ladeOrdnerUndSpeicher();
        schliesseModal();
      } catch (err) {
        setModalError(
          extractFirstError(err, "Ordner konnte nicht erstellt werden."),
        );
        setIsModalBusy(false);
      }
      return;
    }

    if (modal.type === "ordnerUmbenennen") {
      const name = modalInput.trim();
      if (!name) {
        setModalError("Bitte einen Namen eingeben.");
        return;
      }
      setIsModalBusy(true);
      try {
        await renameOrdner(modal.ordner.id, name);
        await ladeOrdnerUndSpeicher();
        schliesseModal();
      } catch (err) {
        setModalError(
          extractFirstError(err, "Ordner konnte nicht umbenannt werden."),
        );
        setIsModalBusy(false);
      }
      return;
    }

    if (modal.type === "ordnerLoeschen") {
      setIsModalBusy(true);
      try {
        await deleteOrdner(modal.ordner.id);
        await ladeOrdnerUndSpeicher();
        schliesseModal();
      } catch (err) {
        setModalError(
          extractFirstError(err, "Ordner konnte nicht gelöscht werden."),
        );
        setIsModalBusy(false);
      }
      return;
    }

    if (modal.type === "dateienLoeschen") {
      setIsModalBusy(true);
      try {
        await Promise.all(modal.ids.map((id) => deleteDatei(id)));
        setSelectedIds(new Set());
        await ladeAlles(aktuellerOrdnerId);
        schliesseModal();
      } catch {
        setModalError("Nicht alle Dateien konnten gelöscht werden.");
        setIsModalBusy(false);
      }
      return;
    }
  }

  async function verschiebeAusgewaehlteDateien(zielOrdnerId: number | null) {
    if (!modal || modal.type !== "dateienVerschieben") return;
    setIsModalBusy(true);
    setModalError(null);
    try {
      await Promise.all(
        modal.ids.map((id) => verschiebeDatei(id, zielOrdnerId)),
      );
      setSelectedIds(new Set());
      await ladeAlles(aktuellerOrdnerId);
      schliesseModal();
    } catch {
      setModalError("Nicht alle Dateien konnten verschoben werden.");
      setIsModalBusy(false);
    }
  }

  function renderOrdnerBaumOptionen(parentId: number | null, tiefe: number) {
    return alleOrdner
      .filter((o) => o.parent === parentId)
      .map((o) => (
        <div key={o.id}>
          <button
            className="btn-outline"
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              marginBottom: "6px",
              paddingLeft: `${12 + tiefe * 16}px`,
            }}
            onClick={() => verschiebeAusgewaehlteDateien(o.id)}
            disabled={isModalBusy}
          >
            📁 {o.name}
          </button>
          {renderOrdnerBaumOptionen(o.id, tiefe + 1)}
        </div>
      ));
  }

  if (isLoading) return <p>Dateien werden geladen …</p>;

  const belegtProzent = speicher
    ? Math.min((speicher.genutzt_mb / speicher.quota_mb) * 100, 100)
    : 0;

  return (
    <div>
      <div className="view-header">
        <div>
          <span className="eyebrow">MEIN SPEICHER</span>
          <h1>Meine Dateien</h1>
          <p>
            Nur du siehst diese Dateien. Teilen mit anderen Mitgliedern kommt in
            einem späteren Update.
          </p>
        </div>
      </div>

      <div className="member-card">
        {speicher && (
          <div style={{ marginBottom: "20px" }}>
            <div
              style={{
                height: "8px",
                borderRadius: "4px",
                background: "#eee",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${belegtProzent}%`,
                  background: belegtProzent > 90 ? "#c8102e" : "#141414",
                }}
              />
            </div>
            <p
              style={{
                fontSize: "13px",
                color: "var(--muted)",
                marginTop: "6px",
              }}
            >
              {speicher.genutzt_mb}MB von {speicher.quota_mb}MB belegt (
              {speicher.frei_mb}MB frei)
            </p>
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            marginBottom: "6px",
          }}
        >
          <label
            className="btn-outline"
            style={{ cursor: isUploading ? "default" : "pointer" }}
          >
            {isUploading ? "Lädt hoch …" : "Datei hochladen"}
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.odt,.txt,.xls,.xlsx,.ods"
              onChange={handleFileChange}
              disabled={isUploading}
              style={{ display: "none" }}
            />
          </label>
          <button className="btn-outline" onClick={oeffneNeuerOrdnerModal}>
            + Neuer Ordner
          </button>
        </div>
        <p
          style={{
            fontSize: "11px",
            color: "var(--muted)",
            marginBottom: "16px",
          }}
        >
          PDF, Bilder, Word/OpenDocument/TXT/Excel, max. {MAX_DATEI_GROESSE_MB}
          MB pro Datei.
        </p>

        {uploadError && (
          <p
            style={{ fontSize: "13px", color: "#c8102e", marginBottom: "12px" }}
          >
            {uploadError}
          </p>
        )}
        {loadError && (
          <p
            style={{ fontSize: "13px", color: "#c8102e", marginBottom: "12px" }}
          >
            {loadError}
          </p>
        )}

        {/* Breadcrumb */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "4px",
            fontSize: "13px",
            marginBottom: "16px",
          }}
        >
          <button
            onClick={() => navigiereZu(null)}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontWeight: aktuellerOrdnerId === null ? 700 : 400,
              color: aktuellerOrdnerId === null ? "#141414" : "#c8102e",
            }}
          >
            Meine Dateien
          </button>
          {ordnerPfad.map((o) => (
            <span
              key={o.id}
              style={{ display: "flex", alignItems: "center", gap: "4px" }}
            >
              <span style={{ color: "var(--muted)" }}>/</span>
              <button
                onClick={() => navigiereZu(o.id)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  fontWeight: aktuellerOrdnerId === o.id ? 700 : 400,
                  color: aktuellerOrdnerId === o.id ? "#141414" : "#c8102e",
                }}
              >
                {o.name}
              </button>
            </span>
          ))}
        </div>

        {/* Unterordner in diesem Ordner */}
        {unterordner.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0, marginBottom: "12px" }}>
            {unterordner.map((o) => (
              <li
                key={o.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 0",
                  borderBottom: "1px solid #eee",
                }}
              >
                <button
                  onClick={() => navigiereZu(o.id)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: "14px",
                  }}
                >
                  📁 {o.name}
                </button>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    className="btn-outline"
                    onClick={() => oeffneUmbenennenModal(o)}
                  >
                    Umbenennen
                  </button>
                  <button
                    className="btn-outline"
                    style={{ color: "#c8102e", borderColor: "#c8102e" }}
                    onClick={() => {
                      setModalError(null);
                      setModal({ type: "ordnerLoeschen", ordner: o });
                    }}
                  >
                    Löschen
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Auswahl-Aktionsleiste, erscheint sobald mindestens eine Datei
            angehakt ist */}
        {selectedIds.size > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "10px",
              padding: "10px 12px",
              background: "#f5f5f5",
              borderRadius: "6px",
              marginBottom: "12px",
            }}
          >
            <span style={{ fontSize: "13px" }}>
              {selectedIds.size} ausgewählt
            </span>
            <button
              className="btn-outline"
              onClick={() => {
                setModalError(null);
                setModal({
                  type: "dateienVerschieben",
                  ids: Array.from(selectedIds),
                });
              }}
            >
              Verschieben
            </button>
            <button
              className="btn-outline"
              style={{ color: "#c8102e", borderColor: "#c8102e" }}
              onClick={() => {
                setModalError(null);
                setModal({
                  type: "dateienLoeschen",
                  ids: Array.from(selectedIds),
                });
              }}
            >
              Löschen
            </button>
          </div>
        )}

        {/* Dateien in diesem Ordner */}
        {dateien.length === 0 && unterordner.length === 0 ? (
          <p style={{ marginTop: "20px", color: "var(--muted)" }}>
            Dieser Ordner ist noch leer.
          </p>
        ) : (
          dateien.length > 0 && (
            <>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "12px",
                  color: "var(--muted)",
                  marginBottom: "4px",
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.size === dateien.length}
                  onChange={toggleSelectAll}
                />
                Alle auswählen
              </label>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {dateien.map((d) => (
                  <li
                    key={d.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                      padding: "10px 0",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(d.id)}
                        onChange={() => toggleSelect(d.id)}
                      />
                      <div>
                        <a href={d.url} target="_blank" rel="noreferrer">
                          {d.dateiname}
                        </a>
                        <p
                          style={{
                            fontSize: "11px",
                            color: "var(--muted)",
                            margin: 0,
                          }}
                        >
                          {d.groesse_mb}MB · {formatiereDatum(d.hochgeladen_am)}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        className="btn-outline"
                        onClick={() => {
                          setModalError(null);
                          setModal({ type: "dateienVerschieben", ids: [d.id] });
                        }}
                      >
                        Verschieben
                      </button>
                      <button
                        className="btn-outline"
                        style={{ color: "#c8102e", borderColor: "#c8102e" }}
                        onClick={() => {
                          setModalError(null);
                          setModal({ type: "dateienLoeschen", ids: [d.id] });
                        }}
                      >
                        Löschen
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )
        )}
      </div>

      {/* ===== Modals ===== */}

      {(modal?.type === "neuerOrdner" ||
        modal?.type === "ordnerUmbenennen") && (
        <ModalOverlay onClose={schliesseModal}>
          <h3 style={{ marginTop: 0 }}>
            {modal.type === "neuerOrdner"
              ? "Neuer Ordner"
              : "Ordner umbenennen"}
          </h3>
          <input
            type="text"
            value={modalInput}
            onChange={(e) => setModalInput(e.target.value)}
            placeholder="Ordnername"
            autoFocus
            style={{
              width: "100%",
              padding: "8px",
              marginBottom: "12px",
              boxSizing: "border-box",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleModalSubmit();
            }}
          />
          {modalError && (
            <p
              style={{
                fontSize: "13px",
                color: "#c8102e",
                marginBottom: "12px",
              }}
            >
              {modalError}
            </p>
          )}
          <div
            style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}
          >
            <button
              className="btn-outline"
              onClick={schliesseModal}
              disabled={isModalBusy}
            >
              Abbrechen
            </button>
            <button
              className="btn-outline"
              onClick={handleModalSubmit}
              disabled={isModalBusy}
            >
              {modal.type === "neuerOrdner" ? "Erstellen" : "Speichern"}
            </button>
          </div>
        </ModalOverlay>
      )}

      {modal?.type === "ordnerLoeschen" && (
        <ModalOverlay onClose={schliesseModal}>
          <h3 style={{ marginTop: 0 }}>Ordner löschen</h3>
          <p>
            Soll der Ordner „{modal.ordner.name}“ wirklich gelöscht werden? Alle
            enthaltenen Unterordner und Dateien werden dabei unwiderruflich
            mitgelöscht.
          </p>
          {modalError && (
            <p
              style={{
                fontSize: "13px",
                color: "#c8102e",
                marginBottom: "12px",
              }}
            >
              {modalError}
            </p>
          )}
          <div
            style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}
          >
            <button
              className="btn-outline"
              onClick={schliesseModal}
              disabled={isModalBusy}
            >
              Abbrechen
            </button>
            <button
              className="btn-outline"
              style={{ color: "#c8102e", borderColor: "#c8102e" }}
              onClick={handleModalSubmit}
              disabled={isModalBusy}
            >
              Löschen
            </button>
          </div>
        </ModalOverlay>
      )}

      {modal?.type === "dateienLoeschen" && (
        <ModalOverlay onClose={schliesseModal}>
          <h3 style={{ marginTop: 0 }}>Dateien löschen</h3>
          <p>
            {modal.ids.length === 1
              ? "Soll diese Datei wirklich gelöscht werden?"
              : `Sollen diese ${modal.ids.length} Dateien wirklich gelöscht werden?`}
          </p>
          {modalError && (
            <p
              style={{
                fontSize: "13px",
                color: "#c8102e",
                marginBottom: "12px",
              }}
            >
              {modalError}
            </p>
          )}
          <div
            style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}
          >
            <button
              className="btn-outline"
              onClick={schliesseModal}
              disabled={isModalBusy}
            >
              Abbrechen
            </button>
            <button
              className="btn-outline"
              style={{ color: "#c8102e", borderColor: "#c8102e" }}
              onClick={handleModalSubmit}
              disabled={isModalBusy}
            >
              {isModalBusy ? "Löscht …" : "Löschen"}
            </button>
          </div>
        </ModalOverlay>
      )}

      {modal?.type === "dateienVerschieben" && (
        <ModalOverlay onClose={schliesseModal}>
          <h3 style={{ marginTop: 0 }}>
            {modal.ids.length === 1
              ? "Datei verschieben"
              : `${modal.ids.length} Dateien verschieben`}
          </h3>
          <p style={{ fontSize: "13px", color: "var(--muted)" }}>
            Zielordner auswählen:
          </p>
          {modalError && (
            <p
              style={{
                fontSize: "13px",
                color: "#c8102e",
                marginBottom: "12px",
              }}
            >
              {modalError}
            </p>
          )}
          <div style={{ marginBottom: "8px" }}>
            <button
              className="btn-outline"
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                marginBottom: "6px",
              }}
              onClick={() => verschiebeAusgewaehlteDateien(null)}
              disabled={isModalBusy}
            >
              📁 Meine Dateien (Hauptordner)
            </button>
            {renderOrdnerBaumOptionen(null, 1)}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              className="btn-outline"
              onClick={schliesseModal}
              disabled={isModalBusy}
            >
              Abbrechen
            </button>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

export default Dateien


