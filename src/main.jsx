import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './lib/sync/AuthContext.jsx'
import { VerifyResult } from './components/CloudSync.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
      <VerifyResult />
    </AuthProvider>
  </StrictMode>,
)

// Register the service worker in production builds only, so it never
// interferes with hot reload during development.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}

// Ask the browser not to evict our saved data when storage runs low.
navigator.storage?.persist?.()
