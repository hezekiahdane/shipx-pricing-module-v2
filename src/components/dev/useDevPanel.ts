import { useContext } from 'react';
import { DevPanelContext, defaultDevPanelState } from './DevPanelProvider';

export function useDevPanel() {
  return useContext(DevPanelContext) ?? defaultDevPanelState;
}
