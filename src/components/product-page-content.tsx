"use client";

import { useState } from "react";
import { DraftActionLink } from "@/components/draft-action-link";
import { useDraft } from "@/components/draft-provider";
import {
  findDeliveryScenarioForDraftContext,
  formatMoney,
  getMenuItemSnapshotForContext,
  getProductCommercialTruth,
  getRoutingAssignmentDisplay,
  pickupScenarios,
  type FulfillmentMode,
  type MenuItem,
} from "@/lib/fixtures";
import {
  appendDraftLineItem,
  buildDraftLineItem,
  getDefaultModifierSelections,
  replaceDraftLineItemAt,
  type DraftModifierSelection,
} from "@/lib/line-item";

type ProductPageContentProps = {
  editLineIndex: number | null;
  product: MenuItem;
  fulfillment: FulfillmentMode;
};

function updateSelections(
  current: DraftModifierSelection[],
  group: MenuItem["modifierGroups"][number],
  optionId: string,
) {
  const existing = current.find((entry) => entry.groupId === group.id)?.optionIds ?? [];
  const isSelected = existing.includes(optionId);
  let nextOptionIds = existing;

  if (group.maxSelections === 1) {
    nextOptionIds = [optionId];
  } else if (isSelected) {
    nextOptionIds =
      existing.length > group.minSelections
        ? existing.filter((selectedId) => selectedId !== optionId)
        : existing;
  } else if (existing.length < group.maxSelections) {
    nextOptionIds = [...existing, optionId];
  } else {
    nextOptionIds = [...existing.slice(1), optionId];
  }

  return current.map((entry) =>
    entry.groupId === group.id ? { ...entry, optionIds: nextOptionIds } : entry,
  );
}

function getProductFamilyLabel(family: string) {
  if (family === "boiled") return "Варёные раки";
  if (family === "fried") return "Жареные раки";
  if (family === "live") return "Живые раки";
  if (family === "shrimp") return "Креветки";
  if (family === "crab") return "Краб";
  if (family === "mussels") return "Мидии";
  if (family === "caviar") return "Икра";
  if (family === "dessert") return "Десерты";
  if (family === "drink") return "Напитки";
  if (family === "gift") return "Подарки";
  return family;
}

function getFulfillmentLabel(mode: FulfillmentMode) {
  return mode === "delivery" ? "Доставка" : "Самовывоз";
}

function getModifierKindLabel(kind: MenuItem["modifierGroups"][number]["kind"]) {
  return kind === "core" ? "Основа" : "Дополнительно";
}

function getGroupHelperCopy(group: MenuItem["modifierGroups"][number]) {
  if (group.label === "Размер") {
    return "Шкала S-XXL.";
  }

  if (group.label === "Рецепт варки" || group.label === "Рецепт жарки") {
    return "Выбор вкуса.";
  }

  if (group.label === "Вес") {
    return "От 1 кг, шаг 0.5 кг.";
  }

  if (group.label === "Соль") {
    return "По вкусу.";
  }

  if (group.label === "Острота") {
    return "По желанию.";
  }

  if (group.label === "Формат") {
    return "Формат подачи.";
  }

  if (group.label === "Подача") {
    return "Подача.";
  }

  return "Выбор строки заказа.";
}

function getGroupSelectionLabel(
  group: MenuItem["modifierGroups"][number],
  selectedCount: number,
) {
  if (group.maxSelections === 1) {
    return null;
  }

  if (selectedCount === 0) {
    return `Можно выбрать до ${group.maxSelections}`;
  }

  return `Выбрано ${selectedCount} из ${group.maxSelections}`;
}

function getSelectedSummaryValue(summaryLines: string[], groupLabel: string) {
  const line = summaryLines.find((entry) => entry.startsWith(`${groupLabel}: `));
  return line ? line.replace(`${groupLabel}: `, "") : null;
}

