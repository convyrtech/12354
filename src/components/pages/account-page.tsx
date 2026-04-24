"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useFakeAuth, type FakeAuthState } from "@/hooks/use-fake-auth";
import { getCity } from "@/lib/cities/cities-config";
import type { HistoricalOrder, PaymentMethod } from "@/lib/waiter/waiter-types";

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  online: "онлайн",
  cash: "наличными",
};

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

function getDisplayPhone(phone: string | null) {
  if (!phone) return null;
  return formatPhone(phone);
}

function formatMoney(value: number) {
  return `${value.toLocaleString("ru-RU")} ₽`;
}

function formatHistoryDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
  }).format(parsed);
}

function getOrderCountLabel(count: number) {
  if (count <= 0) return "0";

  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return `${count} заказ`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} заказа`;
  return `${count} заказов`;
}

function getItemCountLabel(count: number) {
  if (count <= 0) return "0 позиций";

  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return `${count} позиция`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} позиции`;
  return `${count} позиций`;
}

function getSortedHistory(history: HistoricalOrder[] | undefined) {
  if (!history || history.length === 0) return [];

  return [...history].sort((left, right) => {
    return new Date(right.date).getTime() - new Date(left.date).getTime();
  });
}

function getPaymentLabel(payment: PaymentMethod | undefined) {
  if (!payment) return "уточним при заказе";
  return PAYMENT_LABELS[payment];
}

function getCityLabel(state: FakeAuthState) {
  if (!state.preferredCity) return "Москва";
  return getCity(state.preferredCity)?.name ?? "Москва";
}

function AccountControls() {
  return (
    <div className="menu-editorial__controls public-editorial__controls">
      <Link href="/" className="menu-editorial__control menu-editorial__control--menu">
        <span className="product-editorial__back-arrow" aria-hidden>
          ←
        </span>
        <span>Главная</span>
      </Link>

      <div className="menu-editorial__control-stack">
        <Link href="/menu-editorial" className="menu-editorial__control">
          <span>Меню</span>
        </Link>
        <Link href="/contact" className="menu-editorial__control">
          <span>Связь</span>
        </Link>
      </div>
    </div>
  );
}

function LoginCard({
  step,
  phoneInput,
  codeInput,
  error,
  setPhoneInput,
  setCodeInput,
  onPhoneSubmit,
  onCodeSubmit,
  onReset,
}: {
  step: "phone" | "code";
  phoneInput: string;
  codeInput: string;
  error: string | null;
  setPhoneInput: (value: string) => void;
  setCodeInput: (value: string) => void;
  onPhoneSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCodeSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
}) {
  if (step === "phone") {
    return (
      <aside className="public-editorial__sidecard public-editorial__sidecard--form">
        <span className="public-editorial__panel-eyebrow">Вход</span>
        <h2 className="public-editorial__panel-title">Введите телефон</h2>
        <p className="public-editorial__panel-copy">Введите номер и код.</p>

        <form className="public-editorial__form" onSubmit={onPhoneSubmit}>
          <label className="public-editorial__field" htmlFor="account-phone">
            <span className="public-editorial__field-label">Телефон</span>
            <input
              id="account-phone"
              className="public-editorial__input"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+7 (___) ___-__-__"
              value={phoneInput}
              onChange={(event) => setPhoneInput(formatPhone(event.target.value))}
            />
          </label>

          {error ? <p className="public-editorial__field-note public-editorial__field-note--danger">{error}</p> : null}

          <button type="submit" className="public-editorial__primary-action public-editorial__primary-action--full">
            Получить код
          </button>
        </form>
      </aside>
    );
  }

  return (
    <aside className="public-editorial__sidecard public-editorial__sidecard--form">
      <span className="public-editorial__panel-eyebrow">Подтверждение</span>
      <h2 className="public-editorial__panel-title">Введите код</h2>
      <p className="public-editorial__panel-copy">{phoneInput}</p>

      <form className="public-editorial__form" onSubmit={onCodeSubmit}>
        <label className="public-editorial__field" htmlFor="account-code">
          <span className="public-editorial__field-label">Код</span>
          <input
            id="account-code"
            className="public-editorial__input"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="1234"
            maxLength={4}
            value={codeInput}
            onChange={(event) => setCodeInput(event.target.value.replace(/\D/g, ""))}
          />
        </label>

        {error ? <p className="public-editorial__field-note public-editorial__field-note--danger">{error}</p> : null}

        <div className="public-editorial__panel-actions public-editorial__panel-actions--stacked">
          <button type="submit" className="public-editorial__primary-action public-editorial__primary-action--full">
            Войти
          </button>
          <button type="button" className="public-editorial__secondary-action" onClick={onReset}>
            Изменить номер
          </button>
        </div>
      </form>
    </aside>
  );
}

