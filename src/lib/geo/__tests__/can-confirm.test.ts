import { describe, expect, it } from "vitest";
import {
  canConfirmDeliveryAddress,
  type CanConfirmInput,
} from "@/lib/geo/can-confirm";
import type { DeliveryQuote, GeoDeliveryState } from "@/lib/geo/types";

function makeQuote(state: GeoDeliveryState): Pick<DeliveryQuote, "zone"> {
  return {
    zone: {
      inZone: state === "in-zone",
      deliveryState: state,
      zoneId: "zone_test",
      zoneLabel: "Test",
      polygon: null,
      kitchenId: "loc_lesnoy_01",
      servicePointId: null,
      legalEntityId: null,
      resolverNote: "",
    },
  };
}

function makeInput(overrides: Partial<CanConfirmInput> = {}): CanConfirmInput {
  return {
    committed: {
      lat: 55.7611,
      lng: 37.6094,
      normalizedAddress: "Тверская 7",
      confidence: "high",
      source: "suggestion",
    },
    activeQuote: makeQuote("in-zone"),
    isQuoteLoading: false,
    isReverseLoading: false,
    ...overrides,
  };
}

describe("canConfirmDeliveryAddress", () => {
  it("allows submit when suggestion commit + quote ready + in-zone", () => {
    expect(canConfirmDeliveryAddress(makeInput())).toBe(true);
  });

  it("allows submit for a map_pin commit once reverse has settled", () => {
    expect(
      canConfirmDeliveryAddress(
        makeInput({
          committed: {
            lat: 55.76,
            lng: 37.61,
            normalizedAddress: "Тверская 7",
            confidence: "medium",
            source: "map_pin",
          },
          isReverseLoading: false,
        }),
      ),
    ).toBe(true);
  });

  it("blocks submit before any address is committed", () => {
    expect(
      canConfirmDeliveryAddress(makeInput({ committed: null })),
    ).toBe(false);
  });

  it("blocks submit while the quote request is still in flight", () => {
    expect(
      canConfirmDeliveryAddress(makeInput({ isQuoteLoading: true })),
    ).toBe(false);
  });

  it("blocks submit when the quote errored out (activeQuote null)", () => {
    expect(
      canConfirmDeliveryAddress(makeInput({ activeQuote: null })),
    ).toBe(false);
  });

  it("blocks submit for out-of-zone quotes", () => {
    expect(
      canConfirmDeliveryAddress(
        makeInput({ activeQuote: makeQuote("out-of-zone") }),
      ),
    ).toBe(false);
  });

  it("allows submit for cutoff quotes (scheduled for next window)", () => {
    expect(
      canConfirmDeliveryAddress(
        makeInput({ activeQuote: makeQuote("cutoff") }),
      ),
    ).toBe(true);
  });

  it("blocks submit for a map_pin commit while reverse is still pending", () => {
    expect(
      canConfirmDeliveryAddress(
        makeInput({
          committed: {
            lat: 55.76,
            lng: 37.61,
            normalizedAddress: "Точка на карте",
            confidence: "low",
            source: "map_pin",
          },
          isReverseLoading: true,
        }),
      ),
    ).toBe(false);
  });

  it("does NOT block a suggestion commit on reverse flight (reverse is irrelevant there)", () => {
    expect(
      canConfirmDeliveryAddress(
        makeInput({
          committed: {
            lat: 55.76,
            lng: 37.61,
            normalizedAddress: "Тверская 7",
            confidence: "high",
            source: "suggestion",
          },
          isReverseLoading: true,
        }),
      ),
    ).toBe(true);
  });

  it("treats low-confidence suggestion as confirmable (operator handles edge cases)", () => {
    // Gate intentionally doesn't enforce confidence for suggestion source —
    // user typed and picked themselves. deliveryDecisionState upstream will
    // mark "manual_confirmation" if needed; that's a separate responsibility.
    expect(
      canConfirmDeliveryAddress(
        makeInput({
          committed: {
            lat: 55.76,
            lng: 37.61,
            normalizedAddress: "Тверская 7",
            confidence: "low",
            source: "suggestion",
          },
        }),
      ),
    ).toBe(true);
  });
});
