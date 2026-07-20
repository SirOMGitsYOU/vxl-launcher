import type { MutableRefObject, Ref } from "react";

export function setRefValue<T>(ref: Ref<T> | undefined | null, value: T | null) {
  if (!ref) return;
  if (typeof ref === "function") {
    ref(value);
    return;
  }
  (ref as MutableRefObject<T | null>).current = value;
}

export function mergeRefs<T>(...refs: Array<Ref<T> | MutableRefObject<T | null> | undefined | null>) {
  return (value: T | null) => {
    for (const ref of refs) {
      setRefValue(ref, value);
    }
  };
}
