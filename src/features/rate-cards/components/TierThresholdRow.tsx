'use client';

import { Check, Loader2, Pencil, X } from 'lucide-react';
import { Fragment, useState } from 'react';
import { updateTierThresholds } from '@/lib/database/actions/rate-cards';
import type { TierThreshold } from '@/lib/database/schema';

interface TierThresholdRowProps {
  tiers: TierThreshold[];
  colSpanPrefix: number;
}

function fmtThreshold(tier: TierThreshold, allTiers: TierThreshold[]): string {
  if (!tier.thresholdMinVnd) {
    const next = allTiers.find((t) => t.sortOrder === tier.sortOrder + 1);
    if (!next?.thresholdMinVnd) return '—';
    const m = Number(next.thresholdMinVnd) / 1_000_000;
    return `< ${m}M`;
  }
  const m = Number(tier.thresholdMinVnd) / 1_000_000;
  return `≥ ${m}M`;
}

function buildInitialDraft(tiers: TierThreshold[]): Record<string, string> {
  const draft: Record<string, string> = {};
  for (const t of tiers) {
    if (t.thresholdMinVnd !== null) {
      draft[t.tierKey] = String(Number(t.thresholdMinVnd) / 1_000_000);
    }
  }
  return draft;
}

export default function TierThresholdRow({
  tiers,
  colSpanPrefix,
}: TierThresholdRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleEdit() {
    setDraft(buildInitialDraft(tiers));
    setError(null);
    setEditing(true);
  }

  function handleCancel() {
    setDraft(buildInitialDraft(tiers));
    setError(null);
    setEditing(false);
  }

  async function handleSave() {
    const nonPublicTiers = tiers.filter((t) => t.thresholdMinVnd !== null);
    const updates = nonPublicTiers.map((t) => ({
      tierKey: t.tierKey,
      thresholdMinVnd: Math.round(
        parseFloat(draft[t.tierKey] ?? '') * 1_000_000,
      ),
    }));

    if (
      updates.some(
        (u) => Number.isNaN(u.thresholdMinVnd) || u.thresholdMinVnd <= 0,
      )
    ) {
      setError('All threshold values must be positive numbers.');
      return;
    }

    for (let i = 1; i < updates.length; i++) {
      if (updates[i].thresholdMinVnd <= updates[i - 1].thresholdMinVnd) {
        setError(
          'Thresholds must be strictly ascending (each tier higher than the previous).',
        );
        return;
      }
    }

    setSaving(true);
    setError(null);
    const result = await updateTierThresholds(updates);
    setSaving(false);

    if (result.error) {
      setError(result.error);
    } else {
      setEditing(false);
    }
  }

  return (
    <Fragment>
      <tr className="border-b bg-gray-50">
        <td
          colSpan={colSpanPrefix}
          className="px-3 py-1.5 text-xs font-bold text-gray-700"
        >
          {editing ? (
            <span className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                aria-label="Save thresholds"
                className="text-green-600 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                aria-label="Cancel editing"
                className="text-gray-400 disabled:opacity-50"
              >
                <X size={14} />
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={handleEdit}
              aria-label="Edit tier thresholds"
              className="mr-1 inline-flex items-center text-gray-400 hover:text-gray-600"
            >
              <Pencil size={14} />
            </button>
          )}
          Tier Revenue Threshold
        </td>
        {tiers.map((t) => (
          <td
            key={t.tierKey}
            className="px-3 py-1.5 text-center text-sm font-bold text-gray-700"
          >
            {editing && t.thresholdMinVnd !== null ? (
              <div className="flex items-center justify-center gap-1">
                <input
                  type="number"
                  min="0"
                  value={draft[t.tierKey] ?? ''}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      [t.tierKey]: e.target.value,
                    }))
                  }
                  className="w-20 text-center tabular-nums rounded border border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 text-sm py-0.5 px-1"
                />
                <span className="text-xs text-gray-400">M VND</span>
              </div>
            ) : (
              fmtThreshold(t, tiers)
            )}
          </td>
        ))}
      </tr>
      {error !== null && (
        <tr>
          <td
            colSpan={colSpanPrefix + tiers.length + 1}
            className="px-3 pb-1.5"
          >
            <p className="text-xs text-red-500">{error}</p>
          </td>
        </tr>
      )}
    </Fragment>
  );
}
