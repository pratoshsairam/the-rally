import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#111111]">
      <div className="flex min-h-screen">

        {/* Left side */}
        <section className="hidden w-1/2 bg-black p-12 text-white lg:flex lg:flex-col lg:justify-between">

          <div>
            <div className="text-2xl font-semibold tracking-[-0.04em]">
              The Rally
            </div>
          </div>

          <div className="max-w-xl">

            <p className="mb-6 text-sm uppercase tracking-[0.2em] text-white/40">
              University of Auckland
            </p>

            <h1 className="text-6xl font-semibold leading-[0.95] tracking-[-0.06em]">
              Find your people.
              <br />
              <span className="text-white/35">
                Play your game.
              </span>
            </h1>

            <p className="mt-8 max-w-md text-lg leading-8 text-white/50">
              Find UoA students who want to play the same sport,
              at the same time, in the same place.
            </p>

          </div>

          <p className="text-sm text-white/30">
            Built for the UoA student community.
          </p>

        </section>


        {/* Login side */}
        <section className="flex w-full items-center justify-center px-6 lg:w-1/2">

          <div className="w-full max-w-md">

            {/* Mobile logo */}
            <div className="mb-16 lg:hidden">
              <div className="text-2xl font-semibold tracking-[-0.04em]">
                The Rally
              </div>
            </div>


            {/* Heading */}
            <div>

              <p className="text-sm font-medium uppercase tracking-[0.2em] text-black/35">
                Welcome
              </p>

              <h2 className="mt-4 text-5xl font-semibold tracking-[-0.05em]">
                Let&apos;s play.
              </h2>

              <p className="mt-5 leading-7 text-black/50">
                Sign in with your University of Auckland account
                to access The Rally.
              </p>

            </div>


            {/* Login button */}
            <div className="mt-10">

              <Link
                href="/auth/login"
                className="flex w-full items-center justify-center rounded-full bg-black px-6 py-4 text-sm font-medium text-white transition hover:scale-[1.01] hover:bg-black/85"
              >
                Continue with UoA
              </Link>

            </div>


            {/* Divider */}
            <div className="my-8 flex items-center gap-4">

              <div className="h-px flex-1 bg-black/10" />

              <span className="text-xs text-black/30">
                UoA students only
              </span>

              <div className="h-px flex-1 bg-black/10" />

            </div>


            {/* Verification information */}
            <div className="rounded-2xl border border-black/8 bg-white p-5">

              <div className="flex gap-4">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
                  ✓
                </div>

                <div>

                  <p className="text-sm font-medium">
                    Verified student community
                  </p>

                  <p className="mt-1 text-sm leading-6 text-black/45">
                    Your UoA account helps keep The Rally
                    limited to verified students.
                  </p>

                </div>

              </div>

            </div>


            <p className="mt-8 text-center text-xs leading-5 text-black/30">
              By continuing, you agree to use The Rally
              respectfully and safely.
            </p>

          </div>

        </section>

      </div>
    </main>
  );
}