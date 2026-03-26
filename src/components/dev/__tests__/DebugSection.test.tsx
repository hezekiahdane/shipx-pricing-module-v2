import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import type { DevPanelDebugToggle } from '../index';
import { DebugSection } from '../sections/DebugSection';

const toggles: DevPanelDebugToggle[] = [
  { id: 'outlines', label: 'Debug outlines', cssClass: 'debug-outlines' },
];

describe('DebugSection', () => {
  it('renders all debug toggles', () => {
    render(
      <DebugSection toggles={toggles} activeToggles={{}} onToggle={vi.fn()} />,
    );
    expect(screen.getByText('Debug outlines')).toBeDefined();
  });

  it('shows OFF by default', () => {
    render(
      <DebugSection toggles={toggles} activeToggles={{}} onToggle={vi.fn()} />,
    );
    expect(screen.getByText('OFF')).toBeDefined();
  });

  it('calls onToggle with id=true when clicked while off', () => {
    const onToggle = vi.fn();
    render(
      <DebugSection toggles={toggles} activeToggles={{}} onToggle={onToggle} />,
    );
    fireEvent.click(screen.getByText('OFF'));
    expect(onToggle).toHaveBeenCalledWith('outlines', true);
  });

  it('calls onToggle with id=false when clicked while on', () => {
    const onToggle = vi.fn();
    render(
      <DebugSection
        toggles={toggles}
        activeToggles={{ outlines: true }}
        onToggle={onToggle}
      />,
    );
    fireEvent.click(screen.getByText('ON'));
    expect(onToggle).toHaveBeenCalledWith('outlines', false);
  });
});
