"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type RefObject,
} from "react";

const MAP_SIZE = 128;

export type HeroLineRippleHandle = {
  drop: () => void;
};

type Props = {
  targetRef: RefObject<HTMLElement | null>;
  /** If provided, the wave emanates from the centre of this element's
   *  bbox instead of the target's centre. Useful to anchor the ripple
   *  to a semantically important word inside the line. */
  centerRef?: RefObject<HTMLElement | null>;
  filterId: string;
  /** Ripple length in ms. */
  duration: number;
  /** Thickness of the travelling ring in world px. */
  waveWidth: number;
  /** Peak displacement at the ring centre in world px. */
  amplitude: number;
  /** Maximum wave radius as a fraction of the target's own diagonal. */
  maxRadiusFactor: number;
};

export const HeroLineRipple = forwardRef<HeroLineRippleHandle, Props>(function HeroLineRipple(
  {
    targetRef,
    centerRef,
    filterId,
    duration,
    waveWidth,
    amplitude,
    maxRadiusFactor,
  },
  ref,
) {
  const filterRef = useRef<SVGFilterElement>(null);
  const feImageRef = useRef<SVGFEImageElement>(null);
  const feDispRef = useRef<SVGFEDisplacementMapElement>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageDataRef = useRef<ImageData | null>(null);
  const rafRef = useRef<number | null>(null);
  const cleanupRafRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const canvas = document.createElement("canvas");
    canvas.width = MAP_SIZE;
    canvas.height = MAP_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvasRef.current = canvas;
    imageDataRef.current = ctx.createImageData(MAP_SIZE, MAP_SIZE);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (cleanupRafRef.current) cancelAnimationFrame(cleanupRafRef.current);
      canvasRef.current = null;
      imageDataRef.current = null;
    };
  }, []);

  const drop = () => {
    if (isRunningRef.current) return;

    const target = targetRef.current;
    const filter = filterRef.current;
    const feImage = feImageRef.current;
    const feDisp = feDispRef.current;
    const canvas = canvasRef.current;
    const imageData = imageDataRef.current;
    if (!target || !filter || !feImage || !feDisp || !canvas || !imageData) return;
    if (typeof SVGFEDisplacementMapElement === "undefined") return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const targetRect = target.getBoundingClientRect();
    if (targetRect.width < 1 || targetRect.height < 1) return;

    // Wave centre — either a custom element (centerRef) or the target's centre.
    // Coordinates are in target-local space (target's top-left = 0,0).
    let centerX = targetRect.width / 2;
    let centerY = targetRect.height / 2;
    const centerEl = centerRef?.current;
    if (centerEl) {
      const centerRect = centerEl.getBoundingClientRect();
      if (centerRect.width > 0 && centerRect.height > 0) {
        centerX = centerRect.left - targetRect.left + centerRect.width / 2;
        centerY = centerRect.top - targetRect.top + centerRect.height / 2;
      }
    }

    // Square filter region centered on the wave centre. userSpaceOnUse keeps
    // the map sampled 1:1 with CSS pixels so a round ring in the map stays
    // round in world-space (preserveAspectRatio="none" would stretch it).
    const S = Math.max(targetRect.width, targetRect.height) * 2;
    const regionX = centerX - S / 2;
    const regionY = centerY - S / 2;

    filter.setAttribute("filterUnits", "userSpaceOnUse");
    filter.setAttribute("primitiveUnits", "userSpaceOnUse");
    filter.setAttribute("x", String(regionX));
    filter.setAttribute("y", String(regionY));
    filter.setAttribute("width", String(S));
    filter.setAttribute("height", String(S));

    feImage.setAttribute("x", String(regionX));
    feImage.setAttribute("y", String(regionY));
    feImage.setAttribute("width", String(S));
    feImage.setAttribute("height", String(S));
    feImage.setAttribute("preserveAspectRatio", "none");

    // feDisplacementMap: offset = (channel - 0.5) * scale. To encode
    // ±amplitude with a channel range 0..1 we need scale = 2 × amplitude.
    const filterScale = amplitude * 2;
    feDisp.setAttribute("scale", String(filterScale));

    // Wave should reach maxRealRadius (in world px) by progress=1.
    // worldPerMapPx converts canvas distances to world distances.
    const maxRealRadius =
      Math.hypot(targetRect.width, targetRect.height) * maxRadiusFactor;
    const worldPerMapPx = S / MAP_SIZE;
    const waveWidthCanvas = waveWidth / worldPerMapPx;
    const maxWaveRadiusCanvas = maxRealRadius / worldPerMapPx;

    const mapCx = MAP_SIZE / 2;
    const mapCy = MAP_SIZE / 2;

    target.style.filter = `url(#${filterId})`;
    isRunningRef.current = true;

    const start = performance.now();
    const data = imageData.data;
    const size = MAP_SIZE;

    const endAnimation = () => {
      feDisp.setAttribute("scale", "0");
      cleanupRafRef.current = requestAnimationFrame(() => {
        target.style.filter = "";
        feImage.removeAttribute("href");
        isRunningRef.current = false;
      });
    };

    const renderFrame = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);

      if (document.visibilityState === "hidden") {
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(renderFrame);
        } else {
          endAnimation();
        }
        return;
      }

      const waveR = progress * maxWaveRadiusCanvas;
      const amp = amplitude * Math.sin(progress * Math.PI);

      for (let y = 0; y < size; y++) {
        const dy = y - mapCy;
        for (let x = 0; x < size; x++) {
          const dx = x - mapCx;
          const d = Math.sqrt(dx * dx + dy * dy);
          const delta = d - waveR;
          let dispWorld = 0;
          if (Math.abs(delta) < waveWidthCanvas) {
            dispWorld = Math.sin((delta / waveWidthCanvas) * Math.PI) * amp;
          }
          const nx = d > 0 ? dx / d : 0;
          const ny = d > 0 ? dy / d : 0;
          const i = (y * size + x) * 4;
          const rChan = 0.5 + (dispWorld * nx) / filterScale;
          const gChan = 0.5 + (dispWorld * ny) / filterScale;
          data[i] = Math.max(0, Math.min(255, Math.round(rChan * 255)));
          data[i + 1] = Math.max(0, Math.min(255, Math.round(gChan * 255)));
          data[i + 2] = 0;
          data[i + 3] = 255;
        }
      }
      ctx.putImageData(imageData, 0, 0);

      const dataUrl = canvas.toDataURL("image/png");
      feImage.setAttribute("href", dataUrl);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(renderFrame);
      } else {
        endAnimation();
      }
    };

    rafRef.current = requestAnimationFrame(renderFrame);
  };

  useImperativeHandle(ref, () => ({ drop }));

  return (
    <svg
      width="0"
      height="0"
      aria-hidden
      style={{ position: "absolute", pointerEvents: "none" }}
    >
      <defs>
        <filter
          id={filterId}
          ref={filterRef}
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
          colorInterpolationFilters="sRGB"
        >
          <feImage ref={feImageRef} result="ripple-map" preserveAspectRatio="none" />
          <feDisplacementMap
            ref={feDispRef}
            in="SourceGraphic"
            in2="ripple-map"
            scale="0"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
});
