"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { CitySwitcher } from "@/components/shared/city-switcher";

type NavLink = {
  href: string;
  label: string;
  active: boolean;
};

const EASE = [0.22, 1, 0.36, 1] as const;

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

export function Navigation() {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 28);
  });

  const menuHref = "/menu";

  const links = useMemo<NavLink[]>(
    () => {
      const menuLinks: NavLink[] = [
        {
          href: menuHref,
          label: "Меню",
          active: pathname === "/menu" || pathname.startsWith("/product/"),
        },
      ];

      if (pathname === "/menu") {
        menuLinks.push({
          href: "/menu-editorial",
          label: "Витрина",
          active: false,
        });
      }

      return [
        ...menuLinks,
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
      ];
    },
    [menuHref, pathname],
  );

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
            <div className="hidden xl:flex">
              <CitySwitcher />
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
