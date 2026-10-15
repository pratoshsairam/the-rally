
"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type TourStep = {
  route: string;
  target: string;
  title: string;
  description: string;
};

const TOUR_KEY = "the-rally-tour-completed";
const STEP_KEY = "the-rally-tour-step";
const ACTIVE_KEY = "the-rally-tour-active";

const STEPS: TourStep[] = [
  {
    route: "/dashboard",
    target: '[data-tour="dashboard"]',
    title: "Welcome to The Rally",
    description:
      "Your dashboard is your starting point. Discover games, host your own, and keep track of your activity.",
  },
  {
    route: "/dashboard",
    target: '[data-tour="explore-games"]',
    title: "Find your next game",
    description:
      "Explore available student games and find something that matches your interests and schedule.",
  },
  {
    route: "/dashboard",
    target: '[data-tour="create-game"]',
    title: "Host a game",
    description:
      "Create a game, choose its details, and give other students a chance to join.",
  },
  {
    route: "/games",
    target: '[data-tour="games-search"]',
    title: "Search for games",
    description:
      "Search by game title, sport, location, or host to find a suitable game.",
  },
  {
    route: "/games",
    target: '[data-tour="games-filters"]',
    title: "Narrow your results",
    description:
      "Use the available filters to refine the games shown.",
  },
  {
    route: "/games",
    target: '[data-tour="games-sort"]',
    title: "Choose how to sort",
    description:
      "Sort available games by start time, available spots, or cost.",
  },
  {
    route: "/profile",
    target: '[data-tour="profile"]',
    title: "Your profile",
    description:
      "Visit your profile to view your student information and account details.",
  },
];

export default function GuidedTour() {
  const pathname = usePathname();
  const router = useRouter();

  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [targetMissing, setTargetMissing] = useState(false);

  const currentStep = STEPS[stepIndex];

  const finishTour = useCallback(() => {
    window.localStorage.setItem(TOUR_KEY, "true");
    window.sessionStorage.removeItem(ACTIVE_KEY);
    window.sessionStorage.removeItem(STEP_KEY);
    setActive(false);
    setTargetRect(null);
  }, []);

  const startTour = useCallback(() => {
    window.localStorage.removeItem(TOUR_KEY);
    window.sessionStorage.setItem(ACTIVE_KEY, "true");
    window.sessionStorage.setItem(STEP_KEY, "0");
    setStepIndex(0);
    setTargetRect(null);
    setTargetMissing(false);
    setActive(true);

    if (window.location.pathname !== "/dashboard") {
      router.push("/dashboard");
    }
  }, [router]);

  useEffect(() => {
    const isActive = window.sessionStorage.getItem(ACTIVE_KEY) === "true";
    const savedStep = Number(window.sessionStorage.getItem(STEP_KEY) || "0");

    if (isActive) {
      setActive(true);
      setStepIndex(
        Number.isInteger(savedStep) && savedStep >= 0 && savedStep < STEPS.length
          ? savedStep
          : 0
      );
      return;
    }

    if (
      pathname === "/dashboard" &&
      !window.localStorage.getItem(TOUR_KEY)
    ) {
      setActive(true);
      setStepIndex(0);
      window.sessionStorage.setItem(ACTIVE_KEY, "true");
      window.sessionStorage.setItem(STEP_KEY, "0");
    }
  }, [pathname]);

  useEffect(() => {
    if (!active || !currentStep) {
      setTargetRect(null);
      return;
    }

    if (pathname !== currentStep.route) {
      router.push(currentStep.route);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    let timeoutId: number | undefined;
    let frame = 0;

    const locateTarget = () => {
      if (cancelled) return;

      const element = document.querySelector(currentStep.target);

      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });

        frame = window.requestAnimationFrame(() => {
          if (cancelled) return;
          setTargetRect(element.getBoundingClientRect());
          setTargetMissing(false);
        });
        return;
      }

      attempts += 1;

      if (attempts < 30) {
        timeoutId = window.setTimeout(locateTarget, 150);
      } else {
        setTargetRect(null);
        setTargetMissing(true);
      }
    };

    locateTarget();

    const updatePosition = () => {
      const element = document.querySelector(currentStep.target);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
      }
    };

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [active, currentStep, pathname, router]);

  const goToStep = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0) return;

      if (nextIndex >= STEPS.length) {
        finishTour();
        return;
      }

      const nextStep = STEPS[nextIndex];

      setStepIndex(nextIndex);
      setTargetRect(null);
      setTargetMissing(false);
      window.sessionStorage.setItem(STEP_KEY, String(nextIndex));

      if (pathname !== nextStep.route) {
        router.push(nextStep.route);
      }
    },
    [finishTour, pathname, router]
  );

  if (!active) {
    return (
      <button
        type="button"
        onClick={startTour}
        className="fixed bottom-5 right-5 z-[9990] rounded-full border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-black shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
        aria-label="Take the guided tour"
      >
        Take a tour
      </button>
    );
  }

  const cardWidth =
    typeof window === "undefined"
      ? 360
      : Math.min(360, window.innerWidth - 32);

  const cardLeft =
    typeof window === "undefined"
      ? 16
      : targetRect
        ? Math.max(
            16,
            Math.min(
              targetRect.left + targetRect.width / 2 - cardWidth / 2,
              window.innerWidth - cardWidth - 16
            )
          )
        : Math.max(16, (window.innerWidth - cardWidth) / 2);

  const cardTop =
    typeof window === "undefined"
      ? 16
      : targetRect
        ? targetRect.bottom + 238 < window.innerHeight
          ? targetRect.bottom + 18
          : Math.max(16, targetRect.top - 240)
        : Math.max(16, (window.innerHeight - 260) / 2);

  return (
    <>
      {targetRect ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[9998] rounded-xl border-2 border-white"
          style={{
            top: targetRect.top - 5,
            left: targetRect.left - 5,
            width: targetRect.width + 10,
            height: targetRect.height + 10,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.68)",
            transition: "all 180ms ease",
          }}
        />
      ) : (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-[9998] bg-black/65"
        />
      )}

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="rally-tour-title"
        className="fixed z-[10000] w-[calc(100vw-32px)] max-w-[360px] rounded-2xl border border-black/10 bg-white p-5 text-black shadow-2xl"
        style={{ left: cardLeft, top: cardTop }}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            The Rally walkthrough
          </span>
          <button
            type="button"
            onClick={finishTour}
            className="text-sm text-gray-500 underline underline-offset-4 hover:text-black"
          >
            Skip tour
          </button>
        </div>

        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-black transition-all"
            style={{
              width: `${((stepIndex + 1) / STEPS.length) * 100}%`,
            }}
          />
        </div>

        <p className="mb-2 text-xs text-gray-500">
          Step {stepIndex + 1} of {STEPS.length}
        </p>

        <h2
          id="rally-tour-title"
          className="text-xl font-semibold tracking-tight"
        >
          {currentStep.title}
        </h2>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          {currentStep.description}
        </p>

        {targetMissing && (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            This feature is not visible on this page right now. You can continue
            the tour or skip it.
          </p>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => goToStep(stepIndex - 1)}
            disabled={stepIndex === 0}
            className="rounded-full border border-gray-200 px-4 py-2.5 text-sm font-medium transition hover:border-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>

          <button
            type="button"
            onClick={() => goToStep(stepIndex + 1)}
            className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            {stepIndex === STEPS.length - 1 ? "Finish tour" : "Next"}
          </button>
        </div>
      </section>
    </>
  );
}