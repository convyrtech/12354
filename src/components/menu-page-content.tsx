"use client";

import { DraftActionLink } from "@/components/draft-action-link";
import { useDraft } from "@/components/draft-provider";
import {
  findDeliveryScenarioForDraftContext,
  formatMoney,
  getMenuSnapshotForContext,
  getProductCommercialTruth,
  getRoutingAssignmentDisplay,
  pickupScenarios,
  type FulfillmentMode,
  type MenuSnapshotItem,
} from "@/lib/fixtures";
import { appendDraftLineItem, buildDefaultDraftLineItem } from "@/lib/line-item";

type MenuPageContentProps = {
  initialFulfillment: FulfillmentMode;
};

type CatalogSection = {
  id: string;
  category: string;
  eyebrow: string;
  title: string;
  summary: string;
  entries: MenuSnapshotItem[];
  compact: boolean;
};

const FEATURED_FAMILIES = ["boiled", "fried", "live"] as const;

const CATEGORY_ORDER = [
  "Креветки Магаданские / Медведка",
  "Камчатский краб",
  "Десерты",
  "Мидии",
  "Икра",
  "Напитки",
  "Подарки",
] as const;

function getProductFamilyLabel(family: string) {
  if (family === "boiled") return "варёные раки";
  if (family === "fried") return "жареные раки";
  if (family === "live") return "живые раки";
  if (family === "shrimp") return "креветки";
  if (family === "crab") return "краб";
  if (family === "mussels") return "мидии";
  if (family === "caviar") return "икра";
  if (family === "dessert") return "десерты";
  if (family === "drink") return "напитки";
  if (family === "gift") return "подарки";
  return family;
}

function getServiceModeLabel(fulfillment: FulfillmentMode) {
  return fulfillment === "delivery" ? "Доставка" : "Самовывоз";
}

function getPriceDeltaLabel(priceDelta: number) {
  if (priceDelta === 0) return null;

  return priceDelta > 0
    ? `Изменение цены точки: +${formatMoney(priceDelta)}`
    : `Изменение цены точки: -${formatMoney(Math.abs(priceDelta))}`;
}

function getPositionCountLabel(count: number) {
  if (count === 1) return "1 позиция";
  if (count >= 2 && count <= 4) return `${count} позиции`;
  return `${count} позиций`;
}

function getCategorySlug(value: string) {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, "-")
    .replace(/(^-|-$)/g, "");
}

function getCategoryMeta(category: string) {
  if (category === "Креветки Магаданские / Медведка") {
    return {
      eyebrow: "Креветки",
      title: "Магаданские креветки и медведка",
      summary: "Магадан и медведка.",
      compact: false,
    };
  }

  if (category === "Камчатский краб") {
    return {
      eyebrow: "Краб",
      title: "Камчатский краб",
      summary: "Редкая линия.",
      compact: false,
    };
  }

  if (category === "Десерты") {
    return {
      eyebrow: "Десерты",
      title: "Десерты",
      summary: "Финал заказа.",
      compact: true,
    };
  }

  if (category === "Мидии") {
    return {
      eyebrow: "Мидии",
      title: "Мидии",
      summary: "Тёплая линия.",
      compact: true,
    };
  }

  if (category === "Икра") {
    return {
      eyebrow: "Икра",
      title: "Икра",
      summary: "Деликатесная линия.",
      compact: true,
    };
  }

  if (category === "Напитки") {
    return {
      eyebrow: "Напитки",
      title: "Напитки",
      summary: "К заказу.",
      compact: true,
    };
  }

  if (category === "Подарки") {
    return {
      eyebrow: "Подарки",
      title: "Подарки",
      summary: "Подарочные позиции.",
      compact: true,
    };
  }

  return {
    eyebrow: "Категория",
    title: category,
    summary: "Коллекция каталога.",
    compact: false,
  };
}

function buildCatalogSections(entries: MenuSnapshotItem[]) {
  const grouped = new Map<string, MenuSnapshotItem[]>();

  entries.forEach((entry) => {
    const bucket = grouped.get(entry.item.category) ?? [];
    bucket.push(entry);
    grouped.set(entry.item.category, bucket);
  });

  const orderedCategories = [
    ...CATEGORY_ORDER.filter((category) => grouped.has(category)),
    ...[...grouped.keys()].filter(
      (category) => !CATEGORY_ORDER.includes(category as (typeof CATEGORY_ORDER)[number]),
    ),
  ];

  return orderedCategories.map((category) => {
    const meta = getCategoryMeta(category);

    return {
      id: `category-${getCategorySlug(category)}`,
      category,
      eyebrow: meta.eyebrow,
      title: meta.title,
      summary: meta.summary,
      entries: grouped.get(category) ?? [],
      compact: meta.compact,
    } satisfies CatalogSection;
  });
}

