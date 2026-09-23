import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";

async function ErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  const errorMessage =
    params?.error || "An unspecified error occurred.";

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-md border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-600">
          {errorMessage}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href="/auth/login"
          className="flex w-full items-center justify-center rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          Back to login
        </Link>

        <Link
          href="/auth/sign-up"
          className="text-center text-sm underline underline-offset-4"
        >
          Create a new account
        </Link>
      </div>
    </div>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-[#f7f7f5] p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              Something went wrong
            </CardTitle>
          </CardHeader>

          <CardContent>
            <Suspense
              fallback={
                <p className="text-sm text-muted-foreground">
                  Loading error details...
                </p>
              }
            >
              <ErrorContent searchParams={searchParams} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}