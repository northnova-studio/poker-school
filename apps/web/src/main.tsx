import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/fonts'
import './styles/index.css'
import App from './App'
import { AuthProvider } from '@/lib/auth'
import { DemoBanner } from '@/components/ui/DemoBanner'
import { applyTheme, getStoredTheme } from '@/config/brand'

applyTheme(getStoredTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <AuthProvider>
        <App />
        <DemoBanner />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
