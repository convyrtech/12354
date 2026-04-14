"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Courier, DeliveryAssignment } from "@/lib/courier/types";
import {
  fetchCourierActiveJobs,
  fetchCourierMe,
  logoutCourier,
} from "@/lib/courier/client";

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

export function CourierJobsPage() {
  const router = useRouter();
  const [courier, setCourier] = useState<Courier | null>(null);
  const [jobs, setJobs] = useState<DeliveryAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let controller: AbortController | null = null;

    const load = async (markLoading: boolean) => {
      controller?.abort();
      controller = new AbortController();

      if (markLoading) {
        setLoading(true);
      }

      try {
        const [me, activeJobs] = await Promise.all([
          fetchCourierMe({ signal: controller.signal }),
          fetchCourierActiveJobs({ signal: controller.signal }),
        ]);

        if (disposed) {
          return;
        }

        if (!me.courier) {
          router.replace("/courier/login?next=/courier/jobs");
          return;
        }

        setCourier(me.courier);
        setJobs(activeJobs.items);
        setError(null);
        setLoading(false);
      } catch (nextError) {
        if (disposed || (nextError as Error).name === "AbortError") {
          return;
        }

        const message =
          nextError instanceof Error
            ? nextError.message
            : "Не удалось загрузить задания курьера.";

        if (
          message.toLowerCase().includes("authentication") ||
          message.toLowerCase().includes("required")
        ) {
          router.replace("/courier/login?next=/courier/jobs");
          return;
        }

        setError(message);
        setLoading(false);
      }
    };

    void load(true);
    const pollId = window.setInterval(() => {
      void load(false);
    }, 7000);

    return () => {
      disposed = true;
      controller?.abort();
      window.clearInterval(pollId);
    };
  }, [router]);

  async function handleLogout() {
    await logoutCourier();
    router.replace("/courier/login");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        maxWidth: 1160,
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
            Courier Shell
          </span>
          <h1 className="text-h1" style={{ marginBottom: "var(--space-xs)" }}>
            Активные задания
          </h1>
          <p className="text-muted" style={{ lineHeight: 1.75 }}>
            {courier
              ? `${courier.displayName} • ${getCourierStatusLabel(courier.status)}`
              : "Проверяем сессию курьера"}
          </p>
        </div>

        <button type="button" className="cta cta--ghost" onClick={handleLogout}>
          Выйти
        </button>
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
          Загружаем задания...
        </div>
      ) : null}

      {!loading && error ? (
        <div
          style={{
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

      {!loading && !error ? (
        <div style={{ display: "grid", gap: "var(--space-md)" }}>
          {jobs.length > 0 ? (
            jobs.map((job) => (
              <Link
                key={job.id}
                href={`/courier/jobs/${job.id}`}
                style={{
                  display: "block",
                  padding: "var(--space-lg)",
                  borderRadius: "var(--radius-xl)",
                  border: "1px solid var(--border)",
                  background:
                    "linear-gradient(180deg, rgba(99, 188, 197, 0.05) 0%, rgba(15, 26, 34, 0.82) 100%)",
                }}
              >
                <div
                  className="flex items-start justify-between"
                  style={{ gap: "var(--space-sm)", marginBottom: "var(--space-sm)" }}
                >
                  <div>
                    <strong style={{ display: "block", fontSize: 24, marginBottom: 4 }}>
                      {job.orderLabel}
                    </strong>
                    <div className="text-muted" style={{ lineHeight: 1.7 }}>
                      <div>{job.dropoffAddressLabel}</div>
                      <div>Кухня: {job.kitchenLabel ?? "Не указана"}</div>
                    </div>
                  </div>

                  <span
                    style={{
                      padding: "6px 10px",
                      borderRadius: "var(--radius-full)",
                      border: `1px solid ${getStatusTone(job.status)}`,
                      color: getStatusTone(job.status),
                      whiteSpace: "nowrap",
                    }}
                  >
                    {getStatusLabel(job.status)}
                  </span>
                </div>

                <div className="text-muted" style={{ lineHeight: 1.7 }}>
                  <div>{job.statusNote}</div>
                  <div>Открыть карточку задания →</div>
                </div>
              </Link>
            ))
          ) : (
            <div
              style={{
                padding: "var(--space-xl)",
                borderRadius: "var(--radius-xl)",
                border: "1px solid var(--border)",
                backgroundColor: "rgba(15, 26, 34, 0.76)",
              }}
            >
              <strong style={{ display: "block", marginBottom: 8 }}>Активных заданий нет</strong>
              <div className="text-muted" style={{ lineHeight: 1.75 }}>
                Как только диспетчер назначит заказ, он появится здесь автоматически.
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
