import React, { useState } from "react";
import { login, register } from "../utils/auth";
import { useNavigate } from "react-router-dom";

export default function StudentLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password);
      }
      navigate("/student");
    } catch (err) {
      alert("Login failed");
    }
  }

  return (
    <div className="page-container">
      <div className="card card-soft" style={{ maxWidth: 420, margin: "2rem auto" }}>
        <h2>{mode === "login" ? "Student Login" : "Student Register"}</h2>

        <form onSubmit={handleSubmit}>
          <input
            className="input"
            placeholder="Student Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            className="input"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button className="button button-primary" type="submit" style={{ width: "100%" }}>
            {mode === "login" ? "Login" : "Register"}
          </button>
        </form>

        <div style={{ marginTop: "0.8rem", fontSize: "0.8rem" }}>
          {mode === "login" ? (
            <>
              New student?{" "}
              <button className="button button-ghost" onClick={() => setMode("register")}>
                Register
              </button>
            </>
          ) : (
            <>
              Already registered?{" "}
              <button className="button button-ghost" onClick={() => setMode("login")}>
                Login
              </button>
            </>
          )}
        </div>

        <div style={{ marginTop: "0.6rem", fontSize: "0.8rem" }}>
          Are you admin?{" "}
          <button className="button button-ghost" onClick={() => navigate("/admin-login")}>
            Admin Login
          </button>
        </div>
      </div>
    </div>
  );
}