function getCompactEntrySummary(entry: MenuSnapshotItem) {
  if (entry.item.productFamily === "dessert") {
    return "Финал заказа.";
  }

  if (entry.item.productFamily === "drink") {
    return "К заказу.";
  }

  if (entry.item.productFamily === "gift") {
    return "Подарочная позиция.";
  }

  if (entry.item.productFamily === "mussels") {
    return "Тёплая линия.";
  }

  if (entry.item.productFamily === "caviar") {
    return "Деликатес.";
  }

  return entry.item.description;
}

function getFeaturedFamilySummary(entry: MenuSnapshotItem) {
  if (entry.item.productFamily === "boiled") {
    return "Размер, рецепт и вес.";
  }

  if (entry.item.productFamily === "fried") {
    return "S-XXL, от 1 кг.";
  }

  if (entry.item.productFamily === "live") {
    return "S-XXL, от 1 кг.";
  }

  return entry.item.description;
}

function getCatalogEntrySummary(entry: MenuSnapshotItem) {
  if (entry.item.productFamily === "shrimp") {
    return "Морская линия.";
  }

  if (entry.item.productFamily === "crab") {
    return "Редкая линия.";
  }

  if (entry.item.productFamily === "mussels") {
    return "Тёплая линия.";
  }

  if (entry.item.productFamily === "caviar") {
    return "Деликатес.";
  }

  if (entry.item.productFamily === "dessert") {
    return "Финал заказа.";
  }

  if (entry.item.productFamily === "drink") {
    return "К заказу.";
  }

  if (entry.item.productFamily === "gift") {
    return "Подарочная позиция.";
  }

  return entry.item.description;
}

function requiresConfigurator(entry: MenuSnapshotItem) {
  const hasMeaningfulChoice = entry.item.modifierGroups.some(
    (group) =>
      group.options.length > 1 ||
      group.options.some((option) => option.priceDelta !== 0),
  );

  return (
    entry.item.productFamily === "boiled" ||
    entry.item.productFamily === "fried" ||
    entry.item.productFamily === "live" ||
    hasMeaningfulChoice
  );
}

function getFeaturedFamilyFacts(entry: MenuSnapshotItem) {
  const sizeGroup = entry.item.modifierGroups.find((group) => group.label === "Размер");
  const recipeGroup = entry.item.modifierGroups.find((group) => group.label === "Рецепт варки");
  const commercialTruth = getProductCommercialTruth(entry.item);
  const facts: string[] = [];

  if (sizeGroup) {
    facts.push(`${sizeGroup.options.length} размеров`);
  }

  if (recipeGroup) {
    facts.push(`${recipeGroup.options.length} рецептов`);
  }

  if (commercialTruth.minimumWeightKg) {
    facts.push(`от ${commercialTruth.minimumWeightKg} кг`);
  }

  if (commercialTruth.weightStepKg) {
    facts.push(`шаг ${commercialTruth.weightStepKg} кг`);
  }

  if (commercialTruth.seasonalRequestLabel) {
    facts.push(`${commercialTruth.seasonalRequestLabel.toLowerCase()} — сезонно`);
  }

  return facts.slice(0, 4);
}

