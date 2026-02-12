export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

export type AwaitedType<T> = T extends Promise<infer U> ? U : T;
export type ArrayElement<T> = T extends (infer U)[] ? U : never;
export type ReturnTypeOf<T> = T extends (...args: unknown[]) => infer R
  ? R
  : never;
export type ParametersOf<T> = T extends (...args: infer P) => unknown
  ? P
  : never;

export type Immutable<T> = {
  readonly [P in keyof T]: T[P] extends object ? Immutable<T[P]> : T[P];
};

export type NonNullableValue<T> = T extends null | undefined ? never : T;
export type ValueOf<T> = T[keyof T];
export type If<C extends boolean, T, F> = C extends true ? T : F;

export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}
