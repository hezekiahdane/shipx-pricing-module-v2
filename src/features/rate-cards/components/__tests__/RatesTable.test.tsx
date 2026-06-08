import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Rate } from '@/lib/database/schema';
import RatesTable from '../RatesTable';

type RateSummary = Pick<
  Rate,
  'destination' | 'zoneCode' | 'weightKg' | 'unit' | 'price'
>;

const mockRates: RateSummary[] = [
  {
    destination: 'USA',
    zoneCode: 'Z1',
    weightKg: '1.00',
    unit: 'kg',
    price: '150000',
  },
  {
    destination: 'France',
    zoneCode: null,
    weightKg: '0.50',
    unit: 'kg',
    price: null,
  },
];

describe('RatesTable', () => {
  it('renders a row per rate entry', () => {
    render(<RatesTable rates={mockRates} currency="VND" />);
    expect(screen.getByText('USA')).toBeInTheDocument();
    expect(screen.getByText('France')).toBeInTheDocument();
  });

  it('formats price with locale number formatting', () => {
    render(<RatesTable rates={mockRates} currency="VND" />);
    expect(screen.getByText('150,000')).toBeInTheDocument();
  });

  it('renders "—" when price is null', () => {
    render(<RatesTable rates={mockRates} currency="VND" />);
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the price column header with the supplied currency', () => {
    render(<RatesTable rates={mockRates} currency="VND" />);
    expect(screen.getByText('Price (VND)')).toBeInTheDocument();
  });

  it('renders empty state when rates array is empty', () => {
    render(<RatesTable rates={[]} currency="VND" />);
    expect(screen.getByText(/No rates/i)).toBeInTheDocument();
  });
});
