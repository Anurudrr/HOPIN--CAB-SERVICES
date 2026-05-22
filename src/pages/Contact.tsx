import * as React from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import { submitContactMessage } from "../lib/api";
import { contactSchema } from "../lib/validation";
import { Reveal } from "../components/site/Reveal";
import { SectionHeading } from "../components/site/SectionHeading";
import { Button } from "../components/ui/Button";

const topicOptions = [
  "General inquiry",
  "Safety concern",
  "Technical issue",
  "Careers",
  "Partnership",
  "Expansion",
];

function resolveTopicPrefill(requestedTopic: string | null) {
  if (!requestedTopic) return "General inquiry";

  const normalized = requestedTopic.trim().toLowerCase();
  const aliases: Record<string, string> = {
    careers: "Careers",
    career: "Careers",
    expansion: "Expansion",
    partnership: "Partnership",
    partner: "Partnership",
    safety: "Safety concern",
    support: "General inquiry",
    technical: "Technical issue",
    issue: "Technical issue",
    general: "General inquiry",
  };

  return (
    topicOptions.find((topic) => topic.toLowerCase() === normalized) ??
    aliases[normalized] ??
    "General inquiry"
  );
}

function buildPrefillMessage(requestedRole: string | null, requestedCity: string | null) {
  if (requestedRole) {
    return `I would like to discuss the role: ${requestedRole}.`;
  }

  if (requestedCity) {
    return `I would like to request launch coverage in ${requestedCity}.`;
  }

  return "";
}

function normalizeRequestedRole(value: string | null) {
  return value === "rider" || value === "driver" ? value : undefined;
}

export default function Contact() {
  const [searchParams] = useSearchParams();
  const requestedTopic = searchParams.get("topic");
  const requestedRole = searchParams.get("role");
  const requestedCity = searchParams.get("city");

  const [formState, setFormState] = React.useState({
    name: "",
    email: "",
    topic: resolveTopicPrefill(requestedTopic),
    message: buildPrefillMessage(requestedRole, requestedCity),
  });
  const [submitted, setSubmitted] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    setFormState((current) => ({
      ...current,
      topic: resolveTopicPrefill(requestedTopic),
      message: buildPrefillMessage(requestedRole, requestedCity),
    }));
    setSubmitted(false);
    setError("");
  }, [requestedCity, requestedRole, requestedTopic]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedInput = contactSchema.safeParse({
      name: formState.name.trim(),
      email: formState.email.trim().toLowerCase(),
      topic: formState.topic,
      message: formState.message.trim(),
      requestedRole: normalizeRequestedRole(requestedRole),
      requestedCity: requestedCity || undefined,
    });

    if (!parsedInput.success) {
      setError(parsedInput.error.errors[0]?.message || "Fill in the contact form before submitting.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await submitContactMessage(parsedInput.data);
      setSubmitted(true);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Could not submit the contact message right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="site-shell">
      <section className="section-shell">
        <div className="section-frame space-y-10">
          <SectionHeading
            eyebrow="Contact"
            title={
              <>
                Talk to the team behind the route network.
              </>
            }
            description="Messages submitted here are stored directly in HopIn so the support and operations team can follow up without relying on your mail app."
          />
        </div>
      </section>

      <section className="section-shell pt-0">
        <div className="section-frame grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Reveal className="panel p-8 md:p-10">
            <div className="space-y-6">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.26em] text-black">
                  Send a message
                </p>
                <h2 className="mt-3 text-4xl font-black uppercase tracking-tighter text-black">
                  Tell us what you need.
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="contact-name" className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                      Name
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      value={formState.name}
                      onChange={(event) => {
                        setSubmitted(false);
                        setError("");
                        setFormState((current) => ({ ...current, name: event.target.value }));
                      }}
                      className="field-shell"
                      placeholder="Aarav Singh"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="contact-email" className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                      Email
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      value={formState.email}
                      onChange={(event) => {
                        setSubmitted(false);
                        setError("");
                        setFormState((current) => ({ ...current, email: event.target.value }));
                      }}
                      className="field-shell"
                      placeholder="name@company.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="contact-topic" className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                    Topic
                  </label>
                  <select
                    id="contact-topic"
                    value={formState.topic}
                    onChange={(event) => {
                      setSubmitted(false);
                      setError("");
                      setFormState((current) => ({ ...current, topic: event.target.value }));
                    }}
                    className="field-shell"
                  >
                    {topicOptions.map((topic) => (
                      <option key={topic} value={topic}>
                        {topic}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="contact-message" className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    value={formState.message}
                    onChange={(event) => {
                      setSubmitted(false);
                      setError("");
                      setFormState((current) => ({ ...current, message: event.target.value }));
                    }}
                    className="field-shell-lg"
                    placeholder="Describe the route problem, partnership idea, or support issue."
                  />
                </div>

                {error ? <p className="text-sm text-black">{error}</p> : null}
                {submitted ? (
                  <p className="text-sm text-black" aria-live="polite">
                    Your message was submitted to HopIn support.
                  </p>
                ) : null}

                <div className="flex flex-col gap-4 sm:flex-row">
                  <Button type="submit" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? "Sending" : "Send message"}
                  </Button>
                  <a
                    href="mailto:help@hopin.co"
                    className="inline-flex items-center justify-center rounded-none border-2 border-black bg-white px-8 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-black shadow-soft hover:bg-black hover:text-white"
                  >
                    Email directly
                  </a>
                </div>
              </form>
            </div>
          </Reveal>

          <div className="grid gap-6">
            <Reveal className="panel p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-none border-2 border-black bg-white text-black">
                <Mail size={22} />
              </div>
              <h3 className="mt-6 text-2xl font-black uppercase tracking-tight text-black">
                Email support
              </h3>
              <p className="mt-3 text-sm leading-7 text-black/60">
                For direct outreach outside the in-app queue, including product issues and partnerships.
              </p>
              <a href="mailto:help@hopin.co" className="mt-4 inline-block text-sm font-semibold text-black hover:text-black">
                help@hopin.co
              </a>
            </Reveal>

            <Reveal className="panel p-8" delay={0.05}>
              <div className="flex h-12 w-12 items-center justify-center rounded-none border-2 border-black bg-white text-black">
                <Phone size={22} />
              </div>
              <h3 className="mt-6 text-2xl font-black uppercase tracking-tight text-black">
                Phone support
              </h3>
              <p className="mt-3 text-sm leading-7 text-black/60">
                Available for urgent rider and driver support escalations.
              </p>
              <a href="tel:+918045678900" className="mt-4 inline-block text-sm font-semibold text-black hover:text-black">
                +91 80 4567 8900
              </a>
            </Reveal>

            <Reveal className="panel p-8" delay={0.1}>
              <div className="flex h-12 w-12 items-center justify-center rounded-none border-2 border-black bg-black text-white">
                <MapPin size={22} />
              </div>
              <h3 className="mt-6 text-2xl font-black uppercase tracking-tight text-black">
                Bangalore office
              </h3>
              <p className="mt-3 text-sm leading-7 text-black/60">
                HopIn Technologies Private Limited
                <br />
                12, 100 Feet Road, HAL 2nd Stage
                <br />
                Indiranagar, Bangalore 560038
              </p>
            </Reveal>
          </div>
        </div>
      </section>
    </div>
  );
}

