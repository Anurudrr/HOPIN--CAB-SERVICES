import { ArrowRight, BriefcaseBusiness, Gauge, PenTool, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { Reveal } from "../components/site/Reveal";
import { SectionHeading } from "../components/site/SectionHeading";
import { ButtonLink } from "../components/ui/Button";
import { jobOpenings } from "../content/siteContent";

const principles = [
  {
    icon: Gauge,
    title: "Work close to the real user problem",
    body: "We care about behavior under pressure, route density, and product clarity more than presentation theatre.",
  },
  {
    icon: PenTool,
    title: "Design with operational consequences",
    body: "A button in a commute app changes real timing, driver utilization, and rider trust. That standard shapes how we make decisions.",
  },
  {
    icon: ShieldCheck,
    title: "Take trust work seriously",
    body: "Safety, escalation, and quality controls are not side features. They are product fundamentals.",
  },
];

export default function Careers() {
  return (
    <div className="site-shell">
      <section className="section-shell">
        <div className="section-frame space-y-10">
          <SectionHeading
            eyebrow="Careers"
            title={
              <>
                Build shared mobility with people who care about
                <span className="serif-accent"> system quality</span>.
              </>
            }
            description="HopIn needs designers, engineers, operators, and trust specialists who want to solve dense city problems with rigor."
          />
        </div>
      </section>

      <section className="section-shell pt-0">
        <div className="section-frame">
          <div className="panel space-y-8 p-8 md:p-10">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.26em] text-black">
                  Open roles
                </p>
                <h2 className="mt-3 text-4xl font-black uppercase tracking-tighter text-black">
                  Current opportunities
                </h2>
              </div>
              <ButtonLink to="/contact?topic=careers" variant="outline">
                General application
              </ButtonLink>
            </div>

            <div className="grid gap-4">
              {jobOpenings.map((job, index) => (
                <Reveal
                  key={job.title}
                  delay={index * 0.04}
                  className="rounded-none border-2 border-black bg-gray-100 p-6"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2">
                      <div className="route-chip">{job.team}</div>
                      <h3 className="text-2xl font-black uppercase tracking-tight text-black">
                        {job.title}
                      </h3>
                      <p className="text-sm text-black/60">
                        {job.location} / {job.type}
                      </p>
                    </div>

                    <Link
                      to={`/contact?topic=careers&role=${encodeURIComponent(job.title)}`}
                      className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.24em] text-black"
                    >
                      Start conversation
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell">
        <div className="section-frame space-y-12">
          <SectionHeading
            eyebrow="How we work"
            title={
              <>
                The pace is high, but the bar is not chaos.
              </>
            }
            description="We want people who enjoy rigorous product work and systems that must hold up under real urban usage."
          />

          <div className="grid gap-6 lg:grid-cols-3">
            {principles.map((principle, index) => (
              <Reveal key={principle.title} delay={index * 0.05} className="panel p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-none border-2 border-black bg-black text-white">
                  <principle.icon size={22} />
                </div>
                <h3 className="mt-6 text-2xl font-black uppercase tracking-tight text-black">
                  {principle.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-black/60">
                  {principle.body}
                </p>
              </Reveal>
            ))}
          </div>

          <Reveal className="panel flex flex-col gap-6 p-8 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.26em] text-black">
                Reach the team
              </p>
              <h3 className="mt-3 text-3xl font-black uppercase tracking-tight text-black">
                If you like the problem, talk to us.
              </h3>
            </div>
            <ButtonLink to="/contact?topic=careers" size="lg" className="gap-2">
              <BriefcaseBusiness size={16} />
              Contact Recruiting
            </ButtonLink>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

