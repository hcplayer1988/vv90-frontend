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
  listKommentare,
  updateKommentar,
  type Beitrag,
  type Kommentar,
} from "../../api/forum";
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
 */
function ForumThread() {
  const { id } = useParams<{ id: string }>();
  const beitragId = Number(id);
  const { currentUser } = useOutletContext<OutletContext>();
  const navigate = useNavigate();
  const isModerator =
    hasRole(currentUser, "vorstand") || hasRole(currentUser, "admin");

  const [beitrag, setBeitrag] = useState<Beitrag | null>(null);
  const [kommentare, setKommentare] = useState<Kommentar[]>([]);
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

  async function loadThread() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [beitragData, kommentareData] = await Promise.all([
        getBeitrag(beitragId),
        listKommentare(beitragId),
      ]);
      setBeitrag(beitragData);
      setKommentare(kommentareData);

      const topLevelCount = kommentareData.filter(
        (k) => k.antwort_auf === null,
      ).length;
      setCurrentPage(Math.max(1, Math.ceil(topLevelCount / pageSize)));
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

  function canModify(autor: string) {
    return autor === currentUser.email || isModerator;
  }

  async function handleSubmitComment() {
    if (!newCommentText.trim()) return;
    try {
      const wasTopLevelComment = replyingToId === null;
      const created = await createKommentar({
        beitrag: beitragId,
        antwort_auf: replyingToId,
        text: newCommentText.trim(),
      });
      setKommentare((prev) => [...prev, created]);
      setNewCommentText("");
      setReplyingToId(null);

      // Antworten tauchen direkt unter ihrem Elternkommentar auf - egal auf
      // welcher Seite der steht, kein Seitenwechsel noetig. Ein neuer
      // Hauptkommentar landet dagegen immer ganz hinten, dorthin springen wir.
      if (wasTopLevelComment) {
        const newTopLevelCount = topLevelComments.length + 1;
        setCurrentPage(Math.ceil(newTopLevelCount / pageSize));
      }
    } catch {
      setLoadError("Kommentar konnte nicht gespeichert werden.");
    }
  }

  async function handleVote(kommentarId: number, typ: "like" | "dislike") {
    try {
      const result = await bewerteKommentar(kommentarId, typ);
      setKommentare((prev) =>
        prev.map((k) => (k.id === kommentarId ? { ...k, ...result } : k)),
      );
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
      const updated = await updateKommentar(editingCommentId, editCommentText);
      setKommentare((prev) =>
        prev.map((k) => (k.id === editingCommentId ? updated : k)),
      );
      setEditingCommentId(null);
    } catch {
      setLoadError("Kommentar konnte nicht aktualisiert werden.");
    }
  }

  async function handleConfirmDeleteComment() {
    if (pendingDeleteCommentId === null) return;
    try {
      await deleteKommentar(pendingDeleteCommentId);
      setKommentare((prev) =>
        prev.filter(
          (k) =>
            k.id !== pendingDeleteCommentId &&
            k.antwort_auf !== pendingDeleteCommentId,
        ),
      );
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

  const topLevelComments = kommentare.filter((k) => k.antwort_auf === null);
  const totalPages = Math.max(1, Math.ceil(topLevelComments.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTopLevel = topLevelComments.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

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
          disabled={safePage === 1}
          onClick={() => setCurrentPage(1)}
        >
          « Erste
        </button>
        <button
          className="btn-mini"
          disabled={safePage === 1}
          onClick={() => setCurrentPage((p) => p - 1)}
        >
          ‹ Zurück
        </button>
        <button
          className="btn-mini"
          disabled={safePage === totalPages}
          onClick={() => setCurrentPage((p) => p + 1)}
        >
          Weiter ›
        </button>
        <button
          className="btn-mini"
          disabled={safePage === totalPages}
          onClick={() => setCurrentPage(totalPages)}
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
        {kommentare.length} Kommentar{kommentare.length === 1 ? "" : "e"}
      </h3>

      {topLevelComments.length === 0 && (
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

      {topLevelComments.length > 0 && (
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
                setPageSize(Number(e.target.value) as 10 | 20 | 50);
                setCurrentPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>
          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
            Seite {safePage} von {totalPages} ({topLevelComments.length}{" "}
            Kommentare)
          </span>
        </div>
      )}

      {renderPaginationButtons()}

      {paginatedTopLevel.map((top) => {
        const replies = kommentare.filter((k) => k.antwort_auf === top.id);
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
    </div>
  );
}

export default ForumThread;
