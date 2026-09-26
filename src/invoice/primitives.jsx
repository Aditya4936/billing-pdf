const ANCHOR = { left: 'start', center: 'middle', right: 'end' };

/** A 1pt horizontal rule. */
export function HLine({ y, x1, x2 }) {
  return <line className="rule" x1={x1} y1={y} x2={x2} y2={y} />;
}

/** A 1pt vertical rule. */
export function VLine({ x, y1, y2 }) {
  return <line className="rule" x1={x} y1={y1} x2={x} y2={y2} />;
}

/** A shaded panel with a 1pt border, painted like the PDF's "re B": fill, then stroke. */
export function Panel({ x, y, width, height }) {
  return <rect className="panel" x={x} y={y} width={width} height={height} />;
}

/**
 * Text positioned the way the reference PDF positions it: `y` is the baseline and
 * `x` is the anchor for `align` (left edge, centre or right edge). `offsetY` shifts
 * a slot down, for repeated rows. Empty values render nothing.
 */
export function Text({ x, y, offsetY = 0, align = 'left', font, size, bold = false, italic = false, children }) {
  if (children == null || children === '') return null;

  const className = ['txt', `ff-${font}`, `pt-${size}`, bold && 'bold', italic && 'italic']
    .filter(Boolean)
    .join(' ');

  return (
    <text className={className} x={x} y={y + offsetY} textAnchor={ANCHOR[align]} xmlSpace="preserve">
      {children}
    </text>
  );
}
