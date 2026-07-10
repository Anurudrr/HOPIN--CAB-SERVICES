import { ArrowLeft } from "lucide-react";

import { ButtonLink } from "../components/ui/Button";

export default function NotFound() {
  return (
    <div className="section-shell flex min-h-[calc(100vh-5rem)] items-center">
      <div className="section-frame max-w-3xl">
        <div className="panel p-8 text-center md:p-10">
          <p className="text-[11px] font-black uppercase tracking-[0.26em] text-black/60">
            404
          </p>
          <h1 className="mt-4 text-5xl font-black uppercase tracking-tighter text-black">
            That route does not exist.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-black/60">
            The page may have moved, or the URL is not part of the current HopIn site map.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <ButtonLink to="/" variant="primary" size="lg" className="gap-2">
              <ArrowLeft size={16} />
              Back to home
            </ButtonLink>
            <ButtonLink to="/contact" variant="outline" size="lg">
              Contact support
            </ButtonLink>
          </div>
        </div>
      </div>
    </div>
  );
}

