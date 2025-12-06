import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Connection = {
  id: string
  name: string
  url: string
  username: string
  password?: string
  sshKeyPath?: string
  authMethod?: 'password' | 'ssh-key'
}

type ConnectionState = {
  connections: Connection[]
  activeConnectionId: string | null
  addConnection: (connection: Omit<Connection, 'id'>) => void
  removeConnection: (id: string) => void
  updateConnection: (id: string, data: Omit<Connection, 'id'>) => void
  setActiveConnection: (id: string) => void
}

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

export const useConnectionStore = create<ConnectionState>()(
  persist(
    (set) => ({
      connections: [],
      activeConnectionId: null,
      addConnection: (connection) =>
        set((state) => {
          const id = generateId()
          return {
            connections: [...state.connections, { id, ...connection }],
            activeConnectionId: id,
          }
        }),
      removeConnection: (id) =>
        set((state) => ({
          connections: state.connections.filter((conn) => conn.id !== id),
          activeConnectionId: state.activeConnectionId === id ? null : state.activeConnectionId,
        })),
      updateConnection: (id, data) =>
        set((state) => ({
          connections: state.connections.map((conn) =>
            conn.id === id ? { id, ...data } : conn,
          ),
        })),
      setActiveConnection: (id) => set({ activeConnectionId: id }),
    }),
    {
      name: 'delta-svn-connections',
    },
  ),
)

