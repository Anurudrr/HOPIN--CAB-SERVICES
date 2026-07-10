import { Reveal } from "../components/site/Reveal";
import { SectionHeading } from "../components/site/SectionHeading";

const privacySections = [
  {
    title: "Data we collect",
    body: "HopIn collects account details, route inputs, device context, and trip-related metadata needed to deliver matching, fare visibility, safety controls, and support. We keep collection scoped to product function rather than novelty.",
  },
  {
    title: "How location is used",
    body: "Location data powers route matching, pickup coordination, and trip visibility. We only use this information for the operational needs of the mobility experience and related safety workflows.",
  },
  {
    title: "Storage and protection",
    body: "We use modern infrastructure and access controls to reduce the risk of unauthorized access. Sensitive operational data should only be available to systems and staff who need it for platform integrity or support.",
  },
  {
    title: "AI support and third-party processing",
    body: "If you use AI support, your messages may be processed by a third-party model provider along with limited account and trip metadata such as role, city, booking status, seat count, fare, and departure time. HopIn is designed not to send passwords, OTPs, full payment details, or exact pickup and drop addresses through that support flow.",
  },
  {
    title: "User control",
    body: "Users should be able to review and correct profile information, manage communication preferences, and contact support when a data concern cannot be handled inside the product.",
  },
];

export default function Privacy() {
  return (
    <div className="site-shell">
      <section className="section-shell">
        <div className="section-frame max-w-5xl space-y-10">
          <SectionHeading
            eyebrow="Privacy policy"
            title={
              <>
                Privacy should be understandable by the people it affects.
              </>
            }
            description="Updated on May 22, 2026. The page now states how AI support handles messages and what data is intentionally kept out of that flow."
          />
        </div>
      </section>

      <section className="section-shell pt-0">
        <div className="section-frame max-w-4xl space-y-4">
          {privacySections.map((section, index) => (
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

