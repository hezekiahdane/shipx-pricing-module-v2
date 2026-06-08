'use server';
import { AuthError } from 'next-auth';
import { signIn as authSignIn } from '@/auth';

export async function signIn(_prev: unknown, formData: FormData) {
  try {
    await authSignIn('credentials', {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      redirectTo: '/',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Invalid email or password' };
    }
    throw error; // rethrow Next.js redirect errors
  }
}
