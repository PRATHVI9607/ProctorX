import React, { useState } from "react";
import { login, register } from "../utils/auth";
import { useNavigate } from "react-router-dom";

export default function StudentLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [year, setYear] = useState("1");
  const [department, setDepartment] = useState("cse");

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password);
        // after registering, save profile (year/department) to backend
        try {
          const token = await (await import("../utils/auth")).getIdToken();
          if (token) {
            await fetch(`${process.env.REACT_APP_API_BASE_URL || "/api"}/auth/profile`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ year, department }),
            });
          }
        } catch (err) {
          console.warn("Failed to save profile after register:", err);
        }
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

          {mode === "register" && (
            <div style={{ marginTop: "0.75rem" }}>
              <label style={{ fontSize: "0.85rem" }}>Year</label>
              <select className="input" value={year} onChange={(e) => setYear(e.target.value)}>
                <option value="1">1st year</option>
                <option value="2">2nd year</option>
              </select>

              <label style={{ fontSize: "0.85rem" }}>Department</label>
              <select className="input" value={department} onChange={(e) => setDepartment(e.target.value)}>
                <option value="cse">CSE</option>
                <option value="aiml">AIML</option>
                <option value="mechanical">Mechanical</option>
                <option value="electronics">Electronics</option>
              </select>
            </div>
          )}

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
