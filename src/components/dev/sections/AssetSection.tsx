'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const COLLAPSED_COUNT = 3;

interface ScannedAsset {
  type: 'img' | 'video' | 'svg';
  label: string;
  value: string;
}

function scanAssets(): ScannedAsset[] {
  const imgs = Array.from(document.querySelectorAll('img[src]')).map((el) => {
    const img = el as HTMLImageElement;
    return {
      type: 'img' as const,
      label: img.alt || img.src.split('/').pop() || 'image',
      value:
        img.naturalWidth && img.naturalHeight
          ? `${img.naturalWidth}×${img.naturalHeight}`
          : '—',
    };
  });
  const videos = Array.from(document.querySelectorAll('video[src]')).map(
    (el) => {
      const vid = el as HTMLVideoElement;
      return {
        type: 'video' as const,
        label:
          vid.getAttribute('aria-label') || vid.src.split('/').pop() || 'video',
        value: vid.src.split('/').pop() ?? '',
      };
    },
  );
  const svgs = Array.from(
    document.querySelectorAll('svg[data-src], svg[aria-label]'),
  ).map((el) => ({
    type: 'svg' as const,
    label:
      el.getAttribute('aria-label') || el.getAttribute('data-src') || 'svg',
    value: '',
  }));
  return [...imgs, ...videos, ...svgs];
}

export function AssetSection() {
  const pathname = usePathname();
  const [assets, setAssets] = useState<ScannedAsset[]>([]);
  const [expanded, setExpanded] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname triggers re-scan on route change
  useEffect(() => {
    const timer = setTimeout(() => {
      setAssets(scanAssets());
      setExpanded(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [pathname]);

  const visible = expanded ? assets : assets.slice(0, COLLAPSED_COUNT);
  const hiddenCount = assets.length - COLLAPSED_COUNT;

  return (
    <div className="border-b border-neutral-800 py-2">
      <p className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-600">
        Assets
      </p>
      {assets.length === 0 ? (
        <p className="px-4 py-1 text-[10px] text-neutral-700">
          No assets detected.
        </p>
      ) : (
        <>
          {visible.map((asset, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: stable scan index
              key={`${asset.label}-${i}`}
              className="flex items-center gap-2 px-4 py-1.5"
            >
              <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-400 shadow-[0_0_6px_#4ade80]" />
              <span className="flex-1 truncate text-xs text-neutral-300">
                {asset.label}
              </span>
              <span className="text-[10px] text-neutral-600">
                {asset.value}
              </span>
            </div>
          ))}
          {!expanded && hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="w-full px-4 py-1 text-left text-[10px] text-neutral-600 hover:text-neutral-400"
            >
              Show {hiddenCount} more
            </button>
          )}
          {expanded && assets.length > COLLAPSED_COUNT && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="w-full px-4 py-1 text-left text-[10px] text-neutral-600 hover:text-neutral-400"
            >
              Show less
            </button>
          )}
        </>
      )}
    </div>
  );
}
