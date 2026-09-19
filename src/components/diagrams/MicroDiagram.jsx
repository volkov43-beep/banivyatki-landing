import Diagram from './Diagram.jsx'

/*
 * Микро-схемы к блокам преимуществ на тёмном экране: 240 × 150,
 * рендерятся ровно в размер viewBox. Примитивы общие с Diagram.jsx.
 */

export { Thin, Label, Dot } from './Diagram.jsx'

export const contour = {
  className: 'stroke-surface',
  fill: 'none',
  strokeWidth: 2,
  strokeLinejoin: 'round',
  strokeLinecap: 'round',
}

export const hairline = {
  className: 'stroke-surface',
  fill: 'none',
  strokeWidth: 1,
  strokeLinecap: 'round',
}

export default function MicroDiagram({ width = 240, height = 150, ...props }) {
  return <Diagram width={width} height={height} scheme="dark" {...props} />
}
