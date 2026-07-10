import * as React from "react";

import { subscribeToJournal } from "../lib/api";
import { newsletterSchema } from "../lib/validation";
import { Reveal } from "../components/site/Reveal";
import { SectionHeading } from "../components/site/SectionHeading";
import { Button } from "../components/ui/Button";
import { OptimizedImage } from "../components/ui/OptimizedImage";
import { blogPosts } from "../content/siteContent";

export default function Blog() {
  const [email, setEmail] = React.useState("");
  const [submittedFor, setSubmittedFor] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleSubscribe = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedInput = newsletterSchema.safeParse({
      email: email.trim().toLowerCase(),
    });

    if (!parsedInput.success) {
      setError(parsedInput.error.errors[0]?.message || "Enter a valid email address.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const result = await subscribeToJournal(parsedInput.data.email);
      setSubmittedFor(result.email);
    } catch (subscriptionError) {
      setError(
        subscriptionError instanceof Error
          ? subscriptionError.message
          : "Could not save that journal subscription.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const [featured, ...articles] = blogPosts;

  return (
    <div className="site-shell">
      <section className="section-shell">
        <div className="section-frame space-y-10">
          <SectionHeading
            eyebrow="Journal"
            title={
              <>
                Notes on route density, trust systems, and
                <span className="serif-accent"> better mobility UX</span>.
              </>
            }
            description="These are field notes on route density, trust systems, and better mobility UX."
          />
        </div>
      </section>

      <section className="section-shell pt-0">
        <div className="section-frame">
          <Reveal className="panel overflow-hidden">
            <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
              <OptimizedImage
                src={featured.image}
                alt={featured.title}
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="h-full min-h-[360px] w-full object-cover"
              />
              <div className="space-y-5 p-8 md:p-10">
                <div className="route-chip">{featured.category}</div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                  {featured.date}
                </p>
                <h2 className="text-4xl font-black uppercase tracking-tighter text-black">
                  {featured.title}
                </h2>
                <p className="text-base leading-8 text-black/60">
                  {featured.excerpt}
                </p>
                <p className="text-sm leading-7 text-black/60">
                  Journal entries stay readable on one page until individual article routes are ready.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section-shell">
        <div className="section-frame">
          <div className="grid gap-6 lg:grid-cols-2">
            {articles.map((article, index) => (
              <Reveal key={article.title} delay={index * 0.05} className="panel overflow-hidden">
                <OptimizedImage
                  src={article.image}
                  alt={article.title}
                  sizes="(min-width: 1024px) 32rem, 100vw"
                  className="h-72 w-full object-cover"
                />
                <div className="space-y-4 p-7">
                  <div className="flex items-center justify-between gap-3">
                    <span className="route-chip">{article.category}</span>
                    <span className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                      {article.date}
                    </span>
                  </div>
                  <h3 className="text-3xl font-black uppercase tracking-tight text-black">
                    {article.title}
                  </h3>
                  <p className="text-sm leading-7 text-black/60">
                    {article.excerpt}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell pt-0">
        <div className="section-frame">
          <Reveal className="panel p-8 md:p-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-end">
              <SectionHeading
                eyebrow="Subscribe"
                title={<>Get the next field note when we publish it.</>}
                description="Subscriptions are saved directly in HopIn so the journal CTA behaves like a real launch surface instead of an email workaround."
              />

              <form onSubmit={handleSubscribe} className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <label htmlFor="journal-email" className="sr-only">
                    Email address for journal updates
                  </label>
                  <input
                    id="journal-email"
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setError("");
                      setEmail(event.target.value);
                      setSubmittedFor("");
                    }}
                    placeholder="name@company.com"
                    className="field-shell flex-1"
                  />
                  <Button type="submit" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? "Saving" : "Subscribe"}
                  </Button>
                </div>
                {error ? <p className="text-sm text-black">{error}</p> : null}
                {submittedFor ? (
                  <p className="text-sm text-black/60">
                    {submittedFor} is now subscribed to HopIn Journal updates.
                  </p>
                ) : null}
              </form>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

