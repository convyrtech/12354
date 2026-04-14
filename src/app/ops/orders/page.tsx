import Link from "next/link";
import type { AssignmentStatus } from "@/lib/courier/types";
import type { OrderOpsView, OrderProviderOpsView } from "@/server/orders/ops-view";
import { listOrderOpsViews } from "@/server/orders/ops-view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatIsoDateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Moscow",
  }).format(new Date(value));
}

function formatProviderLocalDateTime(value: string | null) {
  if (!value) {
    return "—";
  }

  if (value.includes("T")) {
    return formatIsoDateTime(value);
  }

  return value;
}

function getDispatchStatusLabel(status: AssignmentStatus | null) {
  switch (status) {
    case "pending_assignment":
      return "Ждет назначения";
    case "assigned":
      return "Курьер назначен";
    case "accepted":
      return "Курьер принял";
    case "waiting_at_pickup":
      return "Курьер на точке";
    case "picked_up":
      return "Заказ у курьера";
    case "arrived_near_customer":
      return "Курьер у клиента";
    case "delivered":
      return "Доставлен";
    case "failed":
      return "Проблема";
    case "cancelled":
      return "Отменен";
    default:
      return "Нет dispatch-задачи";
  }
}

function getDispatchTone(status: AssignmentStatus | null) {
  if (status === "pending_assignment") return "var(--warning)";
  if (status === "delivered") return "var(--success)";
  if (status === "failed" || status === "cancelled") return "var(--error)";
  if (status === "arrived_near_customer" || status === "waiting_at_pickup") return "var(--warning)";
  if (status) return "var(--accent)";
  return "var(--text-dim)";
}

function getProviderTone(view: OrderProviderOpsView) {
  switch (view.providerState) {
    case "submitted_to_provider":
      return "var(--accent)";
    case "sync_failed":
      return "var(--error)";
    case "local_queue":
      return "var(--warning)";
    default:
      return "var(--text-dim)";
  }
}

function getProviderStateLabel(view: OrderProviderOpsView) {
  switch (view.providerState) {
    case "submitted_to_provider":
      return `${view.providerLabel}: отправлен`;
    case "sync_failed":
      return `${view.providerLabel}: нужна проверка`;
    case "local_queue":
      return "локальный ops-слой";
    default:
      return "не применяется";
  }
}

function getIikoDeliveryStatusLabel(status: string | null) {
  switch (status) {
    case "Unconfirmed":
      return "Не подтвержден";
    case "WaitCooking":
      return "Ждет готовки";
    case "ReadyForCooking":
      return "Готов к готовке";
    case "CookingStarted":
      return "Готовится";
    case "CookingCompleted":
      return "Готовка завершена";
    case "Waiting":
      return "Ждет выдачи";
    case "OnWay":
      return "В пути";
    case "Delivered":
      return "Доставлен";
    case "Closed":
      return "Закрыт";
    case "Cancelled":
      return "Отменен";
    default:
      return status ?? "—";
  }
}

function getCommandStateLabel(state: OrderProviderOpsView["sync"]["commandState"]) {
  switch (state) {
    case "InProgress":
      return "В процессе";
    case "Success":
      return "Успешно";
    case "Error":
      return "Ошибка";
    default:
      return "—";
  }
}

