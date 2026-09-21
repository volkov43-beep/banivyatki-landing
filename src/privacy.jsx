import React from 'react'
import ReactDOM from 'react-dom/client'
import PrivacyPage from './pages/PrivacyPage.jsx'
import { trackPhoneClicks } from './lib/track.js'
import './index.css'

trackPhoneClicks()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PrivacyPage />
  </React.StrictMode>,
)
