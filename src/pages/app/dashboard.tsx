import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { listTermine, type Termin } from "../../api/termine";
import { listEinladungen } from "../../api/accounts";
import { listBeitraege, type Beitrag } from "../../api/forum";
import { hasRole, type LoggedInUser } from "../../api/auth";
import { findNextOccurrence } from "../../utils/terminRecurrence";

function formatOccurrence(date: Date, termin: Termin) {
  const dateLabel = date.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
  const time = new Date(termin.start).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { dateLabel, time };
}

/** Turns an ISO timestamp into a relative label ("vor 2 Stunden", "gestern"
 *  etc.), as shown in the forum feed on the dashboard. */
function relativeZeit(iso: string): string {
  const diffMinuten = Math.floor(
    (Date.now() - new Date(iso).getTime()) / 60000,
  );
  if (diffMinuten < 1) return "gerade eben";
  if (diffMinuten < 60)
    return `vor ${diffMinuten} Minute${diffMinuten === 1 ? "" : "n"}`;
  const diffStunden = Math.floor(diffMinuten / 60);
  if (diffStunden < 24)
    return `vor ${diffStunden} Stunde${diffStunden === 1 ? "" : "n"}`;
  const diffTage = Math.floor(diffStunden / 24);
  if (diffTage === 1) return "gestern";
  if (diffTage < 7) return `vor ${diffTage} Tagen`;
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function initialenVon(name: string): string {
  const teile = name.trim().split(/\s+/);
  const initialen = teile
    .slice(0, 2)
    .map((teil) => teil[0]?.toUpperCase() ?? "")
    .join("");
  return initialen || "?";
}

/**
 * Dashboard: landing page of the member area. The two Termin-cards
 * (training/match) are wired up to the real /api/termine/ data via
 * findNextOccurrence(), which accounts for recurring events.
 *
 * "Offene Einladungen" now uses the real invitations list instead of a
 * hardcoded "2" - and only loads/shows that card for Vorstand/Admin, since
 * the backend endpoint itself is Vorstand-only (a regular member would get
 * a 403 there anyway, and the number isn't meaningful to them).
 *
 * "Neu im Forum" now shows all real Beiträge instead of fake demo entries,
 * with a proper "noch keine Beiträge" empty state. Deliberate
 * simplification: it only lists new Beiträge, not individual Kommentare -
 * there's no cross-thread "recent comments" endpoint yet (listKommentare
 * needs a beitrag id), so a real activity feed across both would need a
 * new backend endpoint.
 *
 * On narrow containers the feed only shows the first 3 entries (kept short
 * via CSS, see .dashboard-forum-feed below) - from 480px container width
 * upward (the same @container breakpoint global.css already uses to turn
 * .grid.two two-column) all Beiträge are shown, and if that's more than
 * fits comfortably, the card itself scrolls (max-height + overflow-y)
 * instead of pushing the whole page down.
 *
 * "Wer ist online" is still demo data for now - real online-status
 * tracking wasn't part of this fix, it's a separate, bigger feature.
 */
function Dashboard() {
  const { currentUser } = useOutletContext<{ currentUser: LoggedInUser }>();
  const isVorstand =
    hasRole(currentUser, "vorstand") || hasRole(currentUser, "admin");

  const [termine, setTermine] = useState<Termin[]>([]);
  const [isLoadingTermine, setIsLoadingTermine] = useState(true);

  const [offeneEinladungen, setOffeneEinladungen] = useState<number | null>(
    null,
  );

  const [beitraege, setBeitraege] = useState<Beitrag[]>([]);
  const [isLoadingBeitraege, setIsLoadingBeitraege] = useState(true);

  useEffect(() => {
    async function loadTermine() {
      try {
        const data = await listTermine();
        setTermine(data);
      } catch {
        // Silently falls back to "Kein Termin geplant" below - the
        // dashboard isn't the place for a loud error, the Termine page
        // itself shows one if needed.
      } finally {
        setIsLoadingTermine(false);
      }
    }

    loadTermine();
  }, []);

  useEffect(() => {
    if (!isVorstand) return;
    async function loadEinladungen() {
      try {
        const data = await listEinladungen();
        setOffeneEinladungen(
          data.filter((e) => !e.verwendet && e.ist_gueltig).length,
        );
      } catch {
        // Card shows "–" instead of a wrong number in that case.
      }
    }

    loadEinladungen();
  }, [isVorstand]);

  useEffect(() => {
    async function loadBeitraege() {
      try {
        const data = await listBeitraege();
        const sortiert = [...data].sort(
          (a, b) =>
            new Date(b.erstellt_am).getTime() -
            new Date(a.erstellt_am).getTime(),
        );
        setBeitraege(sortiert);
      } catch {
        // Just stays empty - shows "Noch keine Beiträge" in that case.
      } finally {
        setIsLoadingBeitraege(false);
      }
    }

    loadBeitraege();
  }, []);

  const nextTraining = findNextOccurrence(termine, "training");
  const nextSpiel = findNextOccurrence(termine, "spielplan");

  return (
    <div>
      <div className="view-header">
        <div>
          <span className="eyebrow">ÜBERSICHT</span>
          <h1>Hallo 👋</h1>
          <p>Das ist gerade los bei VV90.</p>
        </div>
      </div>

      <div
        className={`grid ${isVorstand ? "three" : "two"}`}
        style={{ marginBottom: "16px" }}
      >
        <div className="member-card stat-card">
          <span className="label">Nächstes Training</span>
          {isLoadingTermine ? (
            <span className="sub">Lädt …</span>
          ) : nextTraining ? (
            <>
              <span className="value">
                {
                  formatOccurrence(nextTraining.date, nextTraining.termin)
                    .dateLabel
                }{" "}
                ·{" "}
                {formatOccurrence(nextTraining.date, nextTraining.termin).time}
              </span>
              <span className="sub">
                {nextTraining.termin.ort || nextTraining.termin.titel}
              </span>
            </>
          ) : (
            <span className="sub">Kein Training geplant</span>
          )}
        </div>

        <div className="member-card stat-card">
          <span className="label">Nächstes Spiel</span>
          {isLoadingTermine ? (
            <span className="sub">Lädt …</span>
          ) : nextSpiel ? (
            <>
              <span className="value">
                {formatOccurrence(nextSpiel.date, nextSpiel.termin).dateLabel} ·{" "}
                {formatOccurrence(nextSpiel.date, nextSpiel.termin).time}
              </span>
              <span className="sub">{nextSpiel.termin.titel}</span>
            </>
          ) : (
            <span className="sub">Kein Spiel geplant</span>
          )}
        </div>

        {isVorstand && (
          <div className="member-card stat-card">
            <span className="label">Offene Einladungen</span>
            <span className="value">
              {offeneEinladungen === null ? "–" : offeneEinladungen}
            </span>
            <span className="sub">warten auf Registrierung</span>
          </div>
        )}
      </div>

      <div className="grid two">
        <div className="member-card">
          <div className="section-title-row">
            <h3>Neueste Beiträge</h3>
          </div>
          <style>{`
            .dashboard-forum-feed .feed-item:nth-child(n + 4) {
              display: none;
            }
            @container (min-width: 480px) {
              .dashboard-forum-feed {
                max-height: 340px;
                overflow-y: auto;
              }
              .dashboard-forum-feed .feed-item:nth-child(n + 4) {
                display: flex;
              }
            }
          `}</style>
          {isLoadingBeitraege ? (
            <p className="sub">Lädt …</p>
          ) : beitraege.length === 0 ? (
            <p className="sub">Noch keine Beiträge im Forum.</p>
          ) : (
            <div className="dashboard-forum-feed">
              {beitraege.map((beitrag) => (
                <div className="feed-item" key={beitrag.id}>
                  <div className="feed-avatar">
                    {initialenVon(beitrag.autor)}
                  </div>
                  <div>
                    <div className="feed-text">
                      <b>{beitrag.autor}</b> hat einen neuen Beitrag erstellt: „
                      {beitrag.titel}"
                    </div>
                    <div className="feed-meta">
                      {relativeZeit(beitrag.erstellt_am)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="member-card">
          <div className="section-title-row">
            <h3>Wer ist online</h3>
          </div>
          <div className="member-row">
            <span className="status-dot"></span>
            <span className="m-name">Marie Schulze</span>
            <span className="m-sub">online</span>
          </div>
          <div className="member-row">
            <span className="status-dot"></span>
            <span className="m-name">Tom Krause</span>
            <span className="m-sub">online</span>
          </div>
          <div className="member-row">
            <span className="status-dot offline"></span>
            <span className="m-name">Anna Voigt</span>
            <span className="m-sub">vor 3 Std.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
