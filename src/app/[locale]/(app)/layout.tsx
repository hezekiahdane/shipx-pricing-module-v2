import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, signOut } from '@/auth';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <div>
      <header className="flex items-center justify-between border-b bg-white px-6 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          Rate Cards
        </Link>
        <form
          action={async () => {
            'use server';
            await signOut({ redirectTo: '/login' });
          }}
        >
          <button
            type="submit"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            Sign out
          </button>
        </form>
      </header>
      <div className="p-6">{children}</div>
    </div>
  );
}