function DispatchSummary({ view }: { view: OrderOpsView }) {
  const tone = getDispatchTone(view.dispatch.status);

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <span className="text-eyebrow" style={{ display: "block", marginBottom: 6 }}>
        Dispatch
      </span>
      <strong style={{ display: "block", marginBottom: 8, color: tone }}>
        {getDispatchStatusLabel(view.dispatch.status)}
      </strong>
      <div className="text-muted" style={{ lineHeight: 1.7 }}>
        <div>
          Курьер:{" "}
          {view.dispatch.courier
            ? `${view.dispatch.courier.displayName} • ${view.dispatch.courier.vehicleType}`
            : "еще не назначен"}
        </div>
        <div>Статус курьера: {view.dispatch.courier ? view.dispatch.courier.status : "нет"}</div>
        <div>Assignment: {view.dispatch.assignmentId ?? "еще не создано"}</div>
      </div>

      <div
        className="flex"
        style={{
          gap: 10,
          flexWrap: "wrap",
          marginTop: 14,
        }}
      >
        <Link href="/ops/dispatch" className="cta cta--ghost">
          Открыть dispatch
        </Link>
        {view.dispatch.trackingPath ? (
          <Link href={view.dispatch.trackingPath} className="cta cta--secondary">
            Клиентский трекинг
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function ProviderSyncSummary({ view }: { view: OrderProviderOpsView }) {
  const providerTone = getProviderTone(view);

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <span className="text-eyebrow" style={{ display: "block", marginBottom: 6 }}>
        Provider Sync
      </span>
      <strong style={{ display: "block", marginBottom: 8, color: providerTone }}>
        {getProviderStateLabel(view)}
      </strong>
      <div className="text-muted" style={{ lineHeight: 1.7 }}>
        <div>Провайдер: {view.providerLabel}</div>
        <div>External: {view.externalReference ?? "—"}</div>
        <div>Correlation: {view.correlationId ?? "—"}</div>
        <div>Последний sync: {view.sync.syncedAt ? formatIsoDateTime(view.sync.syncedAt) : "—"}</div>
        <div>
          Lookup:{" "}
          {view.sync.lookupMode === "deliveries_by_id"
            ? "deliveries/by_id"
            : view.sync.lookupMode === "commands_status"
              ? "commands/status"
              : "—"}
        </div>
        <div>Command state: {getCommandStateLabel(view.sync.commandState)}</div>
        <div>Delivery status: {getIikoDeliveryStatusLabel(view.sync.deliveryStatus)}</div>
        <div>Complete before: {formatProviderLocalDateTime(view.sync.completeBefore)}</div>
        <div>Курьер в iiko: {view.sync.courierName ?? "—"}</div>
        <div>Problem: {view.sync.hasProblem ? "да" : "нет"}</div>
        {view.sync.problemDescription ? <div>Причина: {view.sync.problemDescription}</div> : null}
      </div>

      {view.sync.trackingLink ? (
        <div style={{ marginTop: 12 }}>
          <Link href={view.sync.trackingLink} className="cta cta--ghost">
            Tracking link из iiko
          </Link>
        </div>
      ) : null}

      <div className="text-muted" style={{ marginTop: 12, lineHeight: 1.7 }}>
        {view.note}
      </div>
    </div>
  );
}

export default async function Page() {
  const views = await listOrderOpsViews(50);

  return (
    <main
      style={{
        minHeight: "100vh",
        maxWidth: 1440,
        margin: "0 auto",
        padding: "120px 24px 80px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 24,
          marginBottom: 32,
        }}
      >
        <div>
          <span className="text-eyebrow" style={{ display: "block", marginBottom: 8 }}>
            Operations
          </span>
          <h1 className="text-h1" style={{ marginBottom: 12 }}>
            Заказы с сайта
          </h1>
          <p className="text-muted" style={{ maxWidth: 820 }}>
            Очередь теперь показывает не только stored order snapshot, но и живую правду по handoff в
            provider, текущему provider status и состоянию dispatch.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/ops/dispatch" className="cta cta--ghost">
            К dispatch
          </Link>
          <Link href="/menu?fulfillment=delivery" className="cta cta--primary">
            В каталог
          </Link>
        </div>
      </div>

      {views.length === 0 ? (
        <section
          style={{
            padding: 28,
            borderRadius: 28,
            border: "1px solid var(--border)",
            backgroundColor: "rgba(15, 26, 34, 0.68)",
          }}
        >
          <h2 style={{ fontSize: 24, marginBottom: 8 }}>Пока нет заказов</h2>
          <p className="text-muted">
            Оформите заказ через сайт, и он появится здесь вместе с handoff и dispatch truth.
          </p>
        </section>
      ) : (
        <div style={{ display: "grid", gap: 18 }}>
          {views.map((view) => {
            const order = view.order;
            const providerTone = getProviderTone(view.provider);
            const dispatchTone = getDispatchTone(view.dispatch.status);

            return (
              <section
                key={order.reference}
                style={{
                  borderRadius: 30,
                  border: "1px solid var(--border)",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(15,26,34,0.82) 100%)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.2fr 1fr 0.95fr",
                    gap: 0,
                  }}
                >
                  <div style={{ padding: 24, borderRight: "1px solid var(--border)" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 16,
                        marginBottom: 18,
                      }}
                    >
                      <div>
                        <span className="text-eyebrow" style={{ display: "block", marginBottom: 6 }}>
                          {order.reference}
                        </span>
                        <h2 style={{ fontSize: 28, marginBottom: 6 }}>{order.guest.name}</h2>
                        <div className="text-muted">{order.guest.phone}</div>
                      </div>
                      <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                        <div
                          style={{
                            padding: "8px 12px",
                            borderRadius: 999,
                            border: `1px solid ${providerTone}`,
                            color: providerTone,
                            fontSize: 12,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                          }}
                        >
                          {getProviderStateLabel(view.provider)}
                        </div>
                        <div
                          style={{
                            padding: "8px 12px",
                            borderRadius: 999,
                            border: `1px solid ${dispatchTone}`,
                            color: dispatchTone,
                            fontSize: 12,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                          }}
                        >
                          {getDispatchStatusLabel(view.dispatch.status)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: 10 }}>
                      <div className="text-muted">Создано: {formatIsoDateTime(order.createdAt)}</div>
                      <div className="text-muted">Контекст: {order.summary.fulfillmentLabel}</div>
                      <div className="text-muted">Сервис: {order.fulfillment.serviceLabel}</div>
                      <div className="text-muted">Время: {order.fulfillment.timingLabel}</div>
                      <div className="text-muted">Передача: {order.submission.destinationLabel}</div>
                      {order.guest.comment ? (
                        <div className="text-muted">Комментарий: {order.guest.comment}</div>
                      ) : null}
                    </div>

                    <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
                      {order.cart.items.map((item) => (
                        <div
                          key={`${order.reference}-${item.itemId}-${item.itemName}`}
                          style={{
                            padding: "12px 14px",
                            borderRadius: 18,
                            backgroundColor: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                              marginBottom: item.summaryLines.length > 0 ? 8 : 0,
                            }}
                          >
                            <strong>
                              {item.itemName} x{item.quantity}
                            </strong>
                            <span>{item.totalPrice.toLocaleString("ru-RU")} ₽</span>
                          </div>
                          {item.summaryLines.length > 0 ? (
                            <div className="text-muted" style={{ fontSize: 13, lineHeight: 1.7 }}>
                              {item.summaryLines.join(" • ")}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: 24,
                      borderRight: "1px solid var(--border)",
                      display: "grid",
                      gap: 14,
                      alignContent: "start",
                    }}
                  >
                    <ProviderSyncSummary view={view.provider} />

                    <div>
                      <span className="text-eyebrow" style={{ display: "block", marginBottom: 6 }}>
                        Маршрут
                      </span>
                      <strong style={{ display: "block", marginBottom: 6 }}>
                        {order.fulfillment.decisionLabel}
                      </strong>
                      <div className="text-muted" style={{ lineHeight: 1.7 }}>
                        <div>Источник: {order.fulfillment.fulfillmentSourceLabel}</div>
                        <div>Dropoff: {order.fulfillment.confirmedDropoffSource}</div>
                        <div>Confidence: {order.fulfillment.addressConfidence}</div>
                      </div>
                    </div>

                    <div>
                      <span className="text-eyebrow" style={{ display: "block", marginBottom: 6 }}>
                        Точка
                      </span>
                      <div className="text-muted" style={{ lineHeight: 1.7 }}>
                        <div>Zone: {order.fulfillment.zoneId ?? "—"}</div>
                        <div>Location: {order.fulfillment.locationId ?? "—"}</div>
                        <div>Service point: {order.fulfillment.servicePointId ?? "—"}</div>
                      </div>
                    </div>

                    {order.fulfillment.confirmedDropoffLabel ? (
                      <div>
                        <span className="text-eyebrow" style={{ display: "block", marginBottom: 6 }}>
                          Адрес вручения
                        </span>
                        <div className="text-muted" style={{ lineHeight: 1.7 }}>
                          {order.fulfillment.confirmedDropoffLabel}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div style={{ padding: 24, display: "grid", gap: 16, alignContent: "start" }}>
                    <div>
                      <span className="text-eyebrow" style={{ display: "block", marginBottom: 6 }}>
                        Оплата
                      </span>
                      <strong style={{ display: "block", marginBottom: 6 }}>{order.payment.label}</strong>
                      <div className="text-muted">{order.payment.method}</div>
                    </div>

                    <div>
                      <span className="text-eyebrow" style={{ display: "block", marginBottom: 6 }}>
                        Сумма
                      </span>
                      <div className="text-muted" style={{ lineHeight: 1.8 }}>
                        <div>Товары: {order.cart.subtotalLabel}</div>
                        <div>Доставка: {order.cart.fee > 0 ? `${order.cart.fee.toLocaleString("ru-RU")} ₽` : "0 ₽"}</div>
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 10 }}>{order.cart.totalLabel}</div>
                    </div>

                    <DispatchSummary view={view} />

                    {order.submission.lastError ? (
                      <div
                        style={{
                          padding: 16,
                          borderRadius: 18,
                          backgroundColor: "rgba(196, 90, 90, 0.08)",
                          border: "1px solid rgba(196, 90, 90, 0.18)",
                        }}
                      >
                        <span className="text-eyebrow" style={{ display: "block", marginBottom: 6 }}>
                          Submit note
                        </span>
                        <div className="text-muted" style={{ lineHeight: 1.7 }}>
                          {order.submission.lastError}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
