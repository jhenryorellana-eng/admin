import type { Metadata } from 'next';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { MainLayout } from '@/components/layout/MainLayout';
import { ToastContainer, ConfirmDialog } from '@/components/ui';
import './globals.css';

export const metadata: Metadata = {
  title: 'Starbiz Admin',
  description: 'Panel de administración de Starbiz Academy',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head />
      <body>
        <AuthGuard>
          <MainLayout>{children}</MainLayout>
        </AuthGuard>
        <ToastContainer />
        <ConfirmDialog />
      </body>
    </html>
  );
}
