import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Icon, IconName } from "./Icon";
import type { Operator } from "../lib/types";

interface NavEntry {
  to: string;
  label: string;
  icon: IconName;
}

const NAV: { section: string; items: NavEntry[] }[] = [
  {
    section: "Operations",
    items: [
      { to: "/", label: "Dashboard", icon: "dashboard" },
      { to: "/incidents", label: "Incidents", icon: "incidents" },
      { to: "/analytics", label: "Analytics", icon: "analytics" },
    ],
  },
  {
    section: "Intelligence",
    items: [{ to: "/upload", label: "New Analysis", icon: "upload" }],
  },
];

const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  "/": { title: "Command Dashboard", sub: "Real-time disaster detection & relief intelligence" },
  "/incidents": { title: "Incident Registry", sub: "Browse, filter and manage detected incidents" },
  "/analytics": { title: "Analytics", sub: "Trends, distributions and relief breakdowns" },
  "/upload": { title: "New Analysis", sub: "Upload media to detect and assess incidents" },
};

interface LayoutProps {
  operator: Operator;
  onLogout: () => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ operator, onLogout, children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const meta = PAGE_TITLES[location.pathname] ?? {
    title: "Resq",
    sub: "Emergency response intelligence",
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">R</div>
          <div className="brand-text">
            <strong>Resq</strong>
            <span>Command Center</span>
          </div>
        </div>

        {NAV.map((group) => (
          <div key={group.section}>
            <div className="nav-section-label">{group.section}</div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
              >
                <span className="nav-icon">
                  <Icon name={item.icon} size={18} />
                </span>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}

        <div className="sidebar-footer">
          <div className="operator-chip" style={{ padding: "4px 12px 4px 4px" }}>
            <span className="operator-avatar">
              {operator.name.slice(0, 1).toUpperCase()}
            </span>
            <span>
              <span className="operator-name">{operator.name}</span>
              <span className="operator-role">{operator.role}</span>
            </span>
          </div>
          <button
            type="button"
            className="button ghost sm"
            onClick={onLogout}
            title="Sign out"
          >
            <Icon name="logout" size={16} />
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button
            type="button"
            className="button ghost sm mobile-topbar-toggle"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <Icon name="menu" size={18} />
          </button>
          <div>
            <h1>{meta.title}</h1>
            <div className="topbar-sub">{meta.sub}</div>
          </div>
          <div className="topbar-right">
            <span className="live-pill">
              <span className="live-dot" />
              Systems Live
            </span>
          </div>
        </header>

        <main className="page">{children}</main>
      </div>
    </div>
  );
};
