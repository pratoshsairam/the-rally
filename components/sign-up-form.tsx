"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");
  const [repeatPassword, setRepeatPassword] =
    useState("");
  const [error, setError] =
    useState<string | null>(null);
  const [isLoading, setIsLoading] =
    useState(false);

  const router = useRouter();

  const isUoaStudentEmail = (
    emailAddress: string,
  ) => {
    const normalizedEmail =
      emailAddress.trim().toLowerCase();

    return normalizedEmail.endsWith(
      "@aucklanduni.ac.nz",
    );
  };

  const handleSignUp = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault();

    setIsLoading(true);
    setError(null);

    const normalizedEmail =
      email.trim().toLowerCase();

    // =====================================================
    // UOA EMAIL VALIDATION
    // =====================================================

    if (!isUoaStudentEmail(normalizedEmail)) {
      setError(
        "Please use your University of Auckland student email address ending in @aucklanduni.ac.nz.",
      );

      setIsLoading(false);
      return;
    }

    // =====================================================
    // PASSWORD VALIDATION
    // =====================================================

    if (password !== repeatPassword) {
      setError(
        "Passwords do not match.",
      );

      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError(
        "Your password must be at least 6 characters long.",
      );

      setIsLoading(false);
      return;
    }

    try {
      const supabase =
        createClient();

      const {
        error: signUpError,
      } =
        await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/protected`,
          },
        });

      if (signUpError) {
        throw signUpError;
      }

      router.push(
        "/auth/sign-up-success",
      );
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(
          error.message,
        );
      } else {
        setError(
          "We couldn't create your account. Please try again.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-6",
        className,
      )}
      {...props}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            Create your Rally account
          </CardTitle>

          <CardDescription>
            The Rally is for University of
            Auckland students. Use your UoA
            student email to create an account.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleSignUp}
          >
            <div className="flex flex-col gap-6">

              {/* =================================================
                  EMAIL
              ================================================= */}

              <div className="grid gap-2">
                <Label htmlFor="email">
                  UoA student email
                </Label>

                <Input
                  id="email"
                  type="email"
                  placeholder="yourname@aucklanduni.ac.nz"
                  required
                  value={email}
                  onChange={(e) =>
                    setEmail(
                      e.target.value,
                    )
                  }
                  autoComplete="email"
                />

                <p className="text-xs text-muted-foreground">
                  Use your official University
                  of Auckland student email.
                </p>
              </div>

              {/* =================================================
                  PASSWORD
              ================================================= */}

              <div className="grid gap-2">
                <Label htmlFor="password">
                  Password
                </Label>

                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) =>
                    setPassword(
                      e.target.value,
                    )
                  }
                  autoComplete="new-password"
                />

                <p className="text-xs text-muted-foreground">
                  At least 6 characters.
                </p>
              </div>

              {/* =================================================
                  REPEAT PASSWORD
              ================================================= */}

              <div className="grid gap-2">
                <Label htmlFor="repeat-password">
                  Repeat password
                </Label>

                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={
                    repeatPassword
                  }
                  onChange={(e) =>
                    setRepeatPassword(
                      e.target.value,
                    )
                  }
                  autoComplete="new-password"
                />
              </div>

              {/* =================================================
                  ERROR
              ================================================= */}

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3">
                  <p className="text-sm leading-5 text-red-600">
                    {error}
                  </p>
                </div>
              )}

              {/* =================================================
                  SIGN UP
              ================================================= */}

              <Button
                type="submit"
                className="w-full"
                disabled={
                  isLoading
                }
              >
                {isLoading
                  ? "Creating your account..."
                  : "Create account"}
              </Button>
            </div>

            {/* =================================================
                LOGIN
            ================================================= */}

            <div className="mt-4 text-center text-sm">
              Already have an account?{" "}

              <Link
                href="/auth/login"
                className="font-medium underline underline-offset-4"
              >
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}