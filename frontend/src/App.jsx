import React, { useState, useEffect } from 'react'
import { createBrowserRouter, RouterProvider, Outlet, useLocation, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import { AuthProvider } from './context/AuthContext'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Dashboard from './pages/Dashboard'
import Alumnos from './pages/Alumnos'
import Pagos from './pages/Pagos'
import Asistencias from './pages/Asistencias'
import AsistenciasAntiguo from './pages/AsistenciasAntiguo'
import Eventos from './pages/Eventos'
import EventoDetalle from './pages/EventoDetalle'
import Examenes from './pages/Examenes'
import ExamenDetalle from './pages/ExamenDetalle'
import Login from './pages/Login'
import Register from './pages/Register'
import Ajustes from './pages/Ajustes'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminAcademias from './pages/admin/AdminAcademias'
import AdminAcademiaDetalle from './pages/admin/AdminAcademiaDetalle'
import AdminSolicitudes from './pages/admin/AdminSolicitudes'
import AdminSuscripciones from './pages/admin/AdminSuscripciones'
import AdminUsuarios from './pages/admin/AdminUsuarios'
import AdminConfiguracion from './pages/admin/AdminConfiguracion'
import CintasSettings from './pages/ajustes/Cintas'
import AjustesEscuela from './pages/ajustes/AjustesEscuela'
import UsuariosSettings from './pages/ajustes/Usuarios'
import SetupGuard from './components/SetupGuard'
import PerfilAlumno from './pages/PerfilAlumno'

/**
 * Layout principal con Sidebar (solo cuando está autenticado).
 */
function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <div className="app-layout">
      {isMobile && <Topbar onToggleSidebar={() => setMobileOpen(true)} />}
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <main className="app-main" style={isMobile ? { paddingTop: '60px' } : {}}>
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
      // Sub-árbol de SuperAdmin (protegido globalmente)
      {
        path: "admin",
        element: (
          <ProtectedRoute requireSuperAdmin={true}>
            <Outlet />
          </ProtectedRoute>
        ),
        children: [
          { path: "dashboard", element: <AdminDashboard /> },
          { path: "academias", element: <AdminAcademias /> },
          { path: "academias/:id", element: <AdminAcademiaDetalle /> },
          { path: "solicitudes", element: <AdminSolicitudes /> },
          { path: "suscripciones", element: <AdminSuscripciones /> },
          { path: "usuarios", element: <AdminUsuarios /> },
          { path: "configuracion", element: <AdminConfiguracion /> },
        ]
      },
      // Módulo Ajustes (accesible para todos los usuarios autenticados)
      {
        path: "ajustes",
        element: <Outlet />,
        children: [
          { index: true, element: <Ajustes /> },
          {
            path: "configuracion",
            element: (
              <ProtectedRoute allowedRoles={['owner', 'secretario']} requireTenant={true}>
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
              <ProtectedRoute allowedRoles={['owner']} requireTenant={true}>
                <UsuariosSettings />
              </ProtectedRoute>
            ) 
          },
        ]
      },
      // Sub-árbol de Tenant / Escuela (protegido globalmente para que el superadmin no entre)
      {
        element: (
          <ProtectedRoute requireTenant={true}>
            <Outlet />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Dashboard /> },
          { path: "alumnos", element: <SetupGuard><Alumnos /></SetupGuard> },
          { path: "alumnos/:id", element: <SetupGuard><PerfilAlumno /></SetupGuard> },
          { path: "pagos", element: <SetupGuard><Pagos /></SetupGuard> },
          { path: "asistencias", element: <SetupGuard><Asistencias /></SetupGuard> },
          { path: "asistencias-antiguo", element: <SetupGuard><AsistenciasAntiguo /></SetupGuard> },
          { path: "eventos", element: <SetupGuard><Eventos /></SetupGuard> },
          { path: "eventos/:id", element: <SetupGuard><EventoDetalle /></SetupGuard> },
          { path: "examenes", element: <SetupGuard><Examenes /></SetupGuard> },
          { path: "examenes/:id", element: <SetupGuard><ExamenDetalle /></SetupGuard> },
        ]
      }
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