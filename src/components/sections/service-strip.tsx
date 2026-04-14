"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { SERVICE_STAGE } from "@/lib/homepage-data";

const EASE = [0.22, 1, 0.36, 1] as const;

export function ServiceStrip() {
  return (
    <section
      id="service"
      className="home-section"
      style={{ paddingBottom: "clamp(88px, 10vw, 148px)", scrollMarginTop: 120 }}
    >
      <div className="home-shell">
        <motion.div
          className="service-stage"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.28 }}
          transition={{ duration: 0.8, ease: EASE }}
        >
          <div className="service-stage__line" aria-hidden>
            <span />
          </div>

          <div className="service-stage__copy">
            <span className="text-eyebrow">{SERVICE_STAGE.eyebrow}</span>
            <h2 className="text-h1" style={{ marginTop: 20 }}>
              {SERVICE_STAGE.title.map((line) => (
                <span key={line} style={{ display: "block" }}>
                  {line}
                </span>
              ))}
            </h2>
            <p className="section-summary service-stage__lead">{SERVICE_STAGE.summary}</p>
          </div>

          <div className="service-stage__aside">
            <motion.div
              className="service-stage__media"
              initial={{ opacity: 0, scale: 0.98, y: 14 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, amount: 0.28 }}
              transition={{ delay: 0.1, duration: 0.82, ease: EASE }}
            >
              <Image
                src={SERVICE_STAGE.image}
                alt="Service moment"
                fill
                sizes="(max-width: 1023px) 100vw, 28vw"
                style={{ objectFit: "cover", objectPosition: "58% 50%" }}
              />
              <div className="service-stage__veil" aria-hidden />
            </motion.div>

            <div className="service-stage__truths">
              {SERVICE_STAGE.truths.map((truth) => (
                <span key={truth}>{truth}</span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
