interface Spiel {
  datum: string
  zeit: string
  heim: string
  gast: string
  heimOderAuswaerts: 'Heim' | 'Auswärts'
  ort: string
}
 
/**
 * Static match data for the 26/27 season, filtered down to VV90's own
 * games (scraped manually from meinspielplan.de since the site blocks
 * automated access). Will move to the termine-API once that page is wired
 * up to the backend.
 */
const spiele: Spiel[] = [
  {
    datum: "06.10.2026",
    zeit: "19:00",
    heim: "MSV Bautzen I. Mix",
    gast: "VV90 Bautzen e. V.",
    heimOderAuswaerts: "Auswärts",
    ort: "Bautzen Schützenplatz",
  },
  {
    datum: "06.10.2026",
    zeit: "19:00",
    heim: "VV90 Bautzen e. V.",
    gast: "JTVG-Fitness Coblenz e. V.",
    heimOderAuswaerts: "Heim",
    ort: "Bautzen Jahnsporthalle, Steinstraße",
  },
  {
    datum: "26.10.2026",
    zeit: "19:00",
    heim: "VV90 Bautzen e. V.",
    gast: "MSV Bautzen TT Crew",
    heimOderAuswaerts: "Heim",
    ort: "Bautzen Jahnsporthalle, Steinstraße",
  },
  {
    datum: "26.10.2026",
    zeit: "19:00",
    heim: "VV90 Bautzen e. V.",
    gast: "SV Wilthen",
    heimOderAuswaerts: "Heim",
    ort: "Bautzen Jahnsporthalle, Steinstraße",
  },
  {
    datum: "15.11.2026",
    zeit: "15:00",
    heim: "SV Grün-Weiß Elstra e. V.",
    gast: "VV90 Bautzen e. V.",
    heimOderAuswaerts: "Auswärts",
    ort: "Elstra Talpenberger Str.",
  },
  {
    datum: "15.11.2026",
    zeit: "15:00",
    heim: "JTVG-Fitness Coblenz e. V.",
    gast: "VV90 Bautzen e. V.",
    heimOderAuswaerts: "Auswärts",
    ort: "Elstra Talpenberger Str.",
  },
  {
    datum: "10.12.2026",
    zeit: "19:30",
    heim: "MSV Bautzen II. Mix",
    gast: "VV90 Bautzen e. V.",
    heimOderAuswaerts: "Auswärts",
    ort: "Bautzen Daimlerhalle",
  },
  {
    datum: "10.12.2026",
    zeit: "19:32",
    heim: "VV90 Bautzen e. V.",
    gast: "FSG Bautzen e. V.",
    heimOderAuswaerts: "Heim",
    ort: "Bautzen Jahnsporthalle, Steinstraße",
  },
  {
    datum: "14.01.2027",
    zeit: "19:01",
    heim: "MSV Bautzen TT Crew",
    gast: "VV90 Bautzen e. V.",
    heimOderAuswaerts: "Auswärts",
    ort: "Bautzen Gesundbrunnenhalle",
  },
  {
    datum: "14.01.2027",
    zeit: "19:02",
    heim: "SG Steinigtwolmsdorf",
    gast: "VV90 Bautzen e. V.",
    heimOderAuswaerts: "Auswärts",
    ort: "Bautzen Gesundbrunnenhalle",
  },
  {
    datum: "04.02.2027",
    zeit: "19:00",
    heim: "FSG Bautzen e. V.",
    gast: "VV90 Bautzen e. V.",
    heimOderAuswaerts: "Auswärts",
    ort: "Bautzen, Militzer Grundschule",
  },
  {
    datum: "04.02.2027",
    zeit: "19:02",
    heim: "VV90 Bautzen e. V.",
    gast: "MSV Bautzen Oldies",
    heimOderAuswaerts: "Heim",
    ort: "Bautzen Jahnsporthalle, Steinstraße",
  },
  {
    datum: "22.02.2027",
    zeit: "19:00",
    heim: "VV90 Bautzen e. V.",
    gast: "MSV Bautzen Oldies",
    heimOderAuswaerts: "Heim",
    ort: "Bautzen Jahnsporthalle, Steinstraße",
  },
  {
    datum: "22.02.2027",
    zeit: "19:00",
    heim: "VV90 Bautzen e. V.",
    gast: "SV Grün-Weiß Elstra e. V.",
    heimOderAuswaerts: "Heim",
    ort: "Bautzen Jahnsporthalle, Steinstraße",
  },
  {
    datum: "15.03.2027",
    zeit: "19:00",
    heim: "SV Wilthen",
    gast: "VV90 Bautzen e. V.",
    heimOderAuswaerts: "Auswärts",
    ort: "Wilthen Karl-Marx-Strasse",
  },
  {
    datum: "15.03.2027",
    zeit: "19:00",
    heim: "MSV Bautzen I. Mix",
    gast: "VV90 Bautzen e. V.",
    heimOderAuswaerts: "Auswärts",
    ort: "Wilthen Karl-Marx-Strasse",
  },
  {
    datum: "12.04.2027",
    zeit: "19:00",
    heim: "VV90 Bautzen e. V.",
    gast: "MSV Bautzen II. Mix",
    heimOderAuswaerts: "Heim",
    ort: "Bautzen Jahnsporthalle, Steinstraße",
  },
  {
    datum: "12.04.2027",
    zeit: "19:00",
    heim: "VV90 Bautzen e. V.",
    gast: "SG Steinigtwolmsdorf",
    heimOderAuswaerts: "Heim",
    ort: "Bautzen Jahnsporthalle, Steinstraße",
  },
]
 
function Spielplan() {
  return (
    <>
      <div className="page-header">
        <div className="page-header-inner">
          <span className="eyebrow">SPIELPLAN</span>
          <h1>Die nächsten Spiele</h1>
          <p>
            Der vollständige Spielplan inklusive Ergebnissen steht Mitgliedern im
            Login-Bereich zur Verfügung.
          </p>
        </div>
      </div>
 
      <section>
        <div className="section-inner">
          <div className="match-list">
            {spiele.map((spiel, index) => (
              <div className="match-card" key={index}>
                <span className="match-date">
                  {spiel.datum} · {spiel.zeit}
                </span>
                <span className="match-teams">
                  {spiel.heim} — {spiel.gast}
                </span>
                <span className="match-place">
                  {spiel.heimOderAuswaerts} · {spiel.ort}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
 
export default Spielplan
 

