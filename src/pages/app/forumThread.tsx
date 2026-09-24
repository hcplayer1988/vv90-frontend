import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router-dom";
import {
  bewerteKommentar,
  createKommentar,
  deleteBeitrag,
  deleteKommentar,
  getBeitrag,
  listAntworten,
  listKommentare,
  updateKommentar,
  type Beitrag,
  type Kommentar,
} from "../../api/forum";
import {
  erstelleUmfrage,
  loescheUmfrage,
  stimmeAbgeben,
  type Umfrage,
} from "../../api/umfragen";
import { hasRole, type LoggedInUser } from "../../api/auth";
 
type OutletContext = { currentUser: LoggedInUser };
 
function timeAgo(iso: string): string {
  const diffMs = Math.max(0, Date.now() - new Date(iso).getTime());
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  return `vor ${days} Tag${days === 1 ? "" : "en"}`;
}
 
function initials(nameOrEmail: string): string {
  return nameOrEmail.slice(0, 2).toUpperCase();
}
 
/**
 * ForumThread: dedicated full-page view of one Beitrag and its complete
 * discussion - the classic forum layout (original post highlighted at the
 * top, chronological comments with replies below), reached by clicking a
 * card on the Forum overview page instead of expanding it inline.
 *
 * Top-level comments are paginated server-side (see api/forum.ts -
 * listKommentare); replies are always fetched in full via listAntworten,
 * since a thread's total reply volume stays small enough in practice that
 * pagination isn't worth it for them too, and they need to render fully
 * nested under their (possibly paginated) parent regardless of which page
 * that parent is on.
 */
