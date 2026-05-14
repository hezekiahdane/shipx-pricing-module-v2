import type { Metadata } from 'next';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'Coming Soon',
  robots: { index: false, follow: false },
};

export default function MaintenanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
