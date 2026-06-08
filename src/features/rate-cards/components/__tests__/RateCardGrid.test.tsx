import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { RateCard, TierThreshold } from '@/lib/database/schema';

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));

import RateCardGrid from '../RateCardGrid';

type CardSummary = Pick<
  RateCard,
  | 'code'
  | 'productName'
  | 'category'
  | 'status'
  | 'source'
  | 'discountPublic'
  | 'discountTier1'
  | 'discountTier2'
  | 'discountTier3'
  | 'discountTier4'
  | 'discountTier5'
  | 'discountPt'
>;

const mockTiers: TierThreshold[] = [
  { tierKey: 'public', label: 'Public', thresholdMinVnd: null, sortOrder: 0 },
  { tierKey: 'tier1', label: 'T1', thresholdMinVnd: '20000000', sortOrder: 1 },
  { tierKey: 'tier2', label: 'T2', thresholdMinVnd: '30000000', sortOrder: 2 },
  { tierKey: 'tier3', label: 'T3', thresholdMinVnd: '40000000', sortOrder: 3 },
  { tierKey: 'tier4', label: 'T4', thresholdMinVnd: '70000000', sortOrder: 4 },
  { tierKey: 'tier5', label: 'T5', thresholdMinVnd: '120000000', sortOrder: 5 },
  { tierKey: 'pt', label: 'PT', thresholdMinVnd: '200000000', sortOrder: 6 },
];

const mockCards: CardSummary[] = [
  {
    code: 'QSM',
    productName: 'Economy · Standard',
    category: 'Economy',
    status: 'Active',
    discountPublic: '0.00',
    discountTier1: '1.50',
    discountTier2: '2.50',
    discountTier3: '3.00',
    discountTier4: '4.00',
    discountTier5: '6.00',
    discountPt: 'Contact Manager',
    source: 'VN',
  },
  {
    code: 'YES',
    productName: 'Economy · YUN Standard',
    category: 'Economy',
    status: 'Experiment',
    discountPublic: '0.00',
    discountTier1: '1.50',
    discountTier2: '2.50',
    discountTier3: '3.00',
    discountTier4: '4.00',
    discountTier5: '6.00',
    discountPt: 'Contact Manager',
    source: 'VN',
  },
  {
    code: 'DLV',
    productName: 'Express · DHL Premium (VN)',
    category: 'Express',
    status: 'Active',
    discountPublic: '0.00',
    discountTier1: '1.50',
    discountTier2: '2.50',
    discountTier3: '3.00',
    discountTier4: '5.00',
    discountTier5: '7.00',
    discountPt: 'Contact Manager',
    source: 'VN',
  },
];

describe('RateCardGrid', () => {
  it('renders a row for each card', () => {
    render(
      <RateCardGrid
        cards={mockCards}
        tiers={mockTiers}
        codesWithRates={new Set(['QSM', 'YES', 'DLV'])}
      />,
    );
    expect(screen.getByText('Economy — Standard')).toBeInTheDocument();
    expect(screen.getByText('Economy — YUN Standard')).toBeInTheDocument();
    expect(screen.getByText('Express — DHL Premium (VN)')).toBeInTheDocument();
  });

  it('renders the code', () => {
    render(
      <RateCardGrid
        cards={mockCards}
        tiers={mockTiers}
        codesWithRates={new Set(['QSM', 'YES', 'DLV'])}
      />,
    );
    expect(screen.getByText('QSM')).toBeInTheDocument();
  });

  it('renders tier discount values as percentages', () => {
    render(
      <RateCardGrid
        cards={mockCards}
        tiers={mockTiers}
        codesWithRates={new Set(['QSM', 'YES', 'DLV'])}
      />,
    );
    expect(screen.getAllByText('1.5%').length).toBeGreaterThanOrEqual(1);
  });

  it('renders threshold values in a dedicated row above the sections', () => {
    render(
      <RateCardGrid
        cards={mockCards}
        tiers={mockTiers}
        codesWithRates={new Set(['QSM', 'YES', 'DLV'])}
      />,
    );
    // Derived from VND values, displayed in the threshold row in tbody
    expect(screen.getByText('< 20M')).toBeInTheDocument();
    expect(screen.getByText('≥ 20M')).toBeInTheDocument();
    expect(screen.getByText('≥ 70M')).toBeInTheDocument();
  });

  it('renders section header rows for Economy groups', () => {
    render(
      <RateCardGrid
        cards={mockCards}
        tiers={mockTiers}
        codesWithRates={new Set(['QSM', 'YES', 'DLV'])}
      />,
    );
    expect(screen.getByText('ECONOMY — POSTAL')).toBeInTheDocument();
    expect(screen.getByText('ECONOMY — YUN (EXPERIMENT)')).toBeInTheDocument();
  });

  it('renders section header for Express DHL', () => {
    render(
      <RateCardGrid
        cards={mockCards}
        tiers={mockTiers}
        codesWithRates={new Set(['QSM', 'YES', 'DLV'])}
      />,
    );
    expect(screen.getByText('EXPRESS — DHL')).toBeInTheDocument();
  });

  it('navigates to the detail page when a row is clicked', async () => {
    render(
      <RateCardGrid
        cards={mockCards}
        tiers={mockTiers}
        codesWithRates={new Set(['QSM', 'YES', 'DLV'])}
      />,
    );
    await userEvent.click(screen.getByText('Economy — Standard'));
    expect(pushMock).toHaveBeenCalledWith('/admin/cards/QSM');
  });

  it('renders column headers from tiers prop', () => {
    render(
      <RateCardGrid
        cards={mockCards}
        tiers={mockTiers}
        codesWithRates={new Set(['QSM', 'YES', 'DLV'])}
      />,
    );
    expect(screen.getByText('Code')).toBeInTheDocument();
    expect(screen.getByText('Product Name')).toBeInTheDocument();
    expect(screen.getByText('Public')).toBeInTheDocument();
    expect(screen.getByText('T1')).toBeInTheDocument();
    expect(screen.getAllByText('PT').length).toBeGreaterThanOrEqual(1);
  });

  it('renders empty state when cards array is empty', () => {
    render(
      <RateCardGrid cards={[]} tiers={mockTiers} codesWithRates={new Set()} />,
    );
    expect(screen.getByText(/No rate cards/i)).toBeInTheDocument();
  });
});
