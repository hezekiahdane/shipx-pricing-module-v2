import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import '@/app/globals.css';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <html lang="en">
      <body className="font-body flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 p-6">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
