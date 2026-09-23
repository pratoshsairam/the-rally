import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const requestedNext = searchParams.get("next");

  // Only allow internal routes.
  // This prevents the confirmation link from redirecting users
  // to an external website.
  const next =
    requestedNext && requestedNext.startsWith("/")
      ? requestedNext
      : "/onboarding";

  if (tokenHash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      redirect(next);
    }

    const errorMessage = encodeURIComponent(
      error.message || "Unable to confirm your account."
    );

    redirect(`/auth/error?error=${errorMessage}`);
  }

  const errorMessage = encodeURIComponent(
    "The confirmation link is missing required information or has expired."
  );

  redirect(`/auth/error?error=${errorMessage}`);
}