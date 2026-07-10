import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";

import { AuthShell } from "../components/auth/AuthShell";
import { ButtonLink } from "../components/ui/Button";
import { forgotPasswordSchema } from "../lib/validation";
import { toast } from "../lib/toast";
import { useAuthStore } from "../store/useAuthStore";

type ForgotPasswordValues = {
  email: string;
};

export default function ForgotPassword() {
  const requestPasswordReset = useAuthStore((state) => state.requestPasswordReset);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    await requestPasswordReset(values.email);
    toast.success("Password reset email sent");
  };

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset."
      description="Send a secure recovery email so you can update your password without losing your booking history."
    >
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

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center border-2 border-black bg-black px-4 py-5 font-bold uppercase tracking-widest text-white shadow-soft transition-colors hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Sending..." : "Send reset email"}
          {!isSubmitting ? <ArrowRight size={20} strokeWidth={2.5} className="ml-3" /> : null}
        </button>

        {isSubmitSuccessful ? (
          <p className="border-2 border-black bg-white p-4 text-center text-xs font-bold uppercase tracking-[0.18em] text-black">
            Check your inbox for the reset link.
          </p>
        ) : null}
      </form>

      <div className="mt-10 border-t-4 border-black pt-6 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
          Remembered your password?
          <ButtonLink to="/login" variant="ghost" size="sm" className="ml-2">
            Log in
          </ButtonLink>
        </p>
      </div>
    </AuthShell>
  );
}
