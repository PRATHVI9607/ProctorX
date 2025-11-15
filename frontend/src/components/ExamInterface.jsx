// frontend/src/components/ExamInterface.jsx
import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../utils/config";
import { getIdToken, logout } from "../utils/auth";
import { useFullscreenMonitor } from "../hooks/useFullscreenMonitor";
import { useExamMonitor } from "../hooks/useExamMonitor";
import { reportViolation } from "../services/monitoringService";
import { fetchExamSessions } from "../services/monitoringService";

export default function ExamInterface({ examId, onExit }) {
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState(null);
  const [session, setSession] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);

  const isFullscreen = useFullscreenMonitor({
    enabled: true,
    onExitFullscreen: () => {
      // report violation to backend and notify student
      (async () => {
        try {
          await reportViolation(examId, 'fullscreen_exit');
          alert('You left fullscreen. The proctor has been notified and may pause your session.');
        } catch (err) {
          console.error('Failed to report violation', err);
        }
      })();
    },
  });

  useExamMonitor({ examId, active: !!session });

  useEffect(() => {
    startExam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  // Poll session state when awaiting approval
  useEffect(() => {
    let interval;
    if (session && session.awaitingApproval) {
      interval = setInterval(async () => {
        try {
          const data = await fetchExamSessions(examId);
          const me = data.find((s) => s.userId === session.userId);
          if (me) setSession(me);
          if (me && !me.awaitingApproval) {
            clearInterval(interval);
          }
        } catch (err) {
          console.error('Poll sessions failed', err);
        }
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [session, examId]);

  useEffect(() => {
    if (!exam) return;
    const durationMs = (exam.durationMinutes || 30) * 60 * 1000;
    const endTime = Date.now() + durationMs;
    setTimeLeft(durationMs);

    const timer = setInterval(() => {
      const remaining = endTime - Date.now();
      if (remaining <= 0) {
        clearInterval(timer);
        submitExam();
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam]);

  async function startExam() {
    setLoading(true);
    try {
      const token = await getIdToken();
      const res = await fetch(`${API_BASE_URL}/exams/${examId}/start`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to start exam");
      const data = await res.json();
      setExam(data.exam);
      setSession(data.session);
    } catch (err) {
      console.error(err);
      alert("Could not start exam.");
      onExit();
    } finally {
      setLoading(false);
    }
  }

  async function submitExam() {
    try {
      const token = await getIdToken();
      const res = await fetch(`${API_BASE_URL}/exams/${examId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) throw new Error();
      await res.json();
      alert("Exam submitted.");
      onExit();
    } catch (err) {
      console.error(err);
      alert("Error submitting exam");
      onExit();
    }
  }

  function handleChangeAnswer(qId, value) {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  }

  function humanTime(ms) {
    const totalSec = Math.floor((ms || 0) / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  }

  async function handleLogout() {
    await logout();
    onExit();
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="card card-soft" style={{ marginTop: "2rem" }}>
          Starting exam…
        </div>
      </div>
    );
  }

  if (!exam || !session) {
    return (
      <div className="page-container">
        <div className="card card-soft" style={{ marginTop: "2rem" }}>
          No exam found.
        </div>
      </div>
    );
  }

  // If session is paused and awaiting approval, show blocking UI
  if (session.awaitingApproval) {
    return (
      <div className="page-container">
        <div className="card card-soft" style={{ marginTop: "2rem", textAlign: 'center' }}>
          <h3>Session paused</h3>
          <p>Your session has been paused because a proctoring violation was detected. Waiting for admin approval to continue.</p>
          <p style={{ fontSize: '0.85rem', color: '#666' }}>This page will automatically resume once an admin approves your session.</p>
          <button className="button button-ghost" onClick={() => { if (window.confirm('Exit exam?')) onExit(); }}>Exit</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "1rem",
          alignItems: "center",
          marginBottom: "0.75rem",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>{exam.name}</h2>
          <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>
            Stay in fullscreen, shortcuts are disabled and monitored.
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <div className="timer-pill">
            ⏱ {humanTime(timeLeft)} left
          </div>
          <div className="badge">
            {isFullscreen ? "Fullscreen ✅" : "Fullscreen ❌"}
          </div>
          <button
            className="button button-primary"
            onClick={() => {
              if (window.confirm("Submit exam and exit?")) submitExam();
            }}
          >
            Submit
          </button>
          <button className="button button-ghost" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {(session.questions || []).map((q, idx) => (
        <div key={q.id || idx} className="card card-soft">
          <div
            style={{
              fontWeight: 600,
              marginBottom: "0.5rem",
              fontSize: "0.95rem",
            }}
          >
            Q{idx + 1}. {q.text}
          </div>
          {q.type === "mcq" &&
            (q.options || []).map((opt, oIdx) => (
              <label
                key={oIdx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  marginBottom: "0.25rem",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                <input
                  type="radio"
                  name={q.id}
                  value={opt}
                  checked={answers[q.id] === opt}
                  onChange={(e) => handleChangeAnswer(q.id, e.target.value)}
                />
                <span>{opt}</span>
              </label>
            ))}
          {q.type === "descriptive" && (
            <textarea
              className="input"
              rows={4}
              placeholder="Type your answer here..."
              value={answers[q.id] || ""}
              onChange={(e) => handleChangeAnswer(q.id, e.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