function getProductPromise(product: MenuItem) {
  if (product.productFamily === "boiled") {
    return "Размер, рецепт и вес.";
  }

  if (product.productFamily === "fried") {
    return "Размер, жарка и вес.";
  }

  if (product.productFamily === "live") {
    return "Размер и вес.";
  }

  if (product.productFamily === "shrimp") {
    return "Здесь важны вес и спокойная подача.";
  }

  if (product.productFamily === "crab") {
    return "Краб должен читаться как редкая дорогая линия.";
  }

  if (product.productFamily === "dessert") {
    return "Небольшой финал к основному заказу.";
  }

  return product.description;
}

function getHeroTitle(input: {
  canCommit: boolean;
  editingLine: boolean;
  product: MenuItem;
}) {
  if (!input.canCommit) {
    return "Эта позиция сейчас не подтверждается для выбранного сервиса.";
  }

  if (input.editingLine) {
    return `Доводим ${input.product.category.toLowerCase()} перед подтверждением заказа.`;
  }

  return input.product.name;
}

function getHeroSummary(input: {
  canCommit: boolean;
  hasLockedServiceContext: boolean;
  product: MenuItem;
}) {
  if (!input.canCommit) {
    return "Лучше честно вернуть гостя в каталог, чем обещать позицию, которую активная кухня сейчас не подтверждает.";
  }

  return getProductPromise(input.product);
}

function getOptionDeltaLabel(optionPriceDelta: number, variant?: "full" | "delta") {
  if (variant === "full") {
    return formatMoney(optionPriceDelta);
  }

  if (optionPriceDelta === 0) {
    return null;
  }

  return `${optionPriceDelta > 0 ? "+" : "-"}${formatMoney(Math.abs(optionPriceDelta))}`;
}