export function MenuPageContent({ initialFulfillment }: MenuPageContentProps) {
  const { draft, patchDraft } = useDraft();
  const fulfillment = draft.fulfillmentMode ?? initialFulfillment;
  const hasLockedServiceContext = Boolean(
    draft.locationId ||
      draft.servicePointId ||
      draft.serviceLabel ||
      draft.confirmedDropoffLabel ||
      draft.pickupState ||
      draft.deliveryState,
  );
  const snapshot = getMenuSnapshotForContext({
    fulfillmentMode: fulfillment,
    locationId: draft.locationId,
    servicePointId: draft.servicePointId,
  });
  const assignment = getRoutingAssignmentDisplay({
    locationId: draft.locationId,
    servicePointId: draft.servicePointId,
    legalEntityId: draft.legalEntityId,
  });
  const lockedTimingLabel =
    draft.timingIntent === "scheduled"
      ? draft.requestedTimeLabel || "Время ещё не зафиксировано"
      : draft.timingIntent === "asap"
        ? "Как можно скорее"
        : "Время пока не выбрано";
  const promiseLabel = draft.serviceTimingLabel || "Обещание ещё не подтверждено";
  const contextLabel =
    draft.serviceLabel || draft.confirmedDropoffLabel || "Сначала подтвердим адрес или точку";
  const featuredEntries = snapshot.visibleItems.filter((entry) =>
    FEATURED_FAMILIES.includes(entry.item.productFamily as (typeof FEATURED_FAMILIES)[number]),
  );
  const secondarySections = buildCatalogSections(
    snapshot.visibleItems.filter(
      (entry) =>
        !FEATURED_FAMILIES.includes(entry.item.productFamily as (typeof FEATURED_FAMILIES)[number]),
    ),
  );
  const jumpLinks = [
    ...featuredEntries.map((entry) => ({
      id: `family-${entry.item.productFamily}`,
      label: entry.item.category,
    })),
    ...secondarySections.map((section) => ({
      id: section.id,
      label: section.category,
    })),
  ];

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
        : "/delivery/result"
      : pickupScenario
        ? `/pickup/points?scenario=${pickupScenario.id}`
        : "/pickup/points";

  const serviceContextReturnHref =
    fulfillment === "delivery"
      ? "/delivery/address"
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

  return (
    <main className="landing">
      <div className="landing__frame">
        <section className="entry-hero">
          <div className="entry-hero__copy">
            <span className="eyebrow">Каталог</span>
            <h1 className="landing-title">Каталог The Raki.</h1>
            <p className="landing-summary">
              {hasLockedServiceContext
                ? "Раки, креветки, краб, мидии и икра уже открыты под подтверждённый сервис."
                : "Раки, креветки, краб, мидии и икра."}
            </p>

            <div className="landing-chips">
              <span className="chip">{getServiceModeLabel(fulfillment)}</span>
              <span className="chip">{snapshot.visibleItems.length} позиций в витрине</span>
              <span className="chip">{hasLockedServiceContext ? contextLabel : "главные линии раков"}</span>
            </div>

            <div className="landing-actions">
              <DraftActionLink
                className="cta cta--primary"
                href="/cart?state=ready"
                label="Корзина"
                patch={{
                  fulfillmentMode: fulfillment,
                  cartState: "ready",
                  orderStage: "cart",
                }}
              />
              <DraftActionLink
                className="cta cta--secondary"
                href={serviceContextReturnHref}
                label={
                  hasLockedServiceContext
                    ? fulfillment === "delivery"
                      ? "Изменить доставку"
                      : "Изменить самовывоз"
                    : fulfillment === "delivery"
                      ? "Проверить доставку"
                      : "Выбрать самовывоз"
                }
                patch={commonReturnPatch}
              />
              {hasLockedServiceContext ? (
                <DraftActionLink
                  className="cta cta--ghost"
                  href={timingReturnHref}
                  label={draft.timingIntent ? "Изменить время" : "Время"}
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
                    <span>Подтверждённое время</span>
                    <strong>{lockedTimingLabel}</strong>
                  </div>
                  <div className="metric-row">
                    <span>Текущее обещание</span>
                    <strong>{promiseLabel}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="landing-note-card">
                <span className="section-title">Каталог</span>
                <p className="kicker">Каталог можно открыть сразу. Адрес и время подтвердим позже.</p>
                <div className="chips">
                  <span className="chip">доставка по адресу</span>
                  <span className="chip">самовывоз отдельно</span>
                </div>
              </div>
            )}
          </aside>
        </section>

        <section className="entry-section">
          <div className="catalog-jump-nav">
            {jumpLinks.map((link) => (
              <a className="catalog-jump-link" href={`#${link.id}`} key={link.id}>
                {link.label}
              </a>
            ))}
          </div>
        </section>

        {featuredEntries.length > 0 ? (
          <section className="entry-section">
            <div className="entry-section__head">
              <span className="section-title">Главные линии</span>
              <h2>Варёные, жареные и живые раки.</h2>
            </div>

            <div className="catalog-family-grid">
              {featuredEntries.map((entry) => (
                <article
                  className={`catalog-family-card catalog-family-card--${entry.item.productFamily}`}
                  id={`family-${entry.item.productFamily}`}
                  key={entry.item.id}
                >
                  <div className="catalog-family-card__head">
                    <span className="section-title">{entry.item.category}</span>
                    <span className="catalog-family-card__tag">{getServiceModeLabel(fulfillment)}</span>
                  </div>

                  <div className="catalog-family-card__body">
                    <h3>{entry.item.name}</h3>
                    <p>{getFeaturedFamilySummary(entry)}</p>
                  </div>

                  <div className="catalog-family-card__facts">
                    {getFeaturedFamilyFacts(entry).map((fact) => (
                      <span className="pill" key={fact}>
                        {fact}
                      </span>
                    ))}
                  </div>

                  <div className="catalog-family-card__footer">
                    <div className="catalog-family-card__price">
                      <span>Старт по текущей точке</span>
                      <strong>{formatMoney(entry.effectiveBasePrice)}</strong>
                    </div>
                    <DraftActionLink
                      className="cta cta--secondary"
                      href={`/product/${entry.item.id}?fulfillment=${fulfillment}`}
                      label="Выбрать размер и рецепт"
                      patch={{
                        fulfillmentMode: fulfillment,
                        orderStage: "product",
                      }}
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

      <section className="entry-section">
        <div className="entry-section__head">
          <span className="section-title">Морская коллекция</span>
          <h2>Креветки, краб и соседние линии.</h2>
        </div>
      </section>

        {secondarySections.map((section) => (
          <section
            className={`entry-section catalog-section${section.compact ? " catalog-section--compact" : ""}`}
            id={section.id}
            key={section.id}
          >
            <div className="catalog-section__head">
              <div className="catalog-section__copy">
                <span className="section-title">{section.eyebrow}</span>
                <h2>{section.title}</h2>
                <p className="muted">{section.summary}</p>
              </div>
              <div className="catalog-section__count">
                <span>{getPositionCountLabel(section.entries.length)}</span>
              </div>
            </div>

            <div className="catalog-grid">
              {section.entries.map((entry) => {
                const familyLabel = getProductFamilyLabel(entry.item.productFamily);
                const showFamilyChip =
                  familyLabel.toLowerCase() !== entry.item.category.toLowerCase();

                return (
                  <article className="catalog-card" key={entry.item.id}>
                    {section.compact ? null : (
                      <div className="chips">
                        <span className="pill pill--accent">{entry.item.category}</span>
                        {showFamilyChip ? <span className="pill">{familyLabel}</span> : null}
                        <span className="pill">{getServiceModeLabel(fulfillment)}</span>
                      </div>
                    )}

                    <div className="catalog-card__body">
                      <h3>{entry.item.name}</h3>
                      <p className="catalog-card__description">
                        {section.compact ? getCompactEntrySummary(entry) : getCatalogEntrySummary(entry)}
                      </p>
                      {entry.priceDelta !== 0 ? (
                        <p className="catalog-card__note">{getPriceDeltaLabel(entry.priceDelta)}</p>
                      ) : null}
                    </div>

                    <div className="catalog-card__footer">
                      <div className="catalog-card__price">
                        <span>{section.compact ? "Цена" : "Цена на текущей точке"}</span>
                        <strong>{formatMoney(entry.effectiveBasePrice)}</strong>
                      </div>
                      {requiresConfigurator(entry) ? (
                        <DraftActionLink
                          className="cta cta--secondary"
                          href={`/product/${entry.item.id}?fulfillment=${fulfillment}`}
                          label="Открыть"
                          patch={{
                            fulfillmentMode: fulfillment,
                            orderStage: "product",
                          }}
                        />
                      ) : (
                        <button
                          className="cta cta--secondary"
                          onClick={() =>
                            patchDraft({
                              fulfillmentMode: fulfillment,
                              lineItems: appendDraftLineItem(
                                draft.lineItems,
                                buildDefaultDraftLineItem(entry.item),
                              ),
                              cartState: "ready",
                              orderStage: "menu",
                            })
                          }
                          type="button"
                        >
                          В корзину
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}

        <section className="landing-service-band">
          <div className="landing-service-band__copy">
            <span className="section-title">Сервис</span>
            <h2>
              {hasLockedServiceContext
                ? "Адрес и время можно менять спокойно, не ломая каталог."
                : fulfillment === "delivery"
                  ? "Адрес и время подтвердим следующим шагом."
                  : "Точку и время подтвердим следующим шагом."}
            </h2>
            <p>
              {hasLockedServiceContext
                ? "Каталог не разваливается, если гость возвращается к доставке или самовывозу."
                : "Сначала можно спокойно собрать продукт, а сервис подтвердить позже."}
            </p>
          </div>

          <div className="landing-service-band__actions">
            {hasLockedServiceContext ? (
              <DraftActionLink
                className="cta cta--secondary"
                href={timingReturnHref}
                label={draft.timingIntent ? "Изменить время" : "Подтвердить время"}
                patch={commonReturnPatch}
              />
            ) : null}
            <DraftActionLink
              className="cta cta--secondary"
              href={serviceContextReturnHref}
              label={
                hasLockedServiceContext
                  ? fulfillment === "delivery"
                    ? "Изменить адрес доставки"
                    : "Изменить точку самовывоза"
                  : fulfillment === "delivery"
                    ? "Проверить доставку"
                    : "Выбрать самовывоз"
              }
              patch={commonReturnPatch}
            />
            <DraftActionLink
              className="cta cta--primary"
              href="/cart?state=ready"
              label="Перейти в корзину"
              patch={{
                fulfillmentMode: fulfillment,
                cartState: "ready",
                orderStage: "cart",
              }}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
