import { createBrowserRouter, RouterProvider, Outlet, useLocation, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import { AuthProvider } from './context/AuthContext'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Alumnos from './pages/Alumnos'
import Pagos from './pages/Pagos'
import Asistencias from './pages/Asistencias'
import AsistenciasAntiguo from './pages/AsistenciasAntiguo'
import Eventos from './pages/Eventos'
import EventoDetalle from './pages/EventoDetalle'
import Login from './pages/Login'
import Register from './pages/Register'
import Ajustes from './pages/Ajustes'
import CintasSettings from './pages/ajustes/Cintas'
import AjustesEscuela from './pages/ajustes/AjustesEscuela'
import UsuariosSettings from './pages/ajustes/Usuarios'

/**
 * Layout principal con Sidebar (solo cuando está autenticado).
 */
function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}

/**
 * Definición de rutas usando createBrowserRouter (Data Router)
 */
import DojoInfo from './pages/ajustes/DojoInfo'
import InstructorManager from './pages/ajustes/InstructorManager'
import HorarioManager from './pages/ajustes/HorarioManager'

const router = createBrowserRouter([
  // ... (rutas públicas)
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: "alumnos", element: <Alumnos /> },
      { path: "pagos", element: <Pagos /> },
      { path: "asistencias", element: <Asistencias /> },
      { path: "asistencias-antiguo", element: <AsistenciasAntiguo /> },
      { path: "eventos", element: <Eventos /> },
      { path: "eventos/:id", element: <EventoDetalle /> },
      {
        path: "ajustes",
        element: <Outlet />,
        children: [
          { index: true, element: <Ajustes /> },
          {
            path: "configuracion",
            element: (
              <ProtectedRoute allowedRoles={['owner', 'secretario']}>
                <AjustesEscuela />
              </ProtectedRoute>
            ),
            children: [
              { index: true, element: <Navigate to="general" replace /> },
              { path: "general", element: <DojoInfo /> },
              { path: "instructores", element: <InstructorManager /> },
              { path: "horarios", element: <HorarioManager /> },
              { path: "cintas", element: <CintasSettings isEmbedded /> },
            ]
          },
          { 
            path: "usuarios", 
            element: (
              <ProtectedRoute allowedRoles={['owner']}>
                <UsuariosSettings />
              </ProtectedRoute>
            ) 
          },
        ]
      },
    ]
  },
  { path: "*", element: <Navigate to="/" replace /> }
])

function AppContent() {
  const { theme } = useTheme();

  return (
    <>
      <RouterProvider router={router} />
      
      <ToastContainer
        position="top-right"
        autoClose={2500}
        hideProgressBar={true}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme={theme === 'dark' ? 'dark' : 'light'}
        toastStyle={{
          background: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          fontSize: '14px',
          padding: '12px 16px',
          fontFamily: 'Inter, sans-serif',
        }}
      />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  )
}