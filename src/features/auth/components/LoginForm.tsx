'use client';
import { useActionState } from 'react';
import { signIn } from '../actions';

export default function LoginForm() {
  const [state, action, pending] = useActionState(signIn, undefined);

  return (
    <form action={action} className="w-80 space-y-3">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <input
        name="email"
        type="email"
        placeholder="Email"
        required
        className="w-full rounded border p-2"
      />
      <input
        name="password"
        type="password"
        placeholder="Password"
        required
        className="w-full rounded border p-2"
      />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-black p-2 text-white disabled:opacity-50"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
