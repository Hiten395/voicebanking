import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import BottomNav from './components/BottomNav';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Transactions from './pages/Transactions';
import Transfer from './pages/Transfer';
import VoiceQuery from './pages/VoiceQuery';
import { useAuth } from './context/AuthContext';

const AppContent = () => {
    const { isAuthenticated } = useAuth();

    return (
        <>
            <Routes>
                <Route path="/" element={!isAuthenticated ? <Landing /> : <Navigate to="/dashboard" />} />
                <Route path="/auth" element={!isAuthenticated ? <Auth /> : <Navigate to="/dashboard" />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
                <Route path="/transfer" element={<ProtectedRoute><Transfer /></ProtectedRoute>} />
                <Route path="/voice" element={<ProtectedRoute><VoiceQuery /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
            {isAuthenticated && <BottomNav />}
        </>
    );
};

function App() {
    return (
        <Router>
            <AppContent />
        </Router>
    );
}

export default App;
