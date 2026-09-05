/**
 * Verein: short about text plus a placeholder card for the club statutes
 * download. Static content - the actual PDF link/download will be wired up
 * once the document is ready.
 */
function Verein() {
  return (
    <>
      <div className="page-header">
        <div className="page-header-inner">
          <span className="eyebrow">DER VEREIN</span>
          <h1>Wer wir sind</h1>
        </div>
      </div>
 
      <section>
        <div className="section-inner">
          <div className="verein-grid">
            <div>
              <p>
                VV90 ist aus einer kleinen Gruppe Hobbyspieler entstanden, die sich einmal
                die Woche zum Aufschlagen trafen — mittlerweile sind wir ein fester Verein
                mit mehreren Trainingsgruppen für unterschiedliche Level und Altersklassen.
              </p>
              <p>
                Uns wichtig ist: Volleyball soll Spaß machen, unabhängig davon, ob du zum
                ersten Mal einen Ball berührst oder schon jahrelang spielst. Der Vorstand
                organisiert Trainings, Turnierteilnahmen und das Vereinsleben ehrenamtlich.
              </p>
            </div>
 
            <div className="satzung-card">
              <h3>Satzung</h3>
              <p>Die vollständige Vereinssatzung als PDF zum Nachlesen.</p>
              <a href="#" className="btn-primary" style={{ width: '100%' }}>
                Satzung herunterladen
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
 
export default Verein
 


