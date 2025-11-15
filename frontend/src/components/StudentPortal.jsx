// frontend/src/components/StudentPortal.jsx
import React, { useEffect, useState } from "react";
import { logout, getIdToken } from "../utils/auth";
import { API_BASE_URL } from "../utils/config";

export default function StudentPortal({ onLogout, onStartExam }) {
  const [profile, setProfile] = useState({
    year: "1",
    department: "cse",
  });
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
        setProfile({
          year: data.user.profile.year || "1",
          department: data.user.profile.department || "cse",
        });
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
          <form onSubmit={saveProfile}>
            <div>
              <label style={{ fontSize: "0.75rem" }}>Year of engineering</label>
              <select
                className="input"
                value={profile.year}
                onChange={(e) =>
                  setProfile({ ...profile, year: e.target.value })
                }
              >
                <option value="1">1st year</option>
                <option value="2">2nd year</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.75rem" }}>Department</label>
              <select
                className="input"
                value={profile.department}
                onChange={(e) =>
                  setProfile({ ...profile, department: e.target.value })
                }
              >
                <option value="cse">CSE</option>
                <option value="aiml">AIML</option>
                <option value="mechanical">Mechanical</option>
                <option value="electronics">Electronics</option>
              </select>
            </div>
            <button
              className="button button-primary"
              type="submit"
              style={{ marginTop: "0.5rem" }}
            >
              Save Profile
            </button>
          </form>
        </div>

        <div className="card">
          <div className="section-title">
            <span>Active Exams</span>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Exam</th>
                  <th>Section</th>
                  <th>Duration</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {exams.map((ex) => (
                  <tr key={ex.id}>
                    <td>{ex.name}</td>
                    <td>{ex.section}</td>
                    <td>{ex.durationMinutes} min</td>
                    <td>
                      <button
                        className="button button-primary"
                        onClick={() => onStartExam(ex.id)}
                      >
                        Start
                      </button>
                    </td>
                  </tr>
                ))}
                {exams.length === 0 && (
                  <tr>
                    <td colSpan="4">No active exams right now.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
