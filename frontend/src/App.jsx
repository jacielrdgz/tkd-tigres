import React, { useState, useEffect, Suspense, lazy } from 'react'
import { createBrowserRouter, RouterProvider, Outlet, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { precargarTodosLosModulos } from './utils/preloader'
import ProtectedRoute from './components/ProtectedRoute'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import SetupGuard from './components/SetupGuard'

// Páginas clave de entrada inmediata
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

// Páginas secundarias con code-splitting lazy (ahorro de ~90% de bundle inicial en móviles)
const Alumnos = lazy(() => import('./pages/Alumnos'))
const PerfilAlumno = lazy(() => import('./pages/PerfilAlumno'))
const Pagos = lazy(() => import('./pages/Pagos'))
const Asistencias = lazy(() => import('./pages/Asistencias'))
const AsistenciasAntiguo = lazy(() => import('./pages/AsistenciasAntiguo'))
const Eventos = lazy(() => import('./pages/Eventos'))
const EventoDetalle = lazy(() => import('./pages/EventoDetalle'))
const Examenes = lazy(() => import('./pages/Examenes'))
const ExamenDetalle = lazy(() => import('./pages/ExamenDetalle'))
const Register = lazy(() => import('./pages/Register'))
const Ajustes = lazy(() => import('./pages/Ajustes'))
const AjustesEscuela = lazy(() => import('./pages/ajustes/AjustesEscuela'))
const DojoInfo = lazy(() => import('./pages/ajustes/DojoInfo'))
const InstructorManager = lazy(() => import('./pages/ajustes/InstructorManager'))
const HorarioManager = lazy(() => import('./pages/ajustes/HorarioManager'))
const CintasSettings = lazy(() => import('./pages/ajustes/Cintas'))
const UsuariosSettings = lazy(() => import('./pages/ajustes/Usuarios'))

// Módulo SuperAdmin (pesado, totalmente aislado)
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminAcademias = lazy(() => import('./pages/admin/AdminAcademias'))
const AdminAcademiaDetalle = lazy(() => import('./pages/admin/AdminAcademiaDetalle'))
const AdminSolicitudes = lazy(() => import('./pages/admin/AdminSolicitudes'))
const AdminSuscripciones = lazy(() => import('./pages/admin/AdminSuscripciones'))
const AdminUsuarios = lazy(() => import('./pages/admin/AdminUsuarios'))
const AdminConfiguracion = lazy(() => import('./pages/admin/AdminConfiguracion'))

/**
 * Fallback visual ultraligero mientras se carga el chunk de una página
 */
function LazyFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '55vh', width: '100%' }}>
      <div style={{
        width: '32px',
        height: '32px',
        border: '3px solid var(--border)',
        borderTopColor: 'var(--accent-blue)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
    </div>
  )
}

function withLazy(Component, extraProps = {}) {
  return (
    <Suspense fallback={<LazyFallback />}>
      <Component {...extraProps} />
    </Suspense>
  )
}

/**
 * Layout principal con Sidebar (solo cuando está autenticado).
 */
function AppLayout() {
  const { user } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Precargar en segundo plano todos los módulos clave al entrar a la sesión
  useEffect(() => {
    if (user && !user.is_superadmin) {
      precargarTodosLosModulos(user)
    }
  }, [user])

  return (
    <div className="app-layout">
      {isMobile && <Topbar onToggleSidebar={() => setMobileOpen(true)} />}
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}

/**
 * Definición de rutas usando createBrowserRouter
 */
const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/register", element: withLazy(Register) },
  
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
          { path: "dashboard", element: withLazy(AdminDashboard) },
          { path: "academias", element: withLazy(AdminAcademias) },
          { path: "academias/:id", element: withLazy(AdminAcademiaDetalle) },
          { path: "solicitudes", element: withLazy(AdminSolicitudes) },
          { path: "suscripciones", element: withLazy(AdminSuscripciones) },
          { path: "usuarios", element: withLazy(AdminUsuarios) },
          { path: "configuracion", element: withLazy(AdminConfiguracion) },
        ]
      },
      // Módulo Ajustes (accesible para todos los usuarios autenticados)
      {
        path: "ajustes",
        element: <Outlet />,
        children: [
          { index: true, element: withLazy(Ajustes) },
          {
            path: "configuracion",
            element: (
              <ProtectedRoute allowedRoles={['owner', 'secretario']} requireTenant={true}>
                {withLazy(AjustesEscuela)}
              </ProtectedRoute>
            ),
            children: [
              { index: true, element: <Navigate to="general" replace /> },
              { path: "general", element: withLazy(DojoInfo) },
              { path: "instructores", element: withLazy(InstructorManager) },
              { path: "horarios", element: withLazy(HorarioManager) },
              { path: "cintas", element: withLazy(CintasSettings, { isEmbedded: true }) },
            ]
          },
          { 
            path: "usuarios", 
            element: (
              <ProtectedRoute allowedRoles={['owner']} requireTenant={true}>
                {withLazy(UsuariosSettings)}
              </ProtectedRoute>
            ) 
          },
        ]
      },
      // Sub-árbol de Tenant / Escuela (protegido globalmente para que el superadmin no entre)
      {
        element: (
          <ProtectedRoute requireTenant={true}>
            <SetupGuard>
              <Outlet />
            </SetupGuard>
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Dashboard /> },
          { path: "alumnos", element: withLazy(Alumnos) },
          { path: "alumnos/:id", element: withLazy(PerfilAlumno) },
          { path: "pagos", element: withLazy(Pagos) },
          { path: "asistencias", element: withLazy(Asistencias) },
          { path: "asistencias-antiguo", element: withLazy(AsistenciasAntiguo) },
          { path: "eventos", element: withLazy(Eventos) },
          { path: "eventos/:id", element: withLazy(EventoDetalle) },
          { path: "examenes", element: withLazy(Examenes) },
          { path: "examenes/:id", element: withLazy(ExamenDetalle) },
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