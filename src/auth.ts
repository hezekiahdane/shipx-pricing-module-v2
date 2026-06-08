import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { getDb } from '@/lib/database';
import { users } from '@/lib/database/schema';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const db = getDb();
        const rows = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email as string));
        const user = rows[0];
        if (!user) return null;
        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        );
        if (!valid) return null;
        return { id: String(user.id), email: user.email, name: user.name };
      },
    }),
  ],
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
});
