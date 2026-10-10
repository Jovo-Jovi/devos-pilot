import type { ReactNode } from "react";

export function Bidi({ children }: { children: ReactNode }) {
  return <bdi>{children}</bdi>;
}