function ForumThread() {
  const { id } = useParams<{ id: string }>();
  const beitragId = Number(id);
  const { currentUser } = useOutletContext<OutletContext>();
  const navigate = useNavigate();
  const isModerator =
    hasRole(currentUser, "vorstand") || hasRole(currentUser, "admin");
 
  const [beitrag, setBeitrag] = useState<Beitrag | null>(null);
  const [topLevelComments, setTopLevelComments] = useState<Kommentar[]>([]);
  const [totalTopLevelCount, setTotalTopLevelCount] = useState(0);
  const [antworten, setAntworten] = useState<Kommentar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
 
  const [newCommentText, setNewCommentText] = useState("");
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [pendingDeleteCommentId, setPendingDeleteCommentId] = useState<
    number | null
  >(null);
  const [pendingDeletePost, setPendingDeletePost] = useState(false);
 
  const [showUmfrageForm, setShowUmfrageForm] = useState(false);
  const [umfrageFrage, setUmfrageFrage] = useState("");
  const [umfrageMehrfachauswahl, setUmfrageMehrfachauswahl] = useState(false);
  const [umfrageOptionen, setUmfrageOptionen] = useState<string[]>(["", ""]);
  const [pendingDeleteUmfrage, setPendingDeleteUmfrage] = useState(false);
 
  const [pageSize, setPageSize] = useState<10 | 20 | 50>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [collapsedReplyIds, setCollapsedReplyIds] = useState<Set<number>>(
    new Set(),
  );
 
  function toggleReplies(topLevelId: number) {
    setCollapsedReplyIds((prev) => {
      const next = new Set(prev);
      if (next.has(topLevelId)) next.delete(topLevelId);
      else next.add(topLevelId);
      return next;
    });
  }
 
  /** Fetches one page of top-level comments and stores it, without
   *  touching the post or the replies. Used for page navigation and after
   *  edits/deletes that only affect the currently viewed page. */
  async function loadTopLevelPage(page: number, size: number = pageSize) {
    const data = await listKommentare(beitragId, { page, page_size: size });
    setTopLevelComments(data.results);
    setTotalTopLevelCount(data.count);
    setCurrentPage(page);
  }
 
  /** Reloads both the current top-level page and all replies - used after
   *  a vote/edit/delete, since either array might be affected and it's not
   *  worth tracking precisely which one for a low-traffic club forum. */
  async function refreshComments() {
    const [antwortenData, topLevelData] = await Promise.all([
      listAntworten(beitragId),
      listKommentare(beitragId, { page: currentPage, page_size: pageSize }),
    ]);
    setAntworten(antwortenData);
    setTopLevelComments(topLevelData.results);
    setTotalTopLevelCount(topLevelData.count);
  }
 
  async function loadThread() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [beitragData, antwortenData, ersteSeite] = await Promise.all([
        getBeitrag(beitragId),
        listAntworten(beitragId),
        listKommentare(beitragId, { page: 1, page_size: pageSize }),
      ]);
      setBeitrag(beitragData);
      setAntworten(antwortenData);
 
      // Jump straight to the last page, like before - the newest top-level
      // comments are what you want to see first when opening a thread.
      const letzteSeite = Math.max(1, Math.ceil(ersteSeite.count / pageSize));
      if (letzteSeite === 1) {
        setTopLevelComments(ersteSeite.results);
        setTotalTopLevelCount(ersteSeite.count);
        setCurrentPage(1);
      } else {
        const zielSeite = await listKommentare(beitragId, {
          page: letzteSeite,
          page_size: pageSize,
        });
        setTopLevelComments(zielSeite.results);
        setTotalTopLevelCount(zielSeite.count);
        setCurrentPage(letzteSeite);
      }
    } catch {
      setLoadError("Thread konnte nicht geladen werden.");
    } finally {
      setIsLoading(false);
    }
  }
 
  useEffect(() => {
    // loadThread only closes over beitragId, which is already listed below -
    // it's safe to omit it from the dependency array (it would just be
    // redefined every render anyway, adding no real reactivity of its own).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beitragId]);
 
  // If a delete pushes currentPage past the new last page, step back
  // rather than showing an empty page or hitting the backend's
  // page-out-of-range check.
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(totalTopLevelCount / pageSize));
    if (currentPage > totalPages) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadTopLevelPage(totalPages).catch(() => {
        setLoadError("Kommentare konnten nicht geladen werden.");
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalTopLevelCount, pageSize]);
 
  function canModify(autor: string) {
    return autor === currentUser.email || isModerator;
  }
 
  async function handleSubmitComment() {
    if (!newCommentText.trim()) return;
    try {
      const wasTopLevelComment = replyingToId === null;
      await createKommentar({
        beitrag: beitragId,
        antwort_auf: replyingToId,
        text: newCommentText.trim(),
      });
      setNewCommentText("");
      setReplyingToId(null);
 
      if (wasTopLevelComment) {
        // A new top-level comment always lands on the last page - jump
        // there, same as the old client-side behavior.
        const letzteSeite = Math.max(
          1,
          Math.ceil((totalTopLevelCount + 1) / pageSize),
        );
        await loadTopLevelPage(letzteSeite);
        const antwortenData = await listAntworten(beitragId);
        setAntworten(antwortenData);
      } else {
        // A reply shows up directly under its parent comment, wherever
        // that parent's page happens to be - no page change needed.
        await refreshComments();
      }
    } catch {
      setLoadError("Kommentar konnte nicht gespeichert werden.");
    }
  }
 
  async function handleVote(kommentarId: number, typ: "like" | "dislike") {
    try {
      await bewerteKommentar(kommentarId, typ);
      await refreshComments();
    } catch {
      setLoadError("Bewertung konnte nicht gespeichert werden.");
    }
  }
 
  function startEditComment(kommentar: Kommentar) {
    setEditingCommentId(kommentar.id);
    setEditCommentText(kommentar.text);
  }
 
  async function handleSaveCommentEdit() {
    if (editingCommentId === null) return;
    try {
      await updateKommentar(editingCommentId, editCommentText);
      setEditingCommentId(null);
      await refreshComments();
    } catch {
      setLoadError("Kommentar konnte nicht aktualisiert werden.");
    }
  }
 
  async function handleConfirmDeleteComment() {
    if (pendingDeleteCommentId === null) return;
    try {
      await deleteKommentar(pendingDeleteCommentId);
      await refreshComments();
    } catch {
      setLoadError("Kommentar konnte nicht gelöscht werden.");
    } finally {
      setPendingDeleteCommentId(null);
    }
  }
 
  async function handleConfirmDeletePost() {
    try {
      await deleteBeitrag(beitragId);
      navigate("/app/forum");
    } catch {
      setLoadError("Beitrag konnte nicht gelöscht werden.");
      setPendingDeletePost(false);
    }
  }
 
  function updateUmfrageOption(index: number, value: string) {
    setUmfrageOptionen((prev) => prev.map((o, i) => (i === index ? value : o)));
  }
 
  function addUmfrageOption() {
    setUmfrageOptionen((prev) => [...prev, ""]);
  }
 
  function removeUmfrageOption(index: number) {
    setUmfrageOptionen((prev) => prev.filter((_, i) => i !== index));
  }
 
  async function handleCreateUmfrage() {
    const optionen = umfrageOptionen.map((o) => o.trim()).filter(Boolean);
    if (!umfrageFrage.trim() || optionen.length < 2) {
      setLoadError("Eine Umfrage braucht eine Frage und mindestens 2 Optionen.");
      return;
    }
    try {
      const neueUmfrage = await erstelleUmfrage({
        frage: umfrageFrage.trim(),
        mehrfachauswahl: umfrageMehrfachauswahl,
        kontext: "forum",
        beitrag: beitragId,
        optionen: optionen.map((text) => ({ text })),
      });
      setBeitrag((prev) => (prev ? { ...prev, umfrage: neueUmfrage } : prev));
      setShowUmfrageForm(false);
      setUmfrageFrage("");
      setUmfrageMehrfachauswahl(false);
      setUmfrageOptionen(["", ""]);
    } catch {
      setLoadError("Umfrage konnte nicht erstellt werden.");
    }
  }
 
  /** Sendet die neue Gesamtauswahl an /abstimmen/ statt nur die geklickte
   *  Option - siehe die Doku am Backend-Endpoint (UmfrageViewSet.abstimmen)
   *  fuer die Begruendung. Bei einer Einzelauswahl-Umfrage ersetzt ein Klick
   *  die bisherige Auswahl komplett, bei Mehrfachauswahl schaltet er nur die
   *  geklickte Option dazu/weg. */
  async function handleVoteUmfrage(umfrage: Umfrage, optionId: number) {
    const bereitsGewaehlt = umfrage.optionen.find(
      (o) => o.id === optionId,
    )?.meine_stimme;
    let neueAuswahl: number[];
    if (umfrage.mehrfachauswahl) {
      const aktuelle = umfrage.optionen
        .filter((o) => o.meine_stimme)
        .map((o) => o.id);
      neueAuswahl = bereitsGewaehlt
        ? aktuelle.filter((id) => id !== optionId)
        : [...aktuelle, optionId];
    } else {
      neueAuswahl = bereitsGewaehlt ? [] : [optionId];
    }
    try {
      const aktualisiert = await stimmeAbgeben(umfrage.id, neueAuswahl);
      setBeitrag((prev) => (prev ? { ...prev, umfrage: aktualisiert } : prev));
    } catch {
      setLoadError("Stimme konnte nicht gespeichert werden.");
    }
  }
 
  async function handleConfirmDeleteUmfrage() {
    if (!beitrag?.umfrage) return;
    try {
      await loescheUmfrage(beitrag.umfrage.id);
      setBeitrag((prev) => (prev ? { ...prev, umfrage: null } : prev));
    } catch {
      setLoadError("Umfrage konnte nicht gelöscht werden.");
    } finally {
      setPendingDeleteUmfrage(false);
    }
  }
 
  function renderComment(kommentar: Kommentar, isReply: boolean) {
    const isEditing = editingCommentId === kommentar.id;
    return (
      <div
        className="member-card"
        style={{ marginLeft: isReply ? "32px" : "0", marginBottom: "10px" }}
        key={kommentar.id}
      >
        <div className="post-head">
          <div className="feed-avatar">{initials(kommentar.autor)}</div>
          <span className="name">{kommentar.autor}</span>
          <span className="time">· {timeAgo(kommentar.erstellt_am)}</span>
        </div>
 
        {isEditing ? (
          <div style={{ marginTop: "8px" }}>
            <input
              type="text"
              value={editCommentText}
              onChange={(e) => setEditCommentText(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1.5px solid #ddd",
              }}
            />
            <div className="row-actions" style={{ marginTop: "8px" }}>
              <button onClick={handleSaveCommentEdit}>Speichern</button>
              <button onClick={() => setEditingCommentId(null)}>
                Abbrechen
              </button>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: "14px", margin: "8px 0" }}>{kommentar.text}</p>
        )}
 
        <div className="post-footer">
          <button
            className="btn-mini"
            style={{
              color:
                kommentar.meine_bewertung === "like" ? "#c8102e" : undefined,
            }}
            onClick={() => handleVote(kommentar.id, "like")}
          >
            👍 {kommentar.likes}
          </button>
          <button
            className="btn-mini"
            style={{
              color:
                kommentar.meine_bewertung === "dislike" ? "#c8102e" : undefined,
            }}
            onClick={() => handleVote(kommentar.id, "dislike")}
          >
            👎 {kommentar.dislikes}
          </button>
          {!isReply && (
            <button
              className="btn-mini"
              onClick={() => setReplyingToId(kommentar.id)}
            >
              Antworten
            </button>
          )}
          {canModify(kommentar.autor) && !isEditing && (
            <>
              <button
                className="btn-mini"
                onClick={() => startEditComment(kommentar)}
              >
                Bearbeiten
              </button>
              <button
                className="btn-mini"
                onClick={() => setPendingDeleteCommentId(kommentar.id)}
              >
                Löschen
              </button>
            </>
          )}
        </div>
      </div>
    );
  }
 
  if (isLoading) return <p>Thread wird geladen …</p>;
  if (loadError || !beitrag)
    return (
      <p style={{ color: "#c8102e" }}>
        {loadError ?? "Beitrag nicht gefunden."}
      </p>
    );
 
  const totalPages = Math.max(1, Math.ceil(totalTopLevelCount / pageSize));
  const kommentareGesamt = totalTopLevelCount + antworten.length;
  const istThemenersteller = beitrag.autor === currentUser.email;
  const umfrage = beitrag.umfrage;
 
  function renderPaginationButtons() {
    if (totalPages <= 1) return null;
    return (
      <div
        style={{
          display: "flex",
          gap: "8px",
          justifyContent: "center",
          margin: "14px 0",
        }}
      >
        <button
          className="btn-mini"
          disabled={currentPage === 1}
          onClick={() => loadTopLevelPage(1)}
        >
          « Erste
        </button>
        <button
          className="btn-mini"
          disabled={currentPage === 1}
          onClick={() => loadTopLevelPage(currentPage - 1)}
        >
          ‹ Zurück
        </button>
        <button
          className="btn-mini"
          disabled={currentPage === totalPages}
          onClick={() => loadTopLevelPage(currentPage + 1)}
        >
          Weiter ›
        </button>
        <button
          className="btn-mini"
          disabled={currentPage === totalPages}
          onClick={() => loadTopLevelPage(totalPages)}
        >
          Letzte »
        </button>
      </div>
    );
  }
 
  return (
    <div>
      <Link
        to="/app/forum"
        style={{
          fontSize: "13px",
          color: "var(--muted)",
          display: "inline-block",
          marginBottom: "14px",
        }}
      >
        ← Zurück zur Übersicht
      </Link>
 
      {/* ===== Ursprungsbeitrag ===== */}
      <div className="member-card" style={{ marginBottom: "20px" }}>
        {beitrag.kategorie && (
          <span className="post-cat">{beitrag.kategorie}</span>
        )}
        <div className="post-head" style={{ marginTop: "8px" }}>
          <div className="feed-avatar">{initials(beitrag.autor)}</div>
          <span className="name">{beitrag.autor}</span>
          <span
            className="role-badge"
            style={{
              marginLeft: "4px",
              position: "static",
              display: "inline-block",
            }}
          >
            Themenstarter
          </span>
          <span className="time">· {timeAgo(beitrag.erstellt_am)}</span>
        </div>
        <h1
          style={{
            fontSize: "22px",
            textTransform: "none",
            letterSpacing: 0,
            fontFamily: "'Work Sans', sans-serif",
            margin: "10px 0",
          }}
        >
          {beitrag.titel}
        </h1>
        <p style={{ fontSize: "15px", lineHeight: 1.6 }}>{beitrag.text}</p>
 
        {canModify(beitrag.autor) && (
          <div className="row-actions">
            <button
              className="danger"
              onClick={() => setPendingDeletePost(true)}
            >
              Beitrag löschen
            </button>
          </div>
        )}
      </div>
 
      {/* ===== Umfrage ===== */}
      {umfrage ? (
        <div className="member-card" style={{ marginBottom: "20px" }}>
          <div className="section-title-row">
            <h3>{umfrage.frage}</h3>
          </div>
          {umfrage.mehrfachauswahl && (
            <p
              style={{
                fontSize: "12px",
                color: "var(--muted)",
                marginTop: "-6px",
                marginBottom: "10px",
              }}
            >
              Mehrfachauswahl möglich
            </p>
          )}
          {umfrage.optionen.map((option) => {
            const gesamtStimmen = umfrage.optionen.reduce(
              (summe, o) => summe + o.anzahl_stimmen,
              0,
            );
            const prozent =
              gesamtStimmen > 0
                ? Math.round((option.anzahl_stimmen / gesamtStimmen) * 100)
                : 0;
            return (
              <button
                key={option.id}
                onClick={() => handleVoteUmfrage(umfrage, option.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  border: option.meine_stimme
                    ? "1.5px solid var(--crest-red)"
                    : "1.5px solid #ddd",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  marginBottom: "8px",
                  background: option.meine_stimme
                    ? "rgba(200,16,46,0.06)"
                    : "#fff",
                  cursor: "pointer",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: `${prozent}%`,
                    background: "rgba(200,16,46,0.08)",
                    zIndex: 0,
                  }}
                />
                <div
                  style={{
                    position: "relative",
                    zIndex: 1,
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "13px",
                  }}
                >
                  <span>
                    {option.meine_stimme ? "✓ " : ""}
                    {option.text}
                  </span>
                  <span style={{ color: "var(--muted)" }}>
                    {option.anzahl_stimmen} ({prozent}%)
                  </span>
                </div>
                {option.waehler.length > 0 && (
                  <div
                    style={{
                      position: "relative",
                      zIndex: 1,
                      fontSize: "11px",
                      color: "var(--muted)",
                      marginTop: "4px",
                    }}
                  >
                    {option.waehler.map((w) => w.name).join(", ")}
                  </div>
                )}
              </button>
            );
          })}
          <p style={{ fontSize: "11px", color: "var(--muted)", marginTop: "6px" }}>
            Erstellt von {umfrage.ersteller}
          </p>
          {(istThemenersteller || isModerator) && (
            <div className="row-actions">
              <button
                className="danger"
                onClick={() => setPendingDeleteUmfrage(true)}
              >
                Umfrage löschen
              </button>
            </div>
          )}
        </div>
      ) : istThemenersteller ? (
        showUmfrageForm ? (
          <div className="member-card" style={{ marginBottom: "20px" }}>
            <div className="field-row">
              <label>Frage</label>
              <input
                type="text"
                value={umfrageFrage}
                onChange={(e) => setUmfrageFrage(e.target.value)}
              />
            </div>
            {umfrageOptionen.map((option, index) => (
              <div className="field-row" key={index}>
                <label>Option {index + 1}</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => updateUmfrageOption(index, e.target.value)}
                    style={{ flex: 1 }}
                  />
                  {umfrageOptionen.length > 2 && (
                    <button
                      className="btn-mini"
                      onClick={() => removeUmfrageOption(index)}
                    >
                      Entfernen
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button
              className="btn-mini"
              onClick={addUmfrageOption}
              style={{ marginBottom: "12px" }}
            >
              + Option hinzufügen
            </button>
            <div className="checkbox-row">
              <input
                type="checkbox"
                id="umfrage-mehrfachauswahl"
                checked={umfrageMehrfachauswahl}
                onChange={(e) => setUmfrageMehrfachauswahl(e.target.checked)}
              />
              <label htmlFor="umfrage-mehrfachauswahl">
                Mehrfachauswahl erlauben
              </label>
            </div>
            <div className="row-actions">
              <button className="btn-primary" onClick={handleCreateUmfrage}>
                Umfrage erstellen
              </button>
              <button onClick={() => setShowUmfrageForm(false)}>
                Abbrechen
              </button>
            </div>
          </div>
        ) : (
          <button
            className="btn-outline"
            style={{ marginBottom: "20px" }}
            onClick={() => setShowUmfrageForm(true)}
          >
            + Umfrage zu diesem Thread hinzufügen
          </button>
        )
      ) : null}
 
      {/* ===== Kommentare ===== */}
      <h3
        style={{
          fontSize: "14px",
          textTransform: "none",
          letterSpacing: 0,
          fontFamily: "'Work Sans', sans-serif",
          marginBottom: "12px",
        }}
      >
        {kommentareGesamt} Kommentar{kommentareGesamt === 1 ? "" : "e"}
      </h3>
 
      {kommentareGesamt === 0 && (
        <p
          style={{
            fontSize: "13px",
            color: "var(--muted)",
            marginBottom: "16px",
          }}
        >
          Noch keine Kommentare – schreib den ersten.
        </p>
      )}
 
      {totalTopLevelCount > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
            marginBottom: "14px",
          }}
        >
          <label
            style={{
              fontSize: "12px",
              color: "var(--muted)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            Pro Seite:
            <select
              value={pageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value) as 10 | 20 | 50;
                setPageSize(newSize);
                loadTopLevelPage(1, newSize);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>
          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
            Seite {currentPage} von {totalPages} ({totalTopLevelCount}{" "}
            Kommentare)
          </span>
        </div>
      )}
 
      {renderPaginationButtons()}
 
      {topLevelComments.map((top) => {
        const replies = antworten.filter((k) => k.antwort_auf === top.id);
        const repliesCollapsed = collapsedReplyIds.has(top.id);
        return (
          <div key={top.id}>
            {renderComment(top, false)}
            {replies.length > 0 && (
              <button
                className="btn-mini"
                style={{ marginLeft: "12px", marginBottom: "10px" }}
                onClick={() => toggleReplies(top.id)}
              >
                {repliesCollapsed
                  ? `▸ ${replies.length} Antwort${replies.length === 1 ? "" : "en"} anzeigen`
                  : `▾ ${replies.length} Antwort${replies.length === 1 ? "" : "en"} verstecken`}
              </button>
            )}
            {!repliesCollapsed &&
              replies.map((reply) => renderComment(reply, true))}
          </div>
        );
      })}
 
      {renderPaginationButtons()}
 
      {/* ===== Neuer Kommentar / Antwort ===== */}
      <div className="member-card" style={{ marginTop: "16px" }}>
        {replyingToId && (
          <p
            style={{
              fontSize: "12px",
              color: "var(--muted)",
              marginBottom: "8px",
            }}
          >
            Antwortest auf Kommentar #{replyingToId}{" "}
            <button className="btn-mini" onClick={() => setReplyingToId(null)}>
              Abbrechen
            </button>
          </p>
        )}
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            placeholder="Kommentar schreiben …"
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            style={{
              flex: 1,
              padding: "11px 13px",
              borderRadius: "8px",
              border: "1.5px solid #ddd",
            }}
          />
          <button className="btn-primary" onClick={handleSubmitComment}>
            Senden
          </button>
        </div>
      </div>
 
      {/* ===== Kommentar löschen ===== */}
      <div
        className={`modal-overlay ${pendingDeleteCommentId !== null ? "open" : ""}`}
      >
        <div className="modal-box">
          <h3>Kommentar löschen?</h3>
          <p>Das kann nicht rückgängig gemacht werden.</p>
          <div className="modal-actions">
            <button
              className="cancel"
              onClick={() => setPendingDeleteCommentId(null)}
            >
              Abbrechen
            </button>
            <button className="confirm" onClick={handleConfirmDeleteComment}>
              Löschen
            </button>
          </div>
        </div>
      </div>
 
      {/* ===== Beitrag löschen ===== */}
      <div className={`modal-overlay ${pendingDeletePost ? "open" : ""}`}>
        <div className="modal-box">
          <h3>Beitrag löschen?</h3>
          <p>
            Alle zugehörigen Kommentare werden mitgelöscht. Das kann nicht
            rückgängig gemacht werden.
          </p>
          <div className="modal-actions">
            <button
              className="cancel"
              onClick={() => setPendingDeletePost(false)}
            >
              Abbrechen
            </button>
            <button className="confirm" onClick={handleConfirmDeletePost}>
              Löschen
            </button>
          </div>
        </div>
      </div>
 
      {/* ===== Umfrage löschen ===== */}
      <div className={`modal-overlay ${pendingDeleteUmfrage ? "open" : ""}`}>
        <div className="modal-box">
          <h3>Umfrage löschen?</h3>
          <p>
            Alle Stimmen gehen dabei verloren. Das kann nicht rückgängig
            gemacht werden.
          </p>
          <div className="modal-actions">
            <button
              className="cancel"
              onClick={() => setPendingDeleteUmfrage(false)}
            >
              Abbrechen
            </button>
            <button className="confirm" onClick={handleConfirmDeleteUmfrage}>
              Löschen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
 
export default ForumThread;
 

