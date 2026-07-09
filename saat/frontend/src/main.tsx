import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

import '@fontsource/vazirmatn/400.css'
import '@fontsource/vazirmatn/500.css'
import '@fontsource/vazirmatn/600.css'
import '@fontsource/vazirmatn/700.css'
import '@fontsource/vazirmatn/800.css'

registerSW({
  immediate: true,
  onOfflineReady() {
    console.info('[سات] اپ برای استفاده آفلاین آماده است.')
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
