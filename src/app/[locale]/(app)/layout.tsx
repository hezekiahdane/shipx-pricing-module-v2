import Link from 'next/link';
import { redirect } from 'next/navigation';
import { signOut } from '@/features/auth/actions';
import { createClient } from '@/lib/auth/clients/server';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect('/login');

  return (
    <div>
      <header className="flex items-center justify-between border-b bg-white px-6 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          Rate Cards
        </Link>
        <form action={signOut}>
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
