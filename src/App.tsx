import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import WeightPage from './pages/WeightPage';
import InsightsPage from './pages/InsightsPage';
import Settings from './pages/Settings';
import LoginPage from './pages/LoginPage';
import AuthGuard from './components/AuthGuard';
import { AuthProvider } from './contexts/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route path="/" element={<AuthGuard><Layout /></AuthGuard>}>
          <Route index element={<Dashboard />} />
          <Route path="history" element={<History />} />
          <Route path="weight" element={<WeightPage />} />
          <Route path="insights" element={<InsightsPage />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
