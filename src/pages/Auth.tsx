import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { AuthShell } from '../components/auth/AuthShell';
import { ButtonLink } from '../components/ui/Button';
import { mapAuthErrorMessage } from '../lib/errors';
import { signInSchema, signUpSchema } from '../lib/validation';
import { useAuthStore } from '../store/useAuthStore';

type LoginFormValues = {
  email: string;
  password: string;
};
type SignupFormValues = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const { user, profile, loading, signIn, signUp } = useAuthStore();

  useEffect(() => {
    setIsLogin(searchParams.get('mode') !== 'signup');
  }, [searchParams]);

  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(signInSchema),
  });

  const {
    register: registerSignup,
    handleSubmit: handleSignupSubmit,
    formState: { errors: signupErrors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signUpSchema),
  });

  if (loading || (user && !profile)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent" />
      </div>
    );
  }

  if (user) {
    return <Navigate to={profile?.onboarding_completed ? '/dashboard' : '/onboarding'} replace />;
  }

  const onLogin = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await signIn(data.email, data.password);
    } catch (authError: unknown) {
      setError(mapAuthErrorMessage(authError));
    } finally {
      setIsLoading(false);
    }
  };

  const onSignup = async (data: SignupFormValues) => {
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await signUp(data.email, data.password, data.fullName);
      navigate(`/verify-email?email=${encodeURIComponent(data.email)}`, {
        replace: true,
      });
    } catch (authError: unknown) {
      setError(mapAuthErrorMessage(authError));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow={isLogin ? "Account access" : "Create account"}
      title={isLogin ? "Enter." : "Join."}
      description={
        isLogin
          ? "Log in to manage bookings, provider activity, notifications, and account settings."
          : "Create your HopIn account to start booking services or apply as a provider."
      }
    >

        {error ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-8 border-2 border-black bg-black p-4 text-center text-xs font-bold uppercase tracking-widest text-white"
          >
            ERROR: {error}
          </motion.div>
        ) : null}

        {successMsg ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-8 border-2 border-black bg-white p-4 text-center text-xs font-bold uppercase tracking-widest text-black"
          >
            SUCCESS: {successMsg}
          </motion.div>
        ) : null}

        <div className="relative">
          <AnimatePresence mode="wait">
            {isLogin ? (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleLoginSubmit(onLogin)}
                className="space-y-6"
              >
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-black">
                    Email
                  </label>
                  <input
                    {...registerLogin('email')}
                    type="email"
                    placeholder="YOU@EXAMPLE.COM"
                    className="w-full border-2 border-black bg-transparent px-4 py-4 font-bold uppercase text-black transition-all placeholder:text-gray-300 focus:outline-none focus:ring-4 focus:ring-black/20"
                  />
                  {loginErrors.email ? (
                    <p className="mt-2 inline-block bg-gray-200 px-2 py-1 text-xs font-bold uppercase text-black">
                      {loginErrors.email.message}
                    </p>
                  ) : null}
                </div>

                <div>
                  <div className="mb-2 flex items-end justify-between">
                    <label className="block text-xs font-bold uppercase tracking-widest text-black">
                      Password
                    </label>
                    <ButtonLink
                      to="/forgot-password"
                      variant="ghost"
                      size="sm"
                      className="!px-0 !py-0 text-[10px] tracking-widest"
                    >
                      Forgot password
                    </ButtonLink>
                  </div>
                  <input
                    {...registerLogin('password')}
                    type="password"
                    placeholder="********"
                    className="w-full border-2 border-black bg-transparent px-4 py-4 font-bold text-black transition-all placeholder:text-gray-300 focus:outline-none focus:ring-4 focus:ring-black/20"
                  />
                  {loginErrors.password ? (
                    <p className="mt-2 inline-block bg-gray-200 px-2 py-1 text-xs font-bold uppercase text-black">
                      {loginErrors.password.message}
                    </p>
                  ) : null}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-8 flex w-full items-center justify-center border-2 border-black bg-black px-4 py-5 font-bold uppercase tracking-widest text-white shadow-soft transition-colors hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLoading ? 'SIGNING IN...' : 'SIGN IN'}
                  {!isLoading ? (
                    <ArrowRight
                      size={20}
                      strokeWidth={2.5}
                      className="ml-3 transition-transform group-hover:translate-x-2"
                    />
                  ) : null}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="signup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleSignupSubmit(onSignup)}
                className="space-y-6"
              >
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-black">
                    Full Name
                  </label>
                  <input
                    {...registerSignup('fullName')}
                    type="text"
                    placeholder="JOHN DOE"
                    className="w-full border-2 border-black bg-transparent px-4 py-4 font-bold uppercase text-black transition-all placeholder:text-gray-300 focus:outline-none focus:ring-4 focus:ring-black/20"
                  />
                  {signupErrors.fullName ? (
                    <p className="mt-2 inline-block bg-gray-200 px-2 py-1 text-xs font-bold uppercase text-black">
                      {signupErrors.fullName.message}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-black">
                    Email
                  </label>
                  <input
                    {...registerSignup('email')}
                    type="email"
                    placeholder="YOU@EXAMPLE.COM"
                    className="w-full border-2 border-black bg-transparent px-4 py-4 font-bold uppercase text-black transition-all placeholder:text-gray-300 focus:outline-none focus:ring-4 focus:ring-black/20"
                  />
                  {signupErrors.email ? (
                    <p className="mt-2 inline-block bg-gray-200 px-2 py-1 text-xs font-bold uppercase text-black">
                      {signupErrors.email.message}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-black">
                    Password
                  </label>
                  <input
                    {...registerSignup('password')}
                    type="password"
                    placeholder="********"
                    className="w-full border-2 border-black bg-transparent px-4 py-4 font-bold text-black transition-all placeholder:text-gray-300 focus:outline-none focus:ring-4 focus:ring-black/20"
                  />
                  {signupErrors.password ? (
                    <p className="mt-2 inline-block bg-gray-200 px-2 py-1 text-xs font-bold uppercase text-black">
                      {signupErrors.password.message}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-black">
                    Confirm Password
                  </label>
                  <input
                    {...registerSignup('confirmPassword')}
                    type="password"
                    placeholder="********"
                    className="w-full border-2 border-black bg-transparent px-4 py-4 font-bold text-black transition-all placeholder:text-gray-300 focus:outline-none focus:ring-4 focus:ring-black/20"
                  />
                  {signupErrors.confirmPassword ? (
                    <p className="mt-2 inline-block bg-gray-200 px-2 py-1 text-xs font-bold uppercase text-black">
                      {signupErrors.confirmPassword.message}
                    </p>
                  ) : null}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-8 flex w-full items-center justify-center border-2 border-black bg-black px-4 py-5 font-bold uppercase tracking-widest text-white shadow-soft transition-colors hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLoading ? 'CREATING...' : 'CREATE ACCOUNT'}
                  {!isLoading ? (
                    <ArrowRight
                      size={20}
                      strokeWidth={2.5}
                      className="ml-3 transition-transform group-hover:translate-x-2"
                    />
                  ) : null}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-10 border-t-4 border-black pt-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
            {isLogin ? "DON'T HAVE AN ACCOUNT?" : 'ALREADY HAVE AN ACCOUNT?'}{' '}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setSuccessMsg(null);
              }}
              className="ml-2 text-black hover:underline underline-offset-4"
            >
              {isLogin ? 'SIGN UP' : 'LOG IN'}
            </button>
          </p>
        </div>
    </AuthShell>
  );
};

export default Auth;
