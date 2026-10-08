import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import Button from '../Button.jsx'

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
      className={`fixed inset-0 m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] overflow-y-auto rounded-md border-0 bg-forest p-5 text-surface backdrop:bg-[rgba(26,21,18,0.85)] md:p-8 ${kind === 'plan' ? 'max-w-[960px]' : 'max-w-[560px]'}`}
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <h2 id={titleId} className="text-title">{title}</h2>
        <Button variant="link" size="sm" className="-mt-2 min-h-11 shrink-0" onClick={onClose}>
          Закрыть
        </Button>
      </div>
      {children}
    </dialog>,
    document.body,
  )
}
