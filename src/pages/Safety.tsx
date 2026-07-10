import { AlertCircle, BellRing, Eye, ShieldCheck, UserRoundCheck } from "lucide-react";

import { Reveal } from "../components/site/Reveal";
import { SectionHeading } from "../components/site/SectionHeading";
import { ButtonLink } from "../components/ui/Button";
import { safetyLayers } from "../content/siteContent";

const tripStages = [
  {
    title: "Before pickup",
    body: "We show the rider who they are matching with, what route overlap exists, and whether the pickup still makes sense under time pressure.",
  },
  {
    title: "During the ride",
    body: "Trip status, route visibility, and support access remain accessible without burying the rider in extra UI.",
  },
  {
    title: "After drop-off",
    body: "Feedback, support follow-up, and issue reporting should be fast enough to be used when something actually feels wrong.",
  },
];

const controlCards = [
  {
    icon: UserRoundCheck,
    title: "Verification signals",
    body: "Profiles surface role, onboarding state, trust markers, and identity status so riders do not enter a trip blindly.",
  },
  {
    icon: Eye,
    title: "Readable trip surfaces",
    body: "We design critical moments for speed. Pickups, routes, and status changes stay visible instead of hiding behind heavy interaction layers.",
  },
  {
    icon: BellRing,
    title: "Escalation access",
    body: "If something feels wrong, support options need to be closer than promotional features. The product should reflect that priority.",
  },
];

export default function Safety() {
  return (
    <div className="site-shell">
      <section className="section-shell">
        <div className="section-frame">
          <div className="panel p-6 md:p-8 lg:p-10">
            <SectionHeading
              eyebrow="Safety architecture"
              title={
                <>
                  A safer ride is usually the result of clearer product structure, not just a panic button.
                </>
              }
              description="Trust is built through identity, readable route decisions, visible trip state, and faster support access. HopIn treats each one as a design problem."
            />

            <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {safetyLayers.map((layer, index) => (
                <Reveal key={layer.label} delay={index * 0.04} className="rounded-none border-2 border-black bg-gray-100 p-5">
                  <p className="text-[11px] font-black uppercase tracking-[0.26em] text-black/60">
                    {layer.label}
                  </p>
                  <h3 className="mt-4 text-xl font-black uppercase tracking-tight text-black">
                    {layer.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-black/60">
                    {layer.body}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell">
        <div className="section-frame space-y-12">
          <SectionHeading
            eyebrow="Trip controls"
            title={
              <>
                Safety UX has to stay useful while someone is already moving.
              </>
            }
              description="We focus on what a rider can grasp at a glance and act on quickly when something feels off."
            />

          <div className="grid gap-6 lg:grid-cols-3">
            {controlCards.map((card, index) => (
              <Reveal key={card.title} delay={index * 0.05} className="panel p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-none border-2 border-black bg-black text-white">
                  <card.icon size={22} />
                </div>
                <h3 className="mt-6 text-2xl font-black uppercase tracking-tight text-black">
                  {card.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-black/60">
                  {card.body}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell">
        <div className="section-frame space-y-12">
          <SectionHeading
            eyebrow="Journey sequence"
            title={
              <>
                We think about trust across the whole ride lifecycle.
              </>
            }
            description="Every stage has a different safety question. The interface should answer the right one at the right time."
          />

          <div className="grid gap-4 lg:grid-cols-3">
            {tripStages.map((stage, index) => (
              <Reveal key={stage.title} delay={index * 0.04} className="panel p-8">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                  0{index + 1}
                </p>
                <h3 className="mt-5 text-2xl font-black uppercase tracking-tight text-black">
                  {stage.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-black/60">
                  {stage.body}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell pt-0">
        <div className="section-frame">
          <Reveal className="panel flex flex-col gap-6 p-8 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.26em] text-black">
                Need help now
              </p>
              <h3 className="mt-3 text-3xl font-black uppercase tracking-tight text-black">
                Contact support or review the rider policies.
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-black/60">
                If you have a safety concern, we want that path to be faster than any other action on the page.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <ButtonLink to="/contact?topic=safety" size="lg" className="gap-2">
                <AlertCircle size={16} />
                Contact Support
              </ButtonLink>
              <ButtonLink to="/terms" variant="outline" size="lg" className="gap-2">
                <ShieldCheck size={16} />
                Rider Policies
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

