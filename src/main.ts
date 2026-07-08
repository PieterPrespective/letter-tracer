// Bootstrap: mount the app shell. Screen logic lives in src/app.ts and
// src/ui/screens/*. Service worker registration arrives in M5.

import './style.css'
import { App } from './app'
import { setupPWA } from './pwa/register'
import { initTheme } from './theme'
import { getSettings } from './state/settings'

// Apply the theme before mounting so there is no light→dark flash.
initTheme(() => getSettings().theme)

const root = document.querySelector<HTMLDivElement>('#app')!
void new App(root).start()
setupPWA()
