"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { DeliveryStatusEvent, PublicTrackingView } from "@/lib/courier/types";
import { fetchPublicTracking } from "@/lib/courier/client";

type PublicTrackingPageProps = {
  token: string;
};

const mapBounds = {
  minLng: 37.16,
  maxLng: 37.96,
  minLat: 55.55,
  maxLat: 55.95,
};

function projectPoint(lat: number | null, lng: number | null) {
  if (lat === null || lng === null) {
    return { x: 50, y: 50 };
  }

  const xRatio = (lng - mapBounds.minLng) / (mapBounds.maxLng - mapBounds.minLng);
  const yRatio = (lat - mapBounds.minLat) / (mapBounds.maxLat - mapBounds.minLat);

  return {
    x: Math.min(Math.max(10 + xRatio * 80, 10), 90),
    y: Math.min(Math.max(90 - yRatio * 74, 12), 90),
  };
}

function buildRoutePath(start: { x: number; y: number }, end: { x: number; y: number }) {
  const cx = (start.x + end.x) / 2;
  const cy = Math.min(start.y, end.y) - 12;
  return `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`;
}

function getStatusTone(status: PublicTrackingView["assignmentStatus"]) {
  if (status === "pending_assignment" || status === "arrived_near_customer") {
    return "var(--warning)";
  }

  if (status === "delivered") {
    return "var(--success)";
  }

  if (status === "failed" || status === "cancelled") {
    return "var(--error)";
  }

  return "var(--accent)";
}

function getStatusLabel(status: PublicTrackingView["assignmentStatus"]) {
  switch (status) {
    case "pending_assignment":
      return "Подбираем курьера";
    case "assigned":
      return "Курьер назначен";
    case "accepted":
      return "Курьер подтвердил заказ";
    case "en_route_to_pickup":
      return "Курьер едет на точку";
    case "waiting_at_pickup":
      return "Курьер на точке выдачи";
    case "picked_up":
      return "Заказ у курьера";
    case "en_route_to_customer":
      return "В пути";
    case "arrived_near_customer":
      return "Курьер уже рядом";
    case "delivered":
      return "Заказ доставлен";
    case "failed":
      return "Нужна проверка";
    case "cancelled":
      return "Доставка отменена";
    default:
      return status;
  }
}

function getEventLabel(event: DeliveryStatusEvent) {
  switch (event.eventType) {
    case "assignment_created":
      return "Заказ передан в доставку";
    case "courier_assigned":
      return "Назначен курьер";
    case "assignment_accepted":
      return "Курьер принял заказ";
    case "courier_arrived_pickup":
      return "Курьер прибыл на точку";
    case "order_picked_up":
      return "Заказ забран";
    case "courier_arrived_dropoff":
      return "Курьер у точки вручения";
    case "order_delivered":
      return "Заказ доставлен";
    case "delivery_failed":
      return "Нужна ручная проверка";
    case "assignment_cancelled":
      return "Доставка отменена";
    case "courier_location_updated":
      return "Обновлена позиция курьера";
    default:
      return event.eventType;
  }
}

function getVehicleLabel(vehicleType: PublicTrackingView["courier"]["vehicleType"]) {
  switch (vehicleType) {
    case "foot":
      return "пешком";
    case "bike":
      return "велокурьер";
    case "scooter":
      return "скутер";
    case "car":
      return "автомобиль";
    default:
      return "уточняется";
  }
}

function formatEventTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatLocationAge(value: string | null) {
  if (!value) {
    return "Позиция появится после выезда";
  }

  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) {
    return "обновлено только что";
  }

  if (diffMinutes < 60) {
    return `обновлено ${diffMinutes} мин назад`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  return `обновлено ${diffHours} ч назад`;
}

