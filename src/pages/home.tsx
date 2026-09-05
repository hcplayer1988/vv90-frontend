/**
 * Home: landing page hero, divider bar and the placeholder section for the
 * future club photo. Static content for now - the hero-ball graphic is
 * hidden on mobile via CSS (.hero-ball { display: none }) and only shown
 * from the desktop breakpoint upward.
 */
function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <span className="hero-eyebrow">
            HOBBYVOLLEYBALLVEREIN · GEGRÜNDET FÜR ALLE, DIE MITSPIELEN WOLLEN
          </span>
          <h1>
            VV90 E. V.
            <span>Dein Aufschlag. Dein Verein.</span>
          </h1>
          <p className="lead">
            Wir spielen Volleyball, weil es Spaß macht, nicht weil es muss. Trainings für
            jedes Level, ein fairer Spielplan und eine Gemeinschaft, die sich auch nach dem
            Abpfiff noch trifft.
          </p>
        </div>
 
        <div className="hero-ball">
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="100" r="96" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity={0.25} />
            <g fill="none" stroke="#c8102e" strokeWidth="1.5" opacity={0.55}>
              <path d="M4,72 Q100,20 196,72" />
              <path d="M4,128 Q100,180 196,128" />
              <path d="M52,6 Q0,100 52,194" />
              <path d="M148,6 Q200,100 148,194" />
            </g>
          </svg>
        </div>
      </section>
 
      <div className="divider-bar"></div>
 
      <section className="image-placeholder-section">
        <div className="image-placeholder">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <circle cx="8.5" cy="9.5" r="1.5" />
            <path d="M21 15l-5-5-9 9" />
          </svg>
          <span>Platzhalter für Vereinsbild</span>
        </div>
      </section>
    </>
  )
}
 
export default Home
 
