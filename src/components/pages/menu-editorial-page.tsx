"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { dispatchCartOpen } from "@/components/cart-events";
import { DemoSeedHandler } from "@/components/menu/demo-seed-handler";
import { useAddToCart } from "@/components/menu/use-add-to-cart";
import { useDraft } from "@/components/draft-provider";
import { useFakeAuth } from "@/hooks/use-fake-auth";
import { getMenuImage, type MenuImage } from "@/lib/category-images";
import {
  formatMoney,
  type FulfillmentMode,
  type MenuSnapshotItem,
} from "@/lib/fixtures";
import { getDraftCartView } from "@/lib/draft-view";
import { appendDraftLineItem, buildDraftLineItem, type DraftModifierSelection } from "@/lib/line-item";
import {
  getCategoryItems,
  getMenuForCity,
} from "@/lib/menu/menu-queries";
import { askWaiter } from "@/lib/waiter/waiter-client";
import { askMock } from "@/lib/waiter/waiter-mock";
import { useWaiterContext } from "@/lib/waiter/use-waiter-context";
import type {
  ChipAction,
  HistoricalOrder,
  WaiterChip,
  WaiterResponse,
} from "@/lib/waiter/waiter-types";

const EASE = [0.22, 1, 0.36, 1] as const;

const HERO_IMAGE = {
  src: "/images/menu/editorial/hero-main.png",
  width: 1536,
  height: 1024,
  alt: "Подводная сцена с раком The Raki",
};

const HERO_ALT_IMAGE = {
  src: "/images/menu/editorial/hero-alt.png",
  width: 1536,
  height: 1024,
  alt: "Подводная сцена с раком The Raki",
};

const TRIPTYCH_IMAGES = {
  raki: {
    src: "/images/menu/editorial/triptych-raki.png",
    width: 1536,
    height: 1024,
    alt: "Раки на мокром черном камне",
  },
  mussels: {
    src: "/images/menu/editorial/triptych-mussels.png",
    width: 1536,
    height: 1024,
    alt: "Мидии на льду",
  },
  crab: {
    src: "/images/menu/editorial/triptych-crab.png",
    width: 1536,
    height: 1024,
    alt: "Камчатский краб на мокром черном камне",
  },
} as const;

const CREAM_IMAGES = {
  boiled: {
    src: "/images/menu/editorial/cream-raki-boiled.png",
    width: 1536,
    height: 1024,
    alt: "Тарелка вареных раков",
  },
  live: {
    src: "/images/menu/editorial/cream-raki-glaze.png",
    width: 1536,
    height: 1024,
    alt: "Фирменная подача раков",
  },
  fried: {
    src: "/images/menu/editorial/cream-raki-roasted.png",
    width: 1536,
    height: 1024,
    alt: "Тарелка жареных раков",
  },
  mussels: {
    src: "/images/menu/editorial/cream-mussels.png",
    width: 1536,
    height: 1024,
    alt: "Тарелка мидий",
  },
  crab: {
    src: "/images/menu/editorial/cream-crab.png",
    width: 1536,
    height: 1024,
    alt: "Тарелка крабовых секций",
  },
} as const;

const MENU_ITEM_LOOKUP = new Map<string, MenuSnapshotItem["item"]>();

const VIEWPORT_ONCE = { once: true, amount: 0.24 } as const;

function formatGreetingName(name: string | null | undefined): string {
  if (!name) return "Добрый вечер.";
  return `Добрый вечер, ${name}.`;
}

function AnimatedHeadline({ text }: { text: string }) {
  const prefersReduced = useReducedMotion();
  const words = text.split(" ");

  return (
    <h1 className="menu-editorial__headline" aria-label={text}>
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          className="menu-editorial__headline-word"
          initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: "0.9em" }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: prefersReduced ? 0 : 0.72,
            delay: prefersReduced ? 0 : 0.08 + index * 0.07,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {word}
          {index < words.length - 1 ? "\u00a0" : ""}
        </motion.span>
      ))}
    </h1>
  );
}

