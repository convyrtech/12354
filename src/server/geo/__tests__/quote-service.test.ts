import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildDeliveryQuote,
  buildEta,
  formatMoscowArrivalLabel,
} from "@/server/geo/quote-service";

describe("buildEta", () => {
  beforeEach(() => {
    // Freeze time at a Moscow-midday instant so etaLabel assertions are
    // deterministic regardless of the machine the tests run on.
    //   2026-04-23T09:00:00Z  ==  2026-04-23 12:00 Moscow (MSK = UTC+3)
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-23T09:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("in-zone: ETA = 20 cook + route + 10 handoff, spread = 15", () => {
    const eta = buildEta({ routeMinutesLive: 25, deliveryState: "in-zone" });
    expect(eta.cookMinutes).toBe(20);
    expect(eta.handoffMinutes).toBe(10);
    expect(eta.etaMinMinutes).toBe(55);
    expect(eta.etaMaxMinutes).toBe(70);
  });

  it("in-zone: etaLabel is Moscow arrival time 'Будем у вас к HH:MM'", () => {
    const eta = buildEta({ routeMinutesLive: 25, deliveryState: "in-zone" });
    // 12:00 Moscow + 55 min = 12:55 Moscow
    expect(eta.etaLabel).toBe("Будем у вас к 12:55");
  });

  it("cutoff zones get an ETA label too (scheduled order path shows it)", () => {
    const eta = buildEta({ routeMinutesLive: 40, deliveryState: "cutoff" });
    expect(eta.etaMinMinutes).toBe(70);
    expect(eta.etaMaxMinutes).toBe(85);
    expect(eta.etaLabel).toBe("Будем у вас к 13:10");
  });

  it("out-of-zone: ETA numbers/label are null (no route to quote)", () => {
    const eta = buildEta({
      routeMinutesLive: 30,
      deliveryState: "out-of-zone",
    });
    expect(eta.etaMinMinutes).toBeNull();
    expect(eta.etaMaxMinutes).toBeNull();
    expect(eta.etaLabel).toBeNull();
    // Constants still returned so diagnostic consumers know the formula.
    expect(eta.cookMinutes).toBe(20);
    expect(eta.handoffMinutes).toBe(10);
  });

  it("routeMinutesLive=null (TomTom+fallback both unavailable) → null label", () => {
    const eta = buildEta({
      routeMinutesLive: null,
      deliveryState: "in-zone",
    });
    expect(eta.etaMinMinutes).toBeNull();
    expect(eta.etaLabel).toBeNull();
  });

  it("rolls over to next hour correctly", () => {
    // 12:00 + 61 min = 13:01
    const eta = buildEta({ routeMinutesLive: 31, deliveryState: "in-zone" });
    expect(eta.etaMinMinutes).toBe(61);
    expect(eta.etaLabel).toBe("Будем у вас к 13:01");
  });

  it("clamps absurd route durations (e.g. stale draft with foreign coords) to null label", () => {
    // User had localStorage cached with coords on a different continent. The
    // Haversine fallback happily produces 10510 min — 'HH:MM' mod 24 would
    // render "Будем у вас к 08:27" which is worse than no label at all.
    const eta = buildEta({
      routeMinutesLive: 10510,
      deliveryState: "in-zone",
    });
    expect(eta.etaLabel).toBeNull();
    expect(eta.etaMinMinutes).toBeNull();
  });

  it("rolls over to next day when late evening", () => {
    // 22:50 Moscow + 20 cook + 65 route + 10 handoff = 95 min → 00:25 next day
    vi.setSystemTime(new Date("2026-04-23T19:50:00Z")); // 22:50 MSK
    const eta = buildEta({ routeMinutesLive: 65, deliveryState: "in-zone" });
    expect(eta.etaMinMinutes).toBe(95);
    expect(eta.etaLabel).toBe("Будем у вас к 00:25");
  });
});

describe("formatMoscowArrivalLabel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-23T09:00:00Z")); // 12:00 MSK
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats with Moscow timezone regardless of server TZ", () => {
    expect(formatMoscowArrivalLabel(30)).toBe("Будем у вас к 12:30");
  });

  it("zero minutes returns current Moscow hour:minute", () => {
    expect(formatMoscowArrivalLabel(0)).toBe("Будем у вас к 12:00");
  });
});

describe("buildDeliveryQuote", () => {
  it("returns the same active kitchen id that was used for route quoting", async () => {
    const quote = await buildDeliveryQuote({
      mode: "suggestion",
      rawInput: "Moscow, Tverskaya 7",
      normalizedAddress: "Moscow, Tverskaya 7",
      lat: 55.7579795,
      lng: 37.611263,
      confidence: "high",
    });

    expect(quote.kitchen.kitchenId).toBe("loc_reutov_01");
  });
});
