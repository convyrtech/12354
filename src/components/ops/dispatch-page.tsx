"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  AdminDispatchOverviewResponse,
  AssignmentTrackResponse,
  DeliveryAssignment,
  Courier,
  CourierLocationSnapshot,
  PublicTrackingTokenRecord,
} from "@/lib/courier/types";
import {
  assignCourierToAssignment,
  fetchAdminDispatchOverview,
  fetchAssignmentTrack,
  issueAssignmentTrackingToken,
} from "@/lib/courier/client";

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
    x: Math.min(Math.max(8 + xRatio * 84, 8), 92),
    y: Math.min(Math.max(92 - yRatio * 76, 10), 92),
  };
}

function buildRoutePath(start: { x: number; y: number }, end: { x: number; y: number }) {
  const cx = (start.x + end.x) / 2;
  const cy = Math.min(start.y, end.y) - 10;
  return `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`;
}

function getAssignmentStatusTone(status: DeliveryAssignment["status"]) {
  if (status === "pending_assignment") return "var(--warning)";
  if (status === "delivered") return "var(--success)";
  if (status === "failed" || status === "cancelled") return "var(--error)";
  if (status === "arrived_near_customer" || status === "waiting_at_pickup") return "var(--warning)";
  return "var(--accent)";
}

function getCourierStatusTone(status: Courier["status"]) {
  if (status === "available") return "var(--success)";
  if (status === "busy") return "var(--accent)";
  if (status === "paused") return "var(--warning)";
  return "var(--text-dim)";
}

