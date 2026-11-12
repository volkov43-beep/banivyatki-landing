import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { REGIONS } from './data/regions.js'
import { captureUtm } from './lib/utm.js'
import { trackPhoneClicks } from './lib/track.js'
import './index.css'

captureUtm()
trackPhoneClicks()

const root = document.getElementById('root')
const regionId = root.dataset.region ?? 'kirov'
if (!Object.hasOwn(REGIONS, regionId)) throw new Error(`Неизвестный регион лендинга: ${regionId}`)

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App region={REGIONS[regionId]} />
  </React.StrictMode>,
)
