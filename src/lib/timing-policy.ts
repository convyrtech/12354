import {
  getDefaultTimingSlotForContext,
  getLocation,
  getTimingSlot,
  getTimingSlotPromiseLabel,
  getTimingSlotsForContext,
  getZone,
  type DeliveryState,
  type FulfillmentMode,
  type PickupState,
  type TimingIntent,
  type TimingSlot,
} from "@/lib/fixtures";

export type TimingTruthState = "ready" | "blocked" | "pending";

export type TimingGuardrailCode =
  | "delivery_cutoff"
  | "pickup_closed"
  | "slot_not_available"
  | "window_after_cutoff";

export type TimingTruthInput = {
  fulfillmentMode: FulfillmentMode | null;
  deliveryState: DeliveryState | null;
  pickupState: PickupState | null;
  zoneId: string | null;
  locationId: string | null;
  servicePointId: string | null;
  timingIntent: TimingIntent | null;
  requestedTimeSlotId: string | null;
  requestedTimeLabel: string;
  promiseLabel: string | null;
};

export type TimingTruthEvaluation = {
  state: TimingTruthState;
  code: TimingGuardrailCode | null;
  note: string;
  requestedWindowLabel: string | null;
  requestedSlot: TimingSlot | null;
  availableSlots: TimingSlot[];
  latestAllowedLabel: string | null;
  promiseLabel: string | null;
};

