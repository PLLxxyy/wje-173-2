import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import FamilyDashboard from './pages/FamilyDashboard';
import WorkerDashboard from './pages/WorkerDashboard';
import VolunteerDashboard from './pages/VolunteerDashboard';
import MainLayout from './components/MainLayout';

const App = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    } else if (location.pathname !== '/login') {
      navigate('/login', { replace: true });
    }
  }, [navigate, location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login', { replace: true });
  };

  const getDashboard = () => {
    if (!user) return <Navigate to="/login" replace />;
    switch (user.role) {
      case 'admin':
        return <AdminDashboard />;
      case 'family':
        return <FamilyDashboard />;
      case 'worker':
        return <WorkerDashboard />;
      case 'volunteer':
        return <VolunteerDashboard />;
      default:
        return <Navigate to="/login" replace />;
    }
  };

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          user ? (
            <MainLayout user={user} onLogout={handleLogout}>
              {getDashboard()}
            </MainLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
};

export default App;
