import { SectionHeading } from "../components/site/SectionHeading";
import { Reveal } from "../components/site/Reveal";

const sections = [
  {
    title: "Eligibility and account use",
    body: "You must be at least 18 years old and provide accurate information when creating a HopIn account. You are responsible for maintaining the security of your login credentials and for activity that occurs through your account.",
  },
  {
    title: "Nature of the platform",
    body: "HopIn provides software for matching riders and drivers on compatible routes. We structure trip information, pricing signals, and support flows, but the transport activity itself is performed by participating riders and drivers.",
  },
  {
    title: "Ride conduct and safety",
    body: "Users must behave lawfully, follow community standards, and respect pickup timing, fellow riders, and driver instructions. HopIn may limit or suspend access when a user's conduct creates safety, fraud, or trust concerns.",
  },
  {
    title: "Payments, cancellations, and changes",
    body: "Displayed fare estimates can change if route conditions, rider count, or timing changes materially. Cancellation policies and any applicable fees should be shown before a rider confirms the final trip state.",
  },
];

export default function Terms() {
  return (
    <div className="site-shell">
      <section className="section-shell">
        <div className="section-frame max-w-5xl space-y-10">
          <SectionHeading
            eyebrow="Terms of service"
            title={
              <>
                Clear rules for a product built around trust and movement.
              </>
            }
            description="Last updated on May 11, 2026. This page is intentionally structured for readability instead of legal-looking filler."
          />
        </div>
      </section>

      <section className="section-shell pt-0">
        <div className="section-frame max-w-4xl space-y-4">
          {sections.map((section, index) => (
            <Reveal key={section.title} delay={index * 0.04} className="panel p-8">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                0{index + 1}
              </p>
              <h2 className="mt-4 text-3xl font-black uppercase tracking-tight text-black">
                {section.title}
              </h2>
              <p className="mt-4 text-sm leading-7 text-black/60">
                {section.body}
              </p>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}

