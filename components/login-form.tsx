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

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // Successful login.
      // Send the user to profile/preferences setup.
      router.push("/onboarding");

      // Refresh the app so the new authenticated session is recognised.
      router.refresh();
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Unable to log in. Please check your email and password.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            Welcome back
          </CardTitle>

          <CardDescription>
            Sign in to continue to The Rally
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">

              {/* Email */}
              <div className="grid gap-2">
                <Label htmlFor="email">
                  UoA email
                </Label>

                <Input
                  id="email"
                  type="email"
                  placeholder="yourname@aucklanduni.ac.nz"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">
                    Password
                  </Label>

                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>

                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              {/* Error message */}
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-600">
                    {error}
                  </p>
                </div>
              )}

              {/* Login button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </div>

            {/* Sign up */}
            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{" "}

              <Link
                href="/auth/sign-up"
                className="font-medium underline underline-offset-4"
              >
                Create an account
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}