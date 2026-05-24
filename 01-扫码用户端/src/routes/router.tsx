import { createHashRouter, Navigate } from 'react-router-dom';
import { AppShell } from '../app/AppShell';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProtectedRoute } from '../components/ProtectedRoute';

export function createAppRouter(
  basicPage: React.ReactNode,
  smsVerifyPage: React.ReactNode,
  healthPage: React.ReactNode,
  medicationPage: React.ReactNode,
  scalePage: React.ReactNode,
  scaleDetailPage: React.ReactNode,
  nameplatePage: React.ReactNode
) {
  return createHashRouter([
    {
      path: '/',
      element: <AppShell />,
      children: [
        { index: true, element: basicPage },
        { path: 'verify', element: smsVerifyPage },
        { path: 'health', element: <ProtectedRoute>{healthPage}</ProtectedRoute> },
        { path: 'medication', element: <ProtectedRoute>{medicationPage}</ProtectedRoute> },
        { path: 'scale', element: <ProtectedRoute>{scalePage}</ProtectedRoute> },
        { path: 'scale/:scaleName', element: <ProtectedRoute>{scaleDetailPage}</ProtectedRoute> },
        { path: 'nameplate', element: nameplatePage },
        { path: '404', element: <NotFoundPage /> },
        { path: '*', element: <Navigate to="/404" replace /> },
      ],
    },
  ]);
}
