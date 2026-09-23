"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/navbar";

type Sport = {
  id: number;
  name: string;
  slug: string;
  emoji: string | null;
};

type Game = {
  id: number;
  host_id: string;
  sport_id: number;
  title: string | null;
  game_date: string;
  start_time: string;
  end_time: string | null;
  location_name: string;
  max_players: number;
  skill_level: string;
  game_type: string;
  gender_preference: string | null;
  cost_per_player: number;
  description: string | null;
  status: string;
};

type FormState = {
  sportId: string;
  title: string;
  gameDate: string;
  startTime: string;
  endTime: string;
  location: string;
  maxPlayers: string;
  skillLevel: string;
  gameType: string;
  genderPreference: string;
  costPerPlayer: string;
  description: string;
};

function getTodayString() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

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

function cleanEnumValue(
  value: string | null | undefined
) {
  return (value ?? "").toLowerCase();
}

export default function EditGamePage() {
  const router = useRouter();
  const supabase = createClient();

  const [gameId, setGameId] = useState<string | null>(
    null
  );

  const [game, setGame] = useState<Game | null>(
    null
  );

  const [sports, setSports] = useState<Sport[]>([]);

  const [form, setForm] = useState<FormState>({
    sportId: "",
    title: "",
    gameDate: "",
    startTime: "",
    endTime: "",
    location: "",
    maxPlayers: "4",
    skillLevel: "beginner",
    gameType: "casual",
    genderPreference: "everyone",
    costPerPlayer: "0",
    description: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [today, setToday] = useState("");

  /*
   * =========================================================
   * GET GAME ID
   * =========================================================
   */

  useEffect(() => {
    setToday(getTodayString());

    const parts = window.location.pathname
      .split("/")
      .filter(Boolean);

    const gamesIndex = parts.indexOf("games");

    if (
      gamesIndex === -1 ||
      !parts[gamesIndex + 1]
    ) {
      setError("Invalid game URL.");
      setLoading(false);
      return;
    }

    setGameId(parts[gamesIndex + 1]);
  }, []);

  /*
   * =========================================================
   * LOAD GAME
   * =========================================================
   */

  useEffect(() => {
    if (!gameId) {
      return;
    }

    async function loadGame() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/auth/login");
          return;
        }

        const numericGameId = Number(gameId);

        if (Number.isNaN(numericGameId)) {
          setError("Invalid game ID.");
          setLoading(false);
          return;
        }

        const {
          data: gameData,
          error: gameError,
        } = await supabase
          .from("games")
          .select(
            `
              id,
              host_id,
              sport_id,
              title,
              game_date,
              start_time,
              end_time,
              location_name,
              max_players,
              skill_level,
              game_type,
              gender_preference,
              cost_per_player,
              description,
              status
            `
          )
          .eq("id", numericGameId)
          .single();

        if (gameError || !gameData) {
          console.error(gameError);

          setError(
            "We couldn't find this game."
          );

          setLoading(false);
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
          console.error(sportsError);

          setError(
            "We couldn't load the sports."
          );

          setLoading(false);
          return;
        }

        const loadedGame = gameData as Game;

        /*
         * Only the host can edit.
         */

        if (loadedGame.host_id !== user.id) {
          setGame(loadedGame);

          setError(
            "Only the host can edit this game."
          );

          setLoading(false);
          return;
        }

        /*
         * Cancelled games cannot be edited.
         */

        if (
          loadedGame.status.toLowerCase() ===
          "cancelled"
        ) {
          setGame(loadedGame);

          setError(
            "This game has been cancelled and cannot be edited."
          );

          setLoading(false);
          return;
        }

        /*
         * Completed games cannot be edited.
         */

        if (
          loadedGame.status.toLowerCase() ===
          "completed"
        ) {
          setGame(loadedGame);

          setError(
            "This game has already been completed and cannot be edited."
          );

          setLoading(false);
          return;
        }

        setGame(loadedGame);

        setSports(
          (sportsData ?? []) as Sport[]
        );

        setForm({
          sportId: String(
            loadedGame.sport_id
          ),

          title:
            loadedGame.title ?? "",

          gameDate:
            loadedGame.game_date,

          startTime:
            loadedGame.start_time?.slice(
              0,
              5
            ) ?? "",

          endTime:
            loadedGame.end_time?.slice(
              0,
              5
            ) ?? "",

          location:
            loadedGame.location_name,

          maxPlayers: String(
            loadedGame.max_players
          ),

          skillLevel:
            cleanEnumValue(
              loadedGame.skill_level
            ),

          gameType:
            cleanEnumValue(
              loadedGame.game_type
            ),

          genderPreference:
            cleanEnumValue(
              loadedGame.gender_preference
            ) || "everyone",

          costPerPlayer: String(
            loadedGame.cost_per_player ?? 0
          ),

          description:
            loadedGame.description ?? "",
        });

        setLoading(false);
      } catch (loadError) {
        console.error(loadError);

        setError(
          "Something went wrong while loading the game."
        );

        setLoading(false);
      }
    }

    loadGame();
  }, [gameId, router, supabase]);

  /*
   * =========================================================
   * SELECTED SPORT
   * =========================================================
   */

  const selectedSport = useMemo(() => {
    return sports.find(
      (sport) =>
        String(sport.id) ===
        form.sportId
    );
  }, [sports, form.sportId]);

  /*
   * =========================================================
   * UPDATE FIELD
   * =========================================================
   */

  function updateField<K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setError("");
    setSuccess("");
  }

  /*
   * =========================================================
   * VALIDATION
   * =========================================================
   */

  function validateForm() {
    if (!form.sportId) {
      return "Please choose a sport.";
    }

    if (!form.title.trim()) {
      return "Please give your game a title.";
    }

    if (form.title.trim().length < 3) {
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

    const maxPlayers = Number(
      form.maxPlayers
    );

    if (
      !Number.isInteger(maxPlayers) ||
      maxPlayers < 2
    ) {
      return "A game needs at least 2 players.";
    }

    if (maxPlayers > 100) {
      return "Maximum players cannot exceed 100.";
    }

    if (!form.skillLevel) {
      return "Please choose a skill level.";
    }

    if (!form.gameType) {
      return "Please choose a game type.";
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

    if (form.description.length > 1000) {
      return "Description cannot exceed 1000 characters.";
    }

    return "";
  }

  /*
   * =========================================================
   * SAVE CHANGES
   * =========================================================
   */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!game || !gameId) {
      setError(
        "Game information is missing."
      );
      return;
    }

    const validationError =
      validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/auth/login");
        return;
      }

      /*
       * Host verification.
       */

      if (game.host_id !== user.id) {
        setError(
          "Only the host can edit this game."
        );

        return;
      }

      /*
       * Re-check the current player count
       * directly from Supabase.
       */

      const {
        count,
        error: countError,
      } = await supabase
        .from("game_players")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq(
          "game_id",
          Number(gameId)
        )
        .eq("status", "joined");

      if (countError) {
        console.error(countError);

        setError(
          "We couldn't check the current player count."
        );

        return;
      }

      const currentPlayers =
        count ?? 0;

      const newMaxPlayers =
        Number(form.maxPlayers);

      /*
       * Never allow the host to reduce
       * max players below the current
       * number of joined players.
       */

      if (
        newMaxPlayers <
        currentPlayers
      ) {
        setError(
          `This game currently has ${currentPlayers} player${
            currentPlayers === 1
              ? ""
              : "s"
          }. Maximum players cannot be lower than the current number of players.`
        );

        return;
      }

      /*
       * Update game.
       */

      const {
        error: updateError,
      } = await supabase
        .from("games")
        .update({
          sport_id:
            Number(form.sportId),

          title:
            form.title.trim(),

          game_date:
            form.gameDate,

          start_time:
            form.startTime,

          end_time:
            form.endTime,

          location_name:
            form.location.trim(),

          max_players:
            newMaxPlayers,

          skill_level:
            form.skillLevel,

          game_type:
            form.gameType,

          gender_preference:
            form.genderPreference,

          cost_per_player:
            Number(
              form.costPerPlayer
            ),

          description:
            form.description.trim() ||
            null,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          Number(gameId)
        )
        .eq(
          "host_id",
          user.id
        );

      if (updateError) {
        console.error(updateError);

        setError(
          updateError.message ||
            "We couldn't update the game."
        );

        return;
      }

      setSuccess(
        "Game updated successfully."
      );

      /*
       * Give the user a short success
       * message before redirecting.
       */

      setTimeout(() => {
        router.push(
          `/games/${gameId}`
        );

        router.refresh();
      }, 600);
    } catch (submitError) {
      console.error(submitError);

      setError(
        "Something went wrong while updating the game."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f7f5]">
        <Navbar />

        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-black/10 border-t-black" />

            <p className="text-sm text-slate-500">
              Loading game...
            </p>
          </div>
        </div>
      </main>
    );
  }

  /*
   * =========================================================
   * GAME NOT FOUND
   * =========================================================
   */

  if (!game) {
    return (
      <main className="min-h-screen bg-[#f7f7f5]">
        <Navbar />

        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h1 className="text-4xl font-semibold">
            Game unavailable
          </h1>

          <p className="mt-4 text-slate-500">
            {error ||
              "This game could not be loaded."}
          </p>

          <Link
            href="/games"
            className="mt-8 inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-900"
          >
            Back to games
          </Link>
        </div>
      </main>
    );
  }

  /*
   * =========================================================
   * ERROR / NOT ALLOWED
   * =========================================================
   */

  if (error) {
    return (
      <main className="min-h-screen bg-[#f7f7f5] text-black">
        <Navbar />

        <div className="mx-auto max-w-3xl px-6 py-24">
          <div className="rounded-3xl border border-black/10 bg-white p-10 text-center shadow-[0_20px_70px_rgba(0,0,0,0.04)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-2xl">
              !
            </div>

            <h1 className="mt-6 text-3xl font-semibold">
              Editing unavailable
            </h1>

            <p className="mx-auto mt-4 max-w-lg text-slate-500">
              {error}
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href={`/games/${game.id}`}
                className="inline-flex items-center justify-center rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-900"
              >
                Back to game
              </Link>

              <Link
                href="/games"
                className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Find other games
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /*
   * =========================================================
   * EDIT PAGE
   * =========================================================
   */

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-black">
      <Navbar />

      <div className="mx-auto max-w-5xl px-6 pb-20 pt-10">
        <Link
          href={`/games/${game.id}`}
          className="text-sm text-slate-500 transition hover:text-black"
        >
          ← Back to game
        </Link>

        <div className="mb-10 mt-10">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.3em] text-slate-400">
            Host
          </p>

          <h1 className="text-5xl font-semibold tracking-[-0.04em] sm:text-6xl">
            Edit your game.
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-500">
            Update the details of your game.
            Changes will be visible to
            everyone viewing the game.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_20px_70px_rgba(0,0,0,0.04)]"
        >
          <div className="p-8 sm:p-12">

            {/* ================================================= */}
            {/* SPORT */}
            {/* ================================================= */}

            <section>
              <label className="mb-4 block text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
                Sport
              </label>

              {selectedSport && (
                <p className="mb-4 text-sm text-slate-500">
                  Current sport:{" "}
                  <span className="font-medium text-black">
                    {selectedSport.emoji}{" "}
                    {formatSportName(
                      selectedSport.name
                    )}
                  </span>
                </p>
              )}

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
                          String(sport.id)
                        )
                      }
                      className={`flex min-h-[60px] items-center gap-3 rounded-2xl border px-5 text-left text-sm font-medium transition ${
                        selected
                          ? "border-black bg-black text-white"
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
            </section>

            {/* ================================================= */}
            {/* TITLE */}
            {/* ================================================= */}

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
                maxLength={100}
                placeholder="e.g. Saturday badminton"
                className="h-14 w-full rounded-2xl border border-slate-200 bg-[#fafafa] px-5 text-sm outline-none transition focus:border-black focus:bg-white"
              />

              <div className="mt-2 text-right text-xs text-slate-400">
                {form.title.length}/100
              </div>
            </section>

            {/* ================================================= */}
            {/* DATE / TIME */}
            {/* ================================================= */}

            <section className="mt-8 grid gap-5 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="gameDate"
                  className="mb-3 block text-xs font-medium uppercase tracking-[0.25em] text-slate-400"
                >
                  Date
                </label>

                <input
                  id="gameDate"
                  type="date"
                  min={
                    today || undefined
                  }
                  value={
                    form.gameDate
                  }
                  onChange={(event) =>
                    updateField(
                      "gameDate",
                      event.target.value
                    )
                  }
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-[#fafafa] px-4 text-sm outline-none transition focus:border-black focus:bg-white"
                />
              </div>

              <div>
                <label
                  htmlFor="startTime"
                  className="mb-3 block text-xs font-medium uppercase tracking-[0.25em] text-slate-400"
                >
                  Start time
                </label>

                <input
                  id="startTime"
                  type="time"
                  value={
                    form.startTime
                  }
                  onChange={(event) =>
                    updateField(
                      "startTime",
                      event.target.value
                    )
                  }
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-[#fafafa] px-4 text-sm outline-none transition focus:border-black focus:bg-white"
                />
              </div>

              <div>
                <label
                  htmlFor="endTime"
                  className="mb-3 block text-xs font-medium uppercase tracking-[0.25em] text-slate-400"
                >
                  End time
                </label>

                <input
                  id="endTime"
                  type="time"
                  value={
                    form.endTime
                  }
                  onChange={(event) =>
                    updateField(
                      "endTime",
                      event.target.value
                    )
                  }
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-[#fafafa] px-4 text-sm outline-none transition focus:border-black focus:bg-white"
                />
              </div>
            </section>

            {/* ================================================= */}
            {/* LOCATION */}
            {/* ================================================= */}

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
                value={
                  form.location
                }
                onChange={(event) =>
                  updateField(
                    "location",
                    event.target.value
                  )
                }
                maxLength={150}
                placeholder="e.g. Recreation Centre"
                className="h-14 w-full rounded-2xl border border-slate-200 bg-[#fafafa] px-5 text-sm outline-none transition focus:border-black focus:bg-white"
              />
            </section>

            {/* ================================================= */}
            {/* PLAYERS / SKILL */}
            {/* ================================================= */}

            <section className="mt-8 grid gap-5 sm:grid-cols-2">
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
                  value={
                    form.maxPlayers
                  }
                  onChange={(event) =>
                    updateField(
                      "maxPlayers",
                      event.target.value
                    )
                  }
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-[#fafafa] px-5 text-sm outline-none transition focus:border-black focus:bg-white"
                />

                <p className="mt-2 text-xs text-slate-400">
                  You cannot set this below
                  the number of players
                  already joined.
                </p>
              </div>

              <div>
                <label
                  htmlFor="skillLevel"
                  className="mb-3 block text-xs font-medium uppercase tracking-[0.25em] text-slate-400"
                >
                  Skill level
                </label>

                <select
                  id="skillLevel"
                  value={
                    form.skillLevel
                  }
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

                  <option value="advanced">
                    Advanced
                  </option>
                </select>
              </div>
            </section>

            {/* ================================================= */}
            {/* GAME TYPE / GENDER */}
            {/* ================================================= */}

            <section className="mt-8 grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="gameType"
                  className="mb-3 block text-xs font-medium uppercase tracking-[0.25em] text-slate-400"
                >
                  Game type
                </label>

                <select
                  id="gameType"
                  value={
                    form.gameType
                  }
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

                  <option value="either">
                    Either
                  </option>
                </select>
              </div>

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

                  <option value="women">
                    Women only
                  </option>

                  <option value="men">
                    Men only
                  </option>
                </select>
              </div>
            </section>

            {/* ================================================= */}
            {/* COST */}
            {/* ================================================= */}

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
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-[#fafafa] pl-10 pr-5 text-sm outline-none transition focus:border-black focus:bg-white"
                />
              </div>

              <p className="mt-2 text-xs text-slate-400">
                Payment is not processed by
                The Rally yet.
              </p>
            </section>

            {/* ================================================= */}
            {/* DESCRIPTION */}
            {/* ================================================= */}

            <section className="mt-8">
              <label
                htmlFor="description"
                className="mb-3 block text-xs font-medium uppercase tracking-[0.25em] text-slate-400"
              >
                Description
              </label>

              <textarea
                id="description"
                value={
                  form.description
                }
                onChange={(event) =>
                  updateField(
                    "description",
                    event.target.value
                  )
                }
                maxLength={1000}
                rows={5}
                placeholder="Tell players anything they should know about this game..."
                className="w-full resize-none rounded-2xl border border-slate-200 bg-[#fafafa] px-5 py-4 text-sm leading-6 outline-none transition focus:border-black focus:bg-white"
              />

              <div className="mt-2 text-right text-xs text-slate-400">
                {form.description.length}
                /1000
              </div>
            </section>

            {/* ================================================= */}
            {/* ERROR */}
            {/* ================================================= */}

            {error && (
              <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700">
                    !
                  </div>

                  <p className="text-sm leading-6 text-red-700">
                    {error}
                  </p>
                </div>
              </div>
            )}

            {/* ================================================= */}
            {/* SUCCESS */}
            {/* ================================================= */}

            {success && (
              <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                    ✓
                  </div>

                  <p className="text-sm leading-6 text-green-700">
                    {success}
                  </p>
                </div>
              </div>
            )}

            {/* ================================================= */}
            {/* ACTIONS */}
            {/* ================================================= */}

            <div className="mt-10 flex flex-col-reverse gap-5 border-t border-black/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href={`/games/${game.id}`}
                className="text-center text-sm text-slate-600 transition hover:text-black sm:text-left"
              >
                ← Cancel
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-14 items-center justify-center rounded-full bg-black px-8 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <span className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Saving...
                  </>
                ) : (
                  "Save changes →"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}