import Link from 'next/link';
import { signOut } from '@/auth';
import { siteConfig } from '@/lib/core/config/site';

// Server Component — only rendered inside the authenticated (app) route group.
export default function Navbar() {
  return (
    <nav className="flex items-center justify-between border-b bg-white px-6 py-3">
      <div className="flex items-center gap-6">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-gray-900"
        >
          {siteConfig.name}
        </Link>
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">
          Rate Cards
        </Link>
      </div>

      <form
        action={async () => {
          'use server';
          await signOut({ redirectTo: '/login' });
        }}
      >
        <button
          type="submit"
          className="text-sm text-gray-500 transition-colors hover:text-gray-900"
        >
          Sign out
        </button>
      </form>
    </nav>
  );
}
