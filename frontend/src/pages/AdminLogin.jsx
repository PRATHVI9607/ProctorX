import React, { useState } from "react";
import { login } from "../utils/auth";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    try {
      await login(email, password);
      navigate("/admin"); // Redirect to admin dashboard
    } catch (err) {
      alert("Admin login failed");
    }
  }

  return (
    <div className="page-container">
      <div className="card card-soft" style={{ maxWidth: 420, margin: "2rem auto" }}>
        <h2>Admin Login</h2>
        <form onSubmit={handleLogin}>
          <input
            className="input"
            placeholder="Admin Email"
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
            Login as Admin
          </button>
        </form>

        <div style={{ marginTop: "0.7rem", fontSize: "0.8rem" }}>
          Not admin?{" "}
          <button className="button button-ghost" onClick={() => navigate("/student-login")}>
            Student Login
          </button>
        </div>
      </div>
    </div>
  );
}
