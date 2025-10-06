// src/App.jsx
import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./frontend/pages/Dashboard";
import Login from "./frontend/pages/Login";
import Signup from "./frontend/pages/Signup";
import History from "./frontend/pages/History";
import Header from "./frontend/components/Header";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem("token"));

  const handleLoginSuccess = () => setIsAuthenticated(true);

  return (
    <Router>
      {isAuthenticated && <Header />}
      <Routes>
        <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
        <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/history" element={isAuthenticated ? <History /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
