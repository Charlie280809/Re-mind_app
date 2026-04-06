import "./navbar.css";

export default function Navbar({ currentPage, setCurrentPage }) {
  return (
    <header className="nav">
      <div className="navInner">
        <div className="brand">
          <span className="brandMark">Logo</span>
        </div>

        <nav className="links">
          <button
            className={`link ${currentPage === "home" ? "active" : ""}`}
            onClick={() => setCurrentPage("home")}
            type="button"
          >
            Home
          </button>

          <button className="link" type="button">
            Dagrapport
          </button>

          <button className="link" type="button">
            Weekrapport
          </button>

          <button
            className={`link ${currentPage === "pause" ? "active" : ""}`}
            onClick={() => setCurrentPage("pause")}
            type="button"
          >
            Pauzesuggesties
          </button>
        </nav>

        <button className="profile" aria-label="Profiel" type="button"></button>
      </div>
    </header>
  );
}
