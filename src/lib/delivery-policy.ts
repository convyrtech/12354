export type DeliveryPolicyZoneId = "zone_center_msk" | "zone_rublevka";
export type DeliveryFulfillmentSource = "own_courier" | "overflow_provider";
export type DeliveryDecisionState = "self_serve" | "manual_confirmation";

export type DeliveryPolicyRule = {
  zoneId: DeliveryPolicyZoneId;
  zoneLabel: string;
  guestFeeAmount: number;
  minimumOrderAmount: number;
  maxEtaMinutes: number;
  maxLiveQuoteAmount: number;
  maxAbsorbAmount: number;
  manualConfirmationMessage: string;
};

export type DeliveryPolicyGuardrailCode =
  | "quote_unavailable"
  | "eta_above_limit"
  | "quote_above_limit"
  | "absorb_above_limit"
  | "cutoff"
  | "vip_override"
  | "sensitive_route";

export type DeliveryPolicyEvaluation = {
  decisionState: DeliveryDecisionState | null;
  decisionNote: string;
  guardrailCode: DeliveryPolicyGuardrailCode | null;
};

export type DeliveryPolicyRouteSignals = {
  deliveryState: "in-zone" | "out-of-zone" | "cutoff" | null;
  zoneId: string | null;
  fulfillmentSource: DeliveryFulfillmentSource | null;
  liveQuoteAmount: number | null;
  etaLabel: string | null;
};

export type DeliveryPolicyProtectedOverrides = {
  vipOverride?: boolean;
  sensitiveRoute?: boolean;
};

export type DeliveryPolicyEvaluationInput = DeliveryPolicyRouteSignals &
  DeliveryPolicyProtectedOverrides;

export type DeliveryPolicyEditableThresholds = {
  guestFeeAmount: number;
  minimumOrderAmount: number;
  maxEtaMinutes: number;
  maxLiveQuoteAmount: number;
  maxAbsorbAmount: number;
};

export type DeliveryPolicyControlMap = {
  routeSignals: {
    deliveryState: DeliveryPolicyRouteSignals["deliveryState"];
    zoneId: string | null;
    fulfillmentSource: DeliveryFulfillmentSource | null;
    liveQuoteAmount: number | null;
    etaLabel: string | null;
  };
  editableThresholds: DeliveryPolicyEditableThresholds | null;
  protectedOverrides: {
    vipOverride: boolean;
    sensitiveRoute: boolean;
  };
};

export type DeliveryPolicyRuleSet = {
  zones: Record<DeliveryPolicyZoneId, DeliveryPolicyRule>;
  outOfZoneAction: "reject";
  cutoffAction: "manual_confirmation";
  defaultEscalationAction: "manual_confirmation";
};

export const deliveryPolicyRuleSet: DeliveryPolicyRuleSet = {
  zones: {
    zone_center_msk: {
      zoneId: "zone_center_msk",
      zoneLabel: "Центр Москвы",
      guestFeeAmount: 500,
      minimumOrderAmount: 0,
      maxEtaMinutes: 150,
      maxLiveQuoteAmount: 900,
      maxAbsorbAmount: 400,
      manualConfirmationMessage:
        "Доставка возможна, но перед финальным подтверждением этот маршрут должен пройти ручную проверку команды.",
    },
    zone_rublevka: {
      zoneId: "zone_rublevka",
      zoneLabel: "Rublevka",
      guestFeeAmount: 700,
      minimumOrderAmount: 0,
      maxEtaMinutes: 180,
      maxLiveQuoteAmount: 1500,
      maxAbsorbAmount: 800,
      manualConfirmationMessage:
        "Маршрут требует повышенного внимания. Финальное подтверждение по доставке должна дать команда.",
    },
  },
  outOfZoneAction: "reject",
  cutoffAction: "manual_confirmation",
  defaultEscalationAction: "manual_confirmation",
};

export function getDeliveryPolicy(zoneId: string | null) {
  if (!zoneId) {
    return null;
  }

  return deliveryPolicyRuleSet.zones[zoneId as DeliveryPolicyZoneId] ?? null;
}

export function getDeliveryPolicyThresholdSummary(zoneId: string | null) {
  const policy = getDeliveryPolicy(zoneId);

  if (!policy) {
    return null;
  }

  return {
    guestFeeAmount: policy.guestFeeAmount,
    minimumOrderAmount: policy.minimumOrderAmount,
    maxEtaMinutes: policy.maxEtaMinutes,
    maxLiveQuoteAmount: policy.maxLiveQuoteAmount,
    maxAbsorbAmount: policy.maxAbsorbAmount,
  };
}

export function getDeliveryPolicyControlMap(
  input: DeliveryPolicyEvaluationInput,
): DeliveryPolicyControlMap {
  const { deliveryState, zoneId, fulfillmentSource, liveQuoteAmount, etaLabel } = input;

  return {
    routeSignals: {
      deliveryState,
      zoneId,
      fulfillmentSource,
      liveQuoteAmount,
      etaLabel,
    },
    editableThresholds: getDeliveryPolicyThresholdSummary(zoneId),
    protectedOverrides: {
      vipOverride: input.vipOverride ?? false,
      sensitiveRoute: input.sensitiveRoute ?? false,
    },
  };
}

export function getDeliveryFulfillmentSourceLabel(
  source: DeliveryFulfillmentSource | null,
) {
  if (source === "own_courier") {
    return "Свой курьер";
  }

  if (source === "overflow_provider") {
    return "Внешний курьер";
  }

  return "Не определён";
}

