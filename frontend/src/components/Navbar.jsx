import "../css/Navbar.css";
import logo from "../assets/images/logo.svg";
import { LuHouse, LuPause, LuUser, LuSettings } from "react-icons/lu";
import { HiOutlineChartBar, HiOutlineChartSquareBar } from "react-icons/hi";
import { TbCrown } from "react-icons/tb";

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export default function Navbar({ currentPage, setCurrentPage, onSettingsNavigate, isPremium, onBreak, breakSeconds, onEndBreak }) {
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
      icon: <HiOutlineChartBar />,
      onClick: () => setCurrentPage("report"),
    },
    {
      key: "weekreport",
      label: "Weekrapport",
      icon: <HiOutlineChartSquareBar />,
      onClick: () => setCurrentPage("weekreport"),
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

  const visibleNavItems = isPremium
    ? navItems
    : navItems.filter((item) => item.key !== "weekreport");

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
          {visibleNavItems.map((item) => (
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

        {onBreak ? (
          <div className="pauseTimePanel" aria-live="polite">
            <div className="pauseTimeLabel">Pauzetijd</div>
            <div className="pauseTimeValue">{formatTime(breakSeconds)}</div>
            <button
              className="pauseEndButton"
              type="button"
              onClick={() => onEndBreak?.()}
            >
              Beëindig pauze
            </button>
          </div>
        ) : null}
      </div>

      <div className="sideNavBottom">
        {!isPremium ? (
          <button
            className="premiumButton"
            type="button"
            onClick={() => {
              if (setCurrentPage) setCurrentPage("upgrade");
              else if (onSettingsNavigate) onSettingsNavigate("upgrade");
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
