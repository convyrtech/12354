"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";

type MenuLink = {
  label: string;
  href?: string;
  action?: "track";
};

const PRIMARY_LINKS: MenuLink[] = [
  { label: "Меню", href: "/menu?fulfillment=delivery" },
  { label: "Доставка", href: "/delivery/address" },
  { label: "Самовывоз", href: "/pickup" },
  { label: "Трекинг", action: "track" },
  { label: "Связь", href: "/contact" },
];

const PROFILE_LINK: MenuLink = { label: "Профиль", href: "/account" };

export function HomeMenu() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [trackOpen, setTrackOpen] = useState(false);
  const [trackValue, setTrackValue] = useState("");
  const trackInputRef = useRef<HTMLInputElement | null>(null);
  const scrollYRef = useRef(0);

  const close = useCallback(() => {
    setIsOpen(false);
    setTrackOpen(false);
  }, []);

  // Body lock — preserve scroll position on iOS by pinning body via fixed.
  // Expose scrollY as CSS var so the rotated home-main can compensate and
  // always present its hero (top) when the menu opens.
  useEffect(() => {
    if (!isOpen) return;
    scrollYRef.current = window.scrollY;
    const body = document.body;
    body.dataset.menuOpen = "true";
    body.style.setProperty("--menu-scroll-y", `${scrollYRef.current}px`);
    body.style.position = "fixed";
    body.style.top = `-${scrollYRef.current}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    return () => {
      delete body.dataset.menuOpen;
      body.style.removeProperty("--menu-scroll-y");
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      window.scrollTo(0, scrollYRef.current);
    };
  }, [isOpen]);

  // Esc to close.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  // Focus track input when opening modal.
  useEffect(() => {
    if (trackOpen) {
      const id = window.setTimeout(() => trackInputRef.current?.focus(), 60);
      return () => window.clearTimeout(id);
    }
  }, [trackOpen]);

  const onLinkClick = useCallback(
    (link: MenuLink) => (event: ReactMouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
      if (link.action === "track") {
        event.preventDefault();
        setTrackOpen(true);
        return;
      }
      // Link's own navigation handles the route; just close the panel.
      close();
    },
    [close],
  );

  const onTrackSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const token = trackValue.trim();
      if (!token) return;
      close();
      setTrackValue("");
      router.push(`/track/${encodeURIComponent(token)}`);
    },
    [trackValue, router, close],
  );

  return (
    <>
      <button
        type="button"
        className="home-menu-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls="home-menu-panel"
        aria-label={isOpen ? "Закрыть меню" : "Открыть меню"}
      >
        <span className="home-menu-trigger__label">Меню</span>
        <svg
          className="home-menu-trigger__mark"
          viewBox="0 0 40 12"
          width="40"
          height="12"
          aria-hidden
          focusable="false"
        >
          <g className="home-menu-trigger__mark-inner">
            <line
              className="home-menu-trigger__mark-line"
              x1="0"
              y1="6"
              x2="32"
              y2="6"
              pathLength={32}
            />
            <path
              className="home-menu-trigger__mark-head"
              d="M26 2 L32 6 L26 10"
            />
          </g>
        </svg>
      </button>

      <div
        className="home-menu-overlay"
        data-open={isOpen}
        onClick={close}
        aria-hidden
      />

      <aside
        id="home-menu-panel"
        className="home-menu-panel"
        data-open={isOpen}
        aria-hidden={!isOpen}
      >
        <nav className="home-menu-panel__nav" aria-label="Основное меню">
          <ul className="home-menu-panel__links">
            {PRIMARY_LINKS.map((link) => (
              <li key={link.label}>
                {link.action === "track" ? (
                  <button
                    type="button"
                    className="home-menu-link"
                    onClick={onLinkClick(link)}
                    tabIndex={isOpen ? 0 : -1}
                  >
                    {link.label}
                  </button>
                ) : (
                  <Link
                    href={link.href ?? "/"}
                    className="home-menu-link"
                    onClick={onLinkClick(link)}
                    tabIndex={isOpen ? 0 : -1}
                  >
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>

          <hr className="home-menu-panel__divider" />

          <ul className="home-menu-panel__links">
            <li>
              <Link
                href={PROFILE_LINK.href ?? "/account"}
                className="home-menu-link"
                onClick={onLinkClick(PROFILE_LINK)}
                tabIndex={isOpen ? 0 : -1}
              >
                {PROFILE_LINK.label}
              </Link>
            </li>
          </ul>
        </nav>

        <div className="home-menu-contacts">
          <p>
            <a href="tel:+79808880588">+7 980 888-05-88</a>
          </p>
          <p>
            <a
              href="https://t.me/The_raki"
              target="_blank"
              rel="noopener noreferrer"
            >
              @The_raki
            </a>
          </p>
          <p>Осоргино, 202</p>
        </div>

        {trackOpen ? (
          <div className="home-menu-track">
            <h2 className="home-menu-track__title">Отследить заказ</h2>
            <form className="home-menu-track__field" onSubmit={onTrackSubmit}>
              <input
                ref={trackInputRef}
                type="text"
                className="home-menu-track__input"
                placeholder="Введите номер заказа"
                value={trackValue}
                onChange={(e) => setTrackValue(e.target.value)}
                autoComplete="off"
                inputMode="text"
              />
              <div className="home-menu-track__actions">
                <button type="submit" className="home-menu-track__submit">
                  Отследить
                </button>
                <button
                  type="button"
                  className="home-menu-track__cancel"
                  onClick={() => {
                    setTrackOpen(false);
                    setTrackValue("");
                  }}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </aside>
    </>
  );
}

export default HomeMenu;