export function getDeliveryRouteStateLabel(
  state: DeliveryPolicyRouteSignals["deliveryState"],
) {
  if (state === "in-zone") {
    return "В пределах сервиса";
  }

  if (state === "out-of-zone") {
    return "Вне текущего покрытия";
  }

  if (state === "cutoff") {
    return "Ближайшее окно уже ушло";
  }

  return "Ещё не определён";
}

export function getDeliveryDecisionLabel(input: {
  deliveryState: "in-zone" | "out-of-zone" | "cutoff" | null;
  decisionState: DeliveryDecisionState | null;
}) {
  if (input.deliveryState === "out-of-zone") {
    return "Заблокировано: вне зоны";
  }

  if (input.decisionState === "manual_confirmation") {
    return "Нужна ручная проверка";
  }

  if (input.decisionState === "self_serve") {
    return "Можно оформить сразу";
  }

  return "Решение по маршруту ещё не принято";
}

export function getDeliveryGuardrailLabel(
  code: DeliveryPolicyGuardrailCode,
) {
  switch (code) {
    case "quote_unavailable":
      return "Расчёт по адресу ещё не получен";
    case "eta_above_limit":
      return "ETA выше допустимого порога";
    case "quote_above_limit":
      return "Расчёт по адресу выше допустимого порога";
    case "absorb_above_limit":
      return "Превышен лимит абсорба";
    case "cutoff":
      return "За пределом окна приёма";
    case "vip_override":
      return "VIP-исключение";
    case "sensitive_route":
      return "Чувствительный маршрут";
    default:
      return "Сработало защитное правило";
  }
}

function parseEtaUpperBoundMinutes(etaLabel: string | null) {
  if (!etaLabel) {
    return null;
  }

  const matches = etaLabel.match(/\d+/g);

  if (!matches || matches.length === 0) {
    return null;
  }

  return Number(matches[matches.length - 1]);
}

export function evaluateDeliveryPolicyDecision(
  input: DeliveryPolicyEvaluationInput,
): DeliveryPolicyEvaluation {
  const {
    deliveryState,
    zoneId,
    fulfillmentSource,
    liveQuoteAmount,
    etaLabel,
    vipOverride = false,
    sensitiveRoute = false,
  } = input;

  if (deliveryState === "out-of-zone") {
    return {
      decisionState: null,
      decisionNote: "",
      guardrailCode: null,
    };
  }

  if (deliveryState === "cutoff") {
    return {
      decisionState: "manual_confirmation",
      decisionNote: "Текущее окно уже нельзя обещать без ручного подтверждения команды.",
      guardrailCode: "cutoff",
    };
  }

  const policy = getDeliveryPolicy(zoneId);

  if (!policy || deliveryState !== "in-zone") {
    return {
      decisionState: "manual_confirmation",
      decisionNote: "Маршрут выглядит рабочим, но перед финальным обещанием по сервису его нужно подтвердить вручную.",
      guardrailCode: "quote_unavailable",
    };
  }

  if (vipOverride) {
    return {
      decisionState: "manual_confirmation",
      decisionNote:
        "Маршрут помечен как чувствительный для VIP-обслуживания, поэтому время и передача заказа должны подтверждаться вручную.",
      guardrailCode: "vip_override",
    };
  }

  if (sensitiveRoute) {
    return {
      decisionState: "manual_confirmation",
      decisionNote:
        "Маршрут отмечен как чувствительный, поэтому обещание по доставке и операционный handoff должны пройти ручную проверку.",
      guardrailCode: "sensitive_route",
    };
  }

  const etaUpperBoundMinutes = parseEtaUpperBoundMinutes(etaLabel);

  if (etaUpperBoundMinutes !== null && etaUpperBoundMinutes > policy.maxEtaMinutes) {
    return {
      decisionState: "manual_confirmation",
      decisionNote: policy.manualConfirmationMessage,
      guardrailCode: "eta_above_limit",
    };
  }

  if (fulfillmentSource === "own_courier") {
    return {
      decisionState: "self_serve",
      decisionNote: "Свой курьер доступен, значит заказ можно вести по обычному самостоятельному сценарию.",
      guardrailCode: null,
    };
  }

  if (fulfillmentSource === "overflow_provider") {
    if (liveQuoteAmount === null) {
      return {
        decisionState: "manual_confirmation",
        decisionNote: "Внешний расчёт ещё не получен, поэтому маршрут нужно подтвердить вручную.",
        guardrailCode: "quote_unavailable",
      };
    }

    if (liveQuoteAmount > policy.maxLiveQuoteAmount) {
      return {
        decisionState: "manual_confirmation",
        decisionNote: "Расчёт внешней доставки выходит за обычный premium-коридор, поэтому заказ ждёт ручного подтверждения.",
        guardrailCode: "quote_above_limit",
      };
    }

    if (liveQuoteAmount - policy.guestFeeAmount > policy.maxAbsorbAmount) {
      return {
        decisionState: "manual_confirmation",
        decisionNote: "Внутреннее покрытие доставки превышает допустимый предел, поэтому маршрут должен пройти ручную проверку.",
        guardrailCode: "absorb_above_limit",
      };
    }

    return {
      decisionState: "self_serve",
      decisionNote: "Понадобится внешний курьер, но текущий расчёт всё ещё укладывается в допустимый сервисный коридор.",
      guardrailCode: null,
    };
  }

  return {
    decisionState: "manual_confirmation",
    decisionNote: "Источник доставки ещё не определён, поэтому маршрут нужно подтвердить вручную.",
    guardrailCode: "quote_unavailable",
  };
}