function scrollToId(id: string) {
  if (typeof document === "undefined") return;
  const el = document.getElementById(id);
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - 40;
  window.scrollTo({ top: y, behavior: "smooth" });
}

function modifiersToSelections(
  modifiers: Record<string, string> | undefined,
): DraftModifierSelection[] {
  if (!modifiers) return [];
  return Object.entries(modifiers).map(([groupId, optionId]) => ({
    groupId,
    optionIds: [optionId],
  }));
}

function applyRepeatLast(
  order: HistoricalOrder | undefined,
  currentLines: ReturnType<typeof useDraft>["draft"]["lineItems"],
) {
  if (!order) return currentLines;
  let next = currentLines;
  for (const line of order.items) {
    const snapshotItem = MENU_ITEM_LOOKUP.get(line.itemId);
    if (!snapshotItem) continue;
    for (let n = 0; n < Math.max(1, line.qty); n += 1) {
      const built = buildDraftLineItem(
        snapshotItem,
        modifiersToSelections(line.modifiers),
      );
      next = appendDraftLineItem(next, built);
    }
  }
  return next;
}

type EditorialTriptychCard = {
  id: string;
  title: string;
  subtitle: string;
  anchor: string;
  image: (typeof TRIPTYCH_IMAGES)[keyof typeof TRIPTYCH_IMAGES];
};

type EditorialListingCard = {
  entry: MenuSnapshotItem;
  image: MenuImage;
  note: string;
};

type EditorialCatalogSection = {
  id: string;
  label: string;
  lede: string;
  items: MenuSnapshotItem[];
};

const SECTION_COPY: Record<
  string,
  { label: string; lede: string }
> = {
  raki: {
    label: "Раки",
    lede: "Варёные, жареные и живые.",
  },
  mussels: {
    label: "Мидии",
    lede: "Мидии в соусах.",
  },
  crab: {
    label: "Краб",
    lede: "Фаланга и краб целиком.",
  },
  caviar: {
    label: "Икра",
    lede: "Красная и чёрная икра.",
  },
  drinks: {
    label: "Напитки",
    lede: "Вода и соки.",
  },
};

const SURFACE_COPY_OVERRIDES: Record<string, string> = {
  item_mussels_blue_cheese:
    "Сливочно-сырный соус.",
  item_mussels_tomato_greens:
    "Томатный соус с зеленью.",
  item_mussels_pesto: "Соус песто.",
  item_mussels_tom_yam:
    "Соус том-ям.",
  item_caviar_red:
    "Зернистая красная икра горбуши.",
  item_caviar_black:
    "Зернистая чёрная икра русского осетра.",
  item_drink_borjomi: "Минеральная вода.",
  item_drink_yoga_cherry: "Вишнёвый сок.",
};

const SECTION_IMAGE_OVERRIDES: Record<string, MenuImage> = {
  item_mussels_tomato_greens: {
    ...TRIPTYCH_IMAGES.mussels,
    alt: "Черноморские мидии для editorial-меню The Raki",
  },
  item_king_crab: {
    ...TRIPTYCH_IMAGES.crab,
    alt: "Камчатский краб для editorial-меню The Raki",
  },
};

function formatWeightUnit(unit: string): string {
  switch (unit) {
    case "kg":
      return "кг";
    case "g":
      return "гр";
    default:
      return unit;
  }
}

function buildMetaLine(entry: MenuSnapshotItem): string {
  const serving = entry.item.metadata?.serving;
  const weight = entry.item.metadata?.weight;
  if (serving && weight) {
    return `${serving} · ${weight.value} ${formatWeightUnit(weight.unit)}`;
  }
  if (serving) return serving;
  if (weight) return `${weight.value} ${formatWeightUnit(weight.unit)}`;
  return entry.item.category;
}

function getSurfaceCopy(entry: MenuSnapshotItem): string {
  return (
    SURFACE_COPY_OVERRIDES[entry.item.id] ??
    entry.item.editorialNote ??
    entry.item.description
  );
}

