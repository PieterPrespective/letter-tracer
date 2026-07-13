// A small bottom toast, shared by the PWA prompts and the speech hint. An
// optional action button; otherwise it auto-dismisses after `timeout` ms.

export interface ToastOptions {
  actionLabel?: string
  onAction?: () => void
  /** Auto-dismiss after this many ms (0 = stay until the ✕). Default 6000. */
  timeout?: number
}

export function showToast(message: string, opts: ToastOptions = {}): void {
  const el = document.createElement('div')
  el.className = 'toast'
  const span = document.createElement('span')
  span.textContent = message
  el.appendChild(span)

  let timer: ReturnType<typeof setTimeout> | undefined
  const close = () => {
    clearTimeout(timer)
    el.remove()
  }

  if (opts.actionLabel && opts.onAction) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.textContent = opts.actionLabel
    btn.addEventListener('click', () => {
      opts.onAction!()
      close()
    })
    el.appendChild(btn)
  }

  const dismiss = document.createElement('button')
  dismiss.type = 'button'
  dismiss.className = 'toast-x'
  dismiss.setAttribute('aria-label', 'Sluiten')
  dismiss.textContent = '✕'
  dismiss.addEventListener('click', close)
  el.appendChild(dismiss)

  document.body.appendChild(el)

  const timeout = opts.timeout ?? 6000
  if (timeout > 0) timer = setTimeout(close, timeout)
}
