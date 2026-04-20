"use client";

import Link from "next/link";
import { motion, useInView, useReducedMotion, type Variants } from "framer-motion";
import { useRef } from "react";
import { useDraft } from "@/components/draft-provider";
import { MENU_ENTRY_INFO } from "@/lib/homepage-data";

const INFO_CONTAINER: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0 } },
};

const INFO_ITEM: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export function CtaFooterMenu() {
  const { draft } = useDraft();
  const prefersReduced = useReducedMotion();
  const infoRef = useRef<HTMLDivElement | null>(null);
  const infoInView = useInView(infoRef, { once: true, amount: 0.2 });
  const isEmpty = draft.lineItems.length === 0;

  const animateState = prefersReduced || infoInView ? "visible" : "hidden";

  return (
    <section
      className="menu-cta-footer menu-cta-section"
      aria-label="Финальный экран — оформить заказ"
    >
      <div className="menu-cta-block">
        <div className="menu-cta-block__cta-zone">
          <div className="menu-cta-block__text-col">
            <h2 className="menu-cta-block__headline">
              Ваш стол{" "}
              <span className="menu-cta-block__emphasis">
                собран
                <span className="menu-cta-block__underline" aria-hidden />
              </span>
              ?
            </h2>
          </div>

          <div className="menu-cta-block__cta-col">
            <Link
              href="/cart"
              className="cta cta--primary menu-cta-footer__pill"
              data-disabled={isEmpty || undefined}
              aria-disabled={isEmpty || undefined}
              tabIndex={isEmpty ? -1 : 0}
              onClick={(event) => {
                if (isEmpty) event.preventDefault();
              }}
            >
              <span>Оформить заказ →</span>
            </Link>
            {isEmpty ? (
              <p className="menu-cta-footer__empty-subtitle">
                Добавьте позиции к столу — собрать можно прямо отсюда.
              </p>
            ) : null}
          </div>
        </div>

        <motion.div
          ref={infoRef}
          className="menu-cta-info"
          variants={INFO_CONTAINER}
          initial={prefersReduced ? "visible" : "hidden"}
          animate={animateState}
        >
          <motion.div
            className="menu-cta-info__separator"
            variants={INFO_ITEM}
            aria-hidden
          >
            <span className="menu-cta-info__separator-line" />
            <span className="menu-cta-info__separator-dots">· · ·</span>
            <span className="menu-cta-info__separator-line" />
          </motion.div>

          {MENU_ENTRY_INFO.columns.map((col, idx) => (
            <motion.div
              key={col.title}
              className={`menu-cta-info__col menu-cta-info__col--${idx + 1}`}
              style={{ gridArea: `c${idx + 1}` }}
              variants={INFO_ITEM}
            >
              <h3 className="menu-cta-info__title">{col.title}</h3>
              {col.lines.map((line, lineIdx) => (
                <p key={lineIdx}>{line || "\u00A0"}</p>
              ))}
            </motion.div>
          ))}

          <motion.p className="menu-cta-info__wordmark" variants={INFO_ITEM}>
            {MENU_ENTRY_INFO.wordmark}
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
