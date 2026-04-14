"use client";

import { startTransition } from "react";
import { useRouter } from "next/navigation";
import { useDraft } from "@/components/draft-provider";
import type { DraftPatch } from "@/lib/draft";

type DraftActionLinkProps = {
  href: string;
  label: string;
  className: string;
  patch?: DraftPatch;
  reset?: boolean;
};

export function DraftActionLink({
  href,
  label,
  className,
  patch,
  reset = false,
}: DraftActionLinkProps) {
  const router = useRouter();
  const { patchDraft, resetDraft } = useDraft();

  return (
    <button
      className={className}
      type="button"
      onClick={() => {
        if (reset) {
          resetDraft(patch);
        } else if (patch) {
          patchDraft(patch);
        }

        startTransition(() => {
          router.push(href);
        });
      }}
    >
      {label}
    </button>
  );
}
