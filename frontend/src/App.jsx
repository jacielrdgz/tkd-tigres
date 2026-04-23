import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Alumnos from './pages/Alumnos'
import Pagos from './pages/Pagos'
import Asistencias from './pages/Asistencias'
import Eventos from './pages/Eventos'
import Login from './pages/Login'
import Register from './pages/Register'
import Ajustes from './pages/Ajustes'
import CintasSettings from './pages/ajustes/Cintas'

/**
 * Layout principal con Sidebar (solo cuando está autenticado).
 */
function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">
        {children}
      </main>
    </div>
  )
}

/**
 * Componente raíz con routing.
 */
function AppRoutes() {
  const location = useLocation()
  const isAuthPage = ['/login', '/register'].includes(location.pathname)

  // Rutas de auth se renderizan sin layout
  if (isAuthPage) {
    return (
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    )
  }

  // Rutas protegidas con layout
  return (
    <ProtectedRoute>
      <AppLayout>
        <Routes>
          <Route path="/"            element={<Dashboard />} />
          <Route path="/alumnos"     element={<Alumnos />} />
          <Route path="/pagos"       element={<Pagos />} />
          <Route path="/asistencias" element={<Asistencias />} />
          <Route path="/eventos"     element={<Eventos />} />
          <Route path="/ajustes"     element={<Ajustes />} />
          <Route path="/ajustes/cintas" element={<CintasSettings />} />
        </Routes>
      </AppLayout>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />

        {/* 🔥 TOAST GLOBAL */}
        <ToastContainer
          position="top-right"
          autoClose={2500}
          hideProgressBar={true}
          newestOnTop
          closeOnClick
          pauseOnHover
          theme="dark"
          toastStyle={{
            background: '#13151f',
            color: '#e2e8f0',
            border: '1px solid #1e2130',
            borderRadius: '10px',
            fontSize: '14px',
            padding: '12px 16px',
            fontFamily: 'Inter, sans-serif',
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  )
}