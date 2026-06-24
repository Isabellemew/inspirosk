import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase.js";

import Login from "./pages/Login.jsx";
import RegisterStudent from "./pages/Registerstudent.jsx";
import RegisterProfessor from "./pages/Registerpofessor.jsx";
import RegisterAdmin from "./pages/Registeradmin.jsx";
import RegisterIndependent from "./pages/Registerindependent.jsx";
import RegisterBusiness from "./pages/Registerbusiness.jsx";
import DashboardStudent from "./pages/DashboardStudent.jsx";
import DashboardProfessor from "./pages/DashboardProfessor.jsx";
import DashboardAdmin from "./pages/DashboardAdmin.jsx";
import DashboardIndependent from "./pages/DashboardIndependent.jsx";
import DashboardBusiness from "./pages/DashboardBusiness.jsx";
import Landing from "./pages/Landing.jsx";

function PrivateRoute({ children }) {
  const [user, setUser] = useState(undefined);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  if (user === undefined) return null;
  return user ? children : <Navigate to="/landing" replace />;
}

export default function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem("inspiro-theme") || "cosmic-dark";
    document.body.setAttribute("data-theme", savedTheme);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/register/student" element={<RegisterStudent />} />
        <Route path="/register/professor" element={<RegisterProfessor />} />
        <Route path="/register/admin" element={<RegisterAdmin />} />
        <Route path="/register/independent" element={<RegisterIndependent />} />
        <Route path="/register/business" element={<RegisterBusiness />} />

        <Route path="/dashboardStudent" element={<PrivateRoute><DashboardStudent /></PrivateRoute>} />
        <Route path="/dashboardProfessor" element={<PrivateRoute><DashboardProfessor /></PrivateRoute>} />
        <Route path="/dashboardAdmin" element={<PrivateRoute><DashboardAdmin /></PrivateRoute>} />
        <Route path="/dashboardIndependent" element={<PrivateRoute><DashboardIndependent /></PrivateRoute>} />
        <Route path="/dashboardBusiness" element={<PrivateRoute><DashboardBusiness /></PrivateRoute>} />

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}