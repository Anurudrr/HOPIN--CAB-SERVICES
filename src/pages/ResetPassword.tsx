import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { AuthShell } from "../components/auth/AuthShell";
import { resetPasswordSchema } from "../lib/validation";
import { toast } from "../lib/toast";
import { useAuthStore } from "../store/useAuthStore";

type ResetPasswordValues = {
  password: string;
  confirmPassword: string;
};

export default function ResetPassword() {
  const navigate = useNavigate();
  const updatePassword = useAuthStore((state) => state.updatePassword);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    setReady(hash.includes("access_token") || search.includes("type=recovery"));
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (values: ResetPasswordValues) => {
    await updatePassword(values.password);
    toast.success("Password updated");
    navigate("/login", { replace: true });
  };

  return (
    <AuthShell
      eyebrow="Secure update"
      title="New pass."
      description="Choose a fresh password for your account. This reset link should only be used by you."
    >
      {!ready ? (
        <div className="border-2 border-black bg-gray-100 p-5 text-sm leading-7 text-black/70">
          Open this page from the password reset email so Supabase can attach the recovery session.
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-black">
              New password
            </label>
            <input
              {...register("password")}
              type="password"
              placeholder="********"
              className="w-full border-2 border-black bg-transparent px-4 py-4 font-bold text-black transition-all placeholder:text-gray-300 focus:outline-none focus:ring-4 focus:ring-black/20"
            />
            {errors.password ? (
              <p className="mt-2 inline-block bg-gray-200 px-2 py-1 text-xs font-bold uppercase text-black">
                {errors.password.message}
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-black">
              Confirm password
            </label>
            <input
              {...register("confirmPassword")}
              type="password"
              placeholder="********"
              className="w-full border-2 border-black bg-transparent px-4 py-4 font-bold text-black transition-all placeholder:text-gray-300 focus:outline-none focus:ring-4 focus:ring-black/20"
            />
            {errors.confirmPassword ? (
              <p className="mt-2 inline-block bg-gray-200 px-2 py-1 text-xs font-bold uppercase text-black">
                {errors.confirmPassword.message}
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center border-2 border-black bg-black px-4 py-5 font-bold uppercase tracking-widest text-white shadow-soft transition-colors hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Updating..." : "Update password"}
            {!isSubmitting ? <ArrowRight size={20} strokeWidth={2.5} className="ml-3" /> : null}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
