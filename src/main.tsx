import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App'
import { registerServiceWorker } from './app/updates'

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
registerServiceWorker()
