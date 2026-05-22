import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Landing } from "./Landing";
import Coverage from "./Coverage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/coverage" element={<Coverage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
