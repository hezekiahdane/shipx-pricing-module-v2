'use client';

interface DevPanelAsset {
  label: string;
  value: string;
}

interface AssetSectionProps {
  assets: DevPanelAsset[];
}

export function AssetSection({ assets }: AssetSectionProps) {
  return (
    <div className="border-b border-neutral-800 py-2">
      <p className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-600">
        Assets
      </p>
      {assets.map((asset) => (
        <div key={asset.label} className="flex items-center gap-2 px-4 py-1.5">
          <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-400 shadow-[0_0_6px_#4ade80]" />
          <span className="flex-1 text-xs text-neutral-300">{asset.label}</span>
          <span className="text-[10px] text-neutral-600">{asset.value}</span>
        </div>
      ))}
    </div>
  );
}
