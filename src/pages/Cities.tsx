import { ArrowRight, Radar, Route, TimerReset } from "lucide-react";

import { Reveal } from "../components/site/Reveal";
import { SectionHeading } from "../components/site/SectionHeading";
import { ButtonLink } from "../components/ui/Button";
import { OptimizedImage } from "../components/ui/OptimizedImage";
import { cityCards } from "../content/siteContent";

const rolloutSteps = [
  {
    icon: Radar,
    title: "Demand mapping",
    body: "We identify routes with repeat rider behavior, directional consistency, and enough overlap to support reliable shared travel.",
  },
  {
    icon: Route,
    title: "Corridor activation",
    body: "We launch concentrated neighborhoods first instead of pretending to cover an entire city before the product is actually useful.",
  },
  {
    icon: TimerReset,
    title: "Expansion only after density",
    body: "A new zone is added when ride quality, pickup discipline, and wait times remain healthy under more demand.",
  },
];

export default function Cities() {
  return (
    <div className="site-shell">
      <section className="section-shell">
        <div className="section-frame space-y-10">
          <SectionHeading
            eyebrow="City rollout"
            title={
              <>
                We grow by deepening useful corridors, not by drawing
                <span className="serif-accent"> superficial coverage</span>.
              </>
            }
            description="HopIn launches in neighborhoods where rider density and driver reliability can make the product useful from day one."
          />
        </div>
      </section>

      <section className="section-shell pt-0">
        <div className="section-frame">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {cityCards.map((city, index) => (
              <Reveal key={city.name} delay={index * 0.04} className="panel overflow-hidden">
                <OptimizedImage
                  src={city.image}
                  alt={`${city.name} rollout preview`}
                  sizes="(min-width: 1280px) 24rem, (min-width: 768px) 50vw, 100vw"
                  className="h-72 w-full object-cover"
                />
                <div className="space-y-5 p-7">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-3xl font-black uppercase tracking-tight text-black">
                      {city.name}
                    </h2>
                    <span className="route-chip">{city.status}</span>
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black">
                    {city.rides}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {city.coverage.map((zone) => (
                      <span key={zone} className="route-chip">
                        {zone}
                      </span>
                    ))}
                  </div>
                  <div className="pt-2">
                    {city.status === "Live" ? (
                      <ButtonLink
                        to="/book"
                        variant="ghost"
                        size="sm"
                        className="gap-2 px-0 py-0 text-black hover:bg-transparent hover:text-black"
                      >
                        Open booking surface
                        <ArrowRight size={14} />
                      </ButtonLink>
                    ) : (
                      <ButtonLink
                        to={`/contact?topic=expansion&city=${encodeURIComponent(city.name)}`}
                        variant="ghost"
                        size="sm"
                        className="gap-2 px-0 py-0 text-black hover:bg-transparent hover:text-black"
                      >
                        Request launch updates
                        <ArrowRight size={14} />
                      </ButtonLink>
                    )}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell">
        <div className="section-frame">
          <div className="panel p-6 md:p-8 lg:p-10">
            <SectionHeading
              eyebrow="Launch protocol"
              title={
                <>
                  A new city is a routing problem before it is a marketing problem.
                </>
            }
              description="We expand only where the network can stay legible under real commuter pressure."
            />

            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {rolloutSteps.map((step, index) => (
                <Reveal key={step.title} delay={index * 0.05} className="rounded-none border-2 border-black bg-gray-100 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-none border-2 border-black bg-black text-white">
                    <step.icon size={22} />
                  </div>
                  <h3 className="mt-5 text-2xl font-black uppercase tracking-tight text-black">
                    {step.title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-black/60">
                    {step.body}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell pt-0">
        <div className="section-frame">
          <Reveal className="panel flex flex-col gap-6 p-8 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.26em] text-black">
                Expansion requests
              </p>
              <h3 className="mt-3 text-3xl font-black uppercase tracking-tight text-black">
                Want HopIn in your corridor next?
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-black/60">
                Tell us which neighborhoods, office clusters, or campus routes we should evaluate for the next dense launch zone.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <ButtonLink to="/contact?topic=expansion" size="lg">
                Request a City
              </ButtonLink>
              <ButtonLink to="/about" variant="outline" size="lg">
                Read the Manifesto
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

