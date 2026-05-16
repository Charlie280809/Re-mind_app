import "../css/Navbar.css";
import logo from "../assets/images/logo.svg";
import { LuHouse, LuPause, LuUser, LuSettings } from "react-icons/lu";
import { HiOutlineDocumentReport } from "react-icons/hi";
import { TbCrown } from "react-icons/tb";

export default function Navbar({ currentPage, setCurrentPage, onSettingsNavigate, isPremium }) {
  const navItems = [
    {
      key: "home",
      label: "Home",
      icon: <LuHouse />,
      onClick: () => setCurrentPage("home"),
    },
    {
      key: "report",
      label: "Dagrapport",
      icon: <HiOutlineDocumentReport />,
      onClick: () => setCurrentPage("report"),
    },
    {
      key: "pause",
      label: "Pauzes",
      icon: <LuPause />,
      onClick: () => setCurrentPage("pause"),
    },
    {
      key: "profile",
      label: "Profiel",
      icon: <LuUser />,
      onClick: () => setCurrentPage("profile"),
    },
  ];

  const bottomNavItems = [
    {
      key: "settings",
      label: "Instellingen",
      icon: <LuSettings />,
      className: "settingsLink",
      onClick: () => {
        if (onSettingsNavigate) onSettingsNavigate();
        else setCurrentPage("settings");
      },
    },
  ];

  return (
    <aside className="sideNav">
      <div className="sideNavTop">
        <div className="brand">
          <img src={logo} alt="Logo" />
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
        {!isPremium ? (
          <button
            className="premiumButton"
            type="button"
            onClick={() => {
              if (onSettingsNavigate) onSettingsNavigate("upgrade");
              else setCurrentPage("settings");
            }}
            aria-label="Upgrade naar premium"
          >
            <TbCrown />
            <span>Premium</span>
          </button>
        ) : null}

        {bottomNavItems.map((item) => (
          <button
            key={item.key}
            className={`sideNavLink ${currentPage === item.key ? "active" : ""} ${item.className || ""}`}
            onClick={item.onClick}
            type="button"
          >
            <span className="sideNavIcon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}

      </div>
    </aside>
  );
}
