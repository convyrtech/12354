"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { loginCourier } from "@/lib/courier/client";

const demoCouriers = [
  {
    phone: "+7 999 000-00-01",
    label: "Алексей",
    note: "car • available",
  },
  {
    phone: "+7 999 000-00-02",
    label: "Максим",
    note: "scooter • busy",
  },
  {
    phone: "+7 999 000-00-03",
    label: "Никита",
    note: "bike • paused",
  },
];

export function CourierLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState(demoCouriers[0].phone);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(nextPhone: string) {
    setSubmitting(true);
    setError(null);

    try {
      await loginCourier({
        phone: nextPhone,
        platform: "web",
        deviceId: "courier_web_shell",
        appVersion: "phase-2-web-shell",
      });

      const nextHref = searchParams.get("next");
      router.push(nextHref || "/courier/jobs");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Не удалось войти в courier shell.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="flex items-center justify-center"
      style={{ minHeight: "100vh", padding: "var(--space-lg)" }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 840,
          padding: "var(--space-2xl)",
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--border)",
          background:
            "linear-gradient(180deg, rgba(99, 188, 197, 0.08) 0%, rgba(15, 26, 34, 0.92) 100%)",
        }}
      >
        <span className="text-eyebrow block" style={{ marginBottom: "var(--space-xs)" }}>
          Courier Shell
        </span>
        <h1 className="text-h1" style={{ marginBottom: "var(--space-sm)" }}>
          Вход в курьерское приложение
        </h1>
        <p className="text-muted" style={{ maxWidth: 640, lineHeight: 1.8 }}>
          Это первый web shell для полного delivery loop. Здесь пока dev-auth по seeded
          курьерам, без OTP и mobile hardening.
        </p>

        <div
          style={{
            marginTop: "var(--space-xl)",
            display: "grid",
            gridTemplateColumns: "1.2fr 0.95fr",
            gap: "var(--space-lg)",
          }}
        >
          <div
            style={{
              padding: "var(--space-lg)",
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--border)",
              backgroundColor: "rgba(8, 16, 20, 0.46)",
            }}
          >
            <label className="text-eyebrow block" style={{ marginBottom: "var(--space-xs)" }}>
              Телефон курьера
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              style={{
                width: "100%",
                padding: "14px 18px",
                backgroundColor: "var(--bg)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                fontSize: 16,
                marginBottom: "var(--space-md)",
              }}
            />

            {error ? (
              <div
                style={{
                  marginBottom: "var(--space-md)",
                  padding: "var(--space-sm)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--warning)",
                  backgroundColor: "rgba(199, 105, 74, 0.08)",
                  color: "var(--warning)",
                  fontSize: 14,
                }}
              >
                {error}
              </div>
            ) : null}

            <button
              type="button"
              className="cta cta--primary"
              disabled={submitting}
              onClick={() => handleLogin(phone)}
              style={{ width: "100%" }}
            >
              {submitting ? "Входим..." : "Открыть courier shell"}
            </button>
          </div>

          <div
            style={{
              padding: "var(--space-lg)",
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--border)",
              backgroundColor: "rgba(8, 16, 20, 0.46)",
            }}
          >
            <span className="text-eyebrow block" style={{ marginBottom: "var(--space-sm)" }}>
              Demo Courier Accounts
            </span>

            <div style={{ display: "grid", gap: "var(--space-sm)" }}>
              {demoCouriers.map((courier) => (
                <button
                  key={courier.phone}
                  type="button"
                  onClick={() => {
                    setPhone(courier.phone);
                    void handleLogin(courier.phone);
                  }}
                  style={{
                    textAlign: "left",
                    padding: "var(--space-md)",
                    borderRadius: "var(--radius-lg)",
                    border: "1px solid var(--border)",
                    backgroundColor: "rgba(255,255,255,0.02)",
                    cursor: "pointer",
                  }}
                >
                  <strong style={{ display: "block", marginBottom: 4 }}>{courier.label}</strong>
                  <div className="text-muted" style={{ fontSize: 14, lineHeight: 1.65 }}>
                    <div>{courier.phone}</div>
                    <div>{courier.note}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
