import { Routes, Route, Navigate } from "react-router-dom";
import AdminDashboard from "./AdminDashboard.jsx";
import GroupPage from "./GroupPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/g/demo" replace />} />
      <Route path="/g/:slug" element={<GroupPage />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="*" element={<Navigate to="/g/demo" replace />} />
    </Routes>
  );
}