function getHeadlineCopy(tracking: PublicTrackingView) {
  switch (tracking.assignmentStatus) {
    case "pending_assignment":
      return "Заказ уже у команды. Сейчас закрепляем курьера и готовим выезд.";
    case "assigned":
      return "Курьер уже закреплен за заказом. Следим за готовностью точки и выездом.";
    case "accepted":
      return "Курьер подтвердил доставку и готовит маршрут.";
    case "en_route_to_pickup":
      return "Курьер уже едет на точку выдачи.";
    case "waiting_at_pickup":
      return "Курьер на точке и ждет передачу заказа.";
    case "picked_up":
    case "en_route_to_customer":
      return "Заказ уже у курьера. Следим за маршрутом в реальном времени.";
    case "arrived_near_customer":
      return "Курьер уже рядом. Пожалуйста, будьте на связи.";
    case "delivered":
      return "Заказ доставлен. Приятного вечера.";
    case "failed":
      return "По доставке возникла сложность. Команда уже разбирается.";
    case "cancelled":
      return "Передача отменена. Если понадобится новая доставка, команда свяжется отдельно.";
    default:
      return "Следим за заказом в реальном времени.";
  }
}

function getStatusSupportCopy(tracking: PublicTrackingView) {
  switch (tracking.assignmentStatus) {
    case "pending_assignment":
    case "assigned":
    case "accepted":
      return "Назначаем курьера и готовим выезд.";
    case "en_route_to_pickup":
    case "waiting_at_pickup":
      return "Точка уже в работе. Как только заказ перейдёт к курьеру, маршрут обновится здесь автоматически.";
    case "picked_up":
    case "en_route_to_customer":
      return "Заказ уже в пути.";
    case "arrived_near_customer":
      return "Курьер уже рядом. Пожалуйста, будьте на связи ближайшие минуты.";
    case "delivered":
    return "Маршрут завершён. Если понадобится повторить заказ, команда уже знает ваши условия.";
    case "failed":
    case "cancelled":
    return "Ситуацию уже разбирает команда. Если нужно, мы быстро перестроим маршрут вручную.";
    default:
      return "Статус маршрута обновляется автоматически.";
  }
}

function getTrackingTitle(orderLabel: string) {
  if (orderLabel.toLowerCase().includes("investor")) {
    return "Ваш заказ в пути";
  }

  if (orderLabel.startsWith("TR-")) {
    return "Ваш заказ в пути";
  }

  return `Заказ ${orderLabel}`;
}

function getTrackingReference(orderLabel: string) {
  if (orderLabel.toLowerCase().includes("investor")) {
    return "Маршрут уже закреплён";
  }

  if (orderLabel.startsWith("TR-")) {
    return orderLabel;
  }

  return null;
}

function getCourierDisplayLabel(value: string | null) {
  if (!value) return "Назначаем";
  return value.replace(/,\s*частный курьер/gi, "").trim();
}

function getEventNote(event: DeliveryStatusEvent) {
  if ("statusNote" in event.eventPayload && typeof event.eventPayload.statusNote === "string") {
    return event.eventPayload.statusNote;
  }

  return "Событие зафиксировано в системе доставки.";
}

