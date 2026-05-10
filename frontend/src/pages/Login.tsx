import { useState } from "react";
import api from "../api/client";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const form = new FormData();
      form.append("username", email);
      form.append("password", password);
      const { data } = await api.post("/auth/login", form);
      localStorage.setItem("token", data.access_token);
      navigate("/candidates");
    } catch {
      setError("Invalid credentials");
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: 80 }}>
      <form onSubmit={handleLogin} style={{ width: 320 }}>
        <h2>TechKraft Login</h2>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: "100%", marginBottom: 10 }} />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: "100%", marginBottom: 10 }} />
        <button type="submit" style={{ width: "100%" }}>Sign In</button>
      </form>
    </div>
  );
}