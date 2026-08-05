import * as React from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

import { supportedCities } from "../../content/siteContent";

const footerColumns = [
  {
    label: "Explore",
    links: [
      { label: "Home", to: "/" },
      { label: "Manifesto", to: "/about" },
      { label: "Cities", to: "/cities" },
      { label: "Safety", to: "/safety" },
      { label: "Journal", to: "/blog" },
    ],
  },
  {
    label: "Contact",
    links: [
      { label: "Support and partnerships", to: "/contact" },
      { label: "help@hopin.co", to: "mailto:help@hopin.co", external: true },
      { label: "+91 80 4567 8900", to: "tel:+918045678900", external: true },
      { label: "Careers", to: "/careers" },
      { label: "Driver application", to: "/driver-signup" },
    ],
  },
  {
    label: "Legal",
    links: [
      { label: "Terms", to: "/terms" },
      { label: "Privacy", to: "/privacy" },
      { label: "FAQ", to: "/faq" },
    ],
  },
] as const;

export const Footer = () => {
  const ref = React.useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });
  const shouldReduceMotion = useReducedMotion();

  return (
    <footer
      ref={ref}
      className="relative overflow-hidden border-t-2 border-black bg-white"
    >
      <div className="section-shell pt-16">
        <div className="section-frame space-y-14">
          {/* Brand block — large wordmark + manifesto line */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="grid gap-10 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr]"
          >
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center border-2 border-black bg-black text-sm font-black uppercase tracking-[0.3em] text-white">
                  HI
                </span>
                <div>
                  <p className="text-2xl font-black uppercase tracking-[0.18em] text-black">
                    HopIn
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-black/55">
                    shared city mobility
                  </p>
                </div>
              </div>

              <h2 className="max-w-xl text-4xl font-black uppercase leading-[0.9] tracking-tighter text-black md:text-5xl">
                Shared mobility
                <br />
                should feel direct,
                <br />
                legible, and
                <br />
                repeatable.
              </h2>

              <p className="max-w-lg border-l-4 border-black pl-5 text-base font-medium leading-8 text-black/65">
                HopIn focuses on corridor density, verified participants, and clear
                trip economics for Indian cities where everyday commutes deserve
                better software.
              </p>

              <div className="flex flex-wrap gap-2">
                {supportedCities.map((city) => (
                  <Link key={city} to="/cities" className="route-chip">
                    {city}
                  </Link>
                ))}
              </div>
            </div>

            {footerColumns.map((column, colIdx) => (
              <motion.div
                key={column.label}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
                animate={isInView ? { opacity: 1, y: 0 } : undefined}
                transition={{
                  duration: 0.6,
                  delay: 0.1 + colIdx * 0.06,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <p className="mb-5 text-[11px] font-black uppercase tracking-[0.24em] text-black/55">
                  {column.label}
                </p>
                <ul className="space-y-3 text-sm font-medium text-black/65">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <FooterLink link={link} />
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>

          {/* Marquee strip — city ticker */}
          <div className="marquee border-y-2 border-black bg-black py-5 text-white">
            <div className="marquee-track whitespace-nowrap">
              {[...supportedCities, ...supportedCities].map((city, idx) => (
                <span
                  key={`${city}-${idx}`}
                  className="flex items-center gap-8 text-2xl font-black uppercase tracking-tighter md:text-3xl"
                >
                  <span>{city}</span>
                  <span className="text-white/40">↗</span>
                </span>
              ))}
            </div>
          </div>

          {/* Bottom legal line */}
          <div className="flex flex-col gap-3 pt-2 text-xs font-black uppercase tracking-[0.22em] text-black/55 md:flex-row md:items-center md:justify-between">
            <p>Copyright {new Date().getFullYear()} HopIn Mobility</p>
            <p>Shared commute software for Indian city corridors</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

interface FooterLinkProps {
  link: {
    label: string;
    to: string;
    external?: boolean;
  };
}

function FooterLink({ link }: FooterLinkProps) {
  const isExternal =
    Boolean(link.external) ||
    link.to.startsWith("http") ||
    link.to.startsWith("mailto:") ||
    link.to.startsWith("tel:");

  const className =
    "group inline-flex items-center gap-1 text-black/65 transition-colors duration-200 hover:text-black";

  const content = (
    <>
      <span className="relative">
        {link.label}
        <span className="absolute -bottom-0.5 left-0 h-[1.5px] w-full origin-left scale-x-0 bg-black transition-transform duration-300 ease-out group-hover:scale-x-100" />
      </span>
      {isExternal ? (
        <ArrowUpRight
          size={12}
          className="translate-y-px text-black/40 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-black"
        />
      ) : null}
    </>
  );

  if (isExternal) {
    return (
      <a href={link.to} className={className}>
        {content}
      </a>
    );
  }
  return (
    <Link to={link.to} className={className}>
      {content}
    </Link>
  );
}