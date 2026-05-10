import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import CandidateList from "./pages/CandidateList";
import CandidateDetail from "./pages/CandidateDetail";

function PrivateRoute({ children }) {
  return localStorage.getItem("token") ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/candidates" element={<PrivateRoute><CandidateList /></PrivateRoute>} />
        <Route path="/candidates/:id" element={<PrivateRoute><CandidateDetail /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}