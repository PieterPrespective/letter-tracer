// Service-worker registration + lightweight update and install prompts.
// See Prompts/lt-01/08-pwa-and-offline.md.

import { registerSW } from 'virtual:pwa-register'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function toast(message: string, actionLabel: string, onAction: () => void): void {
  const el = document.createElement('div')
  el.className = 'toast'
  const span = document.createElement('span')
  span.textContent = message
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.textContent = actionLabel
  const dismiss = document.createElement('button')
  dismiss.type = 'button'
  dismiss.className = 'toast-x'
  dismiss.setAttribute('aria-label', 'Sluiten')
  dismiss.textContent = '✕'
  const close = () => el.remove()
  btn.addEventListener('click', () => {
    onAction()
    close()
  })
  dismiss.addEventListener('click', close)
  el.append(span, btn, dismiss)
  document.body.appendChild(el)
}

export function setupPWA(): void {
  const updateSW = registerSW({
    onNeedRefresh() {
      toast('Nieuwe versie beschikbaar', 'Vernieuwen', () => void updateSW(true))
    },
  })

  // Offer "add to home screen" when the browser signals it's installable.
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    const promptEvent = e as BeforeInstallPromptEvent
    toast('Zet Letter Tracer op je startscherm', 'Installeren', () => void promptEvent.prompt())
  })
}
