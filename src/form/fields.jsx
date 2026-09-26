import { useId } from 'react';
import { displayToIsoDate, isoToDisplayDate } from '../utils/date.js';

/**
 * A titled block of fields, laid out on a 6-column grid unless `grid` is false.
 * `aside` sits at the right of the title.
 */
export function FormSection({ title, aside, grid = true, children }) {
  return (
    <section className="form-section">
      <div className="form-section-head">
        <h2>{title}</h2>
        {aside}
      </div>
      {grid ? <div className="form-grid">{children}</div> : children}
    </section>
  );
}

/** Like FormSection, but collapsed until opened (for details that rarely change). */
export function CollapsibleSection({ title, children }) {
  return (
    <details className="form-section">
      <summary>{title}</summary>
      <div className="form-grid">{children}</div>
    </details>
  );
}

function Field({ label, span, children }) {
  const id = useId();
  return (
    <div className={`field span-${span}`}>
      <label htmlFor={id}>{label}</label>
      {children(id)}
    </div>
  );
}

export function TextField({ label, value, onChange, span = 6, uppercase = false, ...inputProps }) {
  return (
    <Field label={label} span={span}>
      {(id) => (
        <input
          id={id}
          type="text"
          value={value ?? ''}
          onChange={(event) => onChange(uppercase ? event.target.value.toUpperCase() : event.target.value)}
          {...inputProps}
        />
      )}
    </Field>
  );
}

export function NumberField({ label, value, onChange, span = 2 }) {
  return (
    <Field label={label} span={span}>
      {(id) => (
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Field>
  );
}

/** Edits a "dd/mm/yyyy" value with the browser's date picker. */
export function DateField({ label, value, onChange, span = 2 }) {
  return (
    <Field label={label} span={span}>
      {(id) => (
        <input
          id={id}
          type="date"
          value={displayToIsoDate(value)}
          onChange={(event) => onChange(isoToDisplayDate(event.target.value))}
        />
      )}
    </Field>
  );
}

/** `options`: strings, or { value, label } objects. */
export function SelectField({ label, value, options, onChange, span = 2 }) {
  const normalized = options.map((option) => (typeof option === 'string' ? { value: option, label: option } : option));
  if (!normalized.some((option) => option.value === value)) normalized.unshift({ value, label: value });

  return (
    <Field label={label} span={span}>
      {(id) => (
        <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
          {normalized.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function CheckboxField({ label, checked, onChange }) {
  return (
    <label className="checkbox">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}
