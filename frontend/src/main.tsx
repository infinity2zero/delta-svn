import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'react-tooltip/dist/react-tooltip.css'
import App from './App.tsx'
import { ReactQueryProvider } from './providers/ReactQueryProvider'
import { OutputProvider } from './contexts/OutputContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ReactQueryProvider>
      <OutputProvider>
        <App />
      </OutputProvider>
    </ReactQueryProvider>
  </StrictMode>,
)
