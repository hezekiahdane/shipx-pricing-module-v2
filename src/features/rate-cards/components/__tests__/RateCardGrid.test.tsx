import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { RateCard } from '@/lib/database/schema';
import RateCardGrid from '../RateCardGrid';

type CardSummary = Pick<
  RateCard,
  'code' | 'productName' | 'category' | 'status' | 'currency' | 'effectiveDate'
>;

const mockCards: CardSummary[] = [
  {
    code: 'QSM',
    productName: 'Economy Standard',
    category: 'Air',
    status: 'Active',
    currency: 'VND',
    effectiveDate: '2026-04-01',
  },
  {
    code: 'YUN',
    productName: 'Economy Express',
    category: 'Air',
    status: 'Active',
    currency: 'VND',
    effectiveDate: null,
  },
];

describe('RateCardGrid', () => {
  it('renders a card for each rate card', () => {
    render(<RateCardGrid cards={mockCards} />);
    expect(screen.getByText('Economy Standard')).toBeInTheDocument();
    expect(screen.getByText('Economy Express')).toBeInTheDocument();
  });

  it('renders the card code', () => {
    render(<RateCardGrid cards={mockCards} />);
    expect(screen.getByText('QSM')).toBeInTheDocument();
  });

  it('renders the status badge', () => {
    render(<RateCardGrid cards={mockCards} />);
    expect(screen.getAllByText('Active')).toHaveLength(2);
  });

  it('renders "—" when effectiveDate is null', () => {
    render(<RateCardGrid cards={mockCards} />);
    expect(screen.getByText(/Effective —/)).toBeInTheDocument();
  });

  it('renders links to the card detail page', () => {
    render(<RateCardGrid cards={mockCards} />);
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', '/cards/QSM');
    expect(links[1]).toHaveAttribute('href', '/cards/YUN');
  });

  it('renders empty state when cards array is empty', () => {
    render(<RateCardGrid cards={[]} />);
    expect(screen.getByText(/No rate cards/i)).toBeInTheDocument();
  });
});
