import "../css/LoginPage.css";
import { useState } from "react";
import logo from "../assets/images/logo.svg";

export default function LoginPage({ onLogin, isSubmitting, error, isConfigured }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onLogin({ email, password });
  };

  return (
    <main className="loginPage">
      <section className="loginContent">
        <div className="loginFormColumn">
          <h1 className="loginTitle">Log in</h1>

          <form className="loginForm" onSubmit={handleSubmit}>
            <label className="loginField">
              <span>E-mail</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="E-mail"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="loginField">
              <span>Wachtwoord</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="Wachtwoord"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {error ? <p className="loginError" role="alert">{error}</p> : null}
            {!isConfigured ? <p className="loginError" role="alert">Supabase is nog niet geconfigureerd.</p> : null}

            <button className="loginSubmit" type="submit" disabled={isSubmitting || !isConfigured}>
              {isSubmitting ? "Bezig met inloggen..." : "Log in"}
            </button>
          </form>
        </div>

        <div className="loginBrandColumn" aria-hidden="true">
          <img className="loginBrandLogo" src={logo} alt="" />
          <p className="loginBrandText">
            Nog geen account? <span>Maak account aan.</span>
          </p>
        </div>
      </section>
    </main>
  );
}