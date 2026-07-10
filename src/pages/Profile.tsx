import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreditCard, LogOut, MapPin, Settings, Shield, User } from "lucide-react";
import { motion } from "motion/react";
import { useForm } from "react-hook-form";

import { PlaceAutocompleteInput } from "../components/booking/PlaceAutocompleteInput";
import { Avatar } from "../components/ui/Avatar";
import { Button, ButtonLink } from "../components/ui/Button";
import { supportedCities } from "../lib/cities";
import { updateProfile, uploadAvatar } from "../lib/api";
import { deleteSavedLocation, getSavedLocations, saveLocation } from "../lib/platformApi";
import { toast } from "../lib/toast";
import {
  changePasswordSchema,
  profileUpdateSchema,
  savedLocationSchema,
  type ChangePasswordInput,
  type ProfileUpdateInput,
  type SavedLocationInput,
} from "../lib/validation";
import { useAuthStore } from "../store/useAuthStore";
import type { Location } from "../store/useBookingStore";
import type { SavedLocation } from "../types";

const sections = [
  { icon: Shield, title: "Email verification", description: "Used for login and booking alerts." },
  { icon: MapPin, title: "Primary city", description: "Used for booking defaults and recommendations." },
  { icon: CreditCard, title: "Phone verification", description: "Used for trust and urgent support contact." },
  { icon: Settings, title: "Onboarding status", description: "Tracks whether your booking identity is complete." },
] as const;

