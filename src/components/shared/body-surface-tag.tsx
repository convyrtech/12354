"use client";

import { useEffect } from "react";

export function BodySurfaceTag({ surface }: { surface: string }) {
  useEffect(() => {
    document.body.dataset.surface = surface;
    return () => {
      delete document.body.dataset.surface;
    };
  }, [surface]);

  return null;
}
