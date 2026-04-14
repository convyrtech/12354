"use client";

import { motion } from "framer-motion";

type LogoSvgProps = {
  className?: string;
  color?: string;
  width?: number;
  animated?: boolean;
};

function getDrawMotion(delay: number) {
  return {
    initial: { pathLength: 0, opacity: 0 },
    animate: { pathLength: 1, opacity: 1 },
    transition: {
      pathLength: {
        delay,
        duration: 1.2,
      },
      opacity: {
        delay,
        duration: 0.1,
      },
    },
  } as const;
}

export function LogoSvg({
  className,
  color = "#63bcc5",
  width = 280,
  animated = true,
}: LogoSvgProps) {
  const draw = (delay: number) => (animated ? getDrawMotion(delay) : {});

  return (
    <motion.svg
      viewBox="0 0 400 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ width, height: "auto" }}
    >
      <motion.path
        d="M 40 45 Q 35 30 55 28 Q 75 26 90 30 Q 95 31 90 35 Q 80 33 65 34 Q 60 35 58 55 Q 56 75 60 95 Q 62 100 58 100 Q 52 100 50 90 Q 46 75 48 55 Q 50 40 55 35"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        {...draw(0)}
      />
      <motion.path
        d="M 75 50 Q 72 60 73 72 Q 74 80 80 78 Q 88 74 90 62 Q 86 55 78 58 Q 73 62 75 50"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        {...draw(0.3)}
      />
      <motion.path
        d="M 95 48 Q 93 58 94 72 Q 95 80 100 75 Q 108 65 105 55 Q 100 50 95 55 M 102 62 L 115 60"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        {...draw(0.5)}
      />
      <motion.path
        d="M 155 40 Q 150 50 152 80 Q 153 100 155 110 M 155 50 Q 160 35 180 38 Q 195 42 188 55 Q 182 65 165 68 M 170 68 Q 185 85 200 110"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
        {...draw(1)}
      />
      <motion.path
        d="M 205 55 Q 200 70 205 90 Q 210 100 220 90 Q 232 75 225 60 Q 218 50 208 58 Q 203 65 205 55 M 225 85 Q 230 95 235 105"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
        {...draw(1.5)}
      />
      <motion.path
        d="M 245 40 Q 243 55 245 80 Q 246 95 248 105 M 245 65 Q 255 50 268 55 Q 278 62 272 75 Q 268 82 260 78"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
        {...draw(2)}
      />
      <motion.path
        d="M 290 55 Q 288 70 290 95 Q 291 100 292 105 M 290 42 Q 292 38 294 42 Q 292 46 290 42"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
        {...draw(2.3)}
      />
      <motion.path
        d="M 120 95 Q 100 100 85 110 Q 75 118 80 125 Q 90 135 105 125 Q 95 115 110 108 Q 125 100 120 95"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        {...draw(2.8)}
      />
      <motion.path
        d="M 310 30 Q 320 25 325 30 Q 328 35 322 38 Q 315 35 310 30 M 322 35 Q 330 40 335 38 M 322 35 Q 328 45 325 50"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        {...draw(3)}
      />
    </motion.svg>
  );
}
