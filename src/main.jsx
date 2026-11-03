import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './lib/sync/AuthContext.jsx'
import { VerifyResult } from './components/CloudSync.jsx'
import './index.css'

// The launch screen in index.html fades away once the app has mounted under it,
// but not before the logo has been up for its minimum time: 1800 ms for the
// intro, or 500 ms (200 of them fading in) for the plain fade Reduce Motion gets.
// Time the app takes to mount counts towards these.
let splashLeaving = false
function SplashExit() {
  useEffect(() => {
    const splash = document.getElementById('splash')
    if (!splash || splashLeaving) return
    splashLeaving = true
    const root = document.documentElement
    const minimum = root.classList.contains('intro') ? 1800 : 500
    const [logo] = splash.querySelector('.splash-logo').getAnimations()
    setTimeout(() => {
      splash.animate({ opacity: [1, 0] }, { duration: 500, easing: 'ease-out', fill: 'forwards' })
        .finished.then(() => {
          splash.remove()
          root.classList.remove('intro')
        })
    }, Math.max(0, minimum - (logo?.currentTime ?? minimum)))
  }, [])
  return null
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
      <VerifyResult />
      <SplashExit />
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