export function ProductPageContent({
  editLineIndex,
  product,
  fulfillment,
}: ProductPageContentProps) {
  const { draft, hydrated } = useDraft();
  const availability = getMenuItemSnapshotForContext({
    item: product,
    fulfillmentMode: fulfillment,
    locationId: draft.locationId,
    servicePointId: draft.servicePointId,
  });
  const canCommit = availability.state === "available";
  const hasLockedServiceContext = Boolean(
    draft.locationId ||
      draft.servicePointId ||
      draft.serviceLabel ||
      draft.confirmedDropoffLabel ||
      draft.pickupState ||
      draft.deliveryState,
  );
  const assignment = getRoutingAssignmentDisplay({
    locationId: draft.locationId,
    servicePointId: draft.servicePointId,
    legalEntityId: draft.legalEntityId,
  });
  const commercialTruth = getProductCommercialTruth(product);

  const defaultSelections = getDefaultModifierSelections(product);
  const editableLine =
    hydrated && editLineIndex !== null ? draft.lineItems[editLineIndex] ?? null : null;
  const savedLineItem =
    editableLine?.itemId === product.id
      ? editableLine
      : hydrated
        ? [...draft.lineItems].reverse().find((lineItem) => lineItem.itemId === product.id) ?? null
        : null;
  const savedSelections = savedLineItem?.selections ?? null;
  const [localSelections, setLocalSelections] = useState<DraftModifierSelection[] | null>(null);
  const selections = localSelections ?? savedSelections ?? defaultSelections;

  const lineItem = buildDraftLineItem(product, selections, availability.effectiveBasePrice);
  const editingLine = editLineIndex !== null && editableLine?.itemId === product.id;
  const committedLineItem =
    editingLine && editableLine
      ? {
          ...lineItem,
          quantity: editableLine.quantity,
          totalPrice: lineItem.unitPrice * editableLine.quantity,
        }
      : lineItem;
  const nextLineItems = editingLine
    ? replaceDraftLineItemAt(draft.lineItems, editLineIndex, committedLineItem)
    : appendDraftLineItem(draft.lineItems, committedLineItem);

  const pointPriceDelta = availability.priceDelta;
  const menuHref = `/menu?fulfillment=${fulfillment}`;
  const secondaryHref = editingLine ? "/cart?state=ready" : menuHref;
  const secondaryLabel = editingLine ? "Вернуться в корзину" : "Вернуться в каталог";
  const commitLabel = editingLine ? "Сохранить строку корзины" : "Добавить позицию в корзину";

  const deliveryScenario =
    fulfillment === "delivery"
      ? findDeliveryScenarioForDraftContext({
          serviceLabel: draft.serviceLabel,
          typedAddress: draft.typedAddress,
          normalizedAddress: draft.normalizedAddress,
        })
      : null;
  const pickupScenario =
    fulfillment === "pickup"
      ? pickupScenarios.find((scenario) => scenario.label === draft.serviceLabel) ??
        pickupScenarios.find((scenario) => scenario.state === draft.pickupState) ??
        pickupScenarios[0]
      : null;
  const timingReturnHref =
    fulfillment === "delivery"
      ? deliveryScenario
        ? `/delivery/result?scenario=${deliveryScenario.id}`
        : "/delivery/address"
      : pickupScenario
        ? `/pickup/points?scenario=${pickupScenario.id}`
        : "/pickup/points";
  const commonReturnPatch = {
    fulfillmentMode: fulfillment,
    deliveryState: fulfillment === "delivery" ? draft.deliveryState : null,
    pickupState: fulfillment === "pickup" ? draft.pickupState : null,
    zoneId: draft.zoneId,
    locationId: draft.locationId,
    servicePointId: draft.servicePointId,
    legalEntityId: draft.legalEntityId,
    resolverNote: draft.resolverNote,
    serviceLabel: draft.serviceLabel,
    serviceTimingLabel: draft.serviceTimingLabel,
    typedAddress: draft.typedAddress,
    normalizedAddress: draft.normalizedAddress,
    confirmedDropoffLabel: draft.confirmedDropoffLabel,
    confirmedDropoffSource: draft.confirmedDropoffSource,
    confirmedDropoffLat: draft.confirmedDropoffLat,
    confirmedDropoffLng: draft.confirmedDropoffLng,
    addressConfidence: draft.addressConfidence,
    courierInstructions: draft.courierInstructions,
    deliveryFulfillmentSource: draft.deliveryFulfillmentSource,
    deliveryVipOverride: draft.deliveryVipOverride,
    deliverySensitiveRoute: draft.deliverySensitiveRoute,
    deliveryDecisionState: draft.deliveryDecisionState,
    deliveryDecisionNote: draft.deliveryDecisionNote,
    liveDeliveryQuoteAmount: draft.liveDeliveryQuoteAmount,
    timingIntent: draft.timingIntent,
    requestedTimeSlotId: draft.requestedTimeSlotId,
    requestedTimeLabel: draft.requestedTimeLabel,
    orderStage: "context" as const,
  };

  const selectedSizeLabel = getSelectedSummaryValue(committedLineItem.summaryLines, "Размер");
  const selectedRecipeLabel =
    getSelectedSummaryValue(committedLineItem.summaryLines, "Рецепт варки") ??
    getSelectedSummaryValue(committedLineItem.summaryLines, "Рецепт жарки");
  const selectedWeightLabel = getSelectedSummaryValue(committedLineItem.summaryLines, "Вес");
  const selectedSaltLabel = getSelectedSummaryValue(committedLineItem.summaryLines, "Соль");
  const selectedHeatLabel = getSelectedSummaryValue(committedLineItem.summaryLines, "Острота");

  const contextLabel =
    draft.serviceLabel ||
    draft.confirmedDropoffLabel ||
    (fulfillment === "pickup"
      ? "Точка самовывоза ещё не подтверждена"
      : "Адрес доставки ещё не подтверждён");
  const timingLabel =
    draft.requestedTimeLabel ||
    (draft.timingIntent === "asap" ? "Как можно скорее" : "Время ещё не подтверждено");
  const promiseLabel =
    draft.serviceTimingLabel ||
    (draft.timingIntent === "scheduled"
      ? `${timingLabel} (допуск ±15 минут)`
      : "Обещание ещё не подтверждено");
  const priceDeltaLabel =
    pointPriceDelta === 0
      ? "Цена активной кухни без изменения"
      : pointPriceDelta > 0
        ? `Точка добавляет ${formatMoney(pointPriceDelta)}`
        : `Точка снижает цену на ${formatMoney(Math.abs(pointPriceDelta))}`;
  const weightAwareCommitLabel =
    commercialTruth.isWeightBased && selectedWeightLabel
      ? editingLine
        ? `Сохранить ${selectedWeightLabel} в строке`
        : `Добавить ${selectedWeightLabel} в корзину`
      : commitLabel;
  const familyLabel = getProductFamilyLabel(product.productFamily);
  const showCategoryChip = product.category !== familyLabel;

  return (
    <main className="landing">
      <div className="landing__frame">
        <section className="entry-hero">
          <div className="entry-hero__copy">
            <span className="eyebrow">Продукт</span>
            <h1 className="landing-title">
              {getHeroTitle({
                canCommit,
                editingLine,
                product,
              })}
            </h1>
            <p className="landing-summary">
              {getHeroSummary({
                canCommit,
                hasLockedServiceContext,
                product,
              })}
            </p>

            <div className="landing-chips">
              <span className="chip">{getFulfillmentLabel(fulfillment)}</span>
              {showCategoryChip ? <span className="chip">{product.category}</span> : null}
              {selectedSizeLabel ? <span className="chip">{selectedSizeLabel}</span> : null}
              {selectedWeightLabel ? <span className="chip">{selectedWeightLabel}</span> : null}
              {selectedRecipeLabel ? <span className="chip">{selectedRecipeLabel}</span> : null}
            </div>

            <div className="landing-actions">
              {canCommit ? (
                <DraftActionLink
                  className="cta cta--primary"
                  href="/cart?state=ready"
                  label={weightAwareCommitLabel}
                  patch={{
                    fulfillmentMode: fulfillment,
                    lineItems: nextLineItems,
                    cartState: "ready",
                    orderStage: "cart",
                  }}
                />
              ) : (
                <DraftActionLink
                  className="cta cta--primary"
                  href={secondaryHref}
                  label="Вернуться в валидный каталог"
                  patch={{ fulfillmentMode: fulfillment, orderStage: editingLine ? "cart" : "menu" }}
                />
              )}

              <DraftActionLink
                className="cta cta--secondary"
                href={secondaryHref}
                label={secondaryLabel}
                patch={{ fulfillmentMode: fulfillment, orderStage: editingLine ? "cart" : "menu" }}
              />

              {hasLockedServiceContext ? (
                <DraftActionLink
                  className="cta cta--ghost"
                  href={timingReturnHref}
                  label={draft.timingIntent ? "Изменить время" : "Подтвердить время"}
                  patch={commonReturnPatch}
                />
              ) : null}
            </div>
          </div>

          <aside className="entry-hero__panel">
            {hasLockedServiceContext ? (
              <div className="landing-stat-card">
                <span className="section-title">Сервис</span>
                <div className="metrics">
                  <div className="metric-row">
                    <span>Контекст</span>
                    <strong>{contextLabel}</strong>
                  </div>
                  <div className="metric-row">
                    <span>Кухня</span>
                    <strong>{assignment.locationLabel}</strong>
                  </div>
                  <div className="metric-row">
                    <span>Время</span>
                    <strong>{timingLabel}</strong>
                  </div>
                  <div className="metric-row">
                    <span>Обещание</span>
                    <strong>{promiseLabel}</strong>
                  </div>
                  <div className="metric-row">
                    <span>Цена строки</span>
                    <strong>{formatMoney(committedLineItem.totalPrice)}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="landing-note-card">
                <span className="section-title">Продукт</span>
                <p className="kicker">
                  Сначала выбираем размер, рецепт и вес. Адрес и время подтверждаются позже.
                </p>
                <div className="chips">
                  <span className="chip">{formatMoney(committedLineItem.totalPrice)}</span>
                  <span className="chip">{selectedWeightLabel ?? "от 1 кг"}</span>
                </div>
              </div>
            )}
          </aside>
        </section>

        <section className="entry-section">
          <div className="entry-section__head">
            <span className="section-title">Выбор</span>
            <h2>Размер, рецепт и детали.</h2>
          </div>

          <div className="catalog-grid">
            {product.modifierGroups.map((group) => {
              const selectedIds =
                selections.find((entry) => entry.groupId === group.id)?.optionIds ?? [];

              return (
                <article className="catalog-card" key={group.id}>
                  <div className="catalog-card__body">
                    <span className="section-title">{getModifierKindLabel(group.kind)}</span>
                    <h3>{group.label}</h3>
                    <p className="catalog-card__description">{getGroupHelperCopy(group)}</p>
                    {getGroupSelectionLabel(group, selectedIds.length) ? (
                      <p className="catalog-card__note">
                        {getGroupSelectionLabel(group, selectedIds.length)}
                      </p>
                    ) : null}
                  </div>

                  <div className="feature-grid">
                    {group.options.map((option) => {
                      const selected = selectedIds.includes(option.id);

                      return (
                        <button
                          className={selected ? "choice-card choice-card--selected" : "choice-card"}
                          key={option.id}
                          onClick={() => {
                            setLocalSelections((current) =>
                              updateSelections(
                                current ?? savedSelections ?? defaultSelections,
                                group,
                                option.id,
                              ),
                            );
                          }}
                          type="button"
                        >
                          <strong>{option.label}</strong>
                          {getOptionDeltaLabel(option.priceDelta) ? (
                            <span>{getOptionDeltaLabel(option.priceDelta)}</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="entry-section">
          <div className="entry-section__head">
            <span className="section-title">Итог</span>
            <h2>Строка заказа и цена.</h2>
          </div>

          <div className="catalog-grid">
            <article className="catalog-card">
              <div className="catalog-card__body">
                <span className="section-title">Итоговая конфигурация</span>
                <h3>{product.name}</h3>
                <p className="catalog-card__description">Всё, что уйдёт в корзину.</p>
              </div>

              <div className="feature-grid">
                <div className="feature-tile">
                  <span>Цена по текущей кухне</span>
                  <strong>{formatMoney(availability.effectiveBasePrice)}</strong>
                  <small>{priceDeltaLabel}</small>
                </div>
                <div className="feature-tile">
                  <span>Цена конфигурации</span>
                  <strong>{formatMoney(committedLineItem.unitPrice)}</strong>
                  <small>
                    {selectedRecipeLabel ? `Рецепт: ${selectedRecipeLabel}` : "Собранная строка"}
                  </small>
                </div>
                <div className="feature-tile">
                  <span>Итог по строке</span>
                  <strong>{formatMoney(committedLineItem.totalPrice)}</strong>
                  <small>{selectedWeightLabel ?? "Вес уже зафиксирован в строке"}</small>
                </div>
              </div>

              <ul className="product-summary-list">
                {committedLineItem.summaryLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </article>

            <article className="catalog-card">
              <div className="catalog-card__body">
                <span className="section-title">Оговорки</span>
                <h3>Сезон и детали.</h3>
                <p className="catalog-card__description">Коротко о том, что не обещается жёстко.</p>
              </div>

              {product.bestEffortRequests?.length ? (
                <div className="chips">
                  {product.bestEffortRequests.map((request) => (
                    <span className="pill" key={request}>
                      {request}
                    </span>
                  ))}
                </div>
              ) : null}

              {selectedSaltLabel || selectedHeatLabel ? (
                <div className="chips">
                  {selectedSaltLabel ? <span className="pill">Соль: {selectedSaltLabel}</span> : null}
                  {selectedHeatLabel ? <span className="pill">Острота: {selectedHeatLabel}</span> : null}
                </div>
              ) : null}

              {commercialTruth.seasonalNote ? (
                <p className="catalog-card__note">{commercialTruth.seasonalNote}</p>
              ) : null}
            </article>
          </div>
        </section>

      </div>
    </main>
  );
}
