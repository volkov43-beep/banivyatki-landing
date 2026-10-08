import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

// Native dialog provides an inert background and keyboard focus containment.
// Closing restores focus to the original card opener.
export default function CatalogDialog({ title, kind, onClose, children }) {
  const titleId = useId()
  const dialogRef = useRef(null)
  const backdropPress = useRef(false)

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

  if (kind === 'plan') {
    return createPortal(
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-modal="true"
        onCancel={(e) => { e.preventDefault(); onClose() }}
        onPointerDown={(e) => { backdropPress.current = e.target === e.currentTarget }}
        onPointerCancel={() => { backdropPress.current = false }}
        onClick={(e) => {
          if (e.target === e.currentTarget && backdropPress.current) onClose()
          backdropPress.current = false
        }}
        className="fixed inset-0 m-0 flex h-[100dvh] max-h-none w-full max-w-none overflow-x-hidden overflow-y-auto border-0 bg-transparent p-4 text-surface backdrop:bg-[rgba(26,21,18,0.85)]"
      >
        <div className="relative m-auto w-full min-w-0 max-w-[960px] shrink-0 p-4 md:p-6">
          <header className="relative mb-4 flex min-h-12 items-center justify-center px-12">
            <h2 id={titleId} className="min-w-0 text-center text-[20px] font-semibold leading-snug md:text-[24px]">{title}</h2>
            <button
              type="button"
              aria-label="Закрыть"
              onClick={onClose}
              className="absolute right-0 top-0 flex h-12 w-12 cursor-pointer items-center justify-center rounded bg-transparent text-current hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <span aria-hidden="true" className="text-[32px] leading-none">×</span>
            </button>
          </header>
          {children}
        </div>
      </dialog>,
      document.body,
    )
  }

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-modal="true"
      onCancel={(e) => { e.preventDefault(); onClose() }}
      className={`fixed inset-0 m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] overflow-y-auto rounded-md border-0 backdrop:bg-[rgba(26,21,18,0.85)] max-w-[480px] bg-surface p-5 text-ink md:p-6`}
    >
      <button
        type="button"
        aria-label="Закрыть"
        onClick={onClose}
        className="absolute right-3 top-3 flex h-11 w-11 cursor-pointer items-center justify-center rounded bg-transparent text-current hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:right-4 md:top-4"
      >
        <span aria-hidden="true" className="text-[28px] leading-none">×</span>
      </button>
      <div className={`flex min-h-11 items-center pr-12 mb-2`}>
        <h2 id={titleId} className="text-title">{title}</h2>
      </div>
      {children}
    </dialog>,
    document.body,
  )
}
