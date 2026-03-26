'use client';

import { useParams, usePathname, useRouter } from 'next/navigation';
import type { DevPanelPage, PageStatus } from '../index';

const STATUS_BADGE: Record<PageStatus, { label: string; className: string }> = {
  active: {
    label: 'ACTIVE',
    className: 'bg-green-900/50 text-green-400 border border-green-700',
  },
  done: {
    label: 'DONE',
    className: 'bg-neutral-800 text-neutral-500 border border-neutral-700',
  },
  wip: {
    label: 'WIP',
    className: 'bg-yellow-900/50 text-yellow-400 border border-yellow-700',
  },
  todo: {
    label: 'TODO',
    className: 'bg-neutral-900 text-neutral-600 border border-neutral-800',
  },
};

const DOT_CLASS: Record<PageStatus, string> = {
  active: 'bg-green-400 shadow-[0_0_6px_#4ade80]',
  done: 'bg-neutral-600 border border-neutral-500',
  wip: 'bg-yellow-400',
  todo: 'bg-neutral-700',
};

interface PagesSectionProps {
  pages: DevPanelPage[];
}

export function PagesSection({ pages }: PagesSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const locale = typeof params?.locale === 'string' ? params.locale : '';

  return (
    <div className="border-b border-neutral-800 py-2">
      <p className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-600">
        Pages
      </p>
      {pages.map((page) => {
        const isCurrentPage =
          pathname === page.path || pathname.endsWith(page.path);
        const badge = STATUS_BADGE[page.status];
        return (
          <button
            key={page.path}
            type="button"
            onClick={() =>
              router.push(locale ? `/${locale}${page.path}` : page.path)
            }
            className={`flex w-full items-center justify-between px-4 py-1.5 text-left transition-colors hover:bg-neutral-800/60 ${isCurrentPage ? 'bg-neutral-800/60' : ''}`}
          >
            <span className="flex items-center gap-2.5">
              <span
                className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${DOT_CLASS[page.status]}`}
              />
              <span
                className={`text-xs ${isCurrentPage ? 'text-blue-400' : 'text-neutral-300'}`}
              >
                {page.label}
              </span>
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider ${badge.className}`}
            >
              {badge.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