function parseClockMinutes(input: string | null) {
  if (!input) {
    return null;
  }

  const match = input.match(/([01]?\d|2[0-3]):([0-5]\d)/);

  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function formatClockMinutes(minutes: number | null) {
  if (minutes === null) {
    return null;
  }

  const hours = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");

  return `${hours}:${mins}`;
}

function getTimingReferenceMinutes(slot: TimingSlot | null) {
  if (!slot) {
    return null;
  }

  return parseClockMinutes(slot.targetTime || slot.startTime);
}

function getLatestAllowedMinutes(input: Pick<TimingTruthInput, "fulfillmentMode" | "zoneId" | "locationId">) {
  if (input.fulfillmentMode === "delivery") {
    return parseClockMinutes(getZone(input.zoneId)?.acceptingOrdersUntil ?? null);
  }

  if (input.fulfillmentMode === "pickup") {
    return parseClockMinutes(getLocation(input.locationId)?.operatingHours.close ?? null);
  }

  return null;
}

export function getTimingTruthStateLabel(state: TimingTruthState) {
  if (state === "ready") {
    return "Обещание по времени подтверждено";
  }

  if (state === "blocked") {
    return "Время нужно скорректировать";
  }

  return "Время ещё не зафиксировано";
}

export function getTimingGuardrailLabel(code: TimingGuardrailCode | null) {
  if (code === "delivery_cutoff") {
    return "Ближайшее время доставки уже вне рабочей границы";
  }

  if (code === "pickup_closed") {
    return "Точка самовывоза уже закрыта";
  }

  if (code === "slot_not_available") {
    return "Выбранное время больше не подходит текущему контексту";
  }

  if (code === "window_after_cutoff") {
    return "Выбранное время выходит за текущую границу приёма";
  }

  return "Без ограничения";
}

export function evaluateTimingTruth(input: TimingTruthInput): TimingTruthEvaluation {
  const latestAllowedMinutes = getLatestAllowedMinutes(input);
  const latestAllowedLabel = formatClockMinutes(latestAllowedMinutes);
  const availableSlots = getTimingSlotsForContext({
    fulfillmentMode: input.fulfillmentMode,
    deliveryState: input.deliveryState,
    pickupState: input.pickupState,
    zoneId: input.zoneId,
    locationId: input.locationId,
    servicePointId: input.servicePointId,
  });
  const selectedSlot = getTimingSlot(input.requestedTimeSlotId) ?? null;
  const requestedWindowLabel = input.requestedTimeLabel.trim() || null;

  if (!input.timingIntent) {
    return {
      state: "pending",
      code: null,
      note: "Сначала нужно понять: ведём заказ как можно скорее или обещаем доставку ко времени.",
      requestedWindowLabel,
      requestedSlot: null,
      availableSlots,
      latestAllowedLabel,
      promiseLabel: input.promiseLabel,
    };
  }

  if (input.fulfillmentMode === "delivery" && input.deliveryState === "cutoff" && input.timingIntent === "asap") {
    return {
      state: "blocked",
      code: "delivery_cutoff",
      note: "Ближайшее окно доставки уже вышло за рабочую границу. Такое обещание нельзя показывать как обычный self-serve сценарий.",
      requestedWindowLabel,
      requestedSlot: null,
      availableSlots,
      latestAllowedLabel,
      promiseLabel: input.promiseLabel,
    };
  }

  if (input.fulfillmentMode === "pickup" && input.pickupState === "closed" && input.timingIntent === "asap") {
    return {
      state: "blocked",
      code: "pickup_closed",
      note: "Самовывоз сейчас закрыт, поэтому обещание по времени нельзя считать валидным.",
      requestedWindowLabel,
      requestedSlot: null,
      availableSlots,
      latestAllowedLabel,
      promiseLabel: input.promiseLabel,
    };
  }

  if (input.timingIntent === "asap") {
    return {
      state: "ready",
      code: null,
      note: input.promiseLabel
        ? `Режим «как можно скорее» опирается на текущее сервисное обещание: ${input.promiseLabel}.`
        : "Режим «как можно скорее» выбран, но точное обещание по времени ещё не подтверждено.",
      requestedWindowLabel: "Как можно скорее",
      requestedSlot: null,
      availableSlots,
      latestAllowedLabel,
      promiseLabel: input.promiseLabel,
    };
  }

  if (!input.requestedTimeSlotId) {
    const defaultSlot = getDefaultTimingSlotForContext({
      fulfillmentMode: input.fulfillmentMode,
      deliveryState: input.deliveryState,
      pickupState: input.pickupState,
      zoneId: input.zoneId,
      locationId: input.locationId,
      servicePointId: input.servicePointId,
    });

    return {
      state: "pending",
      code: null,
      note: defaultSlot
        ? `Режим «ко времени» выбран, но конкретное время ещё не зафиксировано. Ближайшее доступное время: ${defaultSlot.label}.`
        : "Режим «ко времени» выбран, но для текущего контекста пока нет доступного подтверждённого времени.",
      requestedWindowLabel,
      requestedSlot: null,
      availableSlots,
      latestAllowedLabel,
      promiseLabel: input.promiseLabel,
    };
  }

  if (!selectedSlot || !availableSlots.some((slot) => slot.id === selectedSlot.id)) {
    return {
      state: "blocked",
      code: "slot_not_available",
      note: "Выбранное время больше не соответствует текущей точке, адресу или режиму сервиса. Нужно выбрать новое подтверждённое время.",
      requestedWindowLabel: requestedWindowLabel ?? selectedSlot?.label ?? null,
      requestedSlot: selectedSlot,
      availableSlots,
      latestAllowedLabel,
      promiseLabel: input.promiseLabel,
    };
  }

  const requestedStartMinutes = getTimingReferenceMinutes(selectedSlot);

  if (
    latestAllowedMinutes !== null &&
    requestedStartMinutes !== null &&
    selectedSlot.dayOffset === 0 &&
    requestedStartMinutes > latestAllowedMinutes
  ) {
    return {
      state: "blocked",
      code: "window_after_cutoff",
      note: `Выбранное время начинается позже текущей границы ${formatClockMinutes(latestAllowedMinutes)} и не должно обещаться гостю как валидное.`,
      requestedWindowLabel: selectedSlot.label,
      requestedSlot: selectedSlot,
      availableSlots,
      latestAllowedLabel,
      promiseLabel: input.promiseLabel,
    };
  }

  const promiseLabel = getTimingSlotPromiseLabel(selectedSlot);

  return {
    state: "ready",
    code: null,
    note: latestAllowedLabel
      ? input.fulfillmentMode === "delivery"
        ? `Время ${selectedSlot.label} подтверждено как рабочее. Для The Raki это уже сервисное обещание: цель — привезти примерно в пределах ±15 минут при текущей границе до ${latestAllowedLabel}.`
        : `Время ${selectedSlot.label} подтверждено как рабочее. Самовывоз должен быть готов к этому времени при текущей границе до ${latestAllowedLabel}.`
      : input.fulfillmentMode === "delivery"
        ? `Время ${selectedSlot.label} подтверждено как рабочее. Для The Raki это уже сервисное обещание, а не пожелание.`
        : `Время ${selectedSlot.label} подтверждено как рабочее для самовывоза.`,
    requestedWindowLabel: selectedSlot.label,
    requestedSlot: selectedSlot,
    availableSlots,
    latestAllowedLabel,
    promiseLabel,
  };
}
