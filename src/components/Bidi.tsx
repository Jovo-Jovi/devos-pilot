import type { ReactNode } from "react";

export function Bidi({ children }: { children: ReactNode }) {
  return <bdi dir="ltr">{children}</bdi>;
}