export function PublicTrackingPage({ token }: PublicTrackingPageProps) {
  const [tracking, setTracking] = useState<PublicTrackingView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let disposed = false;
    let controller: AbortController | null = null;

    const loadTracking = async (markLoading: boolean) => {
      controller?.abort();
      controller = new AbortController();

      if (markLoading) {
        setIsLoading(true);
      }

      try {
        const response = await fetchPublicTracking(token, {
          signal: controller.signal,
        });

        if (disposed) {
          return;
        }

        setTracking(response.tracking);
        setError(null);
        setIsLoading(false);
      } catch (nextError) {
        if (disposed || (nextError as Error).name === "AbortError") {
          return;
        }

        setTracking(null);
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Не удалось загрузить отслеживание.",
        );
        setIsLoading(false);
      }
    };

    void loadTracking(true);
    const pollId = window.setInterval(() => {
      void loadTracking(false);
    }, 7000);

    return () => {
      disposed = true;
      controller?.abort();
      window.clearInterval(pollId);
    };
  }, [token]);

  const destinationPoint = useMemo(
    () => projectPoint(tracking?.destination.lat ?? null, tracking?.destination.lng ?? null),
    [tracking],
  );
  const courierPoint = useMemo(
    () =>
      projectPoint(
        tracking?.liveLocation?.latitude ?? null,
        tracking?.liveLocation?.longitude ?? null,
      ),
    [tracking],
  );

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ minHeight: "100vh", padding: "var(--space-lg)" }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 720,
            padding: "var(--space-2xl)",
            borderRadius: "var(--radius-xl)",
            border: "1px solid var(--border)",
            backgroundColor: "rgba(15, 26, 34, 0.82)",
            textAlign: "center",
          }}
        >
          <span className="text-eyebrow block" style={{ marginBottom: "var(--space-xs)" }}>
            Передача заказа
          </span>
          <h1 className="text-h1" style={{ marginBottom: "var(--space-sm)" }}>
            Загружаем статус заказа
          </h1>
          <p className="text-muted">Пожалуйста, подождите пару секунд.</p>
        </div>
      </div>
    );
  }

  if (!tracking || error) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ minHeight: "100vh", padding: "var(--space-lg)" }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 760,
            padding: "var(--space-2xl)",
            borderRadius: "var(--radius-xl)",
            border: "1px solid var(--warning)",
            backgroundColor: "rgba(15, 26, 34, 0.82)",
          }}
        >
          <span className="text-eyebrow block" style={{ marginBottom: "var(--space-xs)" }}>
            Передача заказа
          </span>
          <h1 className="text-h1" style={{ color: "var(--warning)", marginBottom: "var(--space-sm)" }}>
            Ссылка недоступна
          </h1>
          <p className="text-muted" style={{ marginBottom: "var(--space-lg)", lineHeight: 1.8 }}>
            {error ?? "Ссылка устарела или заказ больше недоступен для отслеживания."}
          </p>
          <Link href="/" className="cta cta--primary">
            На главную
          </Link>
        </div>
      </div>
    );
  }

  const statusTone = getStatusTone(tracking.assignmentStatus);
  const routeAvailable =
    tracking.liveLocation &&
    tracking.destination.lat !== null &&
    tracking.destination.lng !== null;
  const timeline = tracking.timeline
    .slice()
    .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt))
    .filter((event) => event.eventType !== "courier_location_updated");
  const routeSummary =
    tracking.etaLabel ?? (tracking.assignmentStatus === "delivered" ? "Передача завершена" : "Время уточняем");
  const trackingSnapshotCards = [
    { label: "Маршрут", value: routeSummary },
    { label: "Курьер", value: getCourierDisplayLabel(tracking.courier.displayName) },
    {
      label: "Обновление",
      value: formatLocationAge(tracking.liveLocation?.receivedAt ?? null),
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        maxWidth: 1380,
        margin: "0 auto",
        padding: "88px var(--space-lg) var(--space-xl)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.12fr) minmax(320px, 0.88fr)",
          gap: "var(--space-sm)",
          marginBottom: "var(--space-lg)",
        }}
      >
        <section
          style={{
            padding: "calc(var(--space-xl) + 4px)",
            borderRadius: "var(--radius-xl)",
            border: "1px solid rgba(255,255,255,0.07)",
            background:
              "radial-gradient(circle at top left, rgba(99, 188, 197, 0.08) 0%, rgba(99, 188, 197, 0) 42%), linear-gradient(180deg, rgba(15, 26, 34, 0.92) 0%, rgba(10, 18, 24, 0.88) 100%)",
          }}
        >
          <span className="text-eyebrow block" style={{ marginBottom: "var(--space-xs)" }}>
            Передача заказа
          </span>
          <h1 className="text-h1" style={{ marginBottom: "var(--space-2xs)" }}>
            {getTrackingTitle(tracking.orderLabel)}
          </h1>
          {getTrackingReference(tracking.orderLabel) ? (
            <div
              className="text-muted"
              style={{ marginBottom: "var(--space-xs)", fontSize: 14, lineHeight: 1.7 }}
            >
              {getTrackingReference(tracking.orderLabel)}
            </div>
          ) : null}
          <p className="text-muted" style={{ maxWidth: 760, lineHeight: 1.82 }}>
            {getHeadlineCopy(tracking)}
          </p>
        </section>

        <aside
          style={{
            display: "grid",
            gap: "var(--space-xs)",
            alignContent: "start",
            padding: "calc(var(--space-lg) + 2px)",
            borderRadius: "var(--radius-xl)",
            border: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(12, 22, 28, 0.82)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "var(--space-sm)",
              paddingBottom: "var(--space-sm)",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              flexWrap: "wrap",
            }}
          >
            <span className="text-eyebrow">Сейчас</span>
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "var(--radius-full)",
                border: `1px solid ${statusTone}`,
                backgroundColor: "rgba(255,255,255,0.03)",
                color: statusTone,
                width: "fit-content",
              }}
            >
              {getStatusLabel(tracking.assignmentStatus)}
            </div>
          </div>

          <div style={{ display: "grid", gap: "var(--space-xs)" }}>
            {trackingSnapshotCards.map((card) => (
              <div
                key={card.label}
                style={{
                  padding: "14px 16px",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  backgroundColor: "rgba(255,255,255,0.025)",
                }}
              >
                <span className="text-eyebrow block" style={{ marginBottom: 6 }}>
                  {card.label}
                </span>
                <strong style={{ fontSize: 18, lineHeight: 1.2 }}>{card.value}</strong>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.42fr 0.98fr",
          gap: "var(--space-lg)",
        }}
      >
        <section
          style={{
            padding: "var(--space-lg)",
            borderRadius: "var(--radius-xl)",
            border: "1px solid var(--border)",
            background:
              "linear-gradient(180deg, rgba(99, 188, 197, 0.05) 0%, rgba(15, 26, 34, 0.88) 100%)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "var(--space-md)",
              marginBottom: "var(--space-lg)",
              flexWrap: "wrap",
            }}
          >
            <div style={{ maxWidth: 420 }}>
              <span className="text-eyebrow block" style={{ marginBottom: 6 }}>
                Маршрут
              </span>
              <strong style={{ fontSize: 28, lineHeight: 1.1 }}>{routeSummary}</strong>
              <div className="text-muted" style={{ marginTop: 10, lineHeight: 1.75 }}>
                Адрес уже закреплён. Если по времени или маршруту появится изменение, страница обновится сама.
              </div>
            </div>

            <div
              style={{
                minWidth: 240,
                display: "grid",
                gap: "var(--space-sm)",
              }}
            >
              <div
                style={{
                  padding: "var(--space-md)",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  backgroundColor: "rgba(255,255,255,0.03)",
                }}
              >
                <span className="text-eyebrow block" style={{ marginBottom: 6 }}>
                  Курьер
                </span>
                <strong style={{ fontSize: 18 }}>
                  {getCourierDisplayLabel(tracking.courier.displayName)}
                </strong>
                <div className="text-muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
                  {getVehicleLabel(tracking.courier.vehicleType)} •{" "}
                  {formatLocationAge(tracking.liveLocation?.receivedAt ?? null)}
                </div>
              </div>

              <div
                style={{
                  padding: "var(--space-md)",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  backgroundColor: "rgba(255,255,255,0.03)",
                }}
              >
                <span className="text-eyebrow block" style={{ marginBottom: 6 }}>
                  Точка вручения
                </span>
                <strong style={{ fontSize: 18 }}>{tracking.destination.label}</strong>
                <div className="text-muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
                  {getStatusSupportCopy(tracking)}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              position: "relative",
              overflow: "hidden",
            minHeight: 520,
              borderRadius: "var(--radius-xl)",
              border: "1px solid rgba(255,255,255,0.06)",
              backgroundColor: "rgba(8, 16, 20, 0.86)",
            }}
          >
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid slice"
              style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
            >
              {Array.from({ length: 10 }, (_, i) => (
                <line
                  key={`h${i}`}
                  x1={0}
                  y1={i * 10}
                  x2={100}
                  y2={i * 10}
                  stroke="var(--border)"
                  strokeWidth={0.2}
                />
              ))}
              {Array.from({ length: 10 }, (_, i) => (
                <line
                  key={`v${i}`}
                  x1={i * 10}
                  y1={0}
                  x2={i * 10}
                  y2={100}
                  stroke="var(--border)"
                  strokeWidth={0.2}
                />
              ))}

              {routeAvailable ? (
                <path
                  d={buildRoutePath(courierPoint, destinationPoint)}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={0.6}
                  strokeDasharray="2 1.3"
                />
              ) : null}

              <circle
                cx={destinationPoint.x}
                cy={destinationPoint.y}
                r={2.2}
                fill="var(--text-primary)"
                stroke="var(--accent)"
                strokeWidth={0.4}
              />
              <circle
                cx={destinationPoint.x}
                cy={destinationPoint.y}
                r={4.4}
                fill="none"
                stroke="rgba(99, 188, 197, 0.24)"
                strokeWidth={0.28}
              />

              {tracking.liveLocation ? (
                <motion.g
                  initial={{ scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.35 }}
                >
                  <circle cx={courierPoint.x} cy={courierPoint.y} r={2} fill={statusTone} />
                  <circle
                    cx={courierPoint.x}
                    cy={courierPoint.y}
                    r={4}
                    fill="none"
                    stroke={statusTone}
                    strokeWidth={0.28}
                    opacity={0.35}
                  />
                </motion.g>
              ) : null}
            </svg>

            <div
              style={{
                position: "relative",
                zIndex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: 520,
                padding: "var(--space-lg)",
              }}
            >
              <div
                style={{
                  maxWidth: 340,
                  padding: "var(--space-md)",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  backgroundColor: "rgba(15, 26, 34, 0.72)",
                  backdropFilter: "blur(14px)",
                }}
              >
                <span className="text-eyebrow block" style={{ marginBottom: 6 }}>
                  Точка вручения
                </span>
                <strong style={{ fontSize: 22 }}>{tracking.destination.label}</strong>
                <div className="text-muted" style={{ marginTop: 8, lineHeight: 1.7 }}>
                  Маршрут уже закреплён за этим адресом. Все изменения по заказу появляются здесь автоматически.
                </div>
              </div>

              <div
                style={{
                  maxWidth: 560,
                  padding: "var(--space-md)",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  backgroundColor: "rgba(15, 26, 34, 0.72)",
                  backdropFilter: "blur(14px)",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.15fr 1fr 1fr",
                    gap: "var(--space-md)",
                  }}
                >
                  <div>
                    <span className="text-eyebrow block" style={{ marginBottom: 6 }}>
                      Сейчас по маршруту
                    </span>
                    <strong style={{ fontSize: 18 }}>{getStatusLabel(tracking.assignmentStatus)}</strong>
                  </div>
                  <div>
                    <span className="text-eyebrow block" style={{ marginBottom: 6 }}>
                      Окно
                    </span>
                    <strong style={{ fontSize: 18 }}>{routeSummary}</strong>
                  </div>
                  <div>
                    <span className="text-eyebrow block" style={{ marginBottom: 6 }}>
                      Обновление
                    </span>
                    <strong style={{ fontSize: 18 }}>
                      {formatLocationAge(tracking.liveLocation?.receivedAt ?? null)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside style={{ display: "grid", gap: "var(--space-lg)" }}>
          <section
            style={{
              padding: "var(--space-lg)",
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--border)",
              backgroundColor: "rgba(15, 26, 34, 0.72)",
              backdropFilter: "blur(16px)",
            }}
          >
            <span className="text-eyebrow block" style={{ marginBottom: "var(--space-sm)" }}>
              По заказу
            </span>
            <div className="text-muted" style={{ display: "grid", gap: 10, lineHeight: 1.8 }}>
              <div>
                Статус: <strong style={{ color: statusTone }}>{getStatusLabel(tracking.assignmentStatus)}</strong>
              </div>
              <div>
                Курьер:{" "}
                <strong>
                  {getCourierDisplayLabel(tracking.courier.displayName)}
                </strong>
              </div>
              <div>
                Транспорт: <strong>{getVehicleLabel(tracking.courier.vehicleType)}</strong>
              </div>
              <div>
                На карте:{" "}
                <strong>
                  {tracking.liveLocation ? "видна на карте" : "появится после выезда"}
                </strong>
              </div>
            </div>
          </section>

          <section
            style={{
              padding: "var(--space-lg)",
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--border)",
              backgroundColor: "rgba(15, 26, 34, 0.72)",
              backdropFilter: "blur(16px)",
            }}
          >
            <span className="text-eyebrow block" style={{ marginBottom: "var(--space-sm)" }}>
              Что уже сделано
            </span>

            <div style={{ display: "grid", gap: "var(--space-sm)" }}>
              {timeline.map((event, index) => {
                const isLast = index === timeline.length - 1;

                return (
                  <div
                    key={event.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "24px 1fr",
                      gap: "var(--space-sm)",
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        display: "flex",
                        justifyContent: "center",
                        minHeight: 36,
                      }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          backgroundColor: isLast ? statusTone : "var(--accent)",
                          marginTop: 5,
                          zIndex: 1,
                        }}
                      />
                      {!isLast ? (
                        <span
                          style={{
                            position: "absolute",
                            top: 18,
                            bottom: -18,
                            width: 1,
                            backgroundColor: "rgba(255,255,255,0.08)",
                          }}
                        />
                      ) : null}
                    </div>

                    <div style={{ paddingBottom: isLast ? 0 : "var(--space-sm)" }}>
                      <div
                        className="flex items-center justify-between"
                        style={{ gap: "var(--space-sm)", marginBottom: 4 }}
                      >
                        <strong>{getEventLabel(event)}</strong>
                        <span className="text-muted" style={{ fontSize: 13 }}>
                          {formatEventTime(event.occurredAt)}
                        </span>
                      </div>
                      <div className="text-muted" style={{ fontSize: 14, lineHeight: 1.7 }}>
                        {getEventNote(event)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section
            style={{
              padding: "var(--space-lg)",
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--border)",
              backgroundColor: "rgba(15, 26, 34, 0.72)",
              backdropFilter: "blur(16px)",
            }}
          >
            <span className="text-eyebrow block" style={{ marginBottom: "var(--space-sm)" }}>
              Если нужно уточнить
            </span>
            <div className="text-muted" style={{ display: "grid", gap: 8, lineHeight: 1.8 }}>
              <div>Если что-то меняется по окну или вручению, команда быстро подскажет по заказу и времени.</div>
              <div>
                Эта ссылка работает только для этого заказа и обновляется автоматически, пока заказ в пути.
              </div>
            </div>
            <div
              className="flex"
              style={{ gap: "var(--space-sm)", marginTop: "var(--space-md)", flexWrap: "wrap" }}
            >
              <a href="tel:+79808880588" className="cta cta--ghost">
                Позвонить
              </a>
              <a
                href="https://t.me/The_raki"
                className="cta cta--ghost"
                rel="noreferrer"
                target="_blank"
              >
                Telegram
              </a>
              <Link href="/" className="cta cta--secondary">
                На главную
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
