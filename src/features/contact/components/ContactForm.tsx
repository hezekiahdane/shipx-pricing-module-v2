'use client';

import { useState } from 'react';
import { useSimulatedState } from '@/components/dev/useSimulatedState';

type FormState = 'idle' | 'loading' | 'success' | 'error';

export function ContactForm() {
  const [formState, setFormState] = useState<FormState>('idle');
  const simState = useSimulatedState(
    'contact-form',
    'Contact Form',
    ['idle', 'loading', 'success', 'error'],
    'idle',
  ) as FormState;

  // Simulated state overrides real state — display only, no API calls fired
  const activeState: FormState = simState !== 'idle' ? simState : formState;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormState('loading');
    try {
      const data = Object.fromEntries(new FormData(e.currentTarget));
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      setFormState(res.ok ? 'success' : 'error');
    } catch {
      setFormState('error');
    }
  }

  if (activeState === 'success') {
    return (
      <div className="rounded-lg bg-green-50 p-6 text-center">
        <p className="text-lg font-semibold text-green-800">Message sent!</p>
        <p className="mt-1 text-sm text-green-700">
          We'll be in touch shortly.
        </p>
      </div>
    );
  }

  if (activeState === 'error') {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-center">
        <p className="text-lg font-semibold text-red-800">
          Something went wrong
        </p>
        <p className="mt-1 text-sm text-red-700">Please try again later.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-neutral-700"
        >
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-neutral-700"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div>
        <label
          htmlFor="message"
          className="block text-sm font-medium text-neutral-700"
        >
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          required
          className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <button
        type="submit"
        disabled={activeState === 'loading'}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {activeState === 'loading' ? 'Sending\u2026' : 'Send'}
      </button>
    </form>
  );
}
