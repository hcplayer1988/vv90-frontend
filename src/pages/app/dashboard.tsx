/**
 * Dashboard: landing page of the member area. Currently static demo
 * content matching the design mockup - wiring this up to the termine/
 * forum APIs (next training, next match, recent forum activity) comes
 * once the Termine and Forum pages themselves are built and connected.
 */
function Dashboard() {
  return (
    <div>
      <div className="view-header">
        <div>
          <span className="eyebrow">ÜBERSICHT</span>
          <h1>Hallo 👋</h1>
          <p>Das ist gerade los bei VV90.</p>
        </div>
      </div>
 
      <div className="grid three" style={{ marginBottom: '16px' }}>
        <div className="member-card stat-card">
          <span className="label">Nächstes Training</span>
          <span className="value">Mo · 17:30</span>
          <span className="sub">Jahnsporthalle, Steinstraße</span>
        </div>
        <div className="member-card stat-card">
          <span className="label">Nächstes Spiel</span>
          <span className="value">06.10. · 19:00</span>
          <span className="sub">Heim gegen JTVG-Fitness Coblenz</span>
        </div>
        <div className="member-card stat-card">
          <span className="label">Offene Einladungen</span>
          <span className="value">2</span>
          <span className="sub">warten auf Registrierung</span>
        </div>
      </div>
 
      <div className="grid two">
        <div className="member-card">
          <div className="section-title-row">
            <h3>Neu im Forum</h3>
          </div>
          <div className="feed-item">
            <div className="feed-avatar">MS</div>
            <div>
              <div className="feed-text">
                <b>Marie S.</b> hat auf „Vollexballnacht" geantwortet
              </div>
              <div className="feed-meta">vor 2 Stunden</div>
            </div>
          </div>
          <div className="feed-item">
            <div className="feed-avatar">TK</div>
            <div>
              <div className="feed-text">
                <b>Tom K.</b> hat einen neuen Beitrag erstellt: „Trikots bestellen?"
              </div>
              <div className="feed-meta">gestern</div>
            </div>
          </div>
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
  )
}
 
export default Dashboard
  



