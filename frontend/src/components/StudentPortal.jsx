// frontend/src/components/StudentPortal.jsx
import React, { useEffect, useState } from "react";
import { logout, getIdToken } from "../utils/auth";
import { API_BASE_URL } from "../utils/config";

export default function StudentPortal({ onLogout, onStartExam }) {
  const [profile, setProfile] = useState(null);
  const [exams, setExams] = useState([]);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const token = await getIdToken();
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.user && data.user.profile) {
        setProfile(data.user.profile);
      }
      await loadExams();
    } catch (err) {
      console.error(err);
    }
  }

  async function saveProfile(e) {
    e.preventDefault();
    try {
      const token = await getIdToken();
      const res = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error();
      await res.json();
      await loadExams();
      alert("Profile saved.");
    } catch (err) {
      console.error(err);
      alert("Failed to save profile");
    }
  }

  async function loadExams() {
    try {
      const token = await getIdToken();
      const res = await fetch(`${API_BASE_URL}/exams/student`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      setExams(data);
    } catch (err) {
      console.error(err);
    }
  }

  function fmtTime(ts) {
    if (!ts) return "-";
    // Accepted formats: Firestore Timestamp (has toDate), ISO string, or object { seconds }
    try {
      let d;
      if (ts && typeof ts.toDate === "function") {
        d = ts.toDate();
      } else if (typeof ts === "string") {
        d = new Date(ts);
      } else if (ts && typeof ts.seconds === "number") {
        d = new Date(ts.seconds * 1000);
      } else {
        d = new Date(ts);
      }
      if (isNaN(d.getTime())) return "Invalid date";
      return d.toLocaleString();
    } catch (err) {
      return "Invalid date";
    }
  }

  async function handleLogout() {
    await logout();
    onLogout();
  }

  return (
    <div className="page-container">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "1rem",
          alignItems: "center",
          marginBottom: "0.7rem",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Student Portal</h2>
          <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>
            Choose your profile and take scheduled exams.
          </div>
        </div>
        <button className="button button-ghost" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className="grid-2">
        <div className="card card-soft">
          <div className="section-title">
            <span>Your Profile</span>
          </div>
          <div style={{ fontSize: "0.95rem" }}>
            {profile ? (
              <div>
                <div><strong>Year:</strong> {profile.year}</div>
                <div><strong>Department:</strong> {profile.department}</div>
              </div>
            ) : (
              <div>Profile not available</div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="section-title">
            <span>Exams</span>
          </div>
          <div style={{ display: "grid", gap: "0.8rem" }}>
            {exams.length === 0 && (
              <div style={{ padding: "1rem" }}>No exams available</div>
            )}

            {exams
              .filter((e) => e.isLive === true || e.status === "live")
              .map((ex) => (
                <div key={ex.id} className="card-soft" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{ex.name}</div>
                    <div style={{ fontSize: "0.85rem", opacity: 0.85 }}>{ex.section} • {fmtTime(ex.startTime)}</div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <div className="timer-pill">{ex.durationMinutes}m</div>
                    <button className="button button-primary" onClick={() => onStartExam(ex.id)}>Start</button>
                  </div>
                </div>
              ))}

            {exams
              .filter((e) => e.status === "upcoming")
              .map((ex) => (
                <div key={ex.id} className="card-soft" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.95 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{ex.name}</div>
                    <div style={{ fontSize: "0.85rem", opacity: 0.85 }}>{ex.section} • {fmtTime(ex.startTime)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.85rem", color: "orange" }}>Upcoming</div>
                    <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>{ex.durationMinutes} min</div>
                  </div>
                </div>
              ))}

            {exams
              .filter((e) => e.status === "ended")
              .map((ex) => (
                <div key={ex.id} className="card-soft" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.6 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{ex.name}</div>
                    <div style={{ fontSize: "0.85rem", opacity: 0.7 }}>{ex.section} • {fmtTime(ex.startTime)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.85rem", color: "gray" }}>Ended</div>
                    <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>{ex.durationMinutes} min</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
