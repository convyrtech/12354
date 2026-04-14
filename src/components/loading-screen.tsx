"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { BrandLogoTrace } from "@/components/brand-logo-trace";

export function LoadingScreen() {
  const [show, setShow] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(1500);

  useEffect(() => {
    const seen = window.sessionStorage.getItem("raki_loader_seen");
    const nextDuration = seen ? 880 : 1500;

    setDuration(nextDuration);
    setShow(true);
    window.sessionStorage.setItem("raki_loader_seen", "1");

    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min(elapsed / nextDuration, 1);
      setProgress(pct);
      if (pct < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);

    const timer = window.setTimeout(() => setShow(false), nextDuration + 90);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          key="loading"
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
          style={{ backgroundColor: "var(--bg)" }}
          exit={{ opacity: 0, transition: { duration: 0.32 } }}
        >
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0.22 }}
            animate={{ opacity: [0.18, 0.26, 0.18] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.016) 1px, transparent 1px)",
              backgroundSize: "160px 160px",
              maskImage: "radial-gradient(circle at center, black 42%, transparent 86%)",
            }}
          />

          <motion.div
            className="relative z-10 flex flex-col items-center"
            exit={{
              opacity: 0,
              y: -6,
              filter: "blur(8px)",
              transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] },
            }}
          >
            <div
              style={{
                position: "relative",
                width: "min(70vw, 480px)",
                aspectRatio: "1.8 / 1",
              }}
            >
              <motion.div
                className="absolute inset-[-12%]"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: [0.12, 0.2, 0.12], scale: [0.92, 1, 0.94] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, rgba(99,188,197,0.14) 0%, rgba(99,188,197,0.05) 30%, rgba(99,188,197,0) 68%)",
                  filter: "blur(10px)",
                }}
              />

              <motion.div
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 0.08, scale: 0.97 }}
                transition={{ duration: 0.8 }}
              >
                <BrandLogoTrace animated={false} color="rgba(99,188,197,0.16)" width={520} />
              </motion.div>

              <motion.div
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: [0, 0.98, 0.9], scale: [0.95, 0.985, 1] }}
                transition={{
                  duration: Math.max(duration / 1000, 1),
                  times: [0, 0.46, 1],
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <BrandLogoTrace color="#9bf2fb" width={520} />
              </motion.div>
            </div>

            <div
              style={{
                width: "min(72vw, 280px)",
                marginTop: 20,
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: 1,
                  overflow: "hidden",
                  backgroundColor: "rgba(99,188,197,0.12)",
                }}
              >
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: progress }}
                  transition={{ duration: 0.18, ease: "linear" }}
                  style={{
                    height: "100%",
                    backgroundColor: "var(--accent)",
                    transformOrigin: "left",
                  }}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