function buildEditorialListing(
  boiled: MenuSnapshotItem | undefined,
  live: MenuSnapshotItem | undefined,
  fried: MenuSnapshotItem | undefined,
  mussels: MenuSnapshotItem | undefined,
  crab: MenuSnapshotItem | undefined,
): EditorialListingCard[] {
  const cards: EditorialListingCard[] = [];

  if (boiled) {
    cards.push({
      entry: boiled,
      image: CREAM_IMAGES.boiled,
      note: getSurfaceCopy(boiled),
    });
  }
  if (fried) {
    cards.push({
      entry: fried,
      image: CREAM_IMAGES.fried,
      note: getSurfaceCopy(fried),
    });
  }
  if (mussels) {
    cards.push({
      entry: mussels,
      image: CREAM_IMAGES.mussels,
      note: getSurfaceCopy(mussels),
    });
  }
  if (crab) {
    cards.push({
      entry: crab,
      image: CREAM_IMAGES.crab,
      note: getSurfaceCopy(crab),
    });
  } else if (live) {
    cards.push({
      entry: live,
      image: CREAM_IMAGES.live,
      note: getSurfaceCopy(live),
    });
  }

  return cards;
}

function buildSectionNote(entry: MenuSnapshotItem): string {
  return getSurfaceCopy(entry);
}

function getEditorialSectionImage(entry: MenuSnapshotItem): MenuImage {
  return SECTION_IMAGE_OVERRIDES[entry.item.id] ?? getMenuImage(entry.item.imageKey, entry.item.name);
}

function pickSectionEntries(
  items: MenuSnapshotItem[],
  featuredIds: Set<string>,
): MenuSnapshotItem[] {
  const seen = new Set<string>();
  const unique = items.filter((entry) => {
    if (seen.has(entry.item.id)) return false;
    seen.add(entry.item.id);
    return true;
  });

  const withoutFeatured = unique.filter((entry) => !featuredIds.has(entry.item.id));
  return withoutFeatured.length >= 2 ? withoutFeatured : unique;
}

