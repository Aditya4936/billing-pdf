import { TERMS as L } from '../layout.js';
import { Text } from '../primitives.jsx';

/** Numbered terms, followed by the jurisdiction clause as the last item. */
export default function TermsAndConditions({ terms, jurisdiction }) {
  const clauseOffsetY = terms.length * L.rowHeight;

  return (
    <g className="terms-and-conditions">
      <Text {...L.heading}>{'Terms & Condition :'}</Text>
      {terms.map((term, i) => (
        <Text key={i} {...L.item} offsetY={i * L.rowHeight}>
          {`${i + 1}.  ${term}`}
        </Text>
      ))}
      {jurisdiction && (
        <>
          <Text {...L.clauseNumber} offsetY={clauseOffsetY}>{`${terms.length + 1}.`}</Text>
          <Text {...L.clauseText} offsetY={clauseOffsetY}>{jurisdiction}</Text>
        </>
      )}
    </g>
  );
}
