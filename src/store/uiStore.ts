// UI store — Zustand, for transient UI state ONLY (kit §2).
// SQLite is the persistent source of truth; nothing here survives a restart
// and nothing here is app data. Only the address-list filter and the toast
// message live here.
import { create } from 'zustand';

export type AddressFilter = 'all' | 'active' | 'expired';

interface UiState {
  addressFilter: AddressFilter;
  setAddressFilter: (filter: AddressFilter) => void;
  toast: string | null;
  showToast: (message: string) => void;
  clearToast: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  addressFilter: 'all',
  setAddressFilter: (addressFilter) => set({ addressFilter }),
  toast: null,
  showToast: (toast) => set({ toast }),
  clearToast: () => set({ toast: null }),
}));
