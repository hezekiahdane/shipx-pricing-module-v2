import * as nodeFs from 'node:fs';
import { join } from 'node:path';
import { NotFoundError } from '@/lib/core/api/errors';
import { successResponse } from '@/lib/core/api/response';
import { withApi } from '@/lib/core/api/with-api';
import { env } from '@/lib/core/env';

function deriveLabel(path: string): string {
  if (path === '/') return 'Home';
  const segment = path.split('/').filter(Boolean).pop() ?? '';
  return segment
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function walkPages(
  dir: string,
  base = '',
): Array<{ path: string; label: string }> {
  const pages: Array<{ path: string; label: string }> = [];
  try {
    const entries = nodeFs.readdirSync(dir, { withFileTypes: true });
    if (entries.some((e) => e.name === 'page.tsx' || e.name === 'page.ts')) {
      const path = base || '/';
      pages.push({ path, label: deriveLabel(path) });
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('_')) continue;
      // Route groups (groupName) don't affect URL — recurse without adding segment
      const isGroup = entry.name.startsWith('(') && entry.name.endsWith(')');
      const nextBase = isGroup ? base : `${base}/${entry.name}`;
      pages.push(...walkPages(join(dir, entry.name), nextBase));
    }
  } catch {
    // Directory doesn't exist — return empty
  }
  return pages;
}

export const GET = withApi({ csrf: false }, async () => {
  const isDev =
    process.env.NODE_ENV === 'development' || // NODE_ENV: Next.js static analysis exception
    env.NEXT_PUBLIC_VERCEL_ENV === 'preview';

  if (!isDev) throw new NotFoundError('Not found');

  const appDir = join(process.cwd(), 'src', 'app', '[locale]');
  const pages = walkPages(appDir);

  return successResponse({ pages });
});
