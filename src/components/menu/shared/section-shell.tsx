import type { ReactNode } from "react";
import { EditorialLabel } from "@/components/menu/shared/editorial-label";

type Props = {
  id: string;
  title: string;
  eyebrow?: string;
  narrative?: string;
  children: ReactNode;
};

export function SectionShell({ id, title, eyebrow, narrative, children }: Props) {
  const headingId = `section-${id}-heading`;
  return (
    <section id={id} className="menu-section" aria-labelledby={headingId}>
      {eyebrow ? <EditorialLabel>{eyebrow}</EditorialLabel> : null}
      <h2 id={headingId} className="menu-section__headline">
        {title}
      </h2>
      {narrative ? (
        <p className="menu-section__narrative" style={{ marginBottom: 32 }}>
          {narrative}
        </p>
      ) : null}
      {children}
    </section>
  );
}
