// Bootstrap: mount the app shell. Screen logic lives in src/app.ts and
// src/ui/screens/*. Service worker registration arrives in M5.

import './style.css'
import { App } from './app'
import { setupPWA } from './pwa/register'

const root = document.querySelector<HTMLDivElement>('#app')!
void new App(root).start()
setupPWA()
