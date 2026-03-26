'use client';

import { env } from '@/lib/core/env';

const ENV_LABEL: Record<string, string> = {
  development: 'Dev',
  test: 'Test',
  production: 'Live',
};

const VERCEL_LABEL: Record<string, string> = {
  preview: 'Staging',
  production: 'Live',
  development: 'Dev',
};

interface EnvSectionProps {
  projectName: string;
  locale: string;
}

export function EnvSection({ projectName, locale }: EnvSectionProps) {
  const vercelEnv = env.NEXT_PUBLIC_VERCEL_ENV;
  const nodeEnv = process.env.NODE_ENV; // NODE_ENV: Next.js static analysis exception
  const envLabel = vercelEnv
    ? (VERCEL_LABEL[vercelEnv] ?? vercelEnv)
    : (ENV_LABEL[nodeEnv] ?? nodeEnv);

  return (
    <div className="border-b border-neutral-800 py-2">
      <p className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-600">
        Environment
      </p>
      <div className="grid grid-cols-2 gap-1.5 px-4">
        {[
          { key: 'Project', value: projectName },
          { key: 'Env', value: envLabel },
          { key: 'Lang', value: locale },
          { key: 'Next.js', value: '16' },
        ].map(({ key, value }) => (
          <div key={key}>
            <p className="text-[9px] uppercase tracking-wider text-neutral-600">
              {key}
            </p>
            <p className="text-[11px] text-blue-400">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
