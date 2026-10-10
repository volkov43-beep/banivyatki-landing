import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

export default function QuizDialog({ open, title, onClose, openerRef, fallbackRef, children }) {
  const ref = useRef(null)
  const titleId = useId()
  const backdropPress = useRef(false)
  useEffect(() => {
    if (!open) return undefined
    const dialog = ref.current
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    dialog.querySelector('[data-quiz-heading]')?.focus({ preventScroll: true })
    return () => {
      dialog.close()
      document.body.style.overflow = overflow
      const target = openerRef.current?.isConnected ? openerRef.current : fallbackRef.current
      target?.focus({ preventScroll: true })
    }
  }, [open, openerRef, fallbackRef])
  useEffect(() => {
    if (open) ref.current?.querySelector('[data-quiz-heading]')?.focus({ preventScroll: true })
  }, [title, open])
  return createPortal(
    <dialog ref={ref} aria-labelledby={titleId} aria-modal="true"
      onCancel={(e) => { e.preventDefault(); onClose() }}
      onPointerDown={(e) => { backdropPress.current = e.target === e.currentTarget }}
      onPointerCancel={() => { backdropPress.current = false }}
      onClick={(e) => { if (e.target === e.currentTarget && backdropPress.current) onClose(); backdropPress.current = false }}
      className="fixed inset-0 m-0 h-[100dvh] max-h-none w-full max-w-none overflow-x-hidden overflow-y-auto border-0 bg-transparent p-3 text-ink backdrop:bg-[rgba(26,21,18,0.85)] [&[open]]:flex md:p-6">
      <div className="relative m-auto w-full min-w-0 max-w-[960px] shrink-0 rounded-md bg-surface p-5 md:p-10">
        <button type="button" aria-label="Закрыть" onClick={onClose} className="absolute right-2 top-2 flex h-12 w-12 cursor-pointer items-center justify-center rounded text-[32px] leading-none hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent md:right-4 md:top-4"><span aria-hidden="true">×</span></button>
        <h2 id={titleId} data-quiz-heading tabIndex={-1} className="mb-6 pr-10 text-title md:text-[28px] md:leading-tight">{title}</h2>
        {children}
      </div>
    </dialog>, document.body,
  )
}
