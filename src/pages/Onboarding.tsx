import * as React from "react";
import { MapPin, Phone, UserCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";

import { Button } from "../components/ui/Button";
import { supportedCities } from "../content/siteContent";
import { updateProfile } from "../lib/api";
import { getErrorMessage, logDevError } from "../lib/errors";
import { toast } from "../lib/toast";
import { useAuthStore } from "../store/useAuthStore";

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, profile, fetchProfile } = useAuthStore();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState({
    full_name: "",
    phone: "",
    city: "",
    gender: "",
    home_address: "",
    work_address: "",
  });

  React.useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (profile?.onboarding_completed) {
      navigate("/dashboard");
    }
  }, [navigate, profile?.onboarding_completed, user]);

  React.useEffect(() => {
    if (!profile) {
      return;
    }

    setFormData({
      full_name: profile.full_name ?? "",
      phone: profile.phone ?? "",
      city: profile.city ?? "",
      gender: profile.gender ?? "",
      home_address: profile.home_address ?? "",
      work_address: profile.work_address ?? "",
    });
  }, [profile]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.full_name.trim() || !formData.city.trim()) {
      setError("Add your name and primary city before continuing.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await updateProfile({
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim() || undefined,
        city: formData.city,
        gender: formData.gender || undefined,
        home_address: formData.home_address.trim() || undefined,
        work_address: formData.work_address.trim() || undefined,
        onboarding_completed: true,
      });
      await fetchProfile();
      toast.success("Profile completed!");
      navigate("/dashboard");
    } catch (submissionError) {
      logDevError("Onboarding.submit", submissionError);
      const message = getErrorMessage(submissionError, "Could not save onboarding right now.");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section-shell flex min-h-[calc(100vh-5rem)] items-center">
      <div className="section-frame max-w-5xl">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="panel-dark flex flex-col justify-between gap-8 p-8 md:p-10">
            <div className="space-y-5">
              <div className="eyebrow text-white">Onboarding</div>
              <h1 className="text-5xl font-black uppercase leading-[0.88] tracking-tighter text-white">
                Set the profile details riders and drivers will trust.
              </h1>
              <p className="text-base leading-8 text-white">
                HopIn only needs a few core details to keep route matching readable: who you are,
                where you ride, and how other riders can identify you.
              </p>
            </div>

            <div className="grid gap-3 text-sm text-white">
              <div className="rounded-none border-2 border-black bg-white px-5 py-4 text-black">
                01 / Public name
              </div>
              <div className="rounded-none border-2 border-black bg-white px-5 py-4 text-black">
                02 / Primary city
              </div>
              <div className="rounded-none border-2 border-black bg-white px-5 py-4 text-black">
                03 / Contact signal
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
                Complete your account
              </h2>
              <p className="mt-3 text-sm leading-7 text-black/60">
                These values are saved to your Supabase profile and used across booking, rider
                dashboards, and driver applications.
              </p>
            </div>

            <div className="flex h-24 w-24 items-center justify-center rounded-none border-2 border-black bg-white text-black">
              <UserCircle2 size={38} />
            </div>

            <div className="grid gap-5">
              <div className="space-y-2">
                <label htmlFor="full-name" className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                  Full name
                </label>
                <input
                  id="full-name"
                  type="text"
                  value={formData.full_name}
                  onChange={(event) => {
                    setError(null);
                    setFormData((current) => ({ ...current, full_name: event.target.value }));
                  }}
                  className="field-shell"
                  placeholder="Aarav Singh"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="city" className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                  Primary city *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-black/60" size={16} />
                  <select
                    id="city"
                    value={formData.city}
                    onChange={(event) => {
                      setError(null);
                      setFormData((current) => ({ ...current, city: event.target.value }));
                    }}
                    className="field-shell pl-12"
                  >
                    <option value="">Select a city</option>
                    {supportedCities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="phone" className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                  Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-black/60" size={16} />
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(event) => {
                      setError(null);
                      setFormData((current) => ({ ...current, phone: event.target.value }));
                    }}
                    className="field-shell pl-12"
                    placeholder="9876543210"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="gender" className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                  Gender (Optional)
                </label>
                <select
                  id="gender"
                  value={formData.gender}
                  onChange={(event) => {
                    setError(null);
                    setFormData((current) => ({ ...current, gender: event.target.value }));
                  }}
                  className="field-shell"
                >
                  <option value="">Select gender</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="home-address" className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                  Home Address (Optional)
                </label>
                <input
                  id="home-address"
                  type="text"
                  value={formData.home_address}
                  onChange={(event) => {
                    setError(null);
                    setFormData((current) => ({ ...current, home_address: event.target.value }));
                  }}
                  className="field-shell"
                  placeholder="123 Main St, Apt 4"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="work-address" className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                  Work Address (Optional)
                </label>
                <input
                  id="work-address"
                  type="text"
                  value={formData.work_address}
                  onChange={(event) => {
                    setError(null);
                    setFormData((current) => ({ ...current, work_address: event.target.value }));
                  }}
                  className="field-shell"
                  placeholder="456 Office Blvd, Suite 100"
                />
              </div>
            </div>

            {error ? (
              <div className="rounded-none border-2 border-black bg-gray-100 px-5 py-4 text-sm text-black">
                {error}
              </div>
            ) : null}

            <Button type="submit" size="lg" disabled={loading}>
              {loading ? "Saving profile" : "Complete onboarding"}
            </Button>
          </motion.form>
        </div>
      </div>
    </div>
  );
}

