import React, { useCallback, useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import {
  fetchOperator,
  loginOperator,
  logoutOperator,
  readStoredOperator,
} from "./lib/api";
import type { Operator } from "./lib/types";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Incidents } from "./pages/Incidents";
import { Analytics } from "./pages/Analytics";
import { Upload } from "./pages/Upload";

export const App: React.FC = () => {
  const [operator, setOperator] = useState<Operator | null>(readStoredOperator);
  const [checkingAuth, setCheckingAuth] = useState(Boolean(readStoredOperator()));
  const [refreshKey, setRefreshKey] = useState(0);

  // Validate persisted session once on mount.
  useEffect(() => {
    const stored = readStoredOperator();
    if (!stored) {
      setCheckingAuth(false);
      return;
    }
    let active = true;
    fetchOperator()
      .then((op) => {
        if (!active) return;
        localStorage.setItem("resq-operator", JSON.stringify(op));
        setOperator(op);
      })
      .catch(() => {
        if (!active) return;
        localStorage.removeItem("resq-operator");
        setOperator(null);
      })
      .finally(() => active && setCheckingAuth(false));
    return () => {
      active = false;
    };
  }, []);

  const handleLogin = useCallback(async (email: string, password: string) => {
    const op = await loginOperator(email, password);
    localStorage.setItem("resq-operator", JSON.stringify(op));
    setOperator(op);
  }, []);

  const handleLogout = useCallback(() => {
    logoutOperator();
    localStorage.removeItem("resq-operator");
    setOperator(null);
  }, []);

  const handleUploaded = useCallback(() => setRefreshKey((k) => k + 1), []);

  if (checkingAuth) {
    return (
      <div className="auth-screen">
        <div className="auth-panel">
          <div className="auth-card" style={{ textAlign: "center" }}>
            <div className="loading-bar" style={{ marginBottom: 16 }} />
            <p className="text-muted">Validating operator session…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!operator) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Layout operator={operator} onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<Dashboard key={refreshKey} />} />
        <Route path="/incidents" element={<Incidents key={refreshKey} />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/upload" element={<Upload onUploaded={handleUploaded} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};
