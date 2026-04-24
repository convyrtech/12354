"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function getRouteMeta(pathname: string) {
  if (pathname === "/") {
    return { eyebrow: "The Raki", label: "Раковарня Москвы" };
  }

  if (pathname === "/menu") {
    return { eyebrow: "Каталог", label: "Подбор заказа" };
  }

  if (pathname === "/menu-editorial") {
    return { eyebrow: "Меню", label: "Витрина The Raki" };
  }

  if (pathname.startsWith("/product/")) {
    return { eyebrow: "Позиция", label: "Выбор подачи" };
  }

  if (pathname === "/cart") {
    return { eyebrow: "Корзина", label: "Проверка состава" };
  }

  if (pathname === "/checkout") {
    return { eyebrow: "Оформление", label: "Подтверждение контакта" };
  }

  if (pathname === "/delivery/address") {
    return { eyebrow: "Доставка", label: "Подтверждение адреса" };
  }

  if (pathname === "/delivery/result") {
    return { eyebrow: "Доставка", label: "Подтверждение маршрута" };
  }

  if (pathname === "/pickup/points") {
    return { eyebrow: "Самовывоз", label: "Точка и окно выдачи" };
  }

  return { eyebrow: "The Raki", label: "Маршрут" };
}

export default function Template({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const pathname = usePathname();
  const route = getRouteMeta(pathname);
  const isFirstRender = useRef(true);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setShowOverlay(true);
    const timer = setTimeout(() => setShowOverlay(false), 680);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <>
      {children}
      <AnimatePresence>
        {showOverlay ? (
          <motion.div
            key={`${pathname}-overlay`}
            className="pointer-events-none fixed inset-0 z-[70] overflow-hidden"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, delay: 0.42 }}
          >
            <motion.div
              className="absolute inset-0"
              initial={{ clipPath: "inset(0% 0% 0% 0%)" }}
              animate={{ clipPath: "inset(0% 0% 100% 0%)" }}
              transition={{ duration: 0.64, ease: [0.76, 0, 0.24, 1] }}
              style={{
                background:
                  "linear-gradient(180deg, rgba(8,16,20,0.98) 0%, rgba(15,26,34,0.98) 58%, rgba(99,188,197,0.14) 100%)",
              }}
            />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: [0, 1, 0], y: [20, 0, -12] }}
              transition={{ duration: 0.54, times: [0, 0.28, 1], ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                display: "grid",
                gap: 10,
                justifyItems: "center",
                textAlign: "center",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                }}
              >
                {route.eyebrow}
              </span>
              <strong
                className="font-display"
                style={{
                  fontSize: "clamp(30px, 4vw, 56px)",
                  fontWeight: 700,
                  letterSpacing: "-0.04em",
                  color: "var(--text-primary)",
                }}
              >
                {route.label}
              </strong>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
