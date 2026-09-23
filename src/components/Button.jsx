/**
 * Единый компонент кнопки. Три типа (variant):
 *   primary   — заливка accent, текст ink, скругление 4 px; одна на блок:
 *               отправка формы, переход в калькулятор, запись на показ;
 *   secondary — прозрачный фон, рамка 1,5 px; текст accent на светлом
 *               (scheme="light") и surface на тёмном / зелёном (scheme="dark");
 *               второе действие рядом с главной;
 *   link      — текст accent с полупрозрачным подчёркиванием; мелкие действия
 *               внутри карточек («Рассчитать такую», «Читать полностью»).
 *
 * Состояния: наведение — primary темнее на 10 % и мягкая тень, secondary
 * заливается (accent / surface с текстом ink), link — подчёркивание становится
 * непрозрачным; нажатие — чуть темнее, без сдвига; фокус с клавиатуры — рамка
 * 2 px accent с отступом 3 px (общее правило :focus-visible в index.css).
 * Переходы 150 мс только по цвету и тени, ничего не двигается.
 *
 * Размеры: lg — крупная (формы, первый экран, кнопки блоков): min-height 56 px,
 * текст 17 px; md — обычная (внутри карточек, полоска на телефоне): 44 px, 15 px.
 * У link размер задаёт только кегль: lg — 17 px жирный, md — 15 px жирный,
 * sm — 14 px обычный.
 *
 * as — 'button' (по умолчанию) или 'a'; full — на всю ширину (fullMobile —
 * на всю ширину до 1023 px, от 1024 по содержимому).
 */
const BASE =
  'inline-flex items-center justify-center text-center font-bold no-underline transition-[background-color,color,border-color,box-shadow,text-decoration-color] duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-accent disabled:cursor-default disabled:opacity-60'

const VARIANT = {
  primary:
    'rounded bg-accent text-ink hover:bg-accent-hover hover:shadow-[0_4px_14px_rgba(26,21,18,0.22)] active:bg-accent-active active:shadow-none',
  'secondary-light':
    'rounded border-[1.5px] border-accent bg-transparent text-accent hover:bg-accent hover:text-ink active:bg-accent-active active:border-accent-active active:text-ink',
  'secondary-dark':
    'rounded border-[1.5px] border-surface bg-transparent text-surface hover:bg-surface hover:text-ink active:bg-surface-2 active:border-surface-2 active:text-ink',
  link: 'rounded-sm text-accent underline decoration-[rgba(201,138,46,0.4)] underline-offset-4 hover:decoration-accent active:text-accent-active active:decoration-accent-active',
}

const SIZE = {
  lg: 'min-h-14 px-8 py-3 text-body',
  md: 'min-h-11 px-5 py-2 text-[15px]',
}

const LINK_SIZE = {
  lg: 'text-body',
  md: 'text-[15px]',
  sm: 'text-label font-normal',
}

export default function Button({
  as = 'button',
  variant = 'primary',
  size = 'lg',
  scheme = 'light',
  full = false,
  fullMobile = false,
  className = '',
  type,
  children,
  ...rest
}) {
  const isLink = variant === 'link'
  const key = variant === 'secondary' ? `secondary-${scheme}` : variant
  const classes = [
    BASE,
    VARIANT[key],
    isLink ? LINK_SIZE[size] || LINK_SIZE.md : SIZE[size] || SIZE.lg,
    full ? 'w-full' : fullMobile ? 'w-full lg:w-auto' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (as === 'a') {
    return (
      <a className={classes} {...rest}>
        {children}
      </a>
    )
  }
  return (
    <button type={type || 'button'} className={classes} {...rest}>
      {children}
    </button>
  )
}
