"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDraft } from "@/components/draft-provider";
import { CART_OPEN_EVENT } from "@/components/cart-events";
import { getProductFamilyImage } from "@/lib/category-images";
import { getDraftCartView } from "@/lib/draft-view";
import { getMenuSnapshotForContext } from "@/lib/fixtures";
import {
  appendDraftLineItem,
  buildDefaultDraftLineItem,
  decrementDraftLineItemQuantity,
  incrementDraftLineItemQuantity,
  removeDraftLineItem,
} from "@/lib/line-item";
import { getContextUpsellItems, getUpsellNote } from "@/lib/upsells";

export function CartPill() {
  const router = useRouter();
  const pathname = usePathname();
  const { draft, patchDraft } = useDraft();
  const cart = useMemo(() => getDraftCartView(draft), [draft]);
  const prevCount = useRef(draft.lineItems.length);
  const count = draft.lineItems.length;
  const justAdded = count > prevCount.current;
  const [open, setOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    prevCount.current = count;
  }, [count]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (count === 0) {
      setOpen(false);
    }
  }, [count]);

  useEffect(() => {
    const handleOpen = () => {
      if (pathname === "/menu" || pathname.startsWith("/product/")) {
        setOpen(true);
      }
    };

    window.addEventListener(CART_OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(CART_OPEN_EVENT, handleOpen);
  }, [pathname]);

  const supportsDrawer = pathname === "/menu" || pathname.startsWith("/product/");
  const shouldHide =
    pathname === "/" ||
    pathname === "/cart" ||
    pathname === "/checkout" ||
    pathname === "/demo" ||
    pathname === "/investor-demo" ||
    pathname === "/delivery/address" ||
    pathname === "/delivery/result" ||
    pathname.startsWith("/pickup/") ||
    pathname.startsWith("/track/");

  const contextSnapshot = useMemo(() => {
    return getMenuSnapshotForContext({
      fulfillmentMode: draft.fulfillmentMode ?? "delivery",
      locationId: draft.locationId,
      servicePointId: draft.servicePointId,
    });
  }, [draft.fulfillmentMode, draft.locationId, draft.servicePointId]);

  const drawerUpsells = useMemo(() => {
    const anchorFamilies = draft.lineItems
      .map((lineItem) =>
        contextSnapshot.visibleItems.find((entry) => entry.item.id === lineItem.itemId)?.item.productFamily,
      )
      .filter((family): family is string => Boolean(family));

    if (anchorFamilies.length === 0) {
      return [];
    }

    return getContextUpsellItems({
      visibleItems: contextSnapshot.visibleItems,
      excludedItemIds: draft.lineItems.map((lineItem) => lineItem.itemId),
      anchorFamilies,
      limit: 3,
    });
  }, [contextSnapshot.visibleItems, draft.lineItems]);

  if (shouldHide || count === 0) return null;

  const goToCart = () => {
    setOpen(false);
    router.push("/cart");
  };

  const handleUpsellAdd = (itemId: string) => {
    const entry = contextSnapshot.visibleItems.find((candidate) => candidate.item.id === itemId);

    if (!entry) {
      return;
    }

    patchDraft({
      lineItems: appendDraftLineItem(
        draft.lineItems,
        buildDefaultDraftLineItem(entry.item),
      ),
    });
  };

  const serviceLabel =
    draft.fulfillmentMode === "pickup"
      ? "Самовывоз"
      : draft.normalizedAddress || draft.typedAddress
        ? "Доставка подтверждается по адресу"
        : "Доставка";

  return portalReady
    ? createPortal(
        <>
      <AnimatePresence>
        <motion.button
          type="button"
          onClick={() => (supportsDrawer ? setOpen(true) : router.push("/cart"))}
          aria-label="Открыть заказ"
          initial={{ x: 18, opacity: 0 }}
          animate={{
            x: 0,
            opacity: 1,
            scale: justAdded ? [1, 1.06, 1] : 1,
          }}
          exit={{ x: 18, opacity: 0 }}
          transition={{ duration: 0.28 }}
          style={{
            position: "fixed",
            right: "var(--space-lg)",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 70,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 12px 10px 14px",
            minWidth: 176,
            borderRadius: "999px",
            border: "1px solid rgba(255,255,255,0.1)",
            backgroundColor: "rgba(248, 245, 238, 0.94)",
            color: "var(--bg)",
            boxShadow: "0 26px 60px rgba(0,0,0,0.28)",
            backdropFilter: "blur(20px)",
            cursor: "pointer",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 36,
              height: 36,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              backgroundColor: "rgba(8, 16, 20, 0.08)",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M7 9.5h10l-.9 9.2a1.4 1.4 0 0 1-1.39 1.3H9.29a1.4 1.4 0 0 1-1.39-1.3L7 9.5Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path
                d="M9.2 9.3V7.9A2.8 2.8 0 0 1 12 5.1a2.8 2.8 0 0 1 2.8 2.8v1.4"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span style={{ display: "grid", gap: 2, textAlign: "left", minWidth: 0, flex: 1 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(8,16,20,0.56)",
              }}
            >
              Заказ
            </span>
            <strong style={{ fontSize: 13, lineHeight: 1.2, whiteSpace: "nowrap" }}>
              {count} поз.
            </strong>
          </span>
          <strong style={{ fontSize: 15, lineHeight: 1.2, whiteSpace: "nowrap" }}>{cart.totalLabel}</strong>
        </motion.button>
      </AnimatePresence>

      <AnimatePresence>
        {supportsDrawer && open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 95,
              backgroundColor: "rgba(3, 7, 10, 0.6)",
              backdropFilter: "blur(6px)",
            }}
            onClick={() => setOpen(false)}
          >
            <motion.aside
              initial={{ x: 44, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 44, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "absolute",
                top: 18,
                right: 18,
                bottom: 18,
                width: 428,
                borderRadius: "28px",
                border: "1px solid rgba(255,255,255,0.08)",
                backgroundColor: "rgba(8, 14, 18, 0.985)",
                boxShadow: "0 32px 90px rgba(0,0,0,0.34)",
                display: "grid",
                gridTemplateRows: "auto 1fr auto",
                overflow: "hidden",
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div style={{ padding: "20px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-start justify-between" style={{ gap: "var(--space-md)" }}>
                  <div>
                    <span className="text-eyebrow block" style={{ marginBottom: 6 }}>
                      {serviceLabel}
                    </span>
                    <h3 className="font-display" style={{ fontSize: 28, lineHeight: 0.98, marginBottom: 6 }}>
                      Ваш заказ.
                    </h3>
                    <p className="text-muted" style={{ fontSize: 12, lineHeight: 1.55, maxWidth: 260 }}>
                      Можно спокойно поправить позиции, добавить ещё пару вещей к столу и перейти к оформлению.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="cta cta--ghost"
                    style={{ padding: "10px 12px", minWidth: 44 }}
                    onClick={() => setOpen(false)}
                  >
                    ×
                  </button>
                </div>
              </div>

              <div style={{ padding: "16px 16px 18px", overflowY: "auto", display: "grid", gap: 8 }}>
                {draft.lineItems.map((item, index) => (
                  <article
                    key={`${item.itemId}-${index}`}
                    style={{
                      padding: index === 0 ? "4px 0 12px" : "12px 0 12px",
                      borderBottom:
                        index === draft.lineItems.length - 1 ? "none" : "1px solid rgba(255,255,255,0.07)",
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "56px minmax(0, 1fr) auto",
                        gap: 12,
                        alignItems: "start",
                      }}
                    >
                      <div
                        aria-hidden="true"
                          style={{
                          width: 52,
                          height: 52,
                          borderRadius: "14px",
                          overflow: "hidden",
                          border: "1px solid rgba(255,255,255,0.08)",
                          backgroundColor: "rgba(18, 29, 36, 0.92)",
                        }}
                      >
                        <img
                          src={getProductFamilyImage(
                            contextSnapshot.visibleItems.find((entry) => entry.item.id === item.itemId)?.item.productFamily ?? "boiled",
                          )}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <strong style={{ display: "block", fontSize: 15, lineHeight: 1.2, marginBottom: 4 }}>
                          {item.itemName}
                        </strong>
                        {item.summaryLines.length > 0 ? (
                          <span className="text-muted" style={{ display: "block", fontSize: 11, lineHeight: 1.45 }}>
                            {item.summaryLines.slice(0, 2).join(" • ")}
                          </span>
                        ) : null}
                      </div>

                      <div style={{ display: "grid", justifyItems: "end", gap: 8 }}>
                        <strong style={{ fontSize: 15, whiteSpace: "nowrap" }}>
                          {item.totalPrice.toLocaleString("ru-RU")} ₽
                        </strong>
                        {item.quantityEditable === false ? (
                          <span className="text-muted" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                            Весовая позиция
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div
                      className="flex items-center justify-between"
                      style={{
                        gap: "var(--space-sm)",
                        paddingTop: 6,
                      }}
                    >
                      {item.quantityEditable === false ? (
                        <span className="text-muted" style={{ fontSize: 12 }}>Весовая позиция</span>
                      ) : (
                        <div className="flex items-center" style={{ gap: 8 }}>
                          <button
                            type="button"
                            className="cta cta--ghost"
                            style={{ padding: "5px 9px", minWidth: 34, borderRadius: 14 }}
                            onClick={() =>
                              patchDraft({
                                lineItems: decrementDraftLineItemQuantity(draft.lineItems, index),
                              })
                            }
                          >
                            −
                          </button>
                          <strong style={{ minWidth: 16, textAlign: "center", fontSize: 13 }}>{item.quantity}</strong>
                          <button
                            type="button"
                            className="cta cta--ghost"
                            style={{ padding: "5px 9px", minWidth: 34, borderRadius: 14 }}
                            onClick={() =>
                              patchDraft({
                                lineItems: incrementDraftLineItemQuantity(draft.lineItems, index),
                              })
                            }
                          >
                            +
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        className="cta cta--ghost"
                        style={{ padding: "5px 9px", fontSize: 11, borderRadius: 14 }}
                        onClick={() =>
                          patchDraft({
                            lineItems: removeDraftLineItem(draft.lineItems, index),
                          })
                        }
                      >
                        Убрать
                      </button>
                    </div>
                  </article>
                ))}

                {drawerUpsells.length > 0 ? (
                  <section
                    style={{
                      padding: "14px 14px 6px",
                      borderRadius: "20px",
                      border: "1px solid rgba(255,255,255,0.08)",
                      backgroundColor: "rgba(12, 21, 27, 0.9)",
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    <div>
                      <span className="text-eyebrow block" style={{ marginBottom: 4 }}>
                        Добавить к столу
                      </span>
                      <strong style={{ display: "block", fontSize: 17, lineHeight: 1.15, marginBottom: 4 }}>
                        Ещё пару позиций.
                      </strong>
                      <p className="text-muted" style={{ fontSize: 11, lineHeight: 1.5 }}>
                        Небольшие дополнения без лишнего шума.
                      </p>
                    </div>

                    <div style={{ display: "grid", gap: 10 }}>
                      {drawerUpsells.map((entry) => (
                        <article
                          key={entry.item.id}
                          style={{
                            padding: "10px 0",
                            borderTop: "1px solid rgba(255,255,255,0.07)",
                            display: "grid",
                            gridTemplateColumns: "52px minmax(0, 1fr) auto",
                            gap: 10,
                            alignItems: "center",
                          }}
                        >
                          <div
                            aria-hidden="true"
                            style={{
                              width: 52,
                              height: 52,
                              borderRadius: "14px",
                              overflow: "hidden",
                              border: "1px solid rgba(255,255,255,0.08)",
                              backgroundColor: "rgba(22, 34, 41, 0.92)",
                            }}
                          >
                            <img
                              src={getProductFamilyImage(entry.item.productFamily)}
                              alt=""
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <span className="text-eyebrow block" style={{ marginBottom: 4 }}>
                              {entry.item.category}
                            </span>
                            <strong style={{ display: "block", fontSize: 14, lineHeight: 1.2, marginBottom: 4 }}>
                              {entry.item.name}
                            </strong>
                            <p className="text-muted" style={{ fontSize: 11, lineHeight: 1.45 }}>
                              {getUpsellNote(entry)}
                            </p>
                          </div>

                          <div style={{ display: "grid", justifyItems: "end", gap: 8 }}>
                            <strong style={{ fontSize: 14, whiteSpace: "nowrap" }}>
                              от {entry.effectiveBasePrice.toLocaleString("ru-RU")} ₽
                            </strong>
                            <button
                              type="button"
                              className="cta cta--ghost"
                              style={{ padding: "5px 10px", fontSize: 11, borderRadius: 14 }}
                              onClick={() => handleUpsellAdd(entry.item.id)}
                            >
                              Добавить
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>

              <div
                style={{
                  padding: "16px 20px 20px",
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  backgroundColor: "rgba(8, 16, 20, 0.88)",
                  display: "grid",
                  gap: 12,
                }}
              >
                <div className="flex items-center justify-between" style={{ gap: "var(--space-sm)" }}>
                  <span className="text-eyebrow">К оплате</span>
                  <strong style={{ fontSize: 28, lineHeight: 1 }}>{cart.totalLabel}</strong>
                </div>

                <div className="flex items-center justify-between" style={{ gap: "var(--space-sm)", flexWrap: "wrap" }}>
                  <button type="button" className="cta cta--ghost" style={{ padding: "10px 14px" }} onClick={goToCart}>
                    Корзина
                  </button>
                  <Link href="/checkout" className="cta cta--primary" style={{ padding: "10px 16px" }} onClick={() => setOpen(false)}>
                    Оформить заказ
                  </Link>
                </div>
              </div>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
        </>,
        document.body,
      )
    : null;
}
