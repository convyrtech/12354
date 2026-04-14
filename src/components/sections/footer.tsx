"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { HOME_CONTACT_LINES } from "@/lib/homepage-data";

export function Footer() {
  const footerRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: footerRef,
    offset: ["start end", "end end"],
  });

  const wordmarkY = useTransform(scrollYProgress, [0, 1], [80, 0]);

  return (
    <footer
      ref={footerRef}
      id="contact"
      className="footer-outro"
      style={{ padding: "clamp(88px, 10vw, 132px) 0 var(--space-lg)" }}
    >
      <div className="home-shell footer-outro__shell">
        <div className="footer-outro__top">
          <div className="footer-outro__nav">
            <span className="text-eyebrow">
              The Raki
            </span>

            <div className="footer-outro__links">
              <Link href="/#quality" className="footer-link">
                О бренде
              </Link>
              <Link href="/#service" className="footer-link">
                Сервис
              </Link>
              <Link href="/menu?fulfillment=delivery" className="footer-link">
                Меню
              </Link>
            </div>
          </div>

          <div className="footer-outro__contact">
            <span className="text-eyebrow">
              Private service
            </span>

            <p className="footer-outro__headline">Москва и МО. Без компромиссов.</p>

            <div className="footer-outro__signal" aria-hidden />
            <p className="footer-outro__note">Свежий продукт, точная подача и спокойный сервис без ресторанного шума.</p>

            <div className="footer-outro__actions">
              <Link href="/menu?fulfillment=delivery" className="editorial-link">
                Открыть меню
              </Link>
              <Link
                href={HOME_CONTACT_LINES[1].href}
                target="_blank"
                rel="noopener noreferrer"
                className="editorial-link"
              >
                Telegram
              </Link>
              <Link href="/#top" className="footer-outro__toplink" aria-label="Наверх">
                ↑
              </Link>
            </div>
          </div>
        </div>

        <div className="footer-outro__meta">
          <div className="footer-outro__socials">
            {HOME_CONTACT_LINES.slice(1).map((line) => (
              <Link
                key={line.label}
                href={line.href}
                target={line.href.startsWith("http") ? "_blank" : undefined}
                rel={line.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="footer-link"
              >
                {line.value}
              </Link>
            ))}
          </div>

          <div className="footer-outro__city">Москва • с 2017</div>
        </div>

        <motion.div className="footer-outro__wordmark" style={{ y: wordmarkY }}>
          THE RAKI
        </motion.div>
      </div>
    </footer>
  );
}
