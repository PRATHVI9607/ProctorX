// frontend/src/components/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import { logout, getIdToken } from "../utils/auth";
import { API_BASE_URL } from "../utils/config";
import {
  createQuestion,
  fetchQuestions,
  deleteQuestion,
} from "../services/questionService";
import { fetchExamSessions } from "../services/monitoringService";

export default function AdminDashboard({ onLogout }) {
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState({
    text: "",
    section: "general",
    type: "mcq",
    options: ["", "", "", ""],
    correctOptionIndex: 0,
    year: "1",
    department: "general",
  });

  const [exams, setExams] = useState([]);
  const [examForm, setExamForm] = useState({
    name: "",
    section: "general",
    year: "1",
    department: "general",
    durationMinutes: 30,
    startTime: "",
    endTime: "",
    randomQuestionCount: 5,
  });

  const [selectedExamId, setSelectedExamId] = useState(null);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    loadQuestions();
    loadExams();
  }, []);

  async function loadQuestions() {
    try {
      const data = await fetchQuestions();
      setQuestions(data);
    } catch (err) {
      console.error(err);
      alert("Failed to load questions");
    }
  }

  async function loadExams() {
    try {
      const token = await getIdToken();
      const res = await fetch(`${API_BASE_URL}/exams/admin`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setExams(data);
    } catch (err) {
      console.error(err);
      alert("Failed to load exams");
    }
  }

  async function handleCreateQuestion(e) {
    e.preventDefault();
    try {
      const payload = {
        ...newQuestion,
        options:
          newQuestion.type === "mcq" ? newQuestion.options : [],
        correctOptionIndex:
          newQuestion.type === "mcq" ? newQuestion.correctOptionIndex : null,
      };
      await createQuestion(payload);
      setNewQuestion({
        text: "",
        section: "general",
        type: "mcq",
        options: ["", "", "", ""],
        correctOptionIndex: 0,
        year: "1",
        department: "general",
      });
      loadQuestions();
    } catch (err) {
      console.error(err);
      alert("Failed to create question");
    }
  }

  async function handleDeleteQuestion(id) {
    if (!window.confirm("Delete question?")) return;
    try {
      await deleteQuestion(id);
      loadQuestions();
    } catch (err) {
      console.error(err);
      alert("Failed to delete question");
    }
  }

  async function handleCreateExam(e) {
    e.preventDefault();
    try {
      const token = await getIdToken();
      const res = await fetch(`${API_BASE_URL}/exams`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(examForm),
      });
      if (!res.ok) throw new Error();
      await res.json();
      setExamForm({
        name: "",
        section: "general",
        year: "1",
        department: "general",
        durationMinutes: 30,
        startTime: "",
        endTime: "",
        randomQuestionCount: 5,
      });
      loadExams();
    } catch (err) {
      console.error(err);
      alert("Failed to create exam");
    }
  }

  async function handleSelectExam(examId) {
    setSelectedExamId(examId);
    if (!examId) {
      setSessions([]);
      return;
    }
    try {
      const data = await fetchExamSessions(examId);
      setSessions(data);
    } catch (err) {
      console.error(err);
      alert("Failed to load sessions");
    }
  }

  async function handleApproveSession(userId, approve) {
    try {
      const token = await getIdToken();
      const res = await fetch(`${API_BASE_URL}/exams/${selectedExamId}/sessions/${userId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ approve }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      // refresh sessions
      const data = await fetchExamSessions(selectedExamId);
      setSessions(data);
    } catch (err) {
      console.error(err);
      alert('Failed to approve/deny session');
    }
  }

  async function handleLogout() {
    await logout();
    onLogout();
  }
  const [view, setView] = useState("createExam");

  // helper: live exams and counts
  const liveExams = exams.filter((e) => e.status === "live");

  return (
    <div className="page-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.7rem" }}>
        <div>
          <h2 style={{ margin: 0 }}>Admin Console</h2>
          <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>Manage sections, questions, exams & live monitoring.</div>
        </div>
        <button className="button button-ghost" onClick={handleLogout}>Logout</button>
      </div>

      <div style={{ display: "flex", gap: "1rem" }}>
        <aside style={{ width: 220 }} className="card card-soft">
          <div style={{ fontWeight: 700, marginBottom: "0.6rem" }}>Admin Menu</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <button className="nav-link" onClick={() => setView("createExam")}>Create Exam</button>
            <button className="nav-link" onClick={() => setView("createQuestion")}>Create Question</button>
            <button className="nav-link" onClick={() => setView("questions")}>Question Bank</button>
            <hr />
            <button className="nav-link" onClick={() => setView("live")}>Live Exams <span style={{ marginLeft: 8, fontWeight: 600 }}>{liveExams.length}</span></button>
            <button className="nav-link" onClick={() => setView("monitor")}>Monitor Sessions</button>
          </div>
        </aside>

        <main style={{ flex: 1 }}>
          {view === "createQuestion" && (
            <div className="card">
              <div className="section-title"><span>New Question</span></div>
              <form onSubmit={handleCreateQuestion}>
            <input
              className="input"
              placeholder="Question text"
              value={newQuestion.text}
              onChange={(e) =>
                setNewQuestion({ ...newQuestion, text: e.target.value })
              }
              required
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ fontSize: "0.75rem" }}>Section</label>
                <input
                  className="input"
                  placeholder="Section (e.g. A or general)"
                  value={newQuestion.section}
                  onChange={(e) => setNewQuestion({ ...newQuestion, section: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem" }}>Year</label>
                <select
                  className="input"
                  value={newQuestion.year}
                  onChange={(e) =>
                    setNewQuestion({ ...newQuestion, year: e.target.value })
                  }
                >
                  <option value="1">1st year</option>
                  <option value="2">2nd year</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ fontSize: "0.75rem" }}>Department</label>
                <input
                  className="input"
                  placeholder="Department (e.g. cse or general)"
                  value={newQuestion.department}
                  onChange={(e) => setNewQuestion({ ...newQuestion, department: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem" }}>Type</label>
                <select
                  className="input"
                  value={newQuestion.type}
                  onChange={(e) =>
                    setNewQuestion({ ...newQuestion, type: e.target.value })
                  }
                >
                  <option value="mcq">MCQ</option>
                  <option value="descriptive">Descriptive</option>
                </select>
              </div>
            </div>

            {newQuestion.type === "mcq" && (
              <div>
                {newQuestion.options.map((opt, idx) => (
                  <input
                    key={idx}
                    className="input"
                    placeholder={`Option ${idx + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const copy = [...newQuestion.options];
                      copy[idx] = e.target.value;
                      setNewQuestion({ ...newQuestion, options: copy });
                    }}
                    required
                  />
                ))}
                <div>
                  <label style={{ fontSize: "0.75rem" }}>
                    Correct option index (0-3)
                  </label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    max="3"
                    value={newQuestion.correctOptionIndex}
                    onChange={(e) =>
                      setNewQuestion({
                        ...newQuestion,
                        correctOptionIndex: Number(e.target.value),
                      })
                    }
                    required
                  />
                </div>
              </div>
            )}

              <button className="button button-primary" type="submit" style={{ marginTop: "0.5rem" }}>Add Question</button>
              </form>
            </div>
          )}

          {view === "createExam" && (
            <div className="card">
              <div className="section-title"><span>Create Exam</span></div>
              <form onSubmit={handleCreateExam}>
            <input
              className="input"
              placeholder="Exam name"
              value={examForm.name}
              onChange={(e) =>
                setExamForm({ ...examForm, name: e.target.value })
              }
              required
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ fontSize: "0.75rem" }}>Section</label>
                <input
                  className="input"
                  placeholder="Section (e.g. A or general)"
                  value={examForm.section}
                  onChange={(e) => setExamForm({ ...examForm, section: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem" }}>Year</label>
                <select
                  className="input"
                  value={examForm.year}
                  onChange={(e) =>
                    setExamForm({ ...examForm, year: e.target.value })
                  }
                >
                  <option value="1">1st year</option>
                  <option value="2">2nd year</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ fontSize: "0.75rem" }}>Department</label>
                <input
                  className="input"
                  placeholder="Department (e.g. cse or general)"
                  value={examForm.department}
                  onChange={(e) => setExamForm({ ...examForm, department: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem" }}>Duration (minutes)</label>
                <input
                  className="input"
                  type="number"
                  value={examForm.durationMinutes}
                  onChange={(e) =>
                    setExamForm({
                      ...examForm,
                      durationMinutes: Number(e.target.value),
                    })
                  }
                  required
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ fontSize: "0.75rem" }}>Start time</label>
                <input
                  className="input"
                  type="datetime-local"
                  value={examForm.startTime}
                  onChange={(e) =>
                    setExamForm({ ...examForm, startTime: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem" }}>End time</label>
                <input
                  className="input"
                  type="datetime-local"
                  value={examForm.endTime}
                  onChange={(e) =>
                    setExamForm({ ...examForm, endTime: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: "0.75rem" }}>Random questions</label>
              <input
                className="input"
                type="number"
                value={examForm.randomQuestionCount}
                onChange={(e) =>
                  setExamForm({
                    ...examForm,
                    randomQuestionCount: Number(e.target.value),
                  })
                }
                required
              />
            </div>

              <button className="button button-primary" type="submit" style={{ marginTop: "0.5rem" }}>Create Exam</button>
              </form>
            </div>
          )}

          {view === "questions" && (
            <div className="card card-soft">
              <div className="section-title"><span>Question Bank</span></div>
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Text</th>
                      <th>Section</th>
                      <th>Year</th>
                      <th>Dept</th>
                      <th>Type</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map((q) => (
                      <tr key={q.id}>
                        <td>{q.text}</td>
                        <td>{q.section}</td>
                        <td>{q.year}</td>
                        <td>{q.department}</td>
                        <td>{q.type}</td>
                        <td>
                          <button className="button button-ghost" onClick={() => handleDeleteQuestion(q.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                    {questions.length === 0 && <tr><td colSpan="6">No questions yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === "live" && (
            <div className="card">
              <div className="section-title"><span>Live Exams</span></div>
              <div style={{ display: "grid", gap: "0.6rem" }}>
                {liveExams.length === 0 && <div style={{ padding: "1rem" }}>No live exams right now.</div>}
                {liveExams.map((ex) => (
                  <div key={ex.id} className="card-soft" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{ex.name}</div>
                      <div style={{ fontSize: "0.85rem", opacity: 0.85 }}>{ex.section}</div>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <button className="button" onClick={() => handleSelectExam(ex.id)}>View Sessions</button>
                    </div>
                  </div>
                ))}
                {selectedExamId && (
                  <div>
                    <h4 style={{ marginTop: "0.75rem", marginBottom: "0.4rem" }}>Live / Past Sessions</h4>
                    <div className="table-wrapper">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>Status</th>
                            <th>Violations</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sessions.map((s) => (
                            <tr key={s.id}>
                              <td>{s.userId}</td>
                              <td>{s.status}{s.awaitingApproval ? ' (awaiting approval)' : ''}</td>
                              <td>{(s.violations || []).length}</td>
                              <td>
                                {s.awaitingApproval && (
                                  <>
                                    <button className="button button-primary" onClick={() => handleApproveSession(s.id, true)}>Approve</button>
                                    <button className="button button-danger" style={{ marginLeft: 8 }} onClick={() => handleApproveSession(s.id, false)}>Deny</button>
                                  </>
                                )}
                              </td>
                            </tr>
                          ))}
                          {sessions.length === 0 && <tr><td colSpan="3">No sessions yet.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {view === "monitor" && (
            <div className="card card-soft">
              <div className="section-title"><span>Monitor</span></div>
              <div style={{ padding: "0.6rem" }}>Select an exam from Live Exams to view session details and violations.</div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
