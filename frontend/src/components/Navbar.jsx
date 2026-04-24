import "../css/Navbar.css";

export default function Navbar({ currentPage, setCurrentPage }) {
  const navItems = [
    {
      key: "home",
      label: "Home",
      // icon: (),
      onClick: () => setCurrentPage("home"),
    },
    {
      key: "report",
      label: "Dagrapport",
      // icon: (),
      onClick: () => setCurrentPage("home"),
    },
    {
      key: "pause",
      label: "Pauzes",
      // icon: (),
      onClick: () => setCurrentPage("pause"),
    },
    {
      key: "profile",
      label: "Profiel",
      // icon: (),
      onClick: () => setCurrentPage("home"),
    },
  ];

  return (
    <aside className="sideNav">
      <div className="sideNavTop">
        <div className="brand">
          {/* logo */}
        </div>

        <nav className="sideNavLinks" aria-label="Hoofdnavigatie">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`sideNavLink ${currentPage === item.key ? "active" : ""}`}
              onClick={item.onClick}
              type="button"
            >
              <span className="sideNavIcon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="sideNavBottom">
        <button className="premiumButton" type="button">
          {/* icon */}
          <span>Premium</span>
        </button>

        <button className="settingsLink" type="button">
          {/* icon */}
          <span>Instellingen</span>
        </button>
      </div>
    </aside>
  );
}
