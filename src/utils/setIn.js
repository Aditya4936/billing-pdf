/** Returns a copy of `target` with the value at `path` (keys / array indexes) replaced. */
export function setIn(target, [key, ...rest], value) {
  const copy = Array.isArray(target) ? [...target] : { ...target };
  copy[key] = rest.length ? setIn(target[key], rest, value) : value;
  return copy;
}
