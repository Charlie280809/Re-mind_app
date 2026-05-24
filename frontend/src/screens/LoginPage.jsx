import "../css/LoginPage.css";
import { useState } from "react";
import { LuEye, LuEyeOff  } from "react-icons/lu";
import logo from "../assets/images/logo.svg";

export default function LoginPage({ onLogin, onNavigateToSignup, isSubmitting, error, isConfigured }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onLogin({ email, password });
  };

  const togglePasswordVisibility = () => {
    setPasswordVisible((currentValue) => !currentValue);
  };

  return (
    <main className="loginPage">
      <section className="loginContent">
        <div className="loginFormColumn">
          <h1 className="loginTitle">Log in</h1>

          <form className="loginForm" onSubmit={handleSubmit}>
            <label className="inputField">
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

            <label className="inputField">
              <span>Wachtwoord</span>
              <div className="passwordInputWrap">
                <input
                  type={passwordVisible ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  placeholder="Wachtwoord"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  className="passwordVisibilityButton"
                  type="button"
                  onClick={togglePasswordVisibility}
                  aria-label={passwordVisible ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
                >
                  {passwordVisible ? <LuEye /> : <LuEyeOff />}
                </button>
              </div>
            </label>

            {error ? <p className="errorMessage" role="alert">{error}</p> : null}
            {!isConfigured ? <p className="errorMessage" role="alert">Supabase is nog niet geconfigureerd.</p> : null}

            <button className="loginSubmit" type="submit" disabled={isSubmitting || !isConfigured}>
              {isSubmitting ? "Bezig..." : "Log in"}
            </button>
          </form>
        </div>

        <div className="loginBrandColumn">
          <img className="loginBrandLogo" src={logo} alt="" />
          <p className="subtitle">
            Nog geen account? <button type="button" onClick={onNavigateToSignup}>Maak account aan.</button>
          </p>
        </div>
      </section>
    </main>
  );
}