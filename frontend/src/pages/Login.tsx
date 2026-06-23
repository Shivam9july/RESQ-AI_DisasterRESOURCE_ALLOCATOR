import React, { useState } from "react";
import { Icon } from "../components/Icon";

interface Props {
  onLogin: (email: string, password: string) => Promise<void>;
}

export const Login: React.FC<Props> = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !password.trim()) {
      setError("Enter your operator email and password to continue.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onLogin(trimmed, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-hero">
        <div className="auth-hero-inner">
          <div className="auth-logo">
            <div className="brand-mark" style={{ width: 44, height: 44 }}>R</div>
            <div className="brand-text">
              <strong style={{ fontSize: "1.1rem" }}>Resq</strong>
              <span>Command Center</span>
            </div>
          </div>

          <span className="live-pill" style={{ width: "fit-content" }}>
            <span className="live-dot" />
            Emergency Response Intelligence
          </span>

          <h1>
            Detect faster.<br />
            Respond smarter.
          </h1>
          <p>
            An AI-powered command center that detects disasters from field media,
            estimates severity and affected populations, and calculates relief
            requirements — all from one operational dashboard.
          </p>

          <div className="auth-features">
            <div className="auth-feature">
              <span className="feat-dot"><Icon name="fire" size={14} /></span>
              <div>
                <strong style={{ color: "var(--text)" }}>Multi-hazard detection</strong>
                <div>Fire, flood, and crowd-density analysis from images & video.</div>
              </div>
            </div>
            <div className="auth-feature">
              <span className="feat-dot"><Icon name="money" size={14} /></span>
              <div>
                <strong style={{ color: "var(--text)" }}>Relief estimation</strong>
                <div>Automated cost modeling based on severity, area & population.</div>
              </div>
            </div>
            <div className="auth-feature">
              <span className="feat-dot"><Icon name="analytics" size={14} /></span>
              <div>
                <strong style={{ color: "var(--text)" }}>Live analytics</strong>
                <div>Trends, distributions and operational KPIs in real time.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-panel">
        <form className="auth-card" onSubmit={handleSubmit}>
          <span className="eyebrow">Operator Access</span>
          <h2>Sign in</h2>
          <p className="auth-hint">Enter your credentials to access the dashboard.</p>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="commander@resq.local"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="pwd">Password</label>
            <input
              id="pwd"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              disabled={submitting}
            />
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <button type="submit" className="button block" disabled={submitting} style={{ marginTop: 8 }}>
            {submitting ? "Signing in…" : "Sign In"}
          </button>

          <div className="demo-creds">
            Demo credentials &mdash; <code>commander@resq.local</code> / <code>resq1234</code>
          </div>
        </form>
      </div>
    </div>
  );
};