function LoggedInCard({
  state,
  displayName,
  logout,
}: {
  state: FakeAuthState;
  displayName: string;
  logout: () => void;
}) {
  const displayPhone = getDisplayPhone(state.phone);

  return (
    <aside className="public-editorial__sidecard">
      <span className="public-editorial__panel-eyebrow">Профиль</span>
      <h2 className="public-editorial__panel-title">{displayName}</h2>
      <p className="public-editorial__panel-copy">{displayPhone ?? "Телефон не указан"}</p>

      <div className="public-editorial__panel-grid">
        <div className="public-editorial__panel-row">
          <span>Баланс</span>
          <strong>{formatMoney(state.bonusBalance)}</strong>
        </div>
        <div className="public-editorial__panel-row">
          <span>Оплата</span>
          <strong>{getPaymentLabel(state.paymentPreference)}</strong>
        </div>
        <div className="public-editorial__panel-row">
          <span>Город</span>
          <strong>{getCityLabel(state)}</strong>
        </div>
      </div>

      <div className="public-editorial__panel-actions">
        <Link href="/menu-editorial" className="public-editorial__primary-action">
          К меню
        </Link>
        <button type="button" className="public-editorial__secondary-action" onClick={logout}>
          Выйти
        </button>
      </div>
    </aside>
  );
}

