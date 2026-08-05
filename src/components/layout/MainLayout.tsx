import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Outlet, useLocation } from "react-router-dom";

import { PageMeta } from "../site/PageMeta";
import { ScrollProgress } from "../site/ScrollProgress";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";

const PRODUCT_FLOW_PATHS = [
  "/auth",
  "/login",
  "/book",
  "/dashboard",
  "/profile",
  "/onboarding",
  "/driver-signup",
];

const ROUTE_META: Record<
  string,
  {
    description: string;
    noindex?: boolean;
    title: string;
  }
> = {
  "/": {
    title: "HopIn | Shared Rides Across Indian Cities",
    description:
      "Book calmer shared commutes across dense city corridors with clearer fares, route context, and rider trust signals.",
  },
  "/about": {
    title: "About HopIn | Corridor-First Mobility",
    description:
      "Learn how HopIn designs shared commuting around repeat corridors, readable trip decisions, and trust under pressure.",
  },
  "/auth": {
    title: "HopIn Account Access",
    description:
      "Create a HopIn account or log in to book rides, manage your profile, and continue onboarding.",
    noindex: true,
  },
  "/login": {
    title: "HopIn Account Access",
    description:
      "Create a HopIn account or log in to book rides, manage your profile, and continue onboarding.",
    noindex: true,
  },
  "/blog": {
    title: "HopIn Journal",
    description:
      "Read product notes on route density, safety UX, and the operating logic behind shared mobility in Indian cities.",
  },
  "/book": {
    title: "Book a Shared Ride | HopIn",
    description:
      "Choose a route, review per-seat fare estimates, and start matching on supported HopIn city corridors.",
    noindex: true,
  },
  "/careers": {
    title: "Careers at HopIn",
    description:
      "Join a team building shared mobility systems for dense Indian commute corridors with product rigor and operational clarity.",
  },
  "/cities": {
    title: "HopIn Cities",
    description:
      "Explore live HopIn launch corridors and city rollout priorities across India.",
  },
  "/contact": {
    title: "Contact HopIn",
    description:
      "Reach HopIn support for rider safety, technical issues, partnerships, careers, and city expansion requests.",
  },
  "/dashboard": {
    title: "HopIn Dashboard",
    description:
      "Review active rides, verification status, route activity, and account details in your HopIn dashboard.",
    noindex: true,
  },
  "/driver-signup": {
    title: "Driver Application | HopIn",
    description:
      "Prepare your driver application details, documents, and vehicle information for HopIn review.",
    noindex: true,
  },
  "/faq": {
    title: "HopIn FAQ",
    description:
      "Find quick answers about route matching, pricing, safety, cancellations, and support.",
  },
  "/not-found": {
    title: "Page Not Found | HopIn",
    description:
      "The page you requested is not part of the current HopIn site map.",
  },
  "/onboarding": {
    title: "Complete Your HopIn Profile",
    description:
      "Finish onboarding with your city, route context, and account details so shared rides stay readable and safe.",
    noindex: true,
  },
  "/privacy": {
    title: "Privacy Policy | HopIn",
    description:
      "Review how HopIn handles account data, route inputs, and support-related information across the platform.",
  },
  "/profile": {
    title: "Your HopIn Profile",
    description:
      "Manage your account details, verification signals, and ride preferences inside HopIn.",
    noindex: true,
  },
  "/safety": {
    title: "Safety at HopIn",
    description:
      "See how HopIn approaches rider trust through identity, clear trip state, route context, and support access.",
  },
  "/terms": {
    title: "Terms of Use | HopIn",
    description:
      "Read the operating terms for HopIn accounts, routes, fares, rider conduct, and support expectations.",
  },
};

function resolveMeta(pathname: string) {
  return ROUTE_META[pathname] ?? ROUTE_META["/not-found"];
}

export const MainLayout = () => {
  const { pathname, hash } = useLocation();
  const shouldReduceMotion = useReducedMotion();
  const isProductFlow = PRODUCT_FLOW_PATHS.includes(pathname);
  const meta = resolveMeta(pathname);

  React.useEffect(() => {
    if (hash) {
      requestAnimationFrame(() => {
        const section = document.getElementById(hash.slice(1));
        if (section instanceof HTMLElement) {
          const top = section.getBoundingClientRect().top + window.scrollY - 104;
          window.scrollTo({
            top,
            behavior: shouldReduceMotion ? "auto" : "smooth",
          });
        }
      });
      return;
    }

    window.scrollTo({ top: 0, behavior: "auto" });
  }, [hash, pathname, shouldReduceMotion]);

  return (
    <div className="site-shell flex min-h-screen flex-col">
      <PageMeta title={meta.title} description={meta.description} noindex={meta.noindex} />
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <ScrollProgress />
      <Navbar compact={isProductFlow} />
      <main
        id="main-content"
        tabIndex={-1}
        className={isProductFlow ? "flex-grow pt-24" : "flex-grow pt-20"}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${pathname}${hash}`}
            initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, y: -12 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { duration: 0.42, ease: [0.22, 1, 0.36, 1] }
            }
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      {!isProductFlow ? <Footer /> : null}
    </div>
  );
};