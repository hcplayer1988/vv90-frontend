/**
 * Home: landing page hero, divider bar and the club photo section. Static
 * content for now - the hero-ball graphic is hidden on mobile via CSS
 * (.hero-ball { display: none }) and only shown from the desktop breakpoint
 * upward.
 *
 * The section below the divider bar now shows the real club photo
 * (header_secret.webp, served as-is from public/ - no import needed;
 * WebP instead of the original JPG to keep the file size down) instead of
 * the earlier dashed-border placeholder. It keeps the same
 * responsive aspect-ratio switch as before (4:3 on mobile, 16:7 from the
 * 900px breakpoint upward, see .header-photo in global.css) and crops the
 * image with object-fit: cover so it always fills the box without
 * distortion.
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
        <div className="header-photo">
          <img src="/header_secret.webp" alt="Das VV90-Team beim Volleyball" />
        </div>
      </section>
    </>
  )
}

export default Home
