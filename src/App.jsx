import { Navigate, Route, Routes } from "react-router-dom";
import Booth from "./pages/Booth.jsx";
import Guest from "./pages/Guest.jsx";
import Host from "./pages/Host.jsx";
import Marketing from "./pages/Marketing.jsx";
import NewGroup from "./pages/NewGroup.jsx";
import Stand from "./pages/Stand.jsx";
import Wall from "./pages/Wall.jsx";

export default function App() {
  return (
    <>
      <div className="lamp" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <Routes>
        <Route path="/" element={<Marketing />} />
        <Route path="/new" element={<NewGroup />} />
        <Route path="/host/:id" element={<Host />} />
        <Route path="/stand/:id" element={<Stand />} />
        <Route path="/g/:id" element={<Wall />} />
        <Route path="/g/:id/add" element={<Guest />} />
        <Route path="/g/:id/booth" element={<Booth />} />
        <Route path="/admin" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
