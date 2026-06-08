import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { RateCard } from '@/lib/database/schema';

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));

import RateCardGrid from '../RateCardGrid';

type CardSummary = Pick<
  RateCard,
  | 'code'
  | 'productName'
  | 'category'
  | 'status'
  | 'discountPublic'
  | 'discountTier1'
  | 'discountTier2'
  | 'discountTier3'
  | 'discountTier4'
  | 'discountTier5'
  | 'discountPt'
>;

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
  },
];

describe('RateCardGrid', () => {
  it('renders a row for each card', () => {
    render(<RateCardGrid cards={mockCards} />);
    expect(screen.getByText('Economy — Standard')).toBeInTheDocument();
    expect(screen.getByText('Economy — YUN Standard')).toBeInTheDocument();
    expect(screen.getByText('Express — DHL Premium (VN)')).toBeInTheDocument();
  });

  it('renders the code', () => {
    render(<RateCardGrid cards={mockCards} />);
    expect(screen.getByText('QSM')).toBeInTheDocument();
  });

  it('renders tier discount values as percentages', () => {
    render(<RateCardGrid cards={mockCards} />);
    // Multiple 1.5% cells across rows
    expect(screen.getAllByText('1.5%').length).toBeGreaterThanOrEqual(1);
  });

  it('renders section header rows for Economy groups', () => {
    render(<RateCardGrid cards={mockCards} />);
    expect(screen.getByText('ECONOMY — POSTAL')).toBeInTheDocument();
    expect(screen.getByText('ECONOMY — YUN (EXPERIMENT)')).toBeInTheDocument();
  });

  it('renders section header for Express DHL', () => {
    render(<RateCardGrid cards={mockCards} />);
    expect(screen.getByText('EXPRESS — DHL')).toBeInTheDocument();
  });

  it('navigates to the detail page when a row is clicked', async () => {
    render(<RateCardGrid cards={mockCards} />);
    await userEvent.click(screen.getByText('Economy — Standard'));
    expect(pushMock).toHaveBeenCalledWith('/admin/cards/QSM');
  });

  it('renders column headers', () => {
    render(<RateCardGrid cards={mockCards} />);
    expect(screen.getByText('Code')).toBeInTheDocument();
    expect(screen.getByText('Product Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Public')).toBeInTheDocument();
    expect(screen.getByText('T1')).toBeInTheDocument();
    // PT appears in the header and in every data row
    expect(screen.getAllByText('PT').length).toBeGreaterThanOrEqual(1);
  });

  it('renders empty state when cards array is empty', () => {
    render(<RateCardGrid cards={[]} />);
    expect(screen.getByText(/No rate cards/i)).toBeInTheDocument();
  });
});
