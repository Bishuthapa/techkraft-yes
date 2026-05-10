import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/client";

export default function CandidateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [category, setCategory] = useState("");
  const [score, setScore] = useState(3);
  const [note, setNote] = useState("");
  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  useEffect(() => {
    api.get(`/candidates/${id}`).then(r => setCandidate(r.data));
  }, [id]);

  const submitScore = async () => {
    await api.post(`/candidates/${id}/scores`, { category, score: parseInt(score), note });
    const r = await api.get(`/candidates/${id}`);
    setCandidate(r.data);
    setNote(""); setCategory("");
  };

  const generateSummary = async () => {
    setSummaryLoading(true); setSummaryError(""); setSummary("");
    try {
      const { data } = await api.post(`/candidates/${id}/summary`);
      setSummary(data.summary);
    } catch {
      setSummaryError("Failed to generate summary. Try again.");
    } finally {
      setSummaryLoading(false);
    }
  };

  if (!candidate) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={{ padding: 24, maxWidth: 700 }}>
      <button onClick={() => navigate("/candidates")}>← Back</button>
      <h2 style={{ marginTop: 16 }}>{candidate.name}</h2>
      <p>{candidate.email} · {candidate.role_applied} · <strong>{candidate.status}</strong></p>
      <p>Skills: {candidate.skills?.join(", ")}</p>

      {candidate.internal_notes !== undefined && (
        <div style={{ background:"#fff8e1", padding:12, borderRadius:8, margin:"16px 0" }}>
          <strong>🔒 Admin Notes:</strong>
          <p style={{ marginTop:6 }}>{candidate.internal_notes || "None"}</p>
        </div>
      )}

      <h3 style={{ marginTop: 20 }}>Scores</h3>
      {candidate.scores?.length === 0 && <p style={{ color:"#999" }}>No scores yet.</p>}
      {candidate.scores?.map(s => (
        <div key={s.id} style={{ padding:"8px 0", borderBottom:"1px solid #eee" }}>
          <strong>{s.category}</strong>: {"★".repeat(s.score)}{"☆".repeat(5-s.score)} {s.note && `— ${s.note}`}
        </div>
      ))}

      <h3 style={{ marginTop: 20 }}>Add Score</h3>
      <div style={{ display:"flex", flexDirection:"column", gap:8, maxWidth:360 }}>
        <select value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">Select category…</option>
          {["Technical Skills","Communication","Problem Solving","Cultural Fit","Leadership"].map(c =>
            <option key={c}>{c}</option>
          )}
        </select>
        <select value={score} onChange={e => setScore(e.target.value)}>
          {[1,2,3,4,5].map(n => <option key={n}>{n}</option>)}
        </select>
        <textarea placeholder="Optional note…" value={note} onChange={e => setNote(e.target.value)} rows={3} />
        <button onClick={submitScore} disabled={!category}>Submit Score</button>
      </div>

      <h3 style={{ marginTop: 20 }}>AI Summary</h3>
      <button onClick={generateSummary} disabled={summaryLoading}>
        {summaryLoading ? "Generating…" : "Generate AI Summary"}
      </button>
      {summaryLoading && <p style={{ color:"#999" }}>⏳ Calling AI… please wait</p>}
      {summaryError && <p style={{ color:"red" }}>{summaryError}</p>}
      {summary && <div style={{ marginTop:10, padding:12, background:"#f5f5f5", borderRadius:8 }}>{summary}</div>}
    </div>
  );
}