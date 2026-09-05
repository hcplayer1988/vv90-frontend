/**
 * Trainingszeiten: static schedule table. On mobile each row becomes a
 * stacked card (see global.css), driven by the data-label attributes below;
 * from the desktop breakpoint upward it renders as a normal table.
 */
function Trainingszeiten() {
  return (
    <>
      <div className="page-header">
        <div className="page-header-inner">
          <span className="eyebrow">TRAININGSZEITEN</span>
          <h1>Wann wir aufschlagen</h1>
          <p>
            Feste Termine für alle Trainingsgruppen — Änderungen werden Mitgliedern direkt
            über die Plattform mitgeteilt.
          </p>
        </div>
      </div>
 
      <section>
        <div className="section-inner">
          <table className="schedule-table">
            <thead>
              <tr>
                <th>Tag</th>
                <th>Uhrzeit</th>
                <th>Gruppe</th>
                <th>Ort</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td data-label="Tag">Montag</td>
                <td data-label="Uhrzeit">17:30 – 19:30 (Halle ab 17:15 geöffnet)</td>
                <td data-label="Gruppe">
                  <span className="tag">Training</span>
                </td>
                <td data-label="Ort">Bautzen Jahnsporthalle, Steinstraße</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
 
export default Trainingszeiten
 
