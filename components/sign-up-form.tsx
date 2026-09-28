"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const isUoaStudentEmail = (emailAddress: string) => {
  const normalizedEmail = emailAddress
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");

  const atIndex = normalizedEmail.lastIndexOf("@");

  if (atIndex <= 0) {
    return false;
  }

  const localPart = normalizedEmail.slice(0, atIndex);
  const domain = normalizedEmail.slice(atIndex + 1);

  return (
    localPart.length > 0 &&
    domain === "aucklanduni.ac.nz"
  );
};

export default function SignUpForm() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");

    const normalizedEmail = email
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");

    if (!isUoaStudentEmail(normalizedEmail)) {
      setError(
        "Please use your University of Auckland student email address ending in @aucklanduni.ac.nz.",
      );
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== repeatPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } =
        await supabase.auth.signUp({
          email: normalizedEmail,
          password,
        });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (!data.user) {
        setError(
          "Account creation failed. Please try again.",
        );
        return;
      }

      router.push("/auth/sign-up-success");
      router.refresh();
    } catch (err) {
      console.error("Signup error:", err);

      setError(
        "Something went wrong while creating your account. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-white/10 bg-black p-8 shadow-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Create your Rally account
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-400">
            The Rally is for University of Auckland students.
            Use your UoA student email to create an account.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
          noValidate
        >
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-white"
            >
              UoA student email
            </label>

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
              }}
              placeholder="yourname@aucklanduni.ac.nz"
              className="w-full rounded-lg border border-white/15 bg-[#202938] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-white/40 focus:ring-1 focus:ring-white/20"
              required
            />

            <p className="mt-2 text-xs text-gray-400">
              Use your official University of Auckland student
              email.
            </p>
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-white"
            >
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
              placeholder="••••••••"
              className="w-full rounded-lg border border-white/15 bg-transparent px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-white/40 focus:ring-1 focus:ring-white/20"
              minLength={6}
              required
            />

            <p className="mt-2 text-xs text-gray-400">
              At least 6 characters.
            </p>
          </div>

          <div>
            <label
              htmlFor="repeat-password"
              className="mb-2 block text-sm font-medium text-white"
            >
              Repeat password
            </label>

            <input
              id="repeat-password"
              name="repeat-password"
              type="password"
              autoComplete="new-password"
              value={repeatPassword}
              onChange={(event) => {
                setRepeatPassword(event.target.value);
                setError("");
              }}
              placeholder="••••••••"
              className="w-full rounded-lg border border-white/15 bg-transparent px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-white/40 focus:ring-1 focus:ring-white/20"
              minLength={6}
              required
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm leading-6 text-red-600"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-white underline underline-offset-4 hover:text-gray-300"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}