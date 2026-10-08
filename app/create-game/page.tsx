"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DayPicker } from "react-day-picker";
import TimeSelect from "@/components/time-select";
import { createClient } from "@/lib/supabase/client";

type Sport = {
  id: number;
  name: string;
  slug: string;
  emoji: string | null;
};

type FormState = {
  sportId: string;
  title: string;
  gameDate: string;
  startTime: string;
  endTime: string;
  location: string;
  minPlayers: string;
  maxPlayers: string;
  skillLevel: string;
  gameType: string;
  genderPreference: string;
  agePreference: string;
  costPerPlayer: string;
  description: string;
  chatLink: string;
};

const initialForm: FormState = {
  sportId: "",
  title: "",
  gameDate: "",
  startTime: "",
  endTime: "",
  location: "UoA Recreation Centre",
  minPlayers: "2",
  maxPlayers: "4",
  skillLevel: "beginner",
  gameType: "casual",
  genderPreference: "everyone",
  agePreference: "any",
  costPerPlayer: "0",
  description: "",
  chatLink: "",
};

function formatSportName(name: string) {
  return name
    .split(" ")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatLocalTime(date: Date) {
  const hour = String(date.getHours()).padStart(2, "0");
  return `${hour}:00`;
}

function getSupabaseErrorMessage(error: unknown) {
  if (!error) {
    return "We couldn't create your game. Please try again.";
  }

  if (
    typeof error === "object" &&
    error !== null
  ) {
    const supabaseError = error as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };

    if (supabaseError.message) {
      return supabaseError.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "We couldn't create your game. Please try again.";
}

export default function CreateGamePage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] =
    useState<FormState>(initialForm);

  const [sports, setSports] =
    useState<Sport[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [today, setToday] =
    useState("");

  const [datePickerOpen, setDatePickerOpen] =
    useState(false);

  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!datePickerOpen) return;

    function handleOutsideClick(event: PointerEvent) {
      if (!datePickerRef.current?.contains(event.target as Node)) {
        setDatePickerOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    return () => document.removeEventListener("pointerdown", handleOutsideClick);
  }, [datePickerOpen]);

  useEffect(() => {
    const now = new Date();
    const currentDate = formatLocalDate(now);
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    setToday(currentDate);
    setForm((current) => ({
      ...current,
      gameDate: current.gameDate || currentDate,
      startTime: current.startTime || formatLocalTime(now),
      endTime: current.endTime || formatLocalTime(oneHourLater),
    }));

    async function loadPage() {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/auth/login");
        return;
      }

      const {
        data: sportsData,
        error: sportsError,
      } = await supabase
        .from("sports")
        .select(
          "id, name, slug, emoji"
        )
        .eq("is_active", true)
        .order("name", {
          ascending: true,
        });

      if (sportsError) {
        console.error(
          "Sports loading error:",
          sportsError
        );

        setError(
          "We couldn't load the sports. Please refresh the page."
        );
      } else {
        setSports(
          (sportsData ??
            []) as Sport[]
        );

        if (
          sportsData &&
          sportsData.length > 0
        ) {
          const preferredSport =
            sportsData.find(
              (sport) =>
                sport.slug ===
                "badminton"
            );

          setForm((current) => ({
            ...current,
            sportId: String(
              preferredSport?.id ??
                sportsData[0].id
            ),
          }));
        }
      }

      setLoading(false);
    }

    loadPage();
  }, [router, supabase]);

  const selectedSport = useMemo(() => {
    return sports.find(
      (sport) =>
        String(sport.id) ===
        form.sportId
    );
  }, [sports, form.sportId]);

  function updateField<
    K extends keyof FormState
  >(
    field: K,
    value: FormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (error) {
      setError("");
    }

    if (success) {
      setSuccess("");
    }
  }

  function validateForm() {
    if (!form.sportId) {
      return "Please choose a sport.";
    }

    if (!form.title.trim()) {
      return "Please give your game a title.";
    }

    if (
      form.title.trim().length < 3
    ) {
      return "Your game title should be at least 3 characters.";
    }

    if (!form.gameDate) {
      return "Please choose a date.";
    }

    if (
      today &&
      form.gameDate < today
    ) {
      return "Please choose a future date.";
    }

    if (!form.startTime) {
      return "Please choose a start time.";
    }

    if (!form.endTime) {
      return "Please choose an end time.";
    }

    if (
      form.endTime <=
      form.startTime
    ) {
      return "The end time must be after the start time.";
    }

    if (!form.location.trim()) {
      return "Please enter a location.";
    }

    const minPlayers = Number(form.minPlayers);
    const maxPlayers = Number(
      form.maxPlayers
    );

    if (!form.minPlayers || !Number.isInteger(minPlayers) || minPlayers < 2) {
      return "Minimum players must be at least 2.";
    }

    if (
      !form.maxPlayers ||
      !Number.isInteger(maxPlayers) ||
      maxPlayers < 2
    ) {
      return "A game needs at least 2 players.";
    }

    if (maxPlayers > 100) {
      return "Maximum players cannot exceed 100.";
    }

    if (minPlayers > maxPlayers) {
      return "Minimum players cannot exceed maximum players.";
    }

    if (!form.skillLevel) {
      return "Please choose a skill level.";
    }

    if (
      ![
        "beginner",
        "intermediate",
        "expert",
      ].includes(form.skillLevel)
    ) {
      return "Please choose a valid skill level.";
    }

    if (!form.gameType) {
      return "Please choose a game type.";
    }

    if (
      ![
        "casual",
        "competitive",
      ].includes(form.gameType)
    ) {
      return "Please choose a valid game type.";
    }

    if (
      ![
        "everyone",
        "male",
        "female",
      ].includes(form.genderPreference)
    ) {
      return "Please choose a valid joining preference.";
    }

    if (![
      "any",
      "under_25",
      "25_40",
      "40_plus",
    ].includes(form.agePreference)) {
      return "Please choose a valid age range.";
    }

    const cost = Number(
      form.costPerPlayer
    );

    if (
      Number.isNaN(cost) ||
      cost < 0
    ) {
      return "Cost cannot be negative.";
    }

    return "";
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const validationError =
      validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setCreating(true);

    try {
      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/auth/login");
        return;
      }

      /*
       * Make sure the user's profile exists.
       * games.host_id references profiles.id.
       */
      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error(
          "Profile check error:",
          profileError
        );

        setError(
          getSupabaseErrorMessage(
            profileError
          )
        );

        return;
      }

      if (!profile) {
        setError(
          "Your Rally profile could not be found. Please complete your profile before creating a game."
        );

        return;
      }

      const minPlayers = Number(form.minPlayers);
      const maxPlayers = Number(
        form.maxPlayers
      );

      const costPerPlayer = Number(
        form.costPerPlayer
      );

      /*
       * Create the game.
       */
      const {
        data: createdGame,
        error: gameError,
      } = await supabase
        .from("games")
        .insert({
          host_id: user.id,
          sport_id: Number(
            form.sportId
          ),
          title: form.title.trim(),
          game_date: form.gameDate,
          start_time: form.startTime,
          end_time: form.endTime,
          location_name:
            form.location.trim(),
          min_players: minPlayers,
          max_players: maxPlayers,
          skill_level:
            form.skillLevel,
          game_type:
            form.gameType,
          gender_preference:
            form.genderPreference,
          age_preference:
            form.agePreference,
          cost_per_player:
            costPerPlayer,
          description:
            form.description.trim() ||
            null,
          chat_link: form.chatLink.trim(),
          status: "open",
        })
        .select("id")
        .single();

      if (
        gameError ||
        !createdGame
      ) {
        console.error(
          "Game creation error:",
          gameError
        );

        /*
         * Log the complete error so
         * future database errors are
         * easy to diagnose.
         */
        if (gameError) {
          console.error(
            JSON.stringify(
              {
                message:
                  gameError.message,
                details:
                  gameError.details,
                hint:
                  gameError.hint,
                code:
                  gameError.code,
              },
              null,
              2
            )
          );
        }

        setError(
          getSupabaseErrorMessage(
            gameError
          )
        );

        return;
      }

      /*
       * Add the host as the first player.
       */
      const {
        error: playerError,
      } = await supabase
        .from("game_players")
        .insert({
          game_id:
            createdGame.id,
          user_id: user.id,
          status: "joined",
        });

      if (playerError) {
        console.error(
          "Host join error:",
          playerError
        );

        console.error(
          JSON.stringify(
            {
              message:
                playerError.message,
              details:
                playerError.details,
              hint:
                playerError.hint,
              code:
                playerError.code,
            },
            null,
            2
          )
        );

        /*
         * If adding the host fails,
         * remove the game so we do not
         * leave an incomplete game behind.
         */
        const {
          error: cleanupError,
        } = await supabase
          .from("games")
          .delete()
          .eq(
            "id",
            createdGame.id
          )
          .eq(
            "host_id",
            user.id
          );

        if (cleanupError) {
          console.error(
            "Game cleanup error:",
            cleanupError
          );
        }

        setError(
          `The game was created, but adding you as the host player failed: ${getSupabaseErrorMessage(
            playerError
          )}`
        );

        return;
      }

      setSuccess(
        "Your game has been created."
      );

      router.push(
        `/games/${createdGame.id}`
      );

      router.refresh();
    } catch (submitError) {
      console.error(
        "Unexpected create-game error:",
        submitError
      );

      setError(
        getSupabaseErrorMessage(
          submitError
        )
      );
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f7f5]">
        <header className="border-b border-black/5 bg-white">
          <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
            <Link
              href="/dashboard"
              className="text-lg font-semibold tracking-tight text-black"
            >
              The Rally
            </Link>

            <div className="flex items-center gap-7">
              <Link
                href="/dashboard"
                className="text-sm text-slate-600 transition hover:text-black"
              >
                Dashboard
              </Link>

              <Link
                href="/games"
                className="text-sm text-slate-600 transition hover:text-black"
              >
                Find a Game
              </Link>

              <Link
                href="/profile"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-sm font-medium text-white"
              >
                U
              </Link>
            </div>
          </div>
        </header>

        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-black/10 border-t-black" />

            <p className="text-sm text-slate-500">
              Preparing your game...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-black">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
          <Link
            href="/dashboard"
            className="text-lg font-semibold tracking-tight"
          >
            The Rally
          </Link>

          <nav className="flex items-center gap-7">
            <Link
              href="/dashboard"
              className="text-sm text-slate-600 transition hover:text-black"
            >
              Dashboard
            </Link>

            <Link
              href="/games"
              className="text-sm text-slate-600 transition hover:text-black"
            >
              Find a Game
            </Link>

            <Link
              href="/profile"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-sm font-medium text-white transition hover:scale-105"
            >
              U
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 pb-20 pt-16">
        <div className="mb-10">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.3em] text-slate-400">
            Host
          </p>

          <h1 className="text-5xl font-semibold tracking-[-0.04em] sm:text-6xl">
            Create a game.
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-500">
            Set the details and invite other UoA students to join you.
          </p>
          <p className="max-w-2xl text-sm leading-6 text-slate-500">
            View facility availability on the{" "}
            <a
                href="https://sportandrec.auckland.ac.nz/Facility/GetSchedule?facilityId=017fe1ac-d893-4277-a55e-d2c2fcf060a1"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-700 underline underline-offset-4 hover:text-blue-900"
            >
              UoA Sport and Rec portal
            </a>
            . Member drop-in means any active Hiwa member can use the facility free of
            charge during designated drop-in hours. Information on facility reservation
            requests and associated fees can be found{" "}
            <a
                href="https://sportandrec.auckland.ac.nz/facility/reservationrequest"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-700 underline underline-offset-4 hover:text-blue-900"
            >
              here
            </a>
            .
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[28px] border border-black/10 bg-white shadow-[0_20px_70px_rgba(0,0,0,0.04)]"
        >
          <div className="p-9 sm:p-12">
            <section>
              <label className="mb-4 block text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
                Sport
              </label>

              {sports.length === 0 ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  No sports are currently available.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {sports.map((sport) => {
                    const selected =
                      form.sportId ===
                      String(sport.id);

                    return (
                      <button
                        key={sport.id}
                        type="button"
                        onClick={() =>
                          updateField(
                            "sportId",
                            String(
                              sport.id
                            )
                          )
                        }
                        className={`flex min-h-[56px] items-center gap-3 rounded-2xl border px-5 text-left text-sm font-medium transition ${
                          selected
                            ? "border-black bg-black text-white shadow-sm"
                            : "border-slate-200 bg-[#fafafa] text-slate-800 hover:border-slate-400 hover:bg-white"
                        }`}
                      >
                        <span className="text-xl">
                          {sport.emoji ||
                            "🏅"}
                        </span>

                        <span>
                          {formatSportName(
                            sport.name
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="mt-10">
              <label
                htmlFor="title"
                className="mb-3 block text-xs font-medium uppercase tracking-[0.25em] text-slate-400"
              >
                Game title
              </label>

              <input
                id="title"
                type="text"
                value={form.title}
                onChange={(event) =>
                  updateField(
                    "title",
                    event.target.value
                  )
                }
                placeholder={
                  selectedSport
                    ? `e.g. Saturday ${formatSportName(
                        selectedSport.name
                      )}`
                    : "e.g. Saturday Badminton"
                }
                maxLength={100}
                className="h-14 w-full rounded-2xl border border-slate-200 bg-[#fafafa] px-5 text-sm outline-none transition placeholder:text-slate-400 focus:border-black focus:bg-white"
              />
            </section>

            <section className="mt-8 grid gap-5 sm:grid-cols-3">
              <div ref={datePickerRef} className="relative z-10">
                <label
                  htmlFor="gameDate"
                  className="mb-3 block text-xs font-medium uppercase tracking-[0.25em] text-slate-400"
                >
                  Date
                </label>

                <button
                  id="gameDate"
                  type="button"
                  aria-expanded={datePickerOpen}
                  aria-controls={datePickerOpen ? "gameDateCalendar" : undefined}
                  onClick={() => setDatePickerOpen((open) => !open)}
                  className={`h-14 w-full rounded-2xl border border-slate-200 bg-[#fafafa] px-4 text-left text-sm outline-none transition focus:border-black focus:bg-white ${form.gameDate ? "text-black" : "text-slate-400"}`}
                >
                  {form.gameDate
                    ? new Intl.DateTimeFormat("en-NZ", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }).format(new Date(`${form.gameDate}T00:00:00`))
                    : "Choose a date"}
                </button>

                {datePickerOpen && (
                  <div
                    id="gameDateCalendar"
                    className="absolute -left-6 top-full z-20 mt-2 w-max max-w-[calc(100vw-3rem)] rounded-2xl border border-slate-200 bg-white p-3 shadow-lg sm:left-0"
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        setDatePickerOpen(false);
                        document.getElementById("gameDate")?.focus();
                      }
                    }}
                  >
                    <DayPicker
                      className="create-game-calendar mx-auto"
                      mode="single"
                      required
                      autoFocus
                      defaultMonth={form.gameDate ? new Date(`${form.gameDate}T00:00:00`) : undefined}
                      selected={form.gameDate ? new Date(`${form.gameDate}T00:00:00`) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          updateField("gameDate", formatLocalDate(date));
                          setDatePickerOpen(false);
                          document.getElementById("gameDate")?.focus();
                        }
                      }}
                      disabled={today ? { before: new Date(`${today}T00:00:00`) } : undefined}
                      startMonth={today ? new Date(`${today}T00:00:00`) : undefined}
                    />
                  </div>
                )}
              </div>

              <TimeSelect
                id="startTime"
                label="Start time"
                value={form.startTime}
                onChange={(value) => updateField("startTime", value)}
              />

              <TimeSelect
                id="endTime"
                label="End time"
                value={form.endTime}
                onChange={(value) => updateField("endTime", value)}
              />
            </section>

            <section className="mt-8">
              <label
                htmlFor="location"
                className="mb-3 block text-xs font-medium uppercase tracking-[0.25em] text-slate-400"
              >
                Location
              </label>

              <input
                id="location"
                type="text"
                value={form.location}
                onChange={(event) =>
                  updateField(
                    "location",
                    event.target.value
                  )
                }
                placeholder="e.g. UoA Recreation Centre"
                maxLength={150}
                className="h-14 w-full rounded-2xl border border-slate-200 bg-[#fafafa] px-5 text-sm outline-none transition placeholder:text-slate-400 focus:border-black focus:bg-white"
              />
            </section>

            <section className="mt-8 grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="minPlayers"
                  className="mb-3 block text-xs font-medium uppercase tracking-[0.25em] text-slate-400"
                >
                  Minimum players
                </label>

                <input
                  id="minPlayers"
                  type="number"
                  min={2}
                  max={100}
                  value={form.minPlayers}
                  onChange={(event) =>
                    updateField("minPlayers", event.target.value)
                  }
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-[#fafafa] px-5 text-sm outline-none transition focus:border-black focus:bg-white"
                />
              </div>

              <div>
                <label
                  htmlFor="maxPlayers"
                  className="mb-3 block text-xs font-medium uppercase tracking-[0.25em] text-slate-400"
                >
                  Maximum players
                </label>

                <input
                  id="maxPlayers"
                  type="number"
                  min={2}
                  max={100}
                  value={form.maxPlayers}
                  onChange={(event) =>
                    updateField(
                      "maxPlayers",
                      event.target.value
                    )
                  }
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-[#fafafa] px-5 text-sm outline-none transition focus:border-black focus:bg-white"
                />
              </div>
            </section>

            <section className="mt-8 grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="skillLevel"
                  className="mb-3 block text-xs font-medium uppercase tracking-[0.25em] text-slate-400"
                >
                  Skill level
                </label>

                <select
                  id="skillLevel"
                  value={form.skillLevel}
                  onChange={(event) =>
                    updateField(
                      "skillLevel",
                      event.target.value
                    )
                  }
                  className="h-14 w-full appearance-none rounded-2xl border border-slate-200 bg-[#fafafa] px-5 text-sm outline-none transition focus:border-black focus:bg-white"
                >
                  <option value="beginner">
                    Beginner
                  </option>

                  <option value="intermediate">
                    Intermediate
                  </option>

                  <option value="expert">
                    Expert
                  </option>
                </select>
              </div>
              <div>
                <label
                    htmlFor="gameType"
                    className="mb-3 block text-xs font-medium uppercase tracking-[0.25em] text-slate-400"
                >
                  Game type
                </label>

                <select
                    id="gameType"
                    value={form.gameType}
                    onChange={(event) =>
                        updateField(
                            "gameType",
                            event.target.value
                        )
                    }
                    className="h-14 w-full appearance-none rounded-2xl border border-slate-200 bg-[#fafafa] px-5 text-sm outline-none transition focus:border-black focus:bg-white"
                >
                  <option value="casual">
                    Casual
                  </option>

                  <option value="competitive">
                    Competitive
                  </option>
                </select>
              </div>
            </section>

            <section className="mt-8 grid gap-5 sm:grid-cols-2">

              <div>
                <label
                  htmlFor="genderPreference"
                  className="mb-3 block text-xs font-medium uppercase tracking-[0.25em] text-slate-400"
                >
                  Who can join?
                </label>

                <select
                  id="genderPreference"
                  value={
                    form.genderPreference
                  }
                  onChange={(event) =>
                    updateField(
                      "genderPreference",
                      event.target.value
                    )
                  }
                  className="h-14 w-full appearance-none rounded-2xl border border-slate-200 bg-[#fafafa] px-5 text-sm outline-none transition focus:border-black focus:bg-white"
                >
                  <option value="everyone">
                    Everyone
                  </option>

                  <option value="female">
                    Women only
                  </option>

                  <option value="male">
                    Men only
                  </option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="agePreference"
                  className="mb-3 block text-xs font-medium uppercase tracking-[0.25em] text-slate-400"
                >
                  Age
                </label>

                <select
                  id="agePreference"
                  value={form.agePreference}
                  onChange={(event) =>
                    updateField("agePreference", event.target.value)
                  }
                  className="h-14 w-full appearance-none rounded-2xl border border-slate-200 bg-[#fafafa] px-5 text-sm outline-none transition focus:border-black focus:bg-white"
                >
                  <option value="any">Any</option>
                  <option value="under_25">Under 25</option>
                  <option value="25_40">25-40</option>
                  <option value="40_plus">40+</option>
                </select>
              </div>
            </section>

            <section className="mt-8">
              <label
                htmlFor="cost"
                className="mb-3 block text-xs font-medium uppercase tracking-[0.25em] text-slate-400"
              >
                Shared cost per player
              </label>

              <div className="relative">
                <span className="pointer-events-none absolute left-5 top-1/2 z-10 -translate-y-1/2 text-sm text-slate-500">
                  $
                </span>

                <input
                  id="cost"
                  type="number"
                  min={0}
                  step="0.01"
                  value={
                    form.costPerPlayer
                  }
                  onChange={(event) =>
                    updateField(
                      "costPerPlayer",
                      event.target.value
                    )
                  }
                  placeholder="0.00"
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-[#fafafa] pl-10 pr-5 text-sm outline-none transition focus:border-black focus:bg-white"
                />
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-400">
                This currently only displays the cost.
                Payment will be added later.
              </p>
            </section>

            <section className="mt-8">
              <label
                  htmlFor="chatLink"
                  className="mb-3 block text-xs font-medium uppercase tracking-[0.25em] text-slate-400"
              >
                Chat Link
              </label>

              <input
                  id="chatLink"
                  type="text"
                  value={form.chatLink}
                  onChange={(event) =>
                      updateField(
                          "chatLink",
                          event.target.value
                      )
                  }
                  placeholder="e.g. teams"
                  maxLength={150}
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-[#fafafa] px-5 text-sm outline-none transition placeholder:text-slate-400 focus:border-black focus:bg-white"
              />
            </section>

            <section className="mt-8">
              <label
                htmlFor="description"
                className="mb-3 block text-xs font-medium uppercase tracking-[0.25em] text-slate-400"
              >
                Description
              </label>

              <textarea
                id="description"
                value={form.description}
                onChange={(event) =>
                  updateField(
                    "description",
                    event.target.value
                  )
                }
                placeholder="Tell players anything they should know..."
                maxLength={1000}
                rows={5}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-[#fafafa] px-5 py-4 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-black focus:bg-white"
              />

              <div className="mt-2 text-right text-xs text-slate-400">
                {form.description.length}
                /1000
              </div>
            </section>

            {error && (
              <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
                <p className="text-sm leading-6 text-red-700">
                  {error}
                </p>
              </div>
            )}

            {success && (
              <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 px-5 py-4">
                <p className="text-sm leading-6 text-green-700">
                  {success}
                </p>
              </div>
            )}

            <div className="mt-10 flex flex-col-reverse gap-5 border-t border-black/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/games"
                className="text-sm text-slate-600 transition hover:text-black"
              >
                ← Back to games
              </Link>

              <button
                type="submit"
                disabled={creating}
                className="inline-flex h-14 items-center justify-center rounded-full bg-black px-8 text-sm font-semibold text-white transition hover:scale-[1.01] hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? (
                  <>
                    <span className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Creating...
                  </>
                ) : (
                  "Create game →"
                )}
              </button>
            </div>
          </div>
        </form>

        <p className="mt-6 text-center text-xs leading-5 text-slate-400">
          Games are visible to signed-in UoA students on The Rally.
        </p>
      </div>
    </main>
  );
}