"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type {
  Courier,
  CourierAssignmentActionRequest,
  DeliveryAssignment,
  DeliveryStatusEvent,
} from "@/lib/courier/types";
import {
  fetchCourierJobDetail,
  fetchCourierMe,
  performCourierAssignmentAction,
  writeCourierLocation,
} from "@/lib/courier/client";

type CourierJobDetailPageProps = {
  assignmentId: string;
};

function getStatusTone(status: DeliveryAssignment["status"]) {
  if (status === "delivered") return "var(--success)";
  if (status === "failed" || status === "cancelled") return "var(--error)";
  if (status === "arrived_near_customer" || status === "waiting_at_pickup") return "var(--warning)";
  return "var(--accent)";
}

function getStatusLabel(status: DeliveryAssignment["status"]) {
  switch (status) {
    case "assigned":
      return "Назначен";
    case "accepted":
      return "Принят";
    case "waiting_at_pickup":
      return "На точке";
    case "picked_up":
      return "У курьера";
    case "arrived_near_customer":
      return "У клиента";
    case "delivered":
      return "Доставлен";
    case "failed":
      return "Проблема";
    case "cancelled":
      return "Отменен";
    default:
      return status;
  }
}

function getEventLabel(event: DeliveryStatusEvent) {
  switch (event.eventType) {
    case "courier_assigned":
      return "Курьер закреплен";
    case "assignment_created":
      return "Назначение создано";
    case "assignment_accepted":
      return "Курьер принял заказ";
    case "courier_arrived_pickup":
      return "Курьер прибыл на точку";
    case "order_picked_up":
      return "Заказ у курьера";
    case "courier_arrived_dropoff":
      return "Курьер у клиента";
    case "order_delivered":
      return "Заказ доставлен";
    case "delivery_failed":
      return "Доставка с проблемой";
    case "courier_location_updated":
      return "Позиция обновлена";
    default:
      return event.eventType;
  }
}

function formatEventTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getAvailableActions(status: DeliveryAssignment["status"]) {
  switch (status) {
    case "assigned":
      return [{ id: "accept", label: "Принять заказ" }] as const;
    case "accepted":
      return [
        { id: "arrive-pickup", label: "Прибыл на точку" },
        { id: "picked-up", label: "Забрал заказ" },
      ] as const;
    case "waiting_at_pickup":
      return [{ id: "picked-up", label: "Забрал заказ" }] as const;
    case "picked_up":
      return [{ id: "arrive-dropoff", label: "Прибыл к клиенту" }] as const;
    case "arrived_near_customer":
      return [
        { id: "delivered", label: "Доставлено" },
        { id: "fail", label: "Проблема" },
      ] as const;
    default:
      return [] as const;
  }
}

export function CourierJobDetailPage({ assignmentId }: CourierJobDetailPageProps) {
  const router = useRouter();
  const [courier, setCourier] = useState<Courier | null>(null);
  const [assignment, setAssignment] = useState<DeliveryAssignment | null>(null);
  const [timeline, setTimeline] = useState<DeliveryStatusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  async function loadDetail(markLoading: boolean) {
    if (markLoading) {
      setLoading(true);
    }

    try {
      const [me, detail] = await Promise.all([
        fetchCourierMe(),
        fetchCourierJobDetail(assignmentId),
      ]);

      if (!me.courier) {
        router.replace(`/courier/login?next=/courier/jobs/${assignmentId}`);
        return;
      }

      setCourier(me.courier);
      setAssignment(detail.assignment);
      setTimeline(detail.timeline);
      setError(null);
      setLoading(false);
    } catch (nextError) {
      const message =
        nextError instanceof Error
          ? nextError.message
          : "Не удалось загрузить карточку задания.";

      if (
        message.toLowerCase().includes("authentication") ||
        message.toLowerCase().includes("required")
      ) {
        router.replace(`/courier/login?next=/courier/jobs/${assignmentId}`);
        return;
      }

      setError(message);
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDetail(true);
    const pollId = window.setInterval(() => {
      void loadDetail(false);
    }, 7000);

    return () => {
      window.clearInterval(pollId);
    };
  }, [assignmentId]);

  const availableActions = useMemo(
    () => (assignment ? getAvailableActions(assignment.status) : []),
    [assignment],
  );

  async function handleAction(
    action:
      | "accept"
      | "arrive-pickup"
      | "picked-up"
      | "arrive-dropoff"
      | "delivered"
      | "fail",
  ) {
    if (!assignment) {
      return;
    }

    setActionLoading(action);

    try {
      const input: CourierAssignmentActionRequest =
        action === "fail"
          ? { failureReason: "Курьер отметил проблему в web shell." }
          : {};

      const response = await performCourierAssignmentAction(assignment.id, action, input);
      setAssignment(response.assignment);
      await loadDetail(false);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Не удалось применить action.",
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSendLocation() {
    if (!assignment) {
      return;
    }

    setLocationMessage("Пробуем получить геопозицию браузера...");

    if (!navigator.geolocation) {
      setLocationMessage("Браузер не поддерживает геопозицию.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await writeCourierLocation({
            assignmentId: assignment.id,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMeters: position.coords.accuracy,
            speedMps:
              typeof position.coords.speed === "number" ? position.coords.speed : null,
            headingDegrees:
              typeof position.coords.heading === "number"
                ? position.coords.heading
                : null,
          });

          setLocationMessage("Позиция отправлена в tracking backend.");
        } catch (nextError) {
          setLocationMessage(
            nextError instanceof Error
              ? nextError.message
              : "Не удалось отправить позицию.",
          );
        }
      },
      (geoError) => {
        setLocationMessage(`Геопозиция недоступна: ${geoError.message}`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      },
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        maxWidth: 1200,
        margin: "0 auto",
        padding: "88px var(--space-lg) var(--space-xl)",
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{ gap: "var(--space-lg)", marginBottom: "var(--space-lg)" }}
      >
        <div>
          <span className="text-eyebrow block" style={{ marginBottom: "var(--space-xs)" }}>
            Courier Job
          </span>
          <h1 className="text-h1" style={{ marginBottom: "var(--space-xs)" }}>
            {assignment?.orderLabel ?? "Карточка задания"}
          </h1>
          <p className="text-muted" style={{ lineHeight: 1.75 }}>
            {courier ? `${courier.displayName} • ${courier.vehicleType}` : "Проверяем сессию"}
          </p>
        </div>

        <Link href="/courier/jobs" className="cta cta--ghost">
          Назад к заданиям
        </Link>
      </div>

      {loading ? (
        <div
          style={{
            padding: "var(--space-xl)",
            borderRadius: "var(--radius-xl)",
            border: "1px solid var(--border)",
            backgroundColor: "rgba(15, 26, 34, 0.76)",
          }}
        >
          Загружаем карточку задания...
        </div>
      ) : null}

      {!loading && error ? (
        <div
          style={{
            marginBottom: "var(--space-lg)",
            padding: "var(--space-lg)",
            borderRadius: "var(--radius-xl)",
            border: "1px solid var(--warning)",
            backgroundColor: "rgba(199, 105, 74, 0.08)",
            color: "var(--warning)",
          }}
        >
          {error}
        </div>
      ) : null}

      {!loading && assignment ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.15fr 0.9fr",
            gap: "var(--space-lg)",
          }}
        >
          <div
            style={{
              padding: "var(--space-lg)",
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--border)",
              background:
                "linear-gradient(180deg, rgba(99, 188, 197, 0.05) 0%, rgba(15, 26, 34, 0.82) 100%)",
            }}
          >
            <div
              className="flex items-start justify-between"
              style={{ gap: "var(--space-sm)", marginBottom: "var(--space-md)" }}
            >
              <div>
                <strong style={{ display: "block", fontSize: 26, marginBottom: 4 }}>
                  {assignment.orderLabel}
                </strong>
                <div className="text-muted" style={{ lineHeight: 1.75 }}>
                  <div>{assignment.dropoffAddressLabel}</div>
                  <div>Кухня: {assignment.kitchenLabel ?? "Не указана"}</div>
                  <div>Клиент: {assignment.customerLabel ?? "Без имени"}</div>
                </div>
              </div>

              <span
                style={{
                  padding: "6px 10px",
                  borderRadius: "var(--radius-full)",
                  border: `1px solid ${getStatusTone(assignment.status)}`,
                  color: getStatusTone(assignment.status),
                  whiteSpace: "nowrap",
                }}
              >
                {getStatusLabel(assignment.status)}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "var(--space-sm)",
                marginBottom: "var(--space-lg)",
              }}
            >
              <div
                style={{
                  padding: "var(--space-md)",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  backgroundColor: "rgba(255,255,255,0.02)",
                }}
              >
                <span className="text-eyebrow block" style={{ marginBottom: 6 }}>
                  Статус note
                </span>
                <div className="text-muted" style={{ lineHeight: 1.75 }}>
                  {assignment.statusNote}
                </div>
              </div>

              <div
                style={{
                  padding: "var(--space-md)",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  backgroundColor: "rgba(255,255,255,0.02)",
                }}
              >
                <span className="text-eyebrow block" style={{ marginBottom: 6 }}>
                  Геопозиция
                </span>
                <div className="text-muted" style={{ lineHeight: 1.75 }}>
                  Отсюда можно отправить текущую позицию в tracking backend.
                </div>
              </div>
            </div>

            <div
              className="flex"
              style={{ gap: "var(--space-xs)", flexWrap: "wrap", marginBottom: "var(--space-md)" }}
            >
              {availableActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="cta cta--primary"
                  disabled={actionLoading !== null}
                  onClick={() => handleAction(action.id)}
                >
                  {actionLoading === action.id ? "Сохраняем..." : action.label}
                </button>
              ))}

              <button
                type="button"
                className="cta cta--secondary"
                onClick={handleSendLocation}
              >
                Отправить мою позицию
              </button>
            </div>

            {locationMessage ? (
              <div className="text-muted" style={{ lineHeight: 1.75 }}>
                {locationMessage}
              </div>
            ) : null}
          </div>

          <div
            style={{
              padding: "var(--space-lg)",
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--border)",
              backgroundColor: "rgba(15, 26, 34, 0.76)",
            }}
          >
            <span className="text-eyebrow block" style={{ marginBottom: "var(--space-sm)" }}>
              Timeline
            </span>

            <div style={{ display: "grid", gap: "var(--space-sm)" }}>
              {timeline
                .slice()
                .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt))
                .map((event, index, source) => (
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
                        minHeight: 38,
                      }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          backgroundColor:
                            index === source.length - 1 ? getStatusTone(assignment.status) : "var(--accent)",
                          marginTop: 5,
                          zIndex: 1,
                        }}
                      />
                      {index !== source.length - 1 ? (
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

                    <div>
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
                        {"statusNote" in event.eventPayload &&
                        typeof event.eventPayload.statusNote === "string"
                          ? event.eventPayload.statusNote
                          : "Событие записано в courier backend."}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