function getStatusLabel(status: DeliveryAssignment["status"]) {
  switch (status) {
    case "pending_assignment":
      return "Ждет курьера";
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

function getCourierStatusLabel(status: Courier["status"]) {
  switch (status) {
    case "available":
      return "Свободен";
    case "busy":
      return "В рейсе";
    case "paused":
      return "Пауза";
    case "offline":
      return "Оффлайн";
    default:
      return status;
  }
}

function formatLocationAge(value: string | null) {
  if (!value) {
    return "Нет позиции";
  }

  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) {
    return "только что";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} мин назад`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  return `${diffHours} ч назад`;
}

function getPublicTrackingUrl(token: string | null) {
  if (!token || typeof window === "undefined") {
    return null;
  }

  return `${window.location.origin}/track/${token}`;
}

export function DispatchPage() {
  const [overview, setOverview] = useState<AdminDispatchOverviewResponse | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [isOverviewLoading, setIsOverviewLoading] = useState(true);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [assignmentTrack, setAssignmentTrack] = useState<AssignmentTrackResponse | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [trackingToken, setTrackingToken] = useState<PublicTrackingTokenRecord | null>(null);
  const [isIssuingToken, setIsIssuingToken] = useState(false);
  const [assignCourierId, setAssignCourierId] = useState("");
  const [isAssigningCourier, setIsAssigningCourier] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const pollRef = useRef<number | null>(null);

  const assignments = overview?.assignments ?? [];
  const couriers = overview?.couriers ?? [];
  const latestLocations = overview?.latestLocations ?? [];
  const assignableCouriers = useMemo(
    () => couriers.filter((courier) => courier.isActive),
    [couriers],
  );

  const selectedAssignment =
    assignments.find((assignment) => assignment.id === selectedAssignmentId) ??
    assignments[0] ??
    null;

  const selectedCourier =
    selectedAssignment?.courierId
      ? couriers.find((courier) => courier.id === selectedAssignment.courierId) ?? null
      : null;

  const selectedCourierLocation =
    selectedAssignment?.courierId
      ? latestLocations.find((location) => location.courierId === selectedAssignment.courierId) ??
        null
      : null;
  const canAssignSelectedAssignment =
    selectedAssignment !== null &&
    (selectedAssignment.status === "pending_assignment" ||
      (selectedAssignment.status === "assigned" && selectedAssignment.acceptedAt === null));

  useEffect(() => {
    let disposed = false;
    let controller: AbortController | null = null;

    const loadOverview = async (markLoading: boolean) => {
      controller?.abort();
      controller = new AbortController();

      if (markLoading) {
        setIsOverviewLoading(true);
      }

      try {
        const response = await fetchAdminDispatchOverview({ signal: controller.signal });

        if (disposed) {
          return;
        }

        startTransition(() => {
          setOverview(response);
          setOverviewError(null);
          setIsOverviewLoading(false);

          if (!selectedAssignmentId && response.assignments[0]) {
            setSelectedAssignmentId(response.assignments[0].id);
          }

          if (
            selectedAssignmentId &&
            !response.assignments.some(
              (assignment) => assignment.id === selectedAssignmentId,
            )
          ) {
            setSelectedAssignmentId(response.assignments[0]?.id ?? null);
          }
        });
      } catch (error) {
        if (disposed) {
          return;
        }

        if ((error as Error).name === "AbortError") {
          return;
        }

        setOverviewError(
          error instanceof Error
            ? error.message
            : "Не удалось загрузить overview диспетчерки.",
        );
        setIsOverviewLoading(false);
      }
    };

    void loadOverview(true);

    pollRef.current = window.setInterval(() => {
      void loadOverview(false);
    }, 8000);

    return () => {
      disposed = true;
      controller?.abort();
      if (pollRef.current !== null) {
        window.clearInterval(pollRef.current);
      }
    };
  }, [selectedAssignmentId]);

  useEffect(() => {
    if (!selectedAssignment) {
      setAssignmentTrack(null);
      setTrackError(null);
      setTrackingToken(null);
      return;
    }

    let disposed = false;
    const controller = new AbortController();

    const loadTrack = async () => {
      try {
        const response = await fetchAssignmentTrack(selectedAssignment.id, {
          signal: controller.signal,
        });

        if (disposed) {
          return;
        }

        setAssignmentTrack(response);
        setTrackError(null);
        setTrackingToken(
          response.session?.publicTrackingToken
            ? {
                token: response.session.publicTrackingToken,
                assignmentId: response.assignmentId,
                orderId: selectedAssignment.orderId,
                createdAt: response.session.startedAt,
                expiresAt:
                  response.session.publicTrackingExpiresAt ?? response.session.startedAt,
                revokedAt: null,
              }
            : null,
        );
      } catch (error) {
        if (disposed || (error as Error).name === "AbortError") {
          return;
        }

        setTrackError(
          error instanceof Error
            ? error.message
            : "Не удалось получить трек назначения.",
        );
        setAssignmentTrack(null);
      }
    };

    void loadTrack();

    return () => {
      disposed = true;
      controller.abort();
    };
  }, [selectedAssignment]);

  useEffect(() => {
    if (!selectedAssignment) {
      setAssignCourierId("");
      setAssignError(null);
      return;
    }

    if (selectedAssignment.courierId) {
      setAssignCourierId(selectedAssignment.courierId);
      setAssignError(null);
      return;
    }

    setAssignCourierId(assignableCouriers[0]?.id ?? "");
    setAssignError(null);
  }, [assignableCouriers, selectedAssignment]);

  const mapLines = useMemo(() => {
    return assignments
      .map((assignment) => {
        if (!assignment.courierId) {
          return null;
        }

        const courierLocation = latestLocations.find(
          (location) => location.courierId === assignment.courierId,
        );

        if (!courierLocation || assignment.dropoffLat === null || assignment.dropoffLng === null) {
          return null;
        }

        return {
          assignmentId: assignment.id,
          courierPoint: projectPoint(courierLocation.latitude, courierLocation.longitude),
          dropoffPoint: projectPoint(assignment.dropoffLat, assignment.dropoffLng),
          tone: getAssignmentStatusTone(assignment.status),
        };
      })
      .filter(Boolean) as {
      assignmentId: string;
      courierPoint: { x: number; y: number };
      dropoffPoint: { x: number; y: number };
      tone: string;
    }[];
  }, [assignments, latestLocations]);

  const selectedTrackPoints = useMemo(() => {
    return (assignmentTrack?.recentLocations ?? [])
      .slice()
      .reverse()
      .map((ping) => projectPoint(ping.latitude, ping.longitude));
  }, [assignmentTrack]);

  const selectedTrackingUrl = getPublicTrackingUrl(trackingToken?.token ?? null);

  async function handleIssueTrackingToken() {
    if (!selectedAssignment) {
      return;
    }

    setIsIssuingToken(true);

    try {
      const response = await issueAssignmentTrackingToken(selectedAssignment.id);
      setTrackingToken(response.tokenRecord);
      setCopyState("idle");
    } catch {
      setCopyState("error");
    } finally {
      setIsIssuingToken(false);
    }
  }

  async function handleAssignCourier() {
    if (!selectedAssignment || !assignCourierId) {
      return;
    }

    setIsAssigningCourier(true);
    setAssignError(null);

    try {
      await assignCourierToAssignment(selectedAssignment.id, {
        courierId: assignCourierId,
      });

      const nextOverview = await fetchAdminDispatchOverview();
      setOverview(nextOverview);
      setCopyState("idle");
    } catch (error) {
      setAssignError(
        error instanceof Error
          ? error.message
          : "Не удалось назначить курьера.",
      );
    } finally {
      setIsAssigningCourier(false);
    }
  }

  async function handleCopyTrackingLink() {
    if (!selectedTrackingUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(selectedTrackingUrl);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        maxWidth: 1480,
        margin: "0 auto",
        padding: "88px var(--space-lg) var(--space-xl)",
      }}
    >
      <div
        className="flex"
        style={{
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "var(--space-lg)",
          marginBottom: "var(--space-lg)",
        }}
      >
        <div>
          <span className="text-eyebrow block" style={{ marginBottom: "var(--space-xs)" }}>
            Ops Dispatch
          </span>
          <h1 className="text-h1" style={{ marginBottom: "var(--space-xs)" }}>
            Живая диспетчерка курьеров
          </h1>
          <p className="text-muted" style={{ maxWidth: 760, lineHeight: 1.75 }}>
            Эта страница уже читает реальный courier backend: активные назначения, статус
            курьеров, последние координаты и tracking token для клиентской ссылки.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gap: "var(--space-xs)",
            minWidth: 220,
          }}
        >
          <button
            type="button"
            className="cta cta--secondary"
            onClick={() => window.location.reload()}
          >
            Обновить сейчас
          </button>
          <div className="text-muted" style={{ fontSize: 13, textAlign: "right" }}>
            {isOverviewLoading ? "Загружаем overview..." : "Auto-refresh каждые 8 секунд"}
          </div>
        </div>
      </div>

      {overviewError ? (
        <div
          style={{
            marginBottom: "var(--space-lg)",
            padding: "var(--space-md)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--warning)",
            backgroundColor: "rgba(199, 105, 74, 0.08)",
            color: "var(--warning)",
          }}
        >
          {overviewError}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 0.95fr",
          gap: "var(--space-lg)",
        }}
      >
        <div
          style={{
            padding: "var(--space-lg)",
            borderRadius: "var(--radius-xl)",
            border: "1px solid var(--border)",
            background:
              "linear-gradient(180deg, rgba(99, 188, 197, 0.06) 0%, rgba(15, 26, 34, 0.88) 100%)",
            minHeight: 760,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: "var(--space-sm)",
              marginBottom: "var(--space-lg)",
            }}
          >
            {[
              { label: "Курьеры", value: couriers.length.toString() },
              { label: "Активные", value: assignments.length.toString() },
              {
                label: "С координатами",
                value: latestLocations.length.toString(),
              },
              {
                label: "Выбранный трек",
                value: assignmentTrack?.recentLocations.length
                  ? `${assignmentTrack.recentLocations.length} ping`
                  : "нет",
              },
            ].map((card) => (
              <div
                key={card.label}
                style={{
                  padding: "var(--space-md)",
                  borderRadius: "var(--radius-lg)",
                  backgroundColor: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <span className="text-eyebrow block" style={{ marginBottom: 6 }}>
                  {card.label}
                </span>
                <strong style={{ fontSize: 24 }}>{card.value}</strong>
              </div>
            ))}
          </div>

          <div
            style={{
              position: "relative",
              borderRadius: "var(--radius-xl)",
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.06)",
              backgroundColor: "rgba(8, 16, 20, 0.86)",
              minHeight: 560,
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

              {mapLines.map((line) => (
                <path
                  key={line.assignmentId}
                  d={buildRoutePath(line.courierPoint, line.dropoffPoint)}
                  fill="none"
                  stroke={line.tone}
                  strokeWidth={line.assignmentId === selectedAssignment?.id ? 0.65 : 0.35}
                  strokeDasharray={line.assignmentId === selectedAssignment?.id ? "2 1.2" : "1.4 1.6"}
                  opacity={line.assignmentId === selectedAssignment?.id ? 1 : 0.45}
                />
              ))}

              {selectedTrackPoints.length > 1 ? (
                <polyline
                  points={selectedTrackPoints.map((point) => `${point.x},${point.y}`).join(" ")}
                  fill="none"
                  stroke="rgba(245, 242, 236, 0.65)"
                  strokeWidth={0.32}
                />
              ) : null}

              {assignments.map((assignment) => {
                if (assignment.dropoffLat === null || assignment.dropoffLng === null) {
                  return null;
                }

                const point = projectPoint(assignment.dropoffLat, assignment.dropoffLng);
                const active = assignment.id === selectedAssignment?.id;
                const tone = getAssignmentStatusTone(assignment.status);

                return (
                  <g key={assignment.id}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={active ? 2.3 : 1.6}
                      fill="var(--text-primary)"
                      stroke={tone}
                      strokeWidth={0.45}
                    />
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={active ? 4.4 : 3.2}
                      fill="none"
                      stroke={tone}
                      strokeWidth={0.24}
                      opacity={active ? 0.45 : 0.22}
                    />
                  </g>
                );
              })}

              {latestLocations.map((location) => {
                const point = projectPoint(location.latitude, location.longitude);
                const courier =
                  couriers.find((item) => item.id === location.courierId) ?? null;
                const active = courier?.id === selectedCourier?.id;

                return (
                  <g key={location.courierId}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={active ? 1.9 : 1.45}
                      fill={getCourierStatusTone(courier?.status ?? "offline")}
                    />
                    <text
                      x={point.x}
                      y={point.y - 2.7}
                      textAnchor="middle"
                      fill={active ? "var(--text-primary)" : "var(--text-muted)"}
                      fontSize={1.7}
                      fontFamily="var(--font-sans), sans-serif"
                    >
                      {courier?.displayName?.slice(0, 2) ?? "??"}
                    </text>
                  </g>
                );
              })}
            </svg>

            <div
              style={{
                position: "relative",
                zIndex: 1,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "var(--space-sm)",
                padding: "var(--space-lg)",
              }}
            >
              <div
                style={{
                  maxWidth: 320,
                  padding: "var(--space-md)",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  backgroundColor: "rgba(15, 26, 34, 0.72)",
                  backdropFilter: "blur(14px)",
                }}
              >
                <span className="text-eyebrow block" style={{ marginBottom: 6 }}>
                  Selected Run
                </span>
                <strong style={{ fontSize: 22 }}>
                  {selectedAssignment?.orderLabel ?? "Выберите assignment"}
                </strong>
                <div className="text-muted" style={{ marginTop: 8, lineHeight: 1.7 }}>
                  <div>{selectedAssignment?.dropoffAddressLabel ?? "Нет адреса"}</div>
                  <div>
                    {selectedCourier
                      ? `${selectedCourier.displayName} • ${getCourierStatusLabel(selectedCourier.status)}`
                      : "Курьер не выбран"}
                  </div>
                  <div>
                    Последняя позиция:{" "}
                    {formatLocationAge(selectedCourierLocation?.receivedAt ?? null)}
                  </div>
                </div>
              </div>

              <div
                style={{
                  maxWidth: 280,
                  padding: "var(--space-md)",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  backgroundColor: "rgba(15, 26, 34, 0.72)",
                  backdropFilter: "blur(14px)",
                }}
              >
                <span className="text-eyebrow block" style={{ marginBottom: 6 }}>
                  Client Link
                </span>
                {selectedTrackingUrl ? (
                  <div className="text-muted" style={{ lineHeight: 1.7 }}>
                    <div style={{ wordBreak: "break-all", fontSize: 13 }}>{selectedTrackingUrl}</div>
                  </div>
                ) : (
                  <div className="text-muted" style={{ lineHeight: 1.7 }}>
                    Tracking token еще не выпущен для этого заказа.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: "var(--space-lg)",
          }}
        >
          <div
            style={{
              padding: "var(--space-lg)",
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--border)",
              backgroundColor: "rgba(15, 26, 34, 0.72)",
              backdropFilter: "blur(16px)",
            }}
          >
            <div
              className="flex items-center justify-between"
              style={{ gap: "var(--space-sm)", marginBottom: "var(--space-md)" }}
            >
              <div>
                <span className="text-eyebrow block" style={{ marginBottom: 4 }}>
                  Assignment Detail
                </span>
                <strong style={{ fontSize: 24 }}>
                  {selectedAssignment?.orderLabel ?? "Нет активного задания"}
                </strong>
              </div>

              {selectedAssignment ? (
                <span
                  style={{
                    padding: "6px 10px",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: "rgba(255,255,255,0.04)",
                    border: `1px solid ${getAssignmentStatusTone(selectedAssignment.status)}`,
                    color: getAssignmentStatusTone(selectedAssignment.status),
                    fontSize: 13,
                    whiteSpace: "nowrap",
                  }}
                >
                  {getStatusLabel(selectedAssignment.status)}
                </span>
              ) : null}
            </div>

            {selectedAssignment ? (
              <>
                <div className="text-muted" style={{ lineHeight: 1.8, display: "grid", gap: 4 }}>
                  <div>Адрес: {selectedAssignment.dropoffAddressLabel}</div>
                  <div>Кухня: {selectedAssignment.kitchenLabel ?? "Не указана"}</div>
                  <div>Клиент: {selectedAssignment.customerLabel ?? "Без имени"}</div>
                  <div>Статус note: {selectedAssignment.statusNote}</div>
                  <div>
                    Последний ping:{" "}
                    {formatLocationAge(selectedCourierLocation?.receivedAt ?? null)}
                  </div>
                </div>

                {canAssignSelectedAssignment ? (
                  <div
                    style={{
                      marginTop: "var(--space-md)",
                      display: "grid",
                      gap: "var(--space-sm)",
                    }}
                  >
                    <span className="text-eyebrow block">Dispatch Assignment</span>
                    <div
                      className="flex"
                      style={{ gap: "var(--space-xs)", flexWrap: "wrap", alignItems: "center" }}
                    >
                      <select
                        value={assignCourierId}
                        onChange={(event) => setAssignCourierId(event.target.value)}
                        disabled={isAssigningCourier || assignableCouriers.length === 0}
                        style={{
                          minWidth: 220,
                          padding: "12px 14px",
                          borderRadius: "var(--radius-lg)",
                          border: "1px solid var(--border)",
                          backgroundColor: "rgba(255,255,255,0.03)",
                          color: "var(--text-primary)",
                        }}
                      >
                        {assignableCouriers.length === 0 ? (
                          <option value="">Нет курьеров</option>
                        ) : null}
                        {assignableCouriers.map((courier) => (
                          <option key={courier.id} value={courier.id}>
                            {courier.displayName} • {getCourierStatusLabel(courier.status)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="cta cta--secondary"
                        onClick={handleAssignCourier}
                        disabled={!assignCourierId || isAssigningCourier}
                      >
                        {isAssigningCourier ? "Назначаем..." : "Назначить курьера"}
                      </button>
                    </div>
                    {assignError ? (
                      <div className="text-muted" style={{ color: "var(--warning)", fontSize: 14 }}>
                        {assignError}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div
                  className="flex"
                  style={{
                    gap: "var(--space-xs)",
                    flexWrap: "wrap",
                    marginTop: "var(--space-md)",
                  }}
                >
                  <button
                    type="button"
                    className="cta cta--secondary"
                    onClick={handleIssueTrackingToken}
                    disabled={isIssuingToken}
                  >
                    {isIssuingToken ? "Выпускаем..." : "Выдать tracking link"}
                  </button>
                  <button
                    type="button"
                    className="cta cta--ghost"
                    onClick={handleCopyTrackingLink}
                    disabled={!selectedTrackingUrl}
                  >
                    {copyState === "copied"
                      ? "Скопировано"
                      : copyState === "error"
                        ? "Ошибка копирования"
                        : "Скопировать ссылку"}
                  </button>
                </div>

                {trackError ? (
                  <div
                    style={{
                      marginTop: "var(--space-md)",
                      padding: "var(--space-sm)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--warning)",
                      backgroundColor: "rgba(199, 105, 74, 0.08)",
                      color: "var(--warning)",
                      fontSize: 14,
                    }}
                  >
                    {trackError}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="text-muted">Сейчас нет активных назначений.</div>
            )}
          </div>

          <div
            style={{
              padding: "var(--space-lg)",
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--border)",
              backgroundColor: "rgba(15, 26, 34, 0.72)",
              backdropFilter: "blur(16px)",
            }}
          >
            <span className="text-eyebrow block" style={{ marginBottom: "var(--space-sm)" }}>
              Active Deliveries
            </span>

            <div style={{ display: "grid", gap: "var(--space-sm)", maxHeight: 320, overflow: "auto" }}>
              <AnimatePresence initial={false}>
                {assignments.map((assignment) => {
                  const active = assignment.id === selectedAssignment?.id;
                  const courier =
                    couriers.find((item) => item.id === assignment.courierId) ?? null;

                  return (
                    <motion.button
                      key={assignment.id}
                      layout
                      type="button"
                      onClick={() => {
                        setSelectedAssignmentId(assignment.id);
                        setCopyState("idle");
                      }}
                      style={{
                        textAlign: "left",
                        padding: "var(--space-md)",
                        borderRadius: "var(--radius-lg)",
                        border: `1px solid ${
                          active ? getAssignmentStatusTone(assignment.status) : "var(--border)"
                        }`,
                        backgroundColor: active
                          ? "rgba(99, 188, 197, 0.08)"
                          : "rgba(255,255,255,0.02)",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        className="flex items-center justify-between"
                        style={{ gap: "var(--space-sm)", marginBottom: 6 }}
                      >
                        <strong>{assignment.orderLabel}</strong>
                        <span
                          style={{
                            color: getAssignmentStatusTone(assignment.status),
                            fontSize: 13,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {getStatusLabel(assignment.status)}
                        </span>
                      </div>
                      <div className="text-muted" style={{ fontSize: 14, lineHeight: 1.65 }}>
                        <div>{assignment.dropoffAddressLabel}</div>
                        <div>
                          {courier?.displayName ?? "Без курьера"} •{" "}
                          {courier ? getCourierStatusLabel(courier.status) : "нет статуса"}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          <div
            style={{
              padding: "var(--space-lg)",
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--border)",
              backgroundColor: "rgba(15, 26, 34, 0.72)",
              backdropFilter: "blur(16px)",
            }}
          >
            <span className="text-eyebrow block" style={{ marginBottom: "var(--space-sm)" }}>
              Couriers
            </span>

            <div style={{ display: "grid", gap: "var(--space-sm)" }}>
              {couriers.map((courier) => {
                const location =
                  latestLocations.find((item) => item.courierId === courier.id) ?? null;

                return (
                  <div
                    key={courier.id}
                    style={{
                      padding: "var(--space-md)",
                      borderRadius: "var(--radius-lg)",
                      backgroundColor: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div
                      className="flex items-center justify-between"
                      style={{ gap: "var(--space-sm)", marginBottom: 6 }}
                    >
                      <strong>{courier.displayName}</strong>
                      <span
                        style={{
                          color: getCourierStatusTone(courier.status),
                          fontSize: 13,
                        }}
                      >
                        {getCourierStatusLabel(courier.status)}
                      </span>
                    </div>
                    <div className="text-muted" style={{ fontSize: 14, lineHeight: 1.65 }}>
                      <div>{courier.vehicleType}</div>
                      <div>{location ? formatLocationAge(location.receivedAt) : "Нет координат"}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
