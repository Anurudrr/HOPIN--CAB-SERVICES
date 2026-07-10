import { ArrowRight, Compass, Leaf, ShieldCheck, Users } from "lucide-react";

import { Reveal } from "../components/site/Reveal";
import { SectionHeading } from "../components/site/SectionHeading";
import { ButtonLink } from "../components/ui/Button";
import { manifestoPillars, networkMetrics } from "../content/siteContent";

const timeline = [
  {
    year: "Phase 01",
    title: "Decode the commuting corridor",
    body: "We start by understanding where repeated movement already exists: office clusters, metro touchpoints, residential pockets, airport edges, and late-shift exit routes.",
  },
  {
    year: "Phase 02",
    title: "Create a product users can trust in motion",
    body: "The interface needs to remain readable while someone is late, moving, or making a fast decision. Clarity beats ornament every time.",
  },
  {
    year: "Phase 03",
    title: "Scale only when the network stays legible",
    body: "Expansion happens after route density proves itself. We are not interested in shallow footprint growth that makes the product less reliable.",
  },
];

const values = [
  {
    icon: Compass,
    title: "Direction before decoration",
    body: "A mobility product should orient the user instantly. The design system exists to make every decision faster to read.",
  },
  {
    icon: Users,
    title: "Community with real constraints",
    body: "We treat trust as operational. Ratings, verification, route behavior, and pickup discipline all matter to the experience.",
  },
  {
    icon: Leaf,
    title: "Efficiency with social value",
    body: "Shared rides reduce empty seats, lower cost per trip, and make city movement less wasteful when density is built responsibly.",
  },
  {
    icon: ShieldCheck,
    title: "Safety is product architecture",
    body: "Escalation paths, trip visibility, participant identity, and route logic all contribute to whether a rider feels secure.",
  },
];

export default function About() {
  return (
    <div className="site-shell">
      <section className="section-shell">
        <div className="section-frame space-y-10">
          <SectionHeading
            eyebrow="Manifesto"
            title={
              <>
                We are building a commute product that respects both
                <span className="serif-accent"> time and trust</span>.
              </>
            }
            description="HopIn exists because most city transport software optimizes for coverage, not repeated human behavior."
          />

          <div className="grid gap-4 md:grid-cols-4">
            {networkMetrics.map((metric, index) => (
              <Reveal key={metric.label} delay={index * 0.05} className="panel p-6">
                <p className="text-3xl font-black uppercase tracking-tight text-black">
                  {metric.value}
                </p>
                <p className="mt-2 text-sm leading-6 text-black/60">
                  {metric.label}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell">
        <div className="section-frame space-y-12">
          <SectionHeading
            eyebrow="Operating principles"
            title={
              <>
                Four beliefs shape how we design the
                <span className="serif-accent"> entire experience</span>.
              </>
            }
            description="We are building a corridor-first system with stronger route intelligence and calmer UX."
          />

          <div className="grid gap-6 lg:grid-cols-2">
            {manifestoPillars.map((pillar, index) => (
              <Reveal key={pillar.title} delay={index * 0.05} className="panel p-8">
                <h3 className="text-2xl font-black uppercase tracking-tight text-black">
                  {pillar.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-black/60">
                  {pillar.body}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell">
        <div className="section-frame">
          <div className="panel p-6 md:p-8 lg:p-10">
            <SectionHeading
              eyebrow="From idea to network"
              title={
                <>
                  Building HopIn is a sequence, not a launch stunt.
                </>
              }
              description="Each stage answers a different question: where demand exists, how trust is earned, and when expansion actually strengthens the product."
            />

            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {timeline.map((item, index) => (
                <Reveal key={item.year} delay={index * 0.05} className="rounded-none border-2 border-black bg-gray-100 p-6">
                  <p className="text-[11px] font-black uppercase tracking-[0.26em] text-black/60">
                    {item.year}
                  </p>
                  <h3 className="mt-4 text-2xl font-black uppercase tracking-tight text-black">
                    {item.title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-black/60">
                    {item.body}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell pt-0">
        <div className="section-frame space-y-12">
          <SectionHeading
            eyebrow="What we value"
            title={
              <>
                The company should feel as intentional as the product.
              </>
            }
            description="The team behind a commute product matters. We hire for operational rigor and clear thinking."
          />

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {values.map((value, index) => (
              <Reveal key={value.title} delay={index * 0.04} className="panel p-7">
                <div className="flex h-12 w-12 items-center justify-center rounded-none border-2 border-black bg-black text-white">
                  <value.icon size={22} />
                </div>
                <h3 className="mt-6 text-xl font-black uppercase tracking-tight text-black">
                  {value.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-black/60">
                  {value.body}
                </p>
              </Reveal>
            ))}
          </div>

          <Reveal className="panel flex flex-col gap-6 p-8 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.26em] text-black">
                Continue exploring
              </p>
              <h3 className="mt-3 text-3xl font-black uppercase tracking-tight text-black">
                Review the safety model or talk to the team.
              </h3>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <ButtonLink to="/safety" size="lg" className="gap-2">
                Safety Architecture
                <ArrowRight size={16} />
              </ButtonLink>
              <ButtonLink to="/contact" variant="outline" size="lg">
                Contact HopIn
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