function LoggedOutWorkbench() {
  return (
    <div className="public-editorial__workbench-inner">
      <div className="public-editorial__summary-shell">
        <aside className="public-editorial__summary">
          <span className="public-editorial__label">Кабинет</span>
          <h2 className="public-editorial__summary-title">Телефон</h2>

          <div className="public-editorial__summary-block">
            <span className="public-editorial__label">Вход</span>
            <strong>номер и код</strong>
            <p>вход в кабинет</p>
          </div>

          <div className="public-editorial__summary-grid">
            <div className="public-editorial__summary-row">
              <span>Баланс</span>
              <strong>доступен в кабинете</strong>
            </div>
            <div className="public-editorial__summary-row">
              <span>Заказы</span>
              <strong>появятся здесь</strong>
            </div>
            <div className="public-editorial__summary-row">
              <span>Связь</span>
              <strong>Telegram и звонок</strong>
            </div>
          </div>

          <div className="public-editorial__summary-actions">
            <Link href="/menu-editorial" className="public-editorial__primary-action">
              К меню
            </Link>
            <Link href="/contact" className="public-editorial__secondary-action">
              Связь
            </Link>
          </div>
        </aside>
      </div>

      <div className="public-editorial__content">
        <section className="public-editorial__section">
          <div className="public-editorial__section-head">
            <div>
              <span className="public-editorial__label">Кабинет</span>
              <h2>Профиль, баланс, заказы</h2>
            </div>
          </div>

          <div className="public-editorial__detail-grid">
            <div className="public-editorial__detail-row">
              <span>Баланс</span>
              <strong>после подтверждённых заказов</strong>
            </div>
            <div className="public-editorial__detail-row">
              <span>Заказы</span>
              <strong>в одном списке</strong>
            </div>
            <div className="public-editorial__detail-row">
              <span>Телефон</span>
              <strong>как основной вход</strong>
            </div>
            <div className="public-editorial__detail-row">
              <span>Оформление</span>
              <strong>сразу из меню</strong>
            </div>
          </div>
        </section>

        <section className="public-editorial__section public-editorial__section--quiet">
          <div className="public-editorial__section-head">
            <div>
              <span className="public-editorial__label">Связь</span>
              <h2>Если удобнее напрямую</h2>
            </div>
          </div>

          <div className="public-editorial__detail-grid">
            <div className="public-editorial__detail-row">
              <span>Телефон</span>
              <strong>
                <a href="tel:+79808880588">+7 980 888-05-88</a>
              </strong>
            </div>
            <div className="public-editorial__detail-row">
              <span>Telegram</span>
              <strong>
                <a href="https://t.me/The_raki" target="_blank" rel="noreferrer">
                  @The_raki
                </a>
              </strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function DashboardWorkbench({
  state,
  nameDraft,
  setNameDraft,
  onNameSubmit,
  displayName,
}: {
  state: FakeAuthState;
  nameDraft: string;
  setNameDraft: (value: string) => void;
  onNameSubmit: (event: FormEvent<HTMLFormElement>) => void;
  displayName: string;
}) {
  const history = getSortedHistory(state.orderHistory);
  const displayPhone = getDisplayPhone(state.phone);

  return (
    <div className="public-editorial__workbench-inner">
      <div className="public-editorial__summary-shell">
        <aside className="public-editorial__summary">
          <span className="public-editorial__label">Аккаунт</span>
          <h2 className="public-editorial__summary-title">{displayName}</h2>

          <div className="public-editorial__summary-block">
            <span className="public-editorial__label">Баланс</span>
            <strong>{formatMoney(state.bonusBalance)}</strong>
            <p>{displayPhone ?? "Телефон не указан"}</p>
          </div>

          <div className="public-editorial__summary-grid">
            <div className="public-editorial__summary-row">
              <span>Заказы</span>
              <strong>{getOrderCountLabel(history.length)}</strong>
            </div>
            <div className="public-editorial__summary-row">
              <span>Оплата</span>
              <strong>{getPaymentLabel(state.paymentPreference)}</strong>
            </div>
            <div className="public-editorial__summary-row">
              <span>Город</span>
              <strong>{getCityLabel(state)}</strong>
            </div>
          </div>

          <div className="public-editorial__summary-actions">
            <Link href="/menu-editorial" className="public-editorial__primary-action">
              К меню
            </Link>
            <Link href="/checkout" className="public-editorial__secondary-action">
              Оформление
            </Link>
          </div>
        </aside>
      </div>

      <div className="public-editorial__content">
        <section className="public-editorial__section">
          <div className="public-editorial__section-head">
            <div>
              <span className="public-editorial__label">Профиль</span>
              <h2>Имя, телефон, предпочтения</h2>
            </div>
          </div>

          <form className="public-editorial__form" onSubmit={onNameSubmit}>
            <label className="public-editorial__field" htmlFor="account-name">
              <span className="public-editorial__field-label">Имя</span>
              <input
                id="account-name"
                className="public-editorial__input"
                type="text"
                placeholder="Как к вам обращаться"
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
              />
            </label>

            <div className="public-editorial__detail-grid">
              <div className="public-editorial__detail-row">
                <span>Телефон</span>
                <strong>{displayPhone ?? "—"}</strong>
              </div>
              <div className="public-editorial__detail-row">
                <span>Баланс</span>
                <strong>{formatMoney(state.bonusBalance)}</strong>
              </div>
              <div className="public-editorial__detail-row">
                <span>Оплата</span>
                <strong>{getPaymentLabel(state.paymentPreference)}</strong>
              </div>
              <div className="public-editorial__detail-row">
                <span>Город</span>
                <strong>{getCityLabel(state)}</strong>
              </div>
            </div>

            <div className="public-editorial__panel-actions">
              <button type="submit" className="public-editorial__primary-action">
                Сохранить имя
              </button>
            </div>
          </form>
        </section>

        <section className="public-editorial__section public-editorial__section--quiet">
          <div className="public-editorial__section-head">
            <div>
              <span className="public-editorial__label">Заказы</span>
              <h2>{history.length > 0 ? "Последние заказы" : "Заказы"}</h2>
            </div>
          </div>

          {history.length > 0 ? (
            <div className="public-editorial__history-grid">
              {history.map((order, index) => {
                const itemCount = order.items.reduce((sum, item) => sum + item.qty, 0);
                return (
                  <article
                    key={`${order.date}-${order.total}-${index}`}
                    className="public-editorial__history-card"
                  >
                    <div className="public-editorial__history-top">
                      <strong>{formatHistoryDate(order.date)}</strong>
                      <span>{formatMoney(order.total)}</span>
                    </div>

                    <div className="public-editorial__history-meta">
                      <span>{getItemCountLabel(itemCount)}</span>
                      <span>{getPaymentLabel(order.payment)}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="public-editorial__detail-grid">
              <div className="public-editorial__detail-row">
                <span>Первый заказ</span>
                <strong>сохраним здесь</strong>
              </div>
              <div className="public-editorial__detail-row">
                <span>Повтор</span>
                <strong>из кабинета или через официанта</strong>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export function AccountPage() {
  const { state, hydrated, login, updateName, logout } = useFakeAuth();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState(state.name ?? "");

  const phoneDigits = phoneInput.replace(/\D/g, "").length;
  const phoneValid = phoneDigits >= 10;
  const displayName = state.name?.trim() ? state.name : "Гость";
  const history = getSortedHistory(state.orderHistory);
  const displayPhone = getDisplayPhone(state.phone);

  useEffect(() => {
    setNameDraft(state.name ?? "");
  }, [state.name]);

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
    login(normalizePhone(phoneInput));
  };

  const onNameSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === (state.name ?? "").trim()) return;
    updateName(trimmed);
  };

  if (!hydrated) {
    return (
      <main className="public-editorial public-editorial--account public-editorial--loading">
        <AccountControls />
        <section className="public-editorial__hero">
          <div className="public-editorial__hero-inner">
            <div className="public-editorial__hero-grid public-editorial__hero-grid--loading">
              <div className="public-editorial__copy">
                <span className="public-editorial__brand">The Raki</span>
                <span className="public-editorial__eyebrow">Кабинет</span>
                <h1 className="public-editorial__title">Загружаем профиль.</h1>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="public-editorial public-editorial--account">
      <AccountControls />

      <section className="public-editorial__hero">
        <div className="public-editorial__hero-inner">
          <div className="public-editorial__hero-grid">
            <div className="public-editorial__copy">
              <span className="public-editorial__brand">The Raki</span>
              <span className="public-editorial__eyebrow">Кабинет</span>
              <h1 className="public-editorial__title">Личный кабинет.</h1>
              <p className="public-editorial__lead">
                {state.isAuthenticated ? "Телефон, баланс и заказы." : "Телефон и заказы."}
              </p>

              <div className="public-editorial__hero-meta">
                <div className="public-editorial__hero-stat">
                  <span className="public-editorial__label">Баланс</span>
                  <strong>{formatMoney(state.bonusBalance)}</strong>
                  <span>доступный баланс</span>
                </div>

                <div className="public-editorial__hero-stat">
                  <span className="public-editorial__label">Телефон</span>
                  <strong>{displayPhone ?? "не указан"}</strong>
                  <span>{state.isAuthenticated ? "основной номер" : "введите номер"}</span>
                </div>

                <div className="public-editorial__hero-stat">
                  <span className="public-editorial__label">Заказы</span>
                  <strong>{getOrderCountLabel(history.length)}</strong>
                  <span>история заказов</span>
                </div>
              </div>
            </div>

            <div>
              {state.isAuthenticated ? (
                <LoggedInCard state={state} displayName={displayName} logout={logout} />
              ) : (
                <LoginCard
                  step={step}
                  phoneInput={phoneInput}
                  codeInput={codeInput}
                  error={error}
                  setPhoneInput={setPhoneInput}
                  setCodeInput={setCodeInput}
                  onPhoneSubmit={onPhoneSubmit}
                  onCodeSubmit={onCodeSubmit}
                  onReset={() => {
                    setStep("phone");
                    setCodeInput("");
                    setError(null);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="public-editorial__workbench">
        {state.isAuthenticated ? (
          <DashboardWorkbench
            state={state}
            nameDraft={nameDraft}
            setNameDraft={setNameDraft}
            onNameSubmit={onNameSubmit}
            displayName={displayName}
          />
        ) : (
          <LoggedOutWorkbench />
        )}
      </section>
    </main>
  );
}

export default AccountPage;
