import React, { useState } from "react";
import { login, register, getIdToken } from "../utils/auth";
import { API_BASE_URL } from "../utils/config";
import { useNavigate } from "react-router-dom";

export default function StudentLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [year, setYear] = useState("1");
  const [department, setDepartment] = useState("cse");
  const [name, setName] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (mode === "login") {
        await login(email, password);
        } else {
        // register returns the new user object
        const user = await register(email, password);
        // after registering, save profile (name/year/department) to backend
        try {
          const token = user ? await user.getIdToken() : await getIdToken();
          if (token) {
            await fetch(`${API_BASE_URL}/auth/profile`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ name, year, department }),
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

          {mode === "register" && (
            <div style={{ marginTop: "0.75rem" }}>
              <input
                className="input"
                placeholder="Full name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
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
