import * as React from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowRight, Menu, User, X } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";

import { navItems } from "../../content/siteContent";
import { useAuthStore } from "../../store/useAuthStore";
import { cn } from "../../lib/utils";
import { Button, ButtonLink } from "../ui/Button";

const compactLabels: Record<string, string> = {
  "/auth": "Account access",
  "/login": "Account access",
  "/book": "Book a ride",
  "/dashboard": "Dashboard",
  "/driver-signup": "Driver application",
  "/onboarding": "Complete profile",
  "/profile": "Profile",
};

interface NavbarProps {
  compact?: boolean;
}

export const Navbar = ({ compact = false }: NavbarProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const { user, signOut } = useAuthStore();
  const { pathname, hash } = useLocation();
  const shouldReduceMotion = useReducedMotion();

  const { scrollY } = useScroll();
  const navHeight = useTransform(scrollY, [0, 80], [80, 60], { clamp: true });

  React.useEffect(() => {
    const sync = () => setIsScrolled(window.scrollY > 12);
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, []);

  const primaryItems = compact
    ? user
      ? [
          { label: "Book", to: "/book" },
          { label: "Dashboard", to: "/dashboard" },
        ]
      : [{ label: "Home", to: "/" }]
    : navItems;
  const surfaceLabel = compactLabels[pathname] ?? "HopIn";

  React.useEffect(() => {
    setIsOpen(false);
  }, [pathname, hash]);

  const navStyle = shouldReduceMotion
    ? undefined
    : { height: navHeight as unknown as number };

  return (
    <motion.nav
      style={navStyle}
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b-2 border-black bg-white",
        "transition-shadow duration-300 ease-out",
        isScrolled ? "shadow-[0_2px_0_0_rgba(0,0,0,1)]" : "shadow-none",
      )}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-8">
          <Link to="/" className="group flex items-center gap-3">
            <span
              className={cn(
                "inline-flex items-center justify-center border-2 border-black bg-black font-black uppercase tracking-[0.3em] text-white transition-all duration-300",
                isScrolled ? "h-9 w-9 text-[10px]" : "h-10 w-10 text-[11px]",
              )}
            >
              HI
            </span>
            <div className="hidden sm:block">
              <p
                className={cn(
                  "font-black uppercase tracking-[0.18em] text-black transition-all duration-300",
                  isScrolled ? "text-base" : "text-lg",
                )}
              >
                HopIn
              </p>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-black/55">
                shared city mobility
              </p>
            </div>
          </Link>

          {compact ? (
            <div className="hidden lg:flex">
              <span className="route-chip">{surfaceLabel}</span>
            </div>
          ) : null}

          <div className="hidden items-center lg:flex">
            {primaryItems.map((item) => (
              <NavItem key={item.label} item={item} />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 lg:flex">
            {user ? (
              <div className="flex items-center gap-4">
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) =>
                    cn(
                      "px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-black hover:underline hover:decoration-2 hover:underline-offset-4",
                      isActive && "underline decoration-2 underline-offset-4",
                    )
                  }
                >
                  Dashboard
                </NavLink>
                <Link
                  to="/profile"
                  aria-label="Open profile"
                  className="flex h-10 w-10 items-center justify-center border-2 border-black bg-white text-black shadow-soft hover:bg-black hover:text-white hover:shadow-premium"
                >
                  <User size={17} />
                </Link>
                <button
                  onClick={() => void signOut()}
                  className="px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-black hover:underline hover:decoration-2 hover:underline-offset-4"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-black hover:underline hover:decoration-2 hover:underline-offset-4"
                >
                  Log In
                </Link>
                <ButtonLink to="/login?mode=signup" variant="primary" size="md" className="gap-2">
                  Join HopIn
                  <ArrowRight size={14} />
                </ButtonLink>
              </>
            )}
          </div>

          <button
            className="border-2 border-black bg-white p-2.5 text-black lg:hidden"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={isOpen}
            aria-controls="mobile-navigation"
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <MobileMenu
        isOpen={isOpen}
        items={primaryItems}
        isAuthed={Boolean(user)}
        onClose={() => setIsOpen(false)}
        onSignOut={() => void signOut()}
      />
    </motion.nav>
  );
};

interface NavItemProps {
  item: { label: string; to: string };
}

function NavItem({ item }: NavItemProps) {
  if (item.to.startsWith("/#")) {
    return (
      <Link
        to={item.to}
        className="relative px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-black transition-colors hover:text-black/80"
      >
        {item.label}
      </Link>
    );
  }
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          "group relative px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-black transition-colors",
          isActive ? "text-black" : "text-black/85 hover:text-black",
        )
      }
    >
      {({ isActive }) => (
        <>
          <span>{item.label}</span>
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-x-2 bottom-1 h-[2px] origin-center bg-black transition-transform duration-300 ease-out",
              isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
            )}
          />
        </>
      )}
    </NavLink>
  );
}

interface MobileMenuProps {
  isOpen: boolean;
  items: Array<{ label: string; to: string }>;
  isAuthed: boolean;
  onClose: () => void;
  onSignOut: () => void;
}

function MobileMenu({ isOpen, items, isAuthed, onClose, onSignOut }: MobileMenuProps) {
  return (
    <motion.div
      initial={false}
      animate={
        isOpen
          ? { height: "auto", opacity: 1, y: 0 }
          : { height: 0, opacity: 0, y: -16 }
      }
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      id="mobile-navigation"
      className="overflow-hidden border-x-2 border-b-2 border-black bg-white lg:hidden"
    >
      <div className="flex flex-col gap-3 p-6">
        {items.map((item, idx) => {
          const inner = item.to.startsWith("/#") ? (
            <Link
              key={item.label}
              to={item.to}
              onClick={onClose}
              className="border-2 border-black bg-white px-5 py-4 text-base font-black uppercase tracking-[0.16em] text-black shadow-soft"
            >
              {item.label}
            </Link>
          ) : (
            <NavLink
              key={item.label}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "border-2 border-black px-5 py-4 text-base font-black uppercase tracking-[0.16em] shadow-soft",
                  isActive ? "bg-black text-white" : "bg-white text-black",
                )
              }
            >
              {item.label}
            </NavLink>
          );

          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: -8 }}
              animate={isOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 }}
              transition={{ delay: isOpen ? 0.05 + idx * 0.04 : 0, duration: 0.28 }}
            >
              {inner}
            </motion.div>
          );
        })}

        <div className="my-2 h-px bg-black" />

        <div className="flex flex-col gap-3">
          {isAuthed ? (
            <>
              <ButtonLink to="/dashboard" onClick={onClose} variant="outline" className="w-full">
                Dashboard
              </ButtonLink>
              <ButtonLink to="/profile" onClick={onClose} variant="outline" className="w-full">
                Profile
              </ButtonLink>
              <Button
                variant="ghost"
                onClick={() => {
                  onSignOut();
                  onClose();
                }}
                className="w-full"
              >
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <ButtonLink to="/login" onClick={onClose} variant="outline" className="w-full">
                Log In
              </ButtonLink>
              <ButtonLink to="/login?mode=signup" onClick={onClose} variant="primary" className="w-full">
                Sign Up
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}