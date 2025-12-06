import { create } from 'zustand'

type UITab = 'changes' | 'repositories' | 'history' | 'connections'

type UIState = {
  activeTab: UITab
  setActiveTab: (tab: UITab) => void
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: 'changes',
  setActiveTab: (activeTab) => set({ activeTab }),
}))

export type { UITab }

