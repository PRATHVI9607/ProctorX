// frontend/src/App.jsx
import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";

import ThemeSwitcher from "./components/ThemeSwitcher";
import AdminDashboard from "./components/AdminDashboard";
import StudentPortal from "./components/StudentPortal";
import ExamInterface from "./components/ExamInterface";

import { auth, onAuthStateChanged } from "./services/firebase";
import { API_BASE_URL } from "./utils/config";

import AdminLogin from "./pages/AdminLogin";
import StudentLogin from "./pages/StudentLogin";

export default function App() {
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [role, setRole] = useState(null);
  const [examId, setExamId] = useState(null);

  const navigate = useNavigate();

  // 🔥 FIREBASE AUTH LISTENER – fixed version (NO redirect when not logged in)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // user NOT logged in → allow them to open login pages
        setRole(null);
        setLoadingAuth(false);
        return; // ❗ IMPORTANT FIX — do NOT navigate("/")
      }

      try {
        const token = await user.getIdToken();
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Role fetch failed");

        const data = await res.json();

        const resolvedRole =
          (data?.user?.profile?.role) ||
          data?.user?.role ||
          "student";

        setRole(resolvedRole);
        setLoadingAuth(false);

        // Automatic routing ONLY when logged in:
        if (resolvedRole === "admin") navigate("/admin");
        else navigate("/student");

      } catch (err) {
        console.error("Auth role error:", err);
        setRole(null);
        setLoadingAuth(false);
      }
    });

    return () => unsub();
  }, [navigate]);

  // Loading screen during Firebase initialization
  if (loadingAuth) {
    return (
      <div className="page-container">
        <div
          className="card card-soft"
          style={{
            maxWidth: 360,
            margin: "3rem auto",
            textAlign: "center",
          }}
        >
          Loading secure session…
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      {/* Navbar */}
      <header className="navbar">
        <div className="nav-brand">
          <div className="nav-logo-orb" />
          <div>
            <div className="nav-title">SkyNight Proctor</div>
            <div className="nav-subtitle">Holographic Exam Guard</div>
          </div>
        </div>

        <ThemeSwitcher />
      </header>

      {/* App Routes */}
      <Routes>

        {/* Landing page where user chooses role */}
        <Route
          path="/"
          element={
            <div className="page-container">
              <div
                className="card card-soft"
                style={{ maxWidth: 420, margin: "2.5rem auto" }}
              >
                <h2 style={{ marginBottom: "0.5rem" }}>Welcome to ProctorX</h2>

                <p
                  style={{
                    margin: "0 0 1.2rem",
                    fontSize: "0.9rem",
                    opacity: 0.8,
                  }}
                >
                  Choose how you want to log in.
                </p>

                <button
                  className="button button-primary"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => navigate("/student-login")}
                >
                  Student Login
                </button>

                <button
                  className="button button-ghost"
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    marginTop: "0.6rem",
                  }}
                  onClick={() => navigate("/admin-login")}
                >
                  Admin Login
                </button>
              </div>
            </div>
          }
        />

        {/* Individual login screens */}
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/student-login" element={<StudentLogin />} />

        {/* Admin Dashboard (Protected Route) */}
        <Route
          path="/admin"
          element={
            role === "admin" ? (
              <AdminDashboard
                onLogout={() => {
                  setRole(null);
                  navigate("/admin-login");
                }}
              />
            ) : (
              <Navigate to="/admin-login" replace />
            )
          }
        />

        {/* Student Portal (Protected Route) */}
        <Route
          path="/student"
          element={
            role === "student" ? (
              <StudentPortal
                onLogout={() => {
                  setRole(null);
                  navigate("/student-login");
                }}
                onStartExam={(id) => {
                  setExamId(id);
                  navigate(`/exam/${id}`);
                }}
              />
            ) : (
              <Navigate to="/student-login" replace />
            )
          }
        />

        {/* Exam Interface */}
        <Route
          path="/exam/:id"
          element={
            examId ? (
              <ExamInterface
                examId={examId}
                onExit={() => {
                  setExamId(null);
                  navigate("/student");
                }}
              />
            ) : (
              <Navigate to="/student-login" replace />
            )
          }
        />

        {/* Unknown paths redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
