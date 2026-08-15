import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Tablero from './pages/Tablero';
import EstructuraOrganizacional from './pages/EstructuraOrganizacional';
import Reclutamiento from './pages/Reclutamiento';
import Evaluaciones from './pages/Evaluaciones';
import Ausencias from './pages/Ausencias';
import Disciplina from './pages/Disciplina';
import Capacitacion from './pages/Capacitacion';

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Tablero /> },
      { path: 'estructura', element: <EstructuraOrganizacional /> },
      { path: 'reclutamiento', element: <Reclutamiento /> },
      { path: 'evaluaciones', element: <Evaluaciones /> },
      { path: 'ausencias', element: <Ausencias /> },
      { path: 'disciplina', element: <Disciplina /> },
      { path: 'capacitacion', element: <Capacitacion /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
