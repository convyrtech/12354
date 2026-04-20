import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  tone?: "dark" | "cream";
};

export function EditorialLabel({ children, tone = "cream" }: Props) {
  return (
    <span className="menu-editorial-label" data-tone={tone}>
      —— {children}
    </span>
  );
}
