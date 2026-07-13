// Service-worker registration + lightweight update and install prompts.
// See Prompts/lt-01/08-pwa-and-offline.md.

import { registerSW } from 'virtual:pwa-register'
import { showToast } from '../ui/toast'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function setupPWA(): void {
  const updateSW = registerSW({
    onNeedRefresh() {
      showToast('Nieuwe versie beschikbaar', {
        actionLabel: 'Vernieuwen',
        onAction: () => void updateSW(true),
        timeout: 0,
      })
    },
  })

  // Offer "add to home screen" when the browser signals it's installable.
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    const promptEvent = e as BeforeInstallPromptEvent
    showToast('Zet Letter Tracer op je startscherm', {
      actionLabel: 'Installeren',
      onAction: () => void promptEvent.prompt(),
      timeout: 0,
    })
  })
}
