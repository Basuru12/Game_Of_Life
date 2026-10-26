import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { CreateAvatarPage } from "./pages/CreateAvatarPage";
import { LoginPage } from "./pages/LoginPage";
import { QuestsPage } from "./pages/QuestsPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/create"
          element={
            <ProtectedRoute>
              <CreateAvatarPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quests"
          element={
            <ProtectedRoute>
              <QuestsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}
