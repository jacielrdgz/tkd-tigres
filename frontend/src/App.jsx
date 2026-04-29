import { createBrowserRouter, RouterProvider, Outlet, useLocation, Navigate } from 'react-router-dom'
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
 * Esto permite usar hooks como useBlocker y usePrompt.
 */
const router = createBrowserRouter([
  // Rutas públicas
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  
  // Rutas protegidas (con Layout)
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
      { path: "eventos", element: <Eventos /> },
      { path: "ajustes", element: <Ajustes /> },
      { path: "ajustes/cintas", element: <CintasSettings /> },
    ]
  },
  // Redirección por defecto
  { path: "*", element: <Navigate to="/" replace /> }
])

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      
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
    </AuthProvider>
  )
}