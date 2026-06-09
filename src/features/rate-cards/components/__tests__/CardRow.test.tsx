import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TierThreshold } from '@/lib/database/schema';

// Mock the server action
vi.mock('@/lib/database/actions/rate-cards', () => ({
  updateRateCardDiscounts: vi.fn(),
}));

import { updateRateCardDiscounts } from '@/lib/database/actions/rate-cards';
import CardRow from '../CardRow';

const mockUpdateRateCardDiscounts = vi.mocked(updateRateCardDiscounts);

beforeEach(() => {
  mockUpdateRateCardDiscounts.mockReset();
});

const mockTiers: TierThreshold[] = [
  { tierKey: 'public', label: 'Public', thresholdMinVnd: null, sortOrder: 0 },
  { tierKey: 'tier1', label: 'T1', thresholdMinVnd: '20000000', sortOrder: 1 },
  { tierKey: 'tier2', label: 'T2', thresholdMinVnd: '30000000', sortOrder: 2 },
  { tierKey: 'tier3', label: 'T3', thresholdMinVnd: '40000000', sortOrder: 3 },
  { tierKey: 'tier4', label: 'T4', thresholdMinVnd: '70000000', sortOrder: 4 },
  { tierKey: 'tier5', label: 'T5', thresholdMinVnd: '120000000', sortOrder: 5 },
  { tierKey: 'pt', label: 'PT', thresholdMinVnd: '200000000', sortOrder: 6 },
];

const mockCard = {
  code: 'QSM',
  productName: 'Economy · Standard',
  category: 'Economy',
  status: 'Active',
  source: 'VN',
  discountPublic: '0.00',
  discountTier1: '1.50',
  discountTier2: '2.50',
  discountTier3: '3.00',
  discountTier4: '4.00',
  discountTier5: '6.00',
  discountPt: 'Contact Manager',
};

function renderRow(overrides?: Partial<typeof mockCard>) {
  const card = { ...mockCard, ...overrides };
  const onNavigate = vi.fn();
  render(
    <table>
      <tbody>
        <CardRow
          card={card}
          tiers={mockTiers}
          hasRates={true}
          onNavigate={onNavigate}
        />
      </tbody>
    </table>,
  );
  return { onNavigate };
}

describe('CardRow — read mode', () => {
  it('renders formatted product name', () => {
    renderRow();
    expect(screen.getByText('Economy — Standard')).toBeInTheDocument();
  });

  it('renders the card code', () => {
    renderRow();
    expect(screen.getByText('QSM')).toBeInTheDocument();
  });

  it('renders tier discount as percentage', () => {
    renderRow();
    expect(screen.getByText('1.5%')).toBeInTheDocument();
  });

  it('renders PT label for pt tier', () => {
    renderRow();
    expect(screen.getByText('PT')).toBeInTheDocument();
  });

  it('shows "no rates" badge when hasRates is false', () => {
    render(
      <table>
        <tbody>
          <CardRow
            card={mockCard}
            tiers={mockTiers}
            hasRates={false}
            onNavigate={vi.fn()}
          />
        </tbody>
      </table>,
    );
    expect(screen.getByText('no rates')).toBeInTheDocument();
  });

  it('does not show "no rates" badge when hasRates is true', () => {
    renderRow();
    expect(screen.queryByText('no rates')).not.toBeInTheDocument();
  });

  it('calls onNavigate with the card code when row is clicked', async () => {
    const { onNavigate } = renderRow();
    await userEvent.click(screen.getByText('Economy — Standard'));
    expect(onNavigate).toHaveBeenCalledWith('QSM');
  });

  it('renders source badge', () => {
    renderRow();
    expect(screen.getByText('VN')).toBeInTheDocument();
  });

  it('renders the edit pencil button', () => {
    renderRow();
    expect(
      screen.getByRole('button', { name: 'Edit discounts' }),
    ).toBeInTheDocument();
  });

  it('renders status with correct text', () => {
    renderRow();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders "—" for null discount', () => {
    renderRow({ discountPublic: null });
    // At least one em dash rendered (discountPublic is null)
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
  });
});

