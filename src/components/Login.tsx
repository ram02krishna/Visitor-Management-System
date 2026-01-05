"use client";

import type React from "react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link } from "react-router-dom";
import { Shield } from "lucide-react";
import { useAuthStore } from "../store/auth";
import { BackButton } from "./BackButton";
import log from "../lib/logger";
import { LoginSchema } from "../lib/validators";
import { z } from "zod";

type LoginFormData = z.infer<typeof LoginSchema>;


export default function Login() {
  const navigate = useNavigate();
  const { login, signInWithGoogle, isAuthenticated, error } = useAuthStore();
  const isLoading = useAuthStore((state) => state.isLoading);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/app/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = async (data: LoginFormData) => {
    log.info("[Login] Form submitted with email:", data.email);
    try {
      log.info("[Login] Calling login function...");
      await login(data.email, data.password);
      log.info("[Login] Login successful, navigating to dashboard");
      navigate("/app/dashboard");
    } catch (error) {
      log.error("[Login] Login failed:", error);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      log.error("[Login] Google Sign-In failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-950 dark:to-slate-900 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <BackButton />
      <div className="sm:mx-auto sm:w-full sm:max-w-md animate-fadeIn">
        <div className="flex justify-center">
          <div className="p-3 bg-sky-100 dark:bg-sky-900/20 rounded-2xl animate-scaleIn transition-transform duration-300">
            <Shield className="h-10 w-10 sm:h-12 sm:w-12 text-sky-600 dark:text-sky-400" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-sky-600 to-blue-600 dark:from-sky-400 dark:to-blue-400 bg-clip-text text-transparent animate-fadeInUp">
          Campus VMS
        </h2>
        <p
          className="mt-2 text-center text-sm text-gray-600 dark:text-slate-300 animate-fadeInUp px-4"
          style={{ animationDelay: "0.1s" }}
        >
          Sign in to access the Visitor Management System
        </p>
      </div>

      <div
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md animate-fadeInUp"
        style={{ animationDelay: "0.2s" }}
      >
        <div className="glass py-6 sm:py-8 px-4 sm:px-10 shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-500">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-slate-300"
              >
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register("email")}
                  className="appearance-none block w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm sm:text-base bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 transition-all duration-300 hover:border-sky-400"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-slate-300"
              >
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...register("password")}
                  className="appearance-none block w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm sm:text-base bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 transition-all duration-300 hover:border-sky-400"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>
            </div>

            {error && (
              <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2.5 sm:py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm sm:text-base font-medium text-white bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95"
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex justify-center items-center py-2.5 sm:py-3 px-4 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm text-sm sm:text-base font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg"
            >
              <img
                className="w-5 h-5 mr-2"
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google logo"
              />
              Sign in with Google
            </button>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-slate-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400">
                  Don't have an account?
                </span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link
                to="/signup"
                className="font-medium text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors duration-300 hover:underline"
              >
                Create new account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
