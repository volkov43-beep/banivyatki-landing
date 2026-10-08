import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

// Native dialog provides an inert background and keyboard focus containment.
// Switching plan → form keeps the same dialog and original card opener.
export default function CatalogDialog({ title, kind, onClose, children }) {
  const titleId = useId()
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    const opener = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    return () => {
      dialog.close()
      document.body.style.overflow = overflow
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true })
    }
  }, [])

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-modal="true"
      onCancel={(e) => { e.preventDefault(); onClose() }}
      className={`fixed inset-0 m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] overflow-y-auto rounded-md border-0 backdrop:bg-[rgba(26,21,18,0.85)] ${kind === 'plan' ? 'max-w-[960px] bg-transparent p-4 text-surface md:p-6' : 'max-w-[480px] bg-surface p-5 text-ink md:p-6'}`}
    >
      <button
        type="button"
        aria-label="Закрыть"
        onClick={onClose}
        className="absolute right-3 top-3 flex h-11 w-11 cursor-pointer items-center justify-center rounded bg-transparent text-current hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:right-4 md:top-4"
      >
        <span aria-hidden="true" className="text-[28px] leading-none">×</span>
      </button>
      <div className={`flex min-h-11 items-center pr-12 ${kind === 'plan' ? 'mb-4' : 'mb-2'}`}>
        <h2 id={titleId} className={kind === 'plan' ? 'text-body' : 'text-title'}>{title}</h2>
      </div>
      {children}
    </dialog>,
    document.body,
  )
}