export default function Profile() {
  const { user, profile, signOut, loading, fetchProfile, updatePassword } = useAuthStore();
  const [savedLocations, setSavedLocations] = React.useState<SavedLocation[]>([]);
  const [locationDraft, setLocationDraft] = React.useState<Location | undefined>(undefined);
  const [loadingLocations, setLoadingLocations] = React.useState(true);
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [savingPassword, setSavingPassword] = React.useState(false);
  const [savingLocation, setSavingLocation] = React.useState(false);
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfileForm,
    setValue: setProfileValue,
    formState: { errors: profileErrors },
  } = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      city: "",
      gender: "",
      home_address: "",
      work_address: "",
      avatar_url: "",
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPasswordHint: "",
      password: "",
      confirmPassword: "",
    },
  });

  const {
    register: registerLocation,
    handleSubmit: handleLocationSubmit,
    reset: resetLocationForm,
    setValue: setLocationValue,
    formState: { errors: locationErrors },
  } = useForm<SavedLocationInput>({
    resolver: zodResolver(savedLocationSchema),
    defaultValues: {
      label: "",
      address: "",
      lat: 0,
      lng: 0,
      is_default: false,
    },
  });

  const activeCity =
    profile?.city && supportedCities.includes(profile.city as (typeof supportedCities)[number])
      ? (profile.city as (typeof supportedCities)[number])
      : supportedCities[0];

  const refreshSavedLocations = React.useCallback(async () => {
    if (!profile?.id) {
      setSavedLocations([]);
      setLoadingLocations(false);
      return;
    }

    setLoadingLocations(true);

    try {
      const rows = await getSavedLocations();
      setSavedLocations(rows);
    } catch {
      setSavedLocations([]);
    } finally {
      setLoadingLocations(false);
    }
  }, [profile?.id]);

  React.useEffect(() => {
    void refreshSavedLocations();
  }, [refreshSavedLocations]);

  React.useEffect(() => {
    if (!profile) {
      return;
    }

    resetProfileForm({
      full_name: profile.full_name ?? "",
      phone: profile.phone ?? "",
      city: profile.city && supportedCities.includes(profile.city as (typeof supportedCities)[number]) ? profile.city as (typeof supportedCities)[number] : "",
      gender: profile.gender ?? "",
      home_address: profile.home_address ?? "",
      work_address: profile.work_address ?? "",
      avatar_url: profile.avatar_url ?? "",
    });
  }, [profile, resetProfileForm]);

  React.useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  if (loading || (user && !profile)) {
    return (
      <div className="section-shell flex min-h-[calc(100vh-5rem)] items-center justify-center">
        <div className="panel flex items-center gap-4 px-6 py-5">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-black border-t-transparent" />
          <p className="text-sm font-medium text-black/60">Fetching your account settings.</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="section-shell flex min-h-[calc(100vh-5rem)] items-center justify-center">
        <div className="panel max-w-xl p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-none border-2 border-black bg-white text-black">
            <User size={28} />
          </div>
          <h1 className="mt-6 text-4xl font-black uppercase tracking-tight text-black">
            Sign in to view your profile.
          </h1>
          <ButtonLink to="/login" size="lg" className="mt-8">
            Go to login
          </ButtonLink>
        </div>
      </div>
    );
  }

  const onSaveProfile = async (values: ProfileUpdateInput) => {
    setSavingProfile(true);

    try {
      let avatarUrl = values.avatar_url?.trim() || profile.avatar_url || undefined;

      if (avatarFile) {
        avatarUrl = await uploadAvatar(avatarFile);
      }

      await updateProfile({
        full_name: values.full_name.trim(),
        phone: values.phone?.trim() || undefined,
        city: values.city || undefined,
        gender: values.gender?.trim() || undefined,
        home_address: values.home_address?.trim() || undefined,
        work_address: values.work_address?.trim() || undefined,
        avatar_url: avatarUrl,
      });
      await fetchProfile();
      setAvatarFile(null);
      setAvatarPreview(null);
      setProfileValue("avatar_url", avatarUrl || "");
      toast.success("Profile updated.");
    } catch (profileError) {
      toast.error(profileError instanceof Error ? profileError.message : "Could not update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const onChangePassword = async (values: ChangePasswordInput) => {
    setSavingPassword(true);

    try {
      await updatePassword(values.password);
      toast.success("Password updated.");
      resetPasswordForm();
    } catch (passwordError) {
      toast.error(passwordError instanceof Error ? passwordError.message : "Could not update password.");
    } finally {
      setSavingPassword(false);
    }
  };

  const onSaveLocation = async (values: SavedLocationInput) => {
    if (!locationDraft) {
      toast.error("Choose a location suggestion before saving it.");
      return;
    }

    setSavingLocation(true);

    try {
      await saveLocation({
        label: values.label,
        address: locationDraft.address,
        lat: locationDraft.lat,
        lng: locationDraft.lng,
        is_default: values.is_default,
      });
      toast.success("Saved location added.");
      resetLocationForm();
      setLocationDraft(undefined);
      await refreshSavedLocations();
    } catch (locationError) {
      toast.error(locationError instanceof Error ? locationError.message : "Could not save that location.");
    } finally {
      setSavingLocation(false);
    }
  };

  const handleAvatarSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;

    if (!nextFile) {
      setAvatarFile(null);
      setAvatarPreview(null);
      return;
    }

    if (!nextFile.type.startsWith("image/")) {
      toast.error("Choose an image file for your avatar.");
      event.target.value = "";
      return;
    }

    if (nextFile.size > 2 * 1024 * 1024) {
      toast.error("Avatar uploads must be 2MB or smaller.");
      event.target.value = "";
      return;
    }

    if (avatarPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }

    const nextPreview = URL.createObjectURL(nextFile);
    setAvatarFile(nextFile);
    setAvatarPreview(nextPreview);
  };

  return (
    <div className="section-shell pt-6">
      <div className="section-frame max-w-6xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel flex flex-col gap-8 p-8 md:flex-row md:items-center"
        >
          <Avatar
            src={avatarPreview || profile.avatar_url}
            name={profile.full_name}
            alt={`${profile.full_name || "HopIn user"} avatar`}
            className="h-28 w-28"
          />

          <div className="flex-1 space-y-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black">
                Account settings
              </p>
              <h1 className="mt-2 text-4xl font-black uppercase tracking-tight text-black">
                {profile.full_name || "HopIn user"}
              </h1>
              <p className="mt-2 text-sm text-black/60">{profile.email}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <span className="route-chip">Role / {profile.role}</span>
              <span className="route-chip">City / {profile.city || "Not added"}</span>
              <span className="route-chip">
                Verified /{" "}
                {profile.is_email_verified && profile.is_phone_verified
                  ? "Confirmed"
                  : profile.is_email_verified || profile.is_phone_verified
                    ? "Partial"
                    : "Pending"}
              </span>
              <span className="route-chip">
                Account / {profile.onboarding_completed ? "Complete" : "Needs onboarding"}
              </span>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((section) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="panel flex items-center justify-between p-6 text-left"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-none border-2 border-black bg-black text-white">
                  <section.icon size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-[-0.04em] text-black">
                    {section.title}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-black/60">{section.description}</p>
                </div>
              </div>
              <span className="text-sm text-black/60">
                {section.title === "Email verification"
                  ? profile.is_email_verified
                    ? "Verified"
                    : "Pending"
                  : section.title === "Primary city"
                    ? profile.city || "Not added"
                    : section.title === "Phone verification"
                      ? profile.is_phone_verified
                        ? "Verified"
                        : profile.phone || "Not added"
                      : profile.onboarding_completed
                        ? "Complete"
                        : "Incomplete"}
              </span>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
          <form onSubmit={handleProfileSubmit(onSaveProfile)} className="panel p-8">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black">
              Edit profile
            </p>
            <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-black">
              Public identity and defaults
            </h2>

            <div className="mt-8 grid gap-5">
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                  Full name
                </label>
                <input {...registerProfile("full_name")} className="field-shell" />
                {profileErrors.full_name ? <p className="text-sm text-black">{profileErrors.full_name.message}</p> : null}
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                    Phone
                  </label>
                  <input {...registerProfile("phone")} className="field-shell" />
                  {profileErrors.phone ? <p className="text-sm text-black">{profileErrors.phone.message}</p> : null}
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                    Primary city
                  </label>
                  <select {...registerProfile("city")} className="field-shell">
                    <option value="">Select city</option>
                    {supportedCities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                  Avatar upload
                </label>
                <div className="grid gap-4 md:grid-cols-[auto_1fr]">
                  <Avatar
                    src={avatarPreview || profile.avatar_url}
                    name={profile.full_name}
                    alt={`${profile.full_name || "HopIn user"} avatar preview`}
                    className="h-20 w-20"
                  />
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept="image/*"
                      className="field-shell file:mr-4 file:border-0 file:bg-black file:px-4 file:py-3 file:text-[11px] file:font-black file:uppercase file:tracking-[0.18em] file:text-white"
                      onChange={handleAvatarSelection}
                    />
                    <input {...registerProfile("avatar_url")} type="hidden" />
                    <p className="text-sm text-black/60">
                      Upload a profile image up to 2MB. The preview updates immediately, but the URL is
                      only saved when you save the profile.
                    </p>
                    {avatarFile ? (
                      <p className="text-sm text-black/60">
                        Ready to upload: {avatarFile.name}
                      </p>
                    ) : null}
                  </div>
                </div>
                {profileErrors.avatar_url ? <p className="text-sm text-black">{profileErrors.avatar_url.message}</p> : null}
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                    Home address
                  </label>
                  <input {...registerProfile("home_address")} className="field-shell" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                    Work address
                  </label>
                  <input {...registerProfile("work_address")} className="field-shell" />
                </div>
              </div>
            </div>

            <Button type="submit" className="mt-6" disabled={savingProfile}>
              {savingProfile ? "Saving profile" : "Save profile"}
            </Button>
          </form>

          <div className="grid gap-6">
            <form onSubmit={handlePasswordSubmit(onChangePassword)} className="panel p-8">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black">
                Security
              </p>
              <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-black">
                Change password
              </h2>

              <div className="mt-8 grid gap-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                    New password
                  </label>
                  <input {...registerPassword("password")} type="password" className="field-shell" />
                  {passwordErrors.password ? <p className="text-sm text-black">{passwordErrors.password.message}</p> : null}
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                    Confirm password
                  </label>
                  <input {...registerPassword("confirmPassword")} type="password" className="field-shell" />
                  {passwordErrors.confirmPassword ? <p className="text-sm text-black">{passwordErrors.confirmPassword.message}</p> : null}
                </div>
              </div>

              <Button type="submit" className="mt-6" disabled={savingPassword}>
                {savingPassword ? "Updating password" : "Update password"}
              </Button>
            </form>

            <form
              onSubmit={handleLocationSubmit((values) =>
                onSaveLocation({
                  ...values,
                  address: locationDraft?.address || values.address,
                  lat: locationDraft?.lat || values.lat,
                  lng: locationDraft?.lng || values.lng,
                }),
              )}
              className="panel p-8"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black">
                Saved locations
              </p>
              <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-black">
                Favorite pickup anchors
              </h2>

              <div className="mt-8 grid gap-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                    Label
                  </label>
                  <input {...registerLocation("label")} className="field-shell" placeholder="Home, Venue, Campus" />
                  {locationErrors.label ? <p className="text-sm text-black">{locationErrors.label.message}</p> : null}
                </div>

                <PlaceAutocompleteInput
                  label="Address"
                  city={activeCity}
                  value={locationDraft}
                  placeholder="Search a location in your city"
                  onSelect={(location) => {
                    setLocationDraft(location);
                    setLocationValue("address", location.address);
                    setLocationValue("lat", location.lat);
                    setLocationValue("lng", location.lng);
                  }}
                />
                <input type="hidden" {...registerLocation("address")} />
                <input type="hidden" {...registerLocation("lat", { valueAsNumber: true })} />
                <input type="hidden" {...registerLocation("lng", { valueAsNumber: true })} />

                <label className="flex items-center gap-3 text-sm font-medium text-black">
                  <input type="checkbox" {...registerLocation("is_default")} className="h-4 w-4 accent-black" />
                  Make this a default location
                </label>
              </div>

              <Button type="submit" className="mt-6" disabled={savingLocation}>
                {savingLocation ? "Saving location" : "Save location"}
              </Button>

              <div className="mt-6 grid gap-3">
                {loadingLocations ? (
                  <div className="border-2 border-black bg-gray-100 p-4 text-sm text-black/60">
                    Loading saved locations.
                  </div>
                ) : savedLocations.length ? (
                  savedLocations.map((location) => (
                    <div key={location.id} className="border-2 border-black bg-gray-100 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-black uppercase tracking-[0.08em] text-black">
                            {location.label}
                          </p>
                          <p className="mt-2 text-sm text-black/60">{location.address}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {location.is_default ? <span className="route-chip">Default</span> : null}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="!px-0 !py-0 text-[10px]"
                            onClick={() => {
                              void deleteSavedLocation(location.id).then(async () => {
                                toast.success("Saved location removed.");
                                await refreshSavedLocations();
                              }).catch((deleteError) => {
                                toast.error(deleteError instanceof Error ? deleteError.message : "Could not remove that location.");
                              });
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="border-2 border-black bg-gray-100 p-4 text-sm text-black/60">
                    Add locations here to speed up repeat bookings and trip planning.
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="flex justify-center">
          <Button variant="outline" className="gap-2" onClick={() => void signOut()}>
            <LogOut size={16} />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
