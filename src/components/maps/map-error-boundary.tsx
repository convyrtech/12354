"use client";

import { Component, type ReactNode } from "react";

type MapErrorBoundaryProps = {
  fallback: ReactNode;
  children: ReactNode;
};

type MapErrorBoundaryState = {
  hasError: boolean;
};

/**
 * Catches any runtime error thrown by the MapLibre canvas — bundle load
 * failure, CSP violation, WebGL unavailable, etc. Renders the provided
 * fallback instead of an empty page.
 *
 * The plan's fallback is `<DeliveryMapSurface liveCanvas={null} />` which
 * already ships a static SVG map. The address form keeps working on its
 * own — the user can still submit without the interactive map.
 */
export class MapErrorBoundary extends Component<
  MapErrorBoundaryProps,
  MapErrorBoundaryState
> {
  state: MapErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): MapErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Surface to server logs without alarming the user. The UI already
    // degraded to the SVG fallback at this point.
    if (typeof console !== "undefined") {
      console.warn("[MapErrorBoundary] MapLibre canvas failed:", error.message);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