function EditorialWaiterBand() {
  const { state: auth } = useFakeAuth();
  const { context, hydrated } = useWaiterContext();
  const { draft, patchDraft } = useDraft();
  const prefersReduced = useReducedMotion();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [question, setQuestion] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);

  const initialResponse = useMemo<WaiterResponse>(
    () => askMock(null, { ...context, user: null }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [response, setResponse] = useState<WaiterResponse>(initialResponse);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    askWaiter(null, context)
      .then((next) => {
        if (!cancelled) setResponse(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, auth.name, context.cityId]);

  const focusInput = useCallback(() => {
    setExpanded(true);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const handleChip = useCallback(
    (chip: WaiterChip) => {
      const action: ChipAction = chip.action;
      if (action.type === "scroll-to") {
        scrollToId(action.anchor);
        return;
      }
      if (action.type === "scroll-to-triptych") {
        scrollToId("editorial-triptych");
        return;
      }
      if (action.type === "focus-waiter") {
        focusInput();
        return;
      }
      if (action.type === "repeat-last") {
        const lastOrder = auth.orderHistory?.[0];
        if (!lastOrder) return;
        const nextLines = applyRepeatLast(lastOrder, draft.lineItems);
        patchDraft({ lineItems: nextLines, orderStage: "menu" });
        setBusy(true);
        askWaiter("Повторить прошлый стол", { ...context, cart: nextLines })
          .then((next) => setResponse(next))
          .catch(() => {})
          .finally(() => setBusy(false));
      }
    },
    [auth.orderHistory, context, draft.lineItems, focusInput, patchDraft],
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const nextQuestion = question.trim();
      if (!nextQuestion) return;
      setBusy(true);
      try {
        const next = await askWaiter(nextQuestion, context);
        setResponse(next);
        setQuestion("");
        setExpanded(false);
      } finally {
        setBusy(false);
      }
    },
    [context, question],
  );

  const primaryChip =
    response.suggestedChips.find((chip) => chip.primary) ??
    response.suggestedChips[0] ??
    null;

  return (
    <div className="menu-editorial__waiter-wrap">
      <motion.div
        className="menu-editorial__waiter-band"
        initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: prefersReduced ? 0 : 0.45, ease: "easeOut" }}
      >
        <div className="menu-editorial__waiter-mark" aria-hidden>
          <div className="menu-editorial__waiter-mark-core" />
        </div>
        <div className="menu-editorial__waiter-copy">
          <span className="menu-editorial__waiter-label">Официант</span>
          <p className="menu-editorial__waiter-reply">{response.reply}</p>
        </div>
        {!expanded ? (
          <div className="menu-editorial__waiter-actions">
            {primaryChip ? (
              <button
                key={primaryChip.label}
                type="button"
                className="menu-editorial__waiter-chip menu-editorial__waiter-chip--primary"
                onClick={() => handleChip(primaryChip)}
                disabled={busy}
              >
                {primaryChip.label}
              </button>
            ) : null}
            <button
              type="button"
              className="menu-editorial__waiter-ask"
              onClick={focusInput}
            >
              Спросить
            </button>
          </div>
        ) : null}

        <AnimatePresence initial={false}>
          {expanded ? (
            <motion.div
              key="waiter-input"
              className="menu-editorial__waiter-input-wrap"
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: "auto", opacity: 1, marginTop: 10 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
            >
              <form className="menu-editorial__waiter-form" onSubmit={handleSubmit}>
                <input
                  ref={inputRef}
                  type="text"
                  className="menu-editorial__waiter-input"
                  placeholder="Например: к пиву на четверых"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                />
                <button
                  type="button"
                  className="menu-editorial__waiter-cancel"
                  onClick={() => setExpanded(false)}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="menu-editorial__waiter-submit"
                  disabled={busy || question.trim().length === 0}
                >
                  Отправить
                </button>
              </form>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function EditorialProductCard({
  entry,
  image,
  note,
  index,
}: EditorialListingCard & { index: number }) {
  const { addEntry } = useAddToCart();
  const prefersReduced = useReducedMotion();

  return (
    <motion.article
      className="menu-editorial__product-card"
      initial={prefersReduced ? false : { opacity: 0.76, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT_ONCE}
      transition={{ duration: 0.62, delay: index * 0.07, ease: EASE }}
    >
      <Link
        href={`/product/${entry.item.id}?from=editorial`}
        className="menu-editorial__product-image-link"
      >
        <Image
          src={image.src}
          width={image.width}
          height={image.height}
          alt={image.alt}
          sizes="(max-width: 1279px) 100vw, 420px"
          className="menu-editorial__product-image"
        />
      </Link>
      <div className="menu-editorial__product-copy">
        <div>
          <h3 className="menu-editorial__product-title">{entry.item.name}</h3>
          <p className="menu-editorial__product-meta">{buildMetaLine(entry)}</p>
          <p className="menu-editorial__product-note">{note}</p>
        </div>
        <div className="menu-editorial__product-bottom">
          <strong className="menu-editorial__product-price">
            {formatMoney(entry.effectiveBasePrice)}
          </strong>
          <button
            type="button"
            className="menu-editorial__product-add"
            onClick={() => addEntry(entry)}
          >
            +
          </button>
        </div>
      </div>
    </motion.article>
  );
}

function EditorialSectionCard({
  entry,
  index = 0,
}: {
  entry: MenuSnapshotItem;
  index?: number;
}) {
  const { addEntry } = useAddToCart();
  const image = getEditorialSectionImage(entry);
  const isStopList = entry.state === "sold_out";
  const prefersReduced = useReducedMotion();

  return (
    <motion.article
      className="menu-editorial__section-card"
      data-stop-list={isStopList || undefined}
      initial={prefersReduced ? false : { opacity: 0.76, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT_ONCE}
      transition={{ duration: 0.6, delay: index * 0.05, ease: EASE }}
    >
      <Link
        href={`/product/${entry.item.id}?from=editorial`}
        className="menu-editorial__section-card-image-link"
      >
        <Image
          src={image.src}
          width={image.width}
          height={image.height}
          alt={image.alt}
          sizes="(max-width: 1279px) 100vw, 320px"
          loading="eager"
          className="menu-editorial__section-card-image"
        />
      </Link>
      <div className="menu-editorial__section-card-copy">
        <div className="menu-editorial__section-card-head">
          <div>
            <h3 className="menu-editorial__section-card-title">{entry.item.name}</h3>
            <p className="menu-editorial__section-card-meta">{buildMetaLine(entry)}</p>
          </div>
          <strong className="menu-editorial__section-card-price">
            {formatMoney(entry.effectiveBasePrice)}
          </strong>
        </div>
        <p className="menu-editorial__section-card-note">{buildSectionNote(entry)}</p>
        <div className="menu-editorial__section-card-footer">
          <span className="menu-editorial__section-card-state">
            {isStopList ? "сегодня разобрали" : "доступно"}
          </span>
          <button
            type="button"
            className="menu-editorial__section-card-button"
            onClick={() => addEntry(entry)}
            disabled={isStopList}
          >
            {isStopList ? "Нет сегодня" : "В корзину"}
          </button>
        </div>
      </div>
    </motion.article>
  );
}

export function MenuEditorialPage() {
  const prefersReduced = useReducedMotion();
  const { draft } = useDraft();
  const { state: auth, hydrated: authHydrated } = useFakeAuth();
  const { context: waiterContext } = useWaiterContext();
  const cart = useMemo(() => getDraftCartView(draft), [draft]);
  const fulfillmentMode: FulfillmentMode =
    draft.fulfillmentMode ?? "delivery";
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  const greeting = formatGreetingName(authHydrated ? auth.name : null);

  const snapshot = useMemo(
    () => getMenuForCity(waiterContext.cityId, fulfillmentMode),
    [fulfillmentMode, waiterContext.cityId],
  );

  useEffect(() => {
    MENU_ITEM_LOOKUP.clear();
    snapshot.forEach((entry) => {
      MENU_ITEM_LOOKUP.set(entry.item.id, entry.item);
    });
  }, [snapshot]);

  const byCategory = useMemo(() => {
    const raki = getCategoryItems(snapshot, "raki");
    return {
      raki,
      rakiBoiled: raki.find((entry) => entry.item.subcategory === "boiled"),
      rakiLive: raki.find((entry) => entry.item.subcategory === "live"),
      rakiFried: raki.find((entry) => entry.item.subcategory === "fried"),
      mussels: getCategoryItems(snapshot, "mussels"),
      crab: getCategoryItems(snapshot, "crab"),
      caviar: getCategoryItems(snapshot, "caviar"),
      drinks: getCategoryItems(snapshot, "drinks"),
    };
  }, [snapshot]);

  const triptychCards = useMemo<EditorialTriptychCard[]>(
    () => [
      {
        id: "raki",
        title: "Раки",
        subtitle: "варёные, жареные, живые",
        anchor: "editorial-section-raki",
        image: TRIPTYCH_IMAGES.raki,
      },
      {
        id: "mussels",
        title: "Мидии",
        subtitle: "в соусах",
        anchor: "editorial-section-mussels",
        image: TRIPTYCH_IMAGES.mussels,
      },
      {
        id: "crab",
        title: "Краб",
        subtitle: "камчатский",
        anchor: "editorial-section-crab",
        image: TRIPTYCH_IMAGES.crab,
      },
    ],
    [],
  );

  const catalogCards = useMemo(
    () =>
      buildEditorialListing(
        byCategory.rakiBoiled,
        byCategory.rakiLive,
        byCategory.rakiFried,
        byCategory.mussels[0],
        byCategory.crab[0],
      ),
    [
      byCategory.crab,
      byCategory.mussels,
      byCategory.rakiBoiled,
      byCategory.rakiFried,
      byCategory.rakiLive,
    ],
  );

  const featuredIds = useMemo(
    () => new Set(catalogCards.map((card) => card.entry.item.id)),
    [catalogCards],
  );

  const catalogSections = useMemo<EditorialCatalogSection[]>(
    () =>
      [
        { id: "raki", items: byCategory.raki },
        { id: "mussels", items: byCategory.mussels },
        { id: "crab", items: byCategory.crab },
        { id: "caviar", items: byCategory.caviar },
        { id: "drinks", items: byCategory.drinks },
      ]
        .map((section) => {
          const copy = SECTION_COPY[section.id];
          const items = pickSectionEntries(section.items, featuredIds);
          if (!copy || items.length === 0) return null;
          return {
            id: section.id,
            label: copy.label,
            lede: copy.lede,
            items,
          };
        })
        .filter((section): section is EditorialCatalogSection => section != null),
    [
      byCategory.caviar,
      byCategory.crab,
      byCategory.drinks,
      byCategory.mussels,
      byCategory.raki,
      featuredIds,
    ],
  );

  const categoryRail = useMemo(
    () => catalogSections.map((section) => ({ id: section.id, label: section.label })),
    [catalogSections],
  );

  useEffect(() => {
    setActiveSectionId((prev) => prev ?? categoryRail[0]?.id ?? null);
  }, [categoryRail]);

  useEffect(() => {
    const targets = categoryRail
      .map((item) => document.getElementById(`editorial-section-${item.id}`))
      .filter((target): target is HTMLElement => target != null);

    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (!visible[0]) return;
        const nextId = visible[0].target.id.replace("editorial-section-", "");
        setActiveSectionId((prev) => (prev === nextId ? prev : nextId));
      },
      { rootMargin: "-150px 0px -55% 0px", threshold: 0.01 },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [categoryRail]);

  return (
    <div className="menu-editorial">
      <DemoSeedHandler />

      <div className="menu-editorial__controls">
        <div className="menu-editorial__control-stack">
          <button
            type="button"
            className="menu-editorial__control menu-editorial__control--menu"
            onClick={() => scrollToId("editorial-catalog")}
          >
            <span className="menu-editorial__burger" aria-hidden>
              <span />
              <span />
              <span />
            </span>
            <span>Меню</span>
          </button>
          <Link href="/menu" className="menu-editorial__control">
            Каталог
          </Link>
        </div>

        <div className="menu-editorial__control-stack">
          <Link href="/account" className="menu-editorial__icon-control" aria-label="Аккаунт">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="3.6" stroke="currentColor" strokeWidth="1.6" />
              <path d="M5.6 19c1.4-3 4-4.6 6.4-4.6s5 1.6 6.4 4.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </Link>
          <button
            type="button"
            className="menu-editorial__control menu-editorial__control--cart"
            onClick={() => dispatchCartOpen()}
            aria-label="Открыть корзину"
          >
            <span>Корзина</span>
            <strong>{draft.lineItems.length}</strong>
          </button>
        </div>
      </div>

      <section className="menu-editorial__hero">
        <div className="menu-editorial__hero-media">
          <Image
            src={HERO_IMAGE.src}
            width={HERO_IMAGE.width}
            height={HERO_IMAGE.height}
            alt={HERO_IMAGE.alt}
            priority
            sizes="100vw"
            className="menu-editorial__hero-image"
          />
          <Image
            src={HERO_ALT_IMAGE.src}
            width={HERO_ALT_IMAGE.width}
            height={HERO_ALT_IMAGE.height}
            alt={HERO_ALT_IMAGE.alt}
            sizes="100vw"
            className="menu-editorial__hero-image-alt"
          />
          <div className="menu-editorial__hero-overlay" />
          <div className="menu-editorial__hero-grain" />
        </div>

        <div className="menu-editorial__hero-inner">
          <motion.div
            className="menu-editorial__brand"
            initial={prefersReduced ? false : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReduced ? 0 : 0.75, ease: EASE }}
          >
            <span className="menu-editorial__brand-wordmark">The Raki</span>
            <span className="menu-editorial__brand-subline">
              премиальная доставка для своих
            </span>
          </motion.div>

          <motion.div
            className="menu-editorial__hero-stage"
            initial={prefersReduced ? false : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: prefersReduced ? 0 : 0.88,
              delay: prefersReduced ? 0 : 0.12,
              ease: EASE,
            }}
          >
            <div className="menu-editorial__hero-copy">
              <AnimatedHeadline text={greeting} />
              <EditorialWaiterBand />
            </div>

            <div className="menu-editorial__hero-bridge">
              <div
                id="editorial-triptych"
                className="menu-editorial__triptych"
                aria-label="editorial menu lines"
              >
                <div className="menu-editorial__triptych-grid">
                  {triptychCards.map((card, index) => (
                    <motion.button
                      key={card.id}
                      type="button"
                      className="menu-editorial__triptych-card"
                      onClick={() => scrollToId(card.anchor)}
                      initial={prefersReduced ? false : { opacity: 0.84, y: 26 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={VIEWPORT_ONCE}
                      transition={{ duration: 0.68, delay: index * 0.08, ease: EASE }}
                    >
                      <Image
                        src={card.image.src}
                        width={card.image.width}
                        height={card.image.height}
                        alt={card.image.alt}
                        sizes="(max-width: 1279px) 100vw, 30vw"
                        className="menu-editorial__triptych-image"
                      />
                      <span className="menu-editorial__triptych-wash" />
                      <span className="menu-editorial__triptych-copy">
                        <span className="menu-editorial__triptych-title">{card.title}</span>
                        <span className="menu-editorial__triptych-subtitle">{card.subtitle}</span>
                      </span>
                      <span className="menu-editorial__triptych-arrow" aria-hidden>
                        →
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="editorial-catalog" className="menu-editorial__catalog">
        <div className="menu-editorial__catalog-wave" aria-hidden />
        <div className="menu-editorial__catalog-inner">
          <div className="menu-editorial__catalog-main">
            <div className="menu-editorial__catalog-header">
              <h2 className="menu-editorial__catalog-title">Меню</h2>
              <div className="menu-editorial__catalog-total">
                <span>В корзине</span>
                <strong>{draft.lineItems.length > 0 ? cart.totalLabel : "0 ₽"}</strong>
              </div>
            </div>

            <div className="menu-editorial__product-grid">
              {catalogCards.map((card, index) => (
                <EditorialProductCard
                  key={card.entry.item.id}
                  entry={card.entry}
                  image={card.image}
                  note={card.note}
                  index={index}
                />
              ))}
            </div>

            <div className="menu-editorial__catalog-body">
              <aside className="menu-editorial__catalog-rail">
                <nav className="menu-editorial__catalog-nav" aria-label="Editorial menu sections">
                  {categoryRail.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="menu-editorial__catalog-nav-link"
                      data-active={activeSectionId === item.id || undefined}
                      onClick={() => scrollToId("editorial-section-" + item.id)}
                    >
                      {item.label}
                      {activeSectionId === item.id ? (
                        <motion.span
                          layoutId="menu-editorial-nav-indicator"
                          className="menu-editorial__catalog-nav-indicator"
                          transition={{ duration: 0.3, ease: EASE }}
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  ))}
                </nav>
              </aside>

              <div className="menu-editorial__catalog-sections">
                {catalogSections.map((section) => (
                  <motion.section
                    key={section.id}
                    id={"editorial-section-" + section.id}
                    className={[
                      "menu-editorial__catalog-section",
                      "menu-editorial__catalog-section--" + section.id,
                    ].join(" ")}
                    initial={prefersReduced ? false : { opacity: 0.84, y: 36 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={VIEWPORT_ONCE}
                    transition={{ duration: 0.72, ease: EASE }}
                  >
                    <div className="menu-editorial__catalog-section-header">
                      <div className="menu-editorial__catalog-section-copy">
                        <h3 className="menu-editorial__catalog-section-title">
                          {section.label}
                        </h3>
                        <p className="menu-editorial__catalog-section-lede">
                          {section.lede}
                        </p>
                      </div>
                    </div>

                    <div className="menu-editorial__catalog-section-grid">
                      {section.items.map((entry, index) => (
                        <EditorialSectionCard
                          key={entry.item.id}
                          entry={entry}
                          index={index}
                        />
                      ))}
                    </div>
                  </motion.section>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
