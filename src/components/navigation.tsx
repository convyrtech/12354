"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { useDraft } from "@/components/draft-provider";

type NavLink = {
  href: string;
  label: string;
  active: boolean;
};

const HOME_LINKS = [
  { href: "/#quality", label: "О бренде" },
  { href: "/#product", label: "Продукт" },
  { href: "/#service", label: "Сервис" },
  { href: "/#contact", label: "Контакты" },
] as const;

const EASE = [0.22, 1, 0.36, 1] as const;

function truncateLabel(value: string, limit: number) {
  if (value.length <= limit) return value;
  return `${value.slice(0, Math.max(limit - 3, 0))}...`;
}

function getServiceChip(input: {
  fulfillmentMode: "delivery" | "pickup" | null;
  serviceLabel: string;
  serviceTimingLabel: string;
  lineItemCount: number;
}) {
  if (input.fulfillmentMode === "delivery") {
    return {
      eyebrow: "Доставка",
      value: truncateLabel(input.serviceLabel || "Уточнить адрес", 28),
      detail: input.serviceTimingLabel || "Private service по Москве",
    };
  }

  if (input.fulfillmentMode === "pickup") {
    return {
      eyebrow: "Самовывоз",
      value: truncateLabel(input.serviceLabel || "Выбрать точку", 28),
      detail: input.serviceTimingLabel || "Точка и окно выдачи",
    };
  }

  return {
    eyebrow: "The Raki",
    value: "Moscow / since 2017",
    detail: input.lineItemCount > 0 ? `${input.lineItemCount} поз. в заказе` : "Свежий продукт и точная подача",
  };
}

function BrandLockup() {
  return (
    <Link href="/" aria-label="The Raki home" className="nav-brand">
      <span className="nav-brand__wordmark">
        The <em>Raki</em>
      </span>
    </Link>
  );
}

function MobileMenuButton({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={open ? "Закрыть меню" : "Открыть меню"}
      className="nav-menu-button lg:hidden"
    >
      <span />
      <span />
    </button>
  );
}

function MobileSheet({
  open,
  links,
  primaryHref,
  primaryLabel,
  onClose,
}: {
  open: boolean;
  links: NavLink[];
  primaryHref: string;
  primaryLabel: string;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="nav-mobile-sheet"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24, ease: EASE }}
        >
          <motion.div
            className="nav-mobile-sheet__panel"
            initial={{ y: -18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -18, opacity: 0 }}
            transition={{ duration: 0.34, ease: EASE }}
          >
            <div className="nav-mobile-sheet__top">
              <BrandLockup />
              <button type="button" onClick={onClose} className="nav-mobile-sheet__close" aria-label="Закрыть меню">
                Закрыть
              </button>
            </div>

            <div className="nav-mobile-sheet__links">
              {links.map((link) => (
                <Link key={link.href} href={link.href} onClick={onClose} className="nav-mobile-sheet__link">
                  {link.label}
                </Link>
              ))}
            </div>

            <Link href={primaryHref} onClick={onClose} className="cta cta--primary">
              {primaryLabel}
            </Link>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function LinkRow({ links }: { links: NavLink[] }) {
  return (
    <div className="nav-links hidden lg:flex">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="nav-link" data-active={link.active}>
          {link.label}
        </Link>
      ))}
    </div>
  );
}

function HomeNavigation({ scrolled }: { scrolled: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const links = HOME_LINKS.map((link) => ({ ...link, active: false }));

  return (
    <>
      <nav className="nav-root">
        <motion.div
          className="nav-shell nav-shell--home"
          animate={{
            y: 0,
            opacity: 1,
            borderRadius: scrolled ? 20 : 24,
          }}
          transition={{ duration: 0.28, ease: EASE }}
        >
          <BrandLockup />
          <LinkRow links={links} />
          <div className="nav-actions">
            <Link href="/menu?fulfillment=delivery" className="nav-action-link hidden sm:inline-flex">
              Открыть меню
            </Link>
            <MobileMenuButton open={menuOpen} onToggle={() => setMenuOpen((value) => !value)} />
          </div>
        </motion.div>
      </nav>

      <MobileSheet
        open={menuOpen}
        links={links}
        primaryHref="/menu?fulfillment=delivery"
        primaryLabel="Открыть меню"
        onClose={() => setMenuOpen(false)}
      />
    </>
  );
}

export function Navigation() {
  const pathname = usePathname();
  const { draft } = useDraft();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isHome = pathname === "/";

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 28);
  });

  const serviceLabel =
    draft.serviceLabel || draft.confirmedDropoffLabel || draft.normalizedAddress || draft.typedAddress;
  const chip = getServiceChip({
    fulfillmentMode: draft.fulfillmentMode,
    serviceLabel,
    serviceTimingLabel: draft.serviceTimingLabel,
    lineItemCount: draft.lineItems.length,
  });

  const menuHref =
    draft.fulfillmentMode === "pickup" ? "/menu?fulfillment=pickup" : "/menu?fulfillment=delivery";

  const links = useMemo<NavLink[]>(
    () => [
      {
        href: menuHref,
        label: "Меню",
        active: pathname === "/menu" || pathname.startsWith("/product/"),
      },
      {
        href: "/delivery/address",
        label: "Доставка",
        active: pathname.startsWith("/delivery"),
      },
      {
        href: "/pickup/points",
        label: "Самовывоз",
        active: pathname.startsWith("/pickup"),
      },
      {
        href: "/cart",
        label: pathname === "/checkout" ? "Оформление" : "Заказ",
        active: pathname === "/cart" || pathname === "/checkout",
      },
    ],
    [menuHref, pathname],
  );

  if (isHome) {
    return <HomeNavigation scrolled={scrolled} />;
  }

  return (
    <>
      <nav className="nav-root">
        <motion.div
          className="nav-shell"
          animate={{
            y: 0,
            opacity: 1,
            borderRadius: scrolled ? 26 : 30,
          }}
          transition={{ duration: 0.28, ease: EASE }}
        >
          <BrandLockup />
          <LinkRow links={links} />
          <div className="nav-actions">
            <div className="nav-chip hidden xl:flex">
              <span>{chip.eyebrow}</span>
              <strong>{chip.value}</strong>
              <em>{chip.detail}</em>
            </div>
            <MobileMenuButton open={menuOpen} onToggle={() => setMenuOpen((value) => !value)} />
          </div>
        </motion.div>
      </nav>

      <MobileSheet
        open={menuOpen}
        links={links}
        primaryHref={menuHref}
        primaryLabel="Открыть меню"
        onClose={() => setMenuOpen(false)}
      />
    </>
  );
}
