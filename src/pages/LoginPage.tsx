import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getAppHomePath } from "../lib/game/profiles";

export function LoginPage() {
  const { session, loading, signIn, signUp, signOut } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("Checking session…");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) {
      setStatus("Checking session…");
      return;
    }

    if (session?.user) {
      getAppHomePath()
        .then((path) => navigate(path, { replace: true }))
        .catch((err: Error) => {
          setStatus("Signed in as " + session.user.email);
          setError(err.message || "Could not load profile.");
        });
      return;
    }

    setStatus("Not signed in.");
  }, [loading, session, navigate]);

  async function handleSignIn(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      const path = await getAppHomePath();
      navigate(path, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignUp() {
    setError("");
    setBusy(true);
    try {
      await signUp(email.trim(), password);
      setStatus(
        "Sign up sent. If email confirm is on, check your inbox; then sign in."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setError("");
    setBusy(true);
    try {
      await signOut();
      setStatus("Not signed in.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign out failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app">
      <h1>Life RPG Login</h1>
      <p className="page-intro">{status}</p>

      <form className="add-quest-form" onSubmit={handleSignIn}>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="current-password"
          />
        </label>
        <div className="quest-form-actions">
          <button type="submit" className="create-btn" disabled={busy}>
            Sign in
          </button>
          <button
            type="button"
            className="quest-cancel-btn"
            onClick={handleSignUp}
            disabled={busy}
          >
            Sign up
          </button>
          {session ? (
            <button
              type="button"
              className="quest-cancel-btn"
              onClick={handleSignOut}
              disabled={busy}
            >
              Sign out
            </button>
          ) : null}
        </div>
        {error ? <p className="error">{error}</p> : null}
      </form>
    </main>
  );
}