describe('CardRow — entering edit mode', () => {
  it('shows input fields after clicking the edit button', async () => {
    renderRow();
    await userEvent.click(
      screen.getByRole('button', { name: 'Edit discounts' }),
    );
    const inputs = screen.getAllByRole('spinbutton');
    // 6 tier columns with mapped columns (public, tier1..tier5)
    expect(inputs.length).toBe(6);
  });

  it('populates inputs with current discount values', async () => {
    renderRow();
    await userEvent.click(
      screen.getByRole('button', { name: 'Edit discounts' }),
    );
    const inputs = screen.getAllByRole<HTMLInputElement>('spinbutton');
    const values = inputs.map((i) => i.value);
    expect(values).toContain('1.50');
    expect(values).toContain('2.50');
  });

  it('shows Save and Cancel buttons in edit mode', async () => {
    renderRow();
    await userEvent.click(
      screen.getByRole('button', { name: 'Edit discounts' }),
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('does not navigate when row is clicked in edit mode', async () => {
    const { onNavigate } = renderRow();
    await userEvent.click(
      screen.getByRole('button', { name: 'Edit discounts' }),
    );
    // Click the row by clicking the category cell (not an interactive element)
    await userEvent.click(screen.getByText('Economy'));
    expect(onNavigate).not.toHaveBeenCalled();
  });
});

describe('CardRow — cancel', () => {
  it('returns to read mode after cancelling', async () => {
    renderRow();
    await userEvent.click(
      screen.getByRole('button', { name: 'Edit discounts' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Edit discounts' }),
    ).toBeInTheDocument();
  });
});

describe('CardRow — save', () => {
  it('calls updateRateCardDiscounts with parsed numbers on save', async () => {
    mockUpdateRateCardDiscounts.mockResolvedValueOnce({});
    renderRow();
    await userEvent.click(
      screen.getByRole('button', { name: 'Edit discounts' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(mockUpdateRateCardDiscounts).toHaveBeenCalledWith('QSM', {
        discountPublic: 0,
        discountTier1: 1.5,
        discountTier2: 2.5,
        discountTier3: 3,
        discountTier4: 4,
        discountTier5: 6,
      });
    });
  });

  it('exits edit mode on successful save', async () => {
    mockUpdateRateCardDiscounts.mockResolvedValueOnce({});
    renderRow();
    await userEvent.click(
      screen.getByRole('button', { name: 'Edit discounts' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    });
  });

  it('shows error row when server returns an error', async () => {
    mockUpdateRateCardDiscounts.mockResolvedValueOnce({
      error: 'Rate card not found.',
    });
    renderRow();
    await userEvent.click(
      screen.getByRole('button', { name: 'Edit discounts' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(screen.getByText('Rate card not found.')).toBeInTheDocument();
    });
  });

  it('stays in edit mode when server returns an error', async () => {
    mockUpdateRateCardDiscounts.mockResolvedValueOnce({
      error: 'Some error',
    });
    renderRow();
    await userEvent.click(
      screen.getByRole('button', { name: 'Edit discounts' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });
  });
});

describe('CardRow — client validation', () => {
  it('shows validation error for out-of-range value without calling server', async () => {
    renderRow();
    await userEvent.click(
      screen.getByRole('button', { name: 'Edit discounts' }),
    );
    // Set tier1 input to 150 (out of range)
    const inputs = screen.getAllByRole<HTMLInputElement>('spinbutton');
    await userEvent.clear(inputs[1]);
    await userEvent.type(inputs[1], '150');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(
      screen.getByText(
        'All discount values must be numbers between 0 and 100.',
      ),
    ).toBeInTheDocument();
    expect(mockUpdateRateCardDiscounts).not.toHaveBeenCalled();
  });

  it('clears error when cancel is clicked after validation error', async () => {
    renderRow();
    await userEvent.click(
      screen.getByRole('button', { name: 'Edit discounts' }),
    );
    const inputs = screen.getAllByRole<HTMLInputElement>('spinbutton');
    await userEvent.clear(inputs[1]);
    await userEvent.type(inputs[1], '150');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(
      screen.getByText(
        'All discount values must be numbers between 0 and 100.',
      ),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(
      screen.queryByText(
        'All discount values must be numbers between 0 and 100.',
      ),
    ).not.toBeInTheDocument();
  });
});
