"use client";

import { motion } from "framer-motion";
import { LOGO_TRACE_PATHS, LOGO_TRACE_VIEWBOX } from "@/components/logo-trace-paths";

type BrandLogoTraceProps = {
  className?: string;
  color?: string;
  width?: number;
  animated?: boolean;
  opacity?: number;
};

export function BrandLogoTrace({
  className,
  color = "#93eef7",
  width = 320,
  animated = true,
  opacity = 1,
}: BrandLogoTraceProps) {
  return (
    <motion.svg
      viewBox={`0 0 ${LOGO_TRACE_VIEWBOX.width} ${LOGO_TRACE_VIEWBOX.height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ width, height: "auto", overflow: "visible", opacity }}
    >
      {LOGO_TRACE_PATHS.map((path, index) => {
        const strokeWidth = path.area > 1200 ? 1.8 : path.area > 240 ? 1.35 : 1.05;
        const delay = index * 0.011;

        return (
          <motion.path
            key={`${index}-${path.area}`}
            d={path.d}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            initial={animated ? { pathLength: 0, opacity: 0 } : false}
            animate={
              animated
                ? {
                    pathLength: 1,
                    opacity: path.area > 200 ? 1 : 0.8,
                  }
                : {
                    pathLength: 1,
                    opacity: path.area > 200 ? 1 : 0.76,
                  }
            }
            transition={
              animated
                ? {
                    pathLength: {
                      delay,
                      duration: path.area > 1600 ? 1.1 : 0.8,
                      ease: [0.22, 1, 0.36, 1],
                    },
                    opacity: {
                      delay,
                      duration: 0.16,
                    },
                  }
                : undefined
            }
          />
        );
      })}
    </motion.svg>
  );
}
