import { useEffect, useState } from "react";
import api from "../api/client";
import { useNavigate } from "react-router-dom";

export default function CandidateList() {
  const [candidates, setCandidates] = useState([]);
  const [status, setStatus] = useState("");
  const [keyword, setKeyword] = useState("");
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 20;
  const navigate = useNavigate();

  const fetchCandidates = async () => {
    const params = { offset, limit };
    if (status) params.status = status;
    if (keyword) params.keyword = keyword;
    const { data } = await api.get("/candidates/", { params });
    setCandidates(data.items);
    setTotal(data.total);
  };

  useEffect(() => { fetchCandidates(); }, [status, keyword, offset]);

  return (
    <div style={{ padding: 24 }}>
      <h2>Candidates</h2>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <select value={status} onChange={e => { setStatus(e.target.value); setOffset(0); }}>
          <option value="">All statuses</option>
          <option>new</option><option>reviewed</option><option>hired</option><option>rejected</option>
        </select>
        <input placeholder="Search…" value={keyword} onChange={e => { setKeyword(e.target.value); setOffset(0); }} />
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>{["Name","Email","Role","Status","Applied"].map(h => <th key={h} style={{ textAlign:"left", padding:"8px", borderBottom:"1px solid #eee" }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {candidates.map(c => (
            <tr key={c.id} onClick={() => navigate(`/candidates/${c.id}`)} style={{ cursor:"pointer" }}>
              <td style={{ padding: 8 }}>{c.name}</td>
              <td style={{ padding: 8 }}>{c.email}</td>
              <td style={{ padding: 8 }}>{c.role_applied}</td>
              <td style={{ padding: 8 }}><span style={{ padding:"2px 8px", borderRadius:12, background:"#eee", fontSize:12 }}>{c.status}</span></td>
              <td style={{ padding: 8 }}>{c.created_at?.slice(0,10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button disabled={offset === 0} onClick={() => setOffset(o => Math.max(0, o - limit))}>Prev</button>
        <span>{offset + 1}–{Math.min(offset + limit, total)} of {total}</span>
        <button disabled={offset + limit >= total} onClick={() => setOffset(o => o + limit)}>Next</button>
      </div>
    </div>
  );
}