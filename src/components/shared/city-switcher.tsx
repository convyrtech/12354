"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { cities } from "@/lib/cities/cities-config";
import { useCity } from "@/lib/cities/city-context";

const EASE = [0.22, 1, 0.36, 1] as const;

export function CitySwitcher() {
  const { city, setCity, hydrated } = useCity();
  const [open, setOpen] = useState(false);
  const [pendingComingSoonId, setPendingComingSoonId] = useState<string | null>(
    null,
  );
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const handleSelect = useCallback(
    (cityId: string) => {
      const result = setCity(cityId);
      if (result.reason === "coming-soon") {
        setPendingComingSoonId(cityId);
      } else if (result.accepted) {
        setOpen(false);
      }
    },
    [setCity],
  );

  const pendingComingSoon = pendingComingSoonId
    ? cities.find((entry) => entry.id === pendingComingSoonId) ?? null
    : null;

  return (
    <div ref={rootRef} className="city-switcher" data-open={open || undefined}>
      <button
        type="button"
        className="city-switcher__trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Текущий город: ${city.name}. Нажмите, чтобы сменить.`}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="city-switcher__eyebrow">{city.name.toUpperCase()}</span>
        <span className="city-switcher__hint">
          {hydrated ? "Сменить" : "…"}
        </span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.ul
            className="city-switcher__list"
            role="listbox"
            aria-label="Города"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: EASE }}
          >
            {cities.map((entry) => {
              const active = entry.id === city.id;
              const comingSoon = entry.status === "coming-soon";
              return (
                <li key={entry.id} className="city-switcher__item">
                  <button
                    type="button"
                    className="city-switcher__option"
                    role="option"
                    aria-selected={active}
                    data-active={active || undefined}
                    data-coming-soon={comingSoon || undefined}
                    onClick={() => handleSelect(entry.id)}
                  >
                    <span className="city-switcher__name">{entry.name}</span>
                    {comingSoon ? (
                      <em className="city-switcher__flag">
                        {entry.comingSoonLabel ?? "скоро"}
                      </em>
                    ) : active ? (
                      <span className="city-switcher__mark" aria-hidden>
                        ✓
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {pendingComingSoon ? (
          <motion.div
            className="city-switcher__modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setPendingComingSoonId(null)}
          >
            <motion.div
              className="city-switcher__modal-card"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              transition={{ duration: 0.26, ease: EASE }}
              onClick={(event) => event.stopPropagation()}
            >
              <p className="city-switcher__modal-eyebrow">
                {pendingComingSoon.comingSoonLabel ?? "скоро"}
              </p>
              <h3 className="city-switcher__modal-title">
                {pendingComingSoon.name} — пока не работаем
              </h3>
              <p className="city-switcher__modal-body">
                {pendingComingSoon.comingSoonNote ??
                  "Откроемся после Москвы. Оставьте номер — напишем, когда поедем."}
              </p>
              <button
                type="button"
                className="cta cta--secondary"
                onClick={() => setPendingComingSoonId(null)}
              >
                Понятно
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
