import * as React from "react";
import { CalendarDays, CarFront, FileText, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";

import { Button, ButtonLink } from "../components/ui/Button";
import { submitDriverApplication } from "../lib/api";
import { getErrorMessage, logDevError } from "../lib/errors";
import { toast } from "../lib/toast";
import {
  driverApplicationSchema,
  MAX_DRIVER_CAPACITY,
  MAX_DRIVER_VEHICLE_YEAR,
  MIN_DRIVER_CAPACITY,
  MIN_DRIVER_VEHICLE_YEAR,
} from "../lib/validation";
import { useAuthStore } from "../store/useAuthStore";

const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024;
const allowedDocumentTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

function getValidationErrorMessage(error: string[] | undefined, fallback: string) {
  return error?.[0] || fallback;
}

export default function DriverOnboarding() {
  const navigate = useNavigate();
  const { user, profile, fetchProfile } = useAuthStore();
  const [loading, setLoading] = React.useState(false);
  const [completed, setCompleted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState({
    licenseNumber: "",
    licenseExpiry: "",
    documentUrl: "",
    make: "",
    model: "",
    year: "",
    color: "",
    capacity: "4",
    plate: "",
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      setError("Sign in before submitting a driver application.");
      return;
    }

    if (!profile?.city) {
      setError("Complete account onboarding first so your city is on file.");
      return;
    }

    const parsedInput = driverApplicationSchema.safeParse({
      licenseNumber: formData.licenseNumber.trim(),
      licenseExpiry: formData.licenseExpiry,
      documentUrl: formData.documentUrl.trim() || undefined,
      make: formData.make.trim(),
      model: formData.model.trim(),
      year: Number(formData.year),
      color: formData.color.trim(),
      capacity: Number(formData.capacity),
      plate: formData.plate.trim().toUpperCase(),
    });

    if (!parsedInput.success) {
      setError(
        getValidationErrorMessage(
          parsedInput.error.flatten().formErrors,
          parsedInput.error.errors[0]?.message || "Complete the driver application fields before submitting.",
        ),
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await submitDriverApplication({
        ...parsedInput.data,
        documentUrl: parsedInput.data.documentUrl || "",
      });
      await fetchProfile();
      toast.success("Application submitted!");
      setCompleted(true);
    } catch (submissionError) {
      logDevError("DriverOnboarding.submit", submissionError);
      const message = getErrorMessage(submissionError, "Could not submit the driver application.");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="section-shell flex min-h-[calc(100vh-5rem)] items-center">
        <div className="section-frame max-w-3xl">
          <div className="panel p-8 text-center md:p-10">
            <h1 className="text-4xl font-black uppercase tracking-tight text-black">
              Sign in before applying as a driver.
            </h1>
            <p className="mt-4 text-sm leading-7 text-black/60">
              Driver applications are tied directly to your Supabase account profile.
            </p>
            <ButtonLink to="/login?mode=signup" size="lg" className="mt-8">
              Create an account
            </ButtonLink>
          </div>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="section-shell flex min-h-[calc(100vh-5rem)] items-center">
        <div className="section-frame max-w-3xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="panel-dark p-8 text-center md:p-10"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-none border-2 border-black bg-white text-black">
              <ShieldCheck size={28} />
            </div>
            <h1 className="mt-6 text-4xl font-black uppercase tracking-tight text-white">
              Application submitted
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white">
              Your license details, secure document path, and vehicle metadata are now stored for
              review. You can publish rides only after the application is approved and your account
              is activated as a driver.
            </p>
            <Button variant="outline" size="lg" className="mt-8" onClick={() => navigate("/dashboard")}>
              Return to dashboard
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="section-shell flex min-h-[calc(100vh-5rem)] items-center">
      <div className="section-frame max-w-6xl">
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="panel-dark flex flex-col justify-between gap-8 p-8 md:p-10">
            <div className="space-y-5">
              <div className="eyebrow text-white">Driver application</div>
              <h1 className="text-5xl font-black uppercase leading-[0.88] tracking-tighter text-white">
                Add the license and vehicle details needed to schedule rides.
              </h1>
              <p className="text-base leading-8 text-white">
                This flow writes directly to `driver_applications` and `vehicles`, then sends your
                account into the driver approval queue.
              </p>
            </div>

            <div className="grid gap-3 text-sm text-white">
              <div className="rounded-none border-2 border-black bg-white px-5 py-4 text-black">
                01 / License metadata
              </div>
              <div className="rounded-none border-2 border-black bg-white px-5 py-4 text-black">
                02 / Review document link
              </div>
              <div className="rounded-none border-2 border-black bg-white px-5 py-4 text-black">
                03 / Vehicle record
              </div>
            </div>
          </div>

          <motion.form
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="panel space-y-8 p-8 md:p-10"
          >
            <div>
              <h2 className="text-4xl font-black uppercase tracking-tight text-black">
                Driver details
              </h2>
              <p className="mt-3 text-sm leading-7 text-black/60">
                Use the exact details you want attached to your public driver and vehicle records.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="license-number" className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                  License number
                </label>
                <div className="relative">
                  <FileText className="absolute left-5 top-1/2 -translate-y-1/2 text-black/60" size={16} />
                  <input
                    id="license-number"
                    type="text"
                    value={formData.licenseNumber}
                    onChange={(event) => {
                      setError(null);
                      setFormData((current) => ({ ...current, licenseNumber: event.target.value }));
                    }}
                    className="field-shell pl-12"
                    placeholder="MH1420261234567"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="license-expiry" className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                  License expiry
                </label>
                <div className="relative">
                  <CalendarDays className="absolute left-5 top-1/2 -translate-y-1/2 text-black/60" size={16} />
                  <input
                    id="license-expiry"
                    type="date"
                    value={formData.licenseExpiry}
                    onChange={(event) => {
                      setError(null);
                      setFormData((current) => ({ ...current, licenseExpiry: event.target.value }));
                    }}
                    className="field-shell pl-12"
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label htmlFor="document-file" className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                  Document Upload (PDF or Image)
                </label>
                <input
                  id="document-file"
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(event) => {
                    setError(null);
                    const file = event.target.files?.[0];
                    if (file) {
                      if (!allowedDocumentTypes.has(file.type)) {
                        toast.error("Upload a PDF, JPG, PNG, or WEBP file.");
                        event.target.value = "";
                        return;
                      }

                      if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
                        toast.error("Upload a file smaller than 5 MB.");
                        event.target.value = "";
                        return;
                      }

                      const reader = new FileReader();
                      reader.onload = (e) => {
                        const dataUrl = e.target?.result as string;
                        setFormData((current) => ({ ...current, documentUrl: dataUrl }));
                        toast.success("Document loaded");
                      };
                      reader.onerror = () => {
                        toast.error("Failed to read file");
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="field-shell"
                />
                <p className="text-xs text-black/60">
                  Upload a PDF or image up to 5 MB.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="vehicle-make" className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                  Make
                </label>
                <div className="relative">
                  <CarFront className="absolute left-5 top-1/2 -translate-y-1/2 text-black/60" size={16} />
                  <input
                    id="vehicle-make"
                    type="text"
                    value={formData.make}
                    onChange={(event) => {
                      setError(null);
                      setFormData((current) => ({ ...current, make: event.target.value }));
                    }}
                    className="field-shell pl-12"
                    placeholder="Hyundai"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="vehicle-model" className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                  Model
                </label>
                <input
                  id="vehicle-model"
                  type="text"
                  value={formData.model}
                  onChange={(event) => {
                    setError(null);
                    setFormData((current) => ({ ...current, model: event.target.value }));
                  }}
                  className="field-shell"
                  placeholder="Creta"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="vehicle-year" className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                  Year
                </label>
                <input
                  id="vehicle-year"
                  type="number"
                  min={MIN_DRIVER_VEHICLE_YEAR}
                  max={MAX_DRIVER_VEHICLE_YEAR}
                  value={formData.year}
                  onChange={(event) => {
                    setError(null);
                    setFormData((current) => ({ ...current, year: event.target.value }));
                  }}
                  className="field-shell"
                  placeholder="2023"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="vehicle-color" className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                  Color
                </label>
                <input
                  id="vehicle-color"
                  type="text"
                  value={formData.color}
                  onChange={(event) => {
                    setError(null);
                    setFormData((current) => ({ ...current, color: event.target.value }));
                  }}
                  className="field-shell"
                  placeholder="White"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="vehicle-capacity" className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                  Capacity
                </label>
                <input
                  id="vehicle-capacity"
                  type="number"
                  min={MIN_DRIVER_CAPACITY}
                  max={MAX_DRIVER_CAPACITY}
                  value={formData.capacity}
                  onChange={(event) => {
                    setError(null);
                    setFormData((current) => ({ ...current, capacity: event.target.value }));
                  }}
                  className="field-shell"
                  placeholder="4"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="vehicle-plate" className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                  License plate
                </label>
                <input
                  id="vehicle-plate"
                  type="text"
                  value={formData.plate}
                  onChange={(event) => {
                    setError(null);
                    setFormData((current) => ({ ...current, plate: event.target.value }));
                  }}
                  className="field-shell"
                  placeholder="MH01AB1234"
                />
              </div>
            </div>

            {error ? (
              <div className="rounded-none border-2 border-black bg-gray-100 px-5 py-4 text-sm text-black">
                {error}
              </div>
            ) : null}

            <Button type="submit" size="lg" disabled={loading}>
              {loading ? "Submitting application" : "Submit driver application"}
            </Button>
          </motion.form>
        </div>
      </div>
    </div>
  );
}

