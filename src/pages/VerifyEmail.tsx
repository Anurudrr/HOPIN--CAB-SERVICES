import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { AuthShell } from "../components/auth/AuthShell";
import { ButtonLink } from "../components/ui/Button";
import { mapAuthErrorMessage } from "../lib/errors";
import { toast } from "../lib/toast";
import { verifyEmailOtpSchema } from "../lib/validation";
import { useAuthStore } from "../store/useAuthStore";

type VerifyEmailValues = {
  email: string;
  token: string;
};

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const verifyEmailOtp = useAuthStore((state) => state.verifyEmailOtp);
  const resendSignupOtp = useAuthStore((state) => state.resendSignupOtp);
  const completeEmailVerification = useAuthStore((state) => state.completeEmailVerification);
  const [resending, setResending] = React.useState(false);
  const [autoVerifying, setAutoVerifying] = React.useState(false);
  const defaultEmail = searchParams.get("email") || "";
  const hasAttemptedAutoVerification = React.useRef(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<VerifyEmailValues>({
    resolver: zodResolver(verifyEmailOtpSchema),
    defaultValues: {
      email: defaultEmail,
      token: "",
    },
  });

  React.useEffect(() => {
    if (hasAttemptedAutoVerification.current) {
      return;
    }

    const queryParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const confirmationUrl = queryParams.get("confirmation_url");

    if (confirmationUrl) {
      hasAttemptedAutoVerification.current = true;
      window.location.assign(decodeURIComponent(confirmationUrl));
      return;
    }

    const accessToken = hashParams.get("access_token") || queryParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token") || queryParams.get("refresh_token");
    const code = queryParams.get("code");
    const tokenHash = queryParams.get("token_hash") || queryParams.get("token");
    const type = queryParams.get("type") || hashParams.get("type");
    const email = queryParams.get("email") || hashParams.get("email") || defaultEmail;

    const hasVerificationPayload = Boolean(
      (accessToken && refreshToken) || code || tokenHash,
    );

    if (!hasVerificationPayload) {
      return;
    }

    hasAttemptedAutoVerification.current = true;
    setAutoVerifying(true);

    void completeEmailVerification({
      accessToken,
      refreshToken,
      code,
      tokenHash,
      type,
      email,
    })
      .then(() => {
        toast.success("Email verified");
        navigate("/onboarding", { replace: true });
      })
      .catch((error) => {
        toast.error(mapAuthErrorMessage(error));
        setAutoVerifying(false);
      });
  }, [completeEmailVerification, defaultEmail, navigate]);

  const onSubmit = async (values: VerifyEmailValues) => {
    try {
      await verifyEmailOtp(values.email, values.token);
      toast.success("Email verified");
      navigate("/onboarding", { replace: true });
    } catch (error) {
      toast.error(mapAuthErrorMessage(error));
    }
  };

  const handleResend = async () => {
    const email = getValues("email");
    if (!email) {
      toast.error("Enter your email first");
      return;
    }

    setResending(true);
    try {
      await resendSignupOtp(email);
      toast.success("Verification code resent");
    } catch (error) {
      toast.error(mapAuthErrorMessage(error));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Email verification"
      title="Verify."
      description="Enter the email verification code from Supabase to activate your account and unlock the booking flow."
    >
      {autoVerifying ? (
        <div className="mb-6 border-2 border-black bg-gray-100 px-4 py-4 text-center text-xs font-bold uppercase tracking-[0.18em] text-black">
          Confirming your email and preparing your account...
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-black">
            Email
          </label>
          <input
            {...register("email")}
            type="email"
            placeholder="YOU@EXAMPLE.COM"
            className="w-full border-2 border-black bg-transparent px-4 py-4 font-bold uppercase text-black transition-all placeholder:text-gray-300 focus:outline-none focus:ring-4 focus:ring-black/20"
          />
          {errors.email ? (
            <p className="mt-2 inline-block bg-gray-200 px-2 py-1 text-xs font-bold uppercase text-black">
              {errors.email.message}
            </p>
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-black">
            6-digit code
          </label>
          <input
            {...register("token")}
            type="text"
            maxLength={6}
            placeholder="123456"
            className="w-full border-2 border-black bg-transparent px-4 py-4 font-bold uppercase tracking-[0.45em] text-black transition-all placeholder:text-gray-300 focus:outline-none focus:ring-4 focus:ring-black/20"
          />
          {errors.token ? (
            <p className="mt-2 inline-block bg-gray-200 px-2 py-1 text-xs font-bold uppercase text-black">
              {errors.token.message}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || autoVerifying}
          className="flex w-full items-center justify-center border-2 border-black bg-black px-4 py-5 font-bold uppercase tracking-widest text-white shadow-soft transition-colors hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Verifying..." : "Verify email"}
          {!isSubmitting ? <ArrowRight size={20} strokeWidth={2.5} className="ml-3" /> : null}
        </button>
      </form>

      <div className="mt-8 flex flex-col gap-3 border-t-4 border-black pt-6">
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={resending || autoVerifying}
          className="text-xs font-bold uppercase tracking-[0.18em] text-black hover:underline"
        >
          {resending ? "Resending..." : "Resend code"}
        </button>
        <ButtonLink to="/login" variant="ghost" size="sm">
          Back to login
        </ButtonLink>
      </div>
    </AuthShell>
  );
}
