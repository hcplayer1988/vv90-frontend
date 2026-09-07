import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { AxiosError } from "axios";
import {
  createBeitrag,
  deleteBeitrag,
  listBeitraege,
  updateBeitrag,
  type Beitrag,
} from "../../api/forum";
import { hasRole, type LoggedInUser } from "../../api/auth";

type OutletContext = { currentUser: LoggedInUser };
type SortOption = "neueste" | "aelteste" | "meistdiskutiert";

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
 * Forum: overview list of Beiträge with search/filter/sort. Clicking a card
 * navigates to the dedicated thread page (/app/forum/:id) instead of
 * expanding comments inline - a real forum-style layout, not an accordion.
 */
function Forum() {
  const { currentUser } = useOutletContext<OutletContext>();
  const navigate = useNavigate();
  const isModerator =
    hasRole(currentUser, "vorstand") || hasRole(currentUser, "admin");

  const [beitraege, setBeitraege] = useState<Beitrag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("neueste");
  const [categoryFilter, setCategoryFilter] = useState<
    "alle" | "meine" | string
  >("alle");

  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [postForm, setPostForm] = useState({
    titel: "",
    text: "",
    kategorie: "",
  });
  const [postFormError, setPostFormError] = useState<string | null>(null);
  const [pendingDeletePostId, setPendingDeletePostId] = useState<number | null>(
    null,
  );

  const [pageSize, setPageSize] = useState<10 | 20 | 50>(10);
  const [currentPage, setCurrentPage] = useState(1);

  async function loadBeitraege() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await listBeitraege();
      setBeitraege(data);
    } catch {
      setLoadError("Beiträge konnten nicht geladen werden.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBeitraege();
  }, []);

  const categories = Array.from(
    new Set(beitraege.map((b) => b.kategorie).filter(Boolean)),
  );

  const visibleBeitraege = beitraege
    .filter((b) => {
      if (categoryFilter === "meine") return b.autor === currentUser.email;
      if (categoryFilter !== "alle") return b.kategorie === categoryFilter;
      return true;
    })
    .filter((b) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        b.titel.toLowerCase().includes(q) || b.text.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === "meistdiskutiert")
        return b.anzahl_kommentare - a.anzahl_kommentare;
      const diff =
        new Date(a.erstellt_am).getTime() - new Date(b.erstellt_am).getTime();
      return sortBy === "aelteste" ? diff : -diff;
    });

  const totalPages = Math.max(1, Math.ceil(visibleBeitraege.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedBeitraege = visibleBeitraege.slice(
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
          alignItems: "center",
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
        <span style={{ fontSize: "12px", color: "var(--muted)" }}>
          Seite {safePage} von {totalPages}
        </span>
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

  function openCreatePostModal() {
    setEditingPostId(null);
    setPostForm({ titel: "", text: "", kategorie: "" });
    setPostFormError(null);
    setIsPostModalOpen(true);
  }

  function openEditPostModal(beitrag: Beitrag, event: React.MouseEvent) {
    event.stopPropagation(); // don't also trigger navigation to the thread
    setEditingPostId(beitrag.id);
    setPostForm({
      titel: beitrag.titel,
      text: beitrag.text,
      kategorie: beitrag.kategorie,
    });
    setPostFormError(null);
    setIsPostModalOpen(true);
  }

  function extractFirstError(err: unknown, fallback: string): string {
    if (err instanceof AxiosError && err.response?.data) {
      const firstError = Object.values(err.response.data)[0];
      return Array.isArray(firstError) ? firstError[0] : String(firstError);
    }
    return fallback;
  }

  async function handleSavePost() {
    setPostFormError(null);
    try {
      if (editingPostId) {
        const updated = await updateBeitrag(editingPostId, postForm);
        setBeitraege((prev) =>
          prev.map((b) => (b.id === editingPostId ? updated : b)),
        );
      } else {
        const created = await createBeitrag(postForm);
        setBeitraege((prev) => [created, ...prev]);
      }
      setIsPostModalOpen(false);
    } catch (err) {
      setPostFormError(
        extractFirstError(err, "Beitrag konnte nicht gespeichert werden."),
      );
    }
  }

  async function handleConfirmDeletePost() {
    if (pendingDeletePostId === null) return;
    try {
      await deleteBeitrag(pendingDeletePostId);
      setBeitraege((prev) => prev.filter((b) => b.id !== pendingDeletePostId));
    } catch {
      setLoadError("Beitrag konnte nicht gelöscht werden.");
    } finally {
      setPendingDeletePostId(null);
    }
  }

  function canModify(autor: string) {
    return autor === currentUser.email || isModerator;
  }

  return (
    <div>
      <div className="view-header">
        <div>
          <span className="eyebrow">FORUM</span>
          <h1>Diskussionen</h1>
          <p>Fragen, Absprachen und alles rund um den Verein.</p>
        </div>
      </div>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Beiträge durchsuchen …"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />
        <select
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value as SortOption);
            setCurrentPage(1);
          }}
        >
          <option value="neueste">Neueste zuerst</option>
          <option value="aelteste">Älteste zuerst</option>
          <option value="meistdiskutiert">Meistdiskutiert</option>
        </select>
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value) as 10 | 20 | 50);
            setCurrentPage(1);
          }}
        >
          <option value={10}>10 pro Seite</option>
          <option value={20}>20 pro Seite</option>
          <option value={50}>50 pro Seite</option>
        </select>
      </div>

      <div className="filter-chips">
        <button
          className={categoryFilter === "alle" ? "active" : ""}
          onClick={() => {
            setCategoryFilter("alle");
            setCurrentPage(1);
          }}
        >
          Alle
        </button>
        <button
          className={categoryFilter === "meine" ? "active" : ""}
          onClick={() => {
            setCategoryFilter("meine");
            setCurrentPage(1);
          }}
        >
          Meine Beiträge
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            className={categoryFilter === cat ? "active" : ""}
            onClick={() => {
              setCategoryFilter(cat);
              setCurrentPage(1);
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <button
        className="btn-primary"
        style={{ marginBottom: "14px" }}
        onClick={openCreatePostModal}
      >
        + Neuer Beitrag
      </button>

      {isLoading && <p>Beiträge werden geladen …</p>}
      {loadError && <p style={{ color: "#c8102e" }}>{loadError}</p>}

      {!isLoading && visibleBeitraege.length === 0 && (
        <div className="empty-state">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <div className="title">
            {categoryFilter === "meine"
              ? "Du hast noch keine Beiträge erstellt"
              : "Noch keine Beiträge"}
          </div>
          <div className="sub">
            Starte die erste Diskussion über "+ Neuer Beitrag".
          </div>
        </div>
      )}

      {renderPaginationButtons()}

      <div className="grid">
        {paginatedBeitraege.map((beitrag) => (
          <div
            className="member-card post-card"
            key={beitrag.id}
            style={{ cursor: "pointer" }}
            onClick={() => navigate(`/app/forum/${beitrag.id}`)}
          >
            {beitrag.kategorie && (
              <span className="post-cat">{beitrag.kategorie}</span>
            )}
            <div className="post-head">
              <div
                className="feed-avatar"
                style={{ width: "26px", height: "26px", fontSize: "10px" }}
              >
                {initials(beitrag.autor)}
              </div>
              <span className="name">{beitrag.autor}</span>
              <span className="time">· {timeAgo(beitrag.erstellt_am)}</span>
            </div>
            <div className="post-title">{beitrag.titel}</div>
            <p className="post-excerpt">{beitrag.text}</p>
            <div className="post-footer">
              <span>💬 {beitrag.anzahl_kommentare} Kommentare</span>
            </div>

            {canModify(beitrag.autor) && (
              <div className="row-actions">
                <button onClick={(e) => openEditPostModal(beitrag, e)}>
                  Bearbeiten
                </button>
                <button
                  className="danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPendingDeletePostId(beitrag.id);
                  }}
                >
                  Löschen
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {renderPaginationButtons()}

      {/* ===== Beitrag Anlegen/Bearbeiten-Modal ===== */}
      <div className={`modal-overlay ${isPostModalOpen ? "open" : ""}`}>
        <div className="modal-box wide">
          <h3>
            {editingPostId ? "Beitrag bearbeiten" : "Neuen Beitrag erstellen"}
          </h3>

          <div className="field-row">
            <label>Titel</label>
            <input
              type="text"
              value={postForm.titel}
              onChange={(e) =>
                setPostForm({ ...postForm, titel: e.target.value })
              }
            />
          </div>
          <div className="field-row">
            <label>Kategorie (optional)</label>
            <input
              type="text"
              value={postForm.kategorie}
              onChange={(e) =>
                setPostForm({ ...postForm, kategorie: e.target.value })
              }
            />
          </div>
          <div className="field-row">
            <label>Text</label>
            <input
              type="text"
              value={postForm.text}
              onChange={(e) =>
                setPostForm({ ...postForm, text: e.target.value })
              }
            />
          </div>

          {postFormError && (
            <p style={{ color: "#c8102e", fontSize: "13px" }}>
              {postFormError}
            </p>
          )}

          <div className="modal-actions" style={{ marginTop: "8px" }}>
            <button
              className="cancel"
              onClick={() => setIsPostModalOpen(false)}
            >
              Abbrechen
            </button>
            <button className="confirm" onClick={handleSavePost}>
              {editingPostId ? "Änderungen speichern" : "Beitrag speichern"}
            </button>
          </div>
        </div>
      </div>

      {/* ===== Beitrag löschen ===== */}
      <div
        className={`modal-overlay ${pendingDeletePostId !== null ? "open" : ""}`}
      >
        <div className="modal-box">
          <h3>Beitrag löschen?</h3>
          <p>
            Alle zugehörigen Kommentare werden mitgelöscht. Das kann nicht
            rückgängig gemacht werden.
          </p>
          <div className="modal-actions">
            <button
              className="cancel"
              onClick={() => setPendingDeletePostId(null)}
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

export default Forum;
