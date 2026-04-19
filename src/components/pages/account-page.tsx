"use client";

import { useState, type FormEvent } from "react";
import { useFakeAuth } from "@/hooks/use-fake-auth";

function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  const with7 = digits.startsWith("8") ? `7${digits.slice(1)}` : digits;
  const d = with7.padStart(1, "7");
  const rest = d.slice(1);
  let out = "+7";
  if (rest.length > 0) out += ` (${rest.slice(0, 3)}`;
  if (rest.length >= 3) out += `)`;
  if (rest.length > 3) out += ` ${rest.slice(3, 6)}`;
  if (rest.length > 6) out += `-${rest.slice(6, 8)}`;
  if (rest.length > 8) out += `-${rest.slice(8, 10)}`;
  return out;
}

function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) return `+7${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
  if (digits.length === 10) return `+7${digits}`;
  return `+${digits}`;
}

function LoginFlow({
  onSuccess,
}: {
  onSuccess: (phone: string) => void;
}) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const phoneDigits = phoneInput.replace(/\D/g, "").length;
  const phoneValid = phoneDigits >= 10;

  const onPhoneSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!phoneValid) {
      setError("Введите номер полностью");
      return;
    }
    setError(null);
    setStep("code");
  };

  const onCodeSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^\d{4}$/.test(codeInput.trim())) {
      setError("Введите 4-значный код");
      return;
    }
    setError(null);
    onSuccess(normalizePhone(phoneInput));
  };

  if (step === "phone") {
    return (
      <div className="cream-page__shell">
        <p className="cream-page__eyebrow">Вход и регистрация</p>
        <h1 className="cream-page__title">Личный кабинет</h1>
        <p className="cream-page__lead">
          Укажите телефон — пришлём код подтверждения и откроем доступ
          к истории заказов и бонусам.
        </p>

        <form onSubmit={onPhoneSubmit} className="cream-page__section">
          <label className="cream-page__section-title" htmlFor="account-phone">
            Телефон
          </label>
          <input
            id="account-phone"
            className="cream-page__input"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+7 (___) ___-__-__"
            value={phoneInput}
            onChange={(e) => setPhoneInput(formatPhone(e.target.value))}
          />
          {error ? <p className="cream-page__note">{error}</p> : null}
          <button type="submit" className="cream-page__cta">
            Получить код
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="cream-page__shell">
      <p className="cream-page__eyebrow">Подтверждение</p>
      <h1 className="cream-page__title">Введите код</h1>
      <p className="cream-page__lead">
        Отправили на {phoneInput}. Для демо подойдёт любой 4-значный —
        например, 1234.
      </p>

      <form onSubmit={onCodeSubmit} className="cream-page__section">
        <label className="cream-page__section-title" htmlFor="account-code">
          Код из SMS
        </label>
        <input
          id="account-code"
          className="cream-page__input"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="1234"
          maxLength={4}
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ""))}
        />
        {error ? <p className="cream-page__note">{error}</p> : null}
        <div style={{ display: "flex", gap: "clamp(12px, 1.5vw, 24px)", flexWrap: "wrap" }}>
          <button type="submit" className="cream-page__cta">
            Войти
          </button>
          <button
            type="button"
            className="cream-page__cta cream-page__cta--ghost"
            onClick={() => {
              setStep("phone");
              setCodeInput("");
              setError(null);
            }}
          >
            Изменить номер
          </button>
        </div>
      </form>
    </div>
  );
}

function Dashboard() {
  const { state, updateName, logout } = useFakeAuth();
  const [nameDraft, setNameDraft] = useState(state.name ?? "");
  const displayName = state.name ?? "Гость";

  const onNameSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = nameDraft.trim();
    if (!trimmed) return;
    updateName(trimmed);
  };

  return (
    <div className="cream-page__shell">
      <p className="cream-page__eyebrow">Личный кабинет</p>
      <h1 className="cream-page__title">Здравствуйте, {displayName}</h1>

      <section className="cream-page__section">
        <p className="cream-page__section-title">Бонусный баланс</p>
        <p className="cream-page__section-value">
          {state.bonusBalance.toLocaleString("ru-RU")} ₽
        </p>
        <p className="cream-page__note">
          Начисляем после первого заказа. Программа лояльности запускается
          в ближайшие месяцы.
        </p>
      </section>

      <section className="cream-page__section">
        <p className="cream-page__section-title">Телефон</p>
        <p className="cream-page__section-value">{state.phone ?? "—"}</p>
      </section>

      <section className="cream-page__section">
        <p className="cream-page__section-title">Имя</p>
        <form
          onSubmit={onNameSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <input
            className="cream-page__input"
            type="text"
            placeholder={state.name ? state.name : "Как к вам обращаться"}
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
          />
          <button
            type="submit"
            className="cream-page__cta cream-page__cta--ghost"
            style={{ alignSelf: "flex-start" }}
          >
            Сохранить
          </button>
        </form>
      </section>

      <section className="cream-page__section">
        <p className="cream-page__section-title">История заказов</p>
        <p className="cream-page__note">История заказов скоро появится.</p>
      </section>

      <section className="cream-page__section">
        <p className="cream-page__section-title">Адреса доставки</p>
        <p className="cream-page__note">Сохранённые адреса скоро появятся.</p>
      </section>

      <section className="cream-page__section">
        <p className="cream-page__section-title">Программа лояльности</p>
        <p className="cream-page__note">
          Бонусы за заказы, приоритетное окно доставки и ранний доступ
          к сезонным позициям — запускаем в ближайшие месяцы.
        </p>
      </section>

      <button
        type="button"
        className="cream-page__cta cream-page__cta--ghost"
        onClick={logout}
        style={{ alignSelf: "flex-start" }}
      >
        Выйти
      </button>
    </div>
  );
}

export function AccountPage() {
  const { state, hydrated, login } = useFakeAuth();

  if (!hydrated) {
    return (
      <main className="cream-page">
        <div className="cream-page__shell">
          <p className="cream-page__eyebrow">Личный кабинет</p>
        </div>
      </main>
    );
  }

  return (
    <main className="cream-page">
      {state.isAuthenticated ? <Dashboard /> : <LoginFlow onSuccess={login} />}
    </main>
  );
}

export default AccountPage;
