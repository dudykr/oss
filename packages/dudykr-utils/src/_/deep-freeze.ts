export type DeepReadonly<T> = {
  readonly [P in keyof T]: DeepReadonly<T[P]>;
};

export default function deepFreeze<T>(v: T): DeepReadonly<T> {
  if (typeof v !== "object" || v === null) {
    return v;
  }

  const result: { [name: string | symbol | number]: DeepReadonly<T[keyof T]> } =
    {};
  for (const key in v) {
    if (Object.prototype.hasOwnProperty.call(v, key)) {
      result[key] = deepFreeze(v[key]);
    }
  }

  return Object.freeze(result) as DeepReadonly<T>;
}
