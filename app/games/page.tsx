"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/navbar";

type Game = {
  id: number;
  host_id: string;
  sport_id: number;
  title: string | null;
  game_date: string;
  start_time: string;
  end_time: string | null;
  location_name: string;
  facility_id: number | null;
  max_players: number;
  skill_level: string;
  game_type: string;
  gender_preference: string | null;
  cost_per_player: number;
  description: string | null;
  status: string;
};

type Sport = {
  id: number;
  name: string;
  slug: string;
  emoji: string | null;
  description: string | null;
};

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type GamePlayer = {
  game_id: number;
  user_id: string;
  status: string;
};

type SortOption =
  | "soonest"
  | "most-spots"
  | "lowest-cost"
  | "highest-cost";

function formatDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);

  return new Intl.DateTimeFormat("en-NZ", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatTime(timeString: string | null) {
  if (!timeString) {
    return "";
  }

  const [hoursString, minutesString] =
    timeString.split(":");

  const hours = Number(hoursString);

  if (Number.isNaN(hours)) {
    return timeString;
  }

  const suffix = hours >= 12 ? "PM" : "AM";

  const displayHour =
    hours % 12 === 0 ? 12 : hours % 12;

  return `${displayHour}:${minutesString} ${suffix}`;
}

function formatEnum(
  value: string | null | undefined
) {
  if (!value) {
    return "";
  }

  return value
    .replace(/_/g, " ")
    .split(" ")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1).toLowerCase()
    )
    .join(" ");
}

function getGameDateTime(game: Game) {
  return new Date(
    `${game.game_date}T${game.start_time}`
  ).getTime();
}

function addDaysToDateKey(
  dateKey: string,
  days: number
) {
  const date = new Date(
    `${dateKey}T00:00:00`
  );

  date.setDate(date.getDate() + days);

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTodayDateKey() {
  const date = new Date();

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function GamesPage() {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  const [games, setGames] =
    useState<Game[]>([]);

  const [sports, setSports] =
    useState<Sport[]>([]);

  const [profiles, setProfiles] =
    useState<Record<string, Profile>>({});

  const [gamePlayers, setGamePlayers] =
    useState<GamePlayer[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [selectedSport, setSelectedSport] =
    useState("all");

  const [selectedSkill, setSelectedSkill] =
    useState("all");

  const [selectedGameType, setSelectedGameType] =
    useState("all");

  const [selectedGender, setSelectedGender] =
    useState("all");

  const [selectedCost, setSelectedCost] =
    useState("all");

  const [selectedDate, setSelectedDate] =
    useState("all");

  const [sortBy, setSortBy] =
    useState<SortOption>("soonest");

  const [showFilters, setShowFilters] =
    useState(false);

  /*
   * IMPORTANT:
   *
   * Do not use Date.now() here.
   *
   * Next.js 16 can detect Date.now() as an
   * unstable current-time value in Client Components.
   *
   * We capture the current time after the component
   * has mounted using the performance timing API.
   */

  const [nowMs, setNowMs] =
    useState<number | null>(null);

  const [todayDateKey, setTodayDateKey] =
    useState("");

  useEffect(() => {
    const currentTime =
      performance.timeOrigin +
      performance.now();

    setNowMs(currentTime);

    setTodayDateKey(
      getTodayDateKey()
    );
  }, []);

  useEffect(() => {
    async function loadGames() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.push("/auth/login");
          return;
        }

        setCurrentUserId(user.id);

        const [
          gamesResult,
          sportsResult,
          playersResult,
        ] = await Promise.all([
          supabase
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
                facility_id,
                max_players,
                skill_level,
                game_type,
                gender_preference,
                cost_per_player,
                description,
                status
              `
            )
            .order("game_date", {
              ascending: true,
            })
            .order("start_time", {
              ascending: true,
            }),

          supabase
            .from("sports")
            .select(
              `
                id,
                name,
                slug,
                emoji,
                description
              `
            )
            .order("name", {
              ascending: true,
            }),

          supabase
            .from("game_players")
            .select(
              `
                game_id,
                user_id,
                status
              `
            )
            .eq("status", "joined"),
        ]);

        if (gamesResult.error) {
          console.error(
            "Games error:",
            gamesResult.error
          );

          setError(
            "We couldn't load the games."
          );

          return;
        }

        if (sportsResult.error) {
          console.error(
            "Sports error:",
            sportsResult.error
          );
        }

        if (playersResult.error) {
          console.error(
            "Players error:",
            playersResult.error
          );
        }

        const loadedGames =
          (gamesResult.data as Game[] | null) ??
          [];

        const loadedSports =
          (sportsResult.data as Sport[] | null) ??
          [];

        const loadedPlayers =
          (playersResult.data as GamePlayer[] | null) ??
          [];

        setGames(loadedGames);
        setSports(loadedSports);
        setGamePlayers(loadedPlayers);

        const hostIds = Array.from(
          new Set(
            loadedGames.map(
              (game) => game.host_id
            )
          )
        );

        if (hostIds.length > 0) {
          const {
            data: profileData,
            error: profileError,
          } = await supabase
            .from("profiles")
            .select(
              `
                id,
                full_name,
                username,
                avatar_url
              `
            )
            .in("id", hostIds);

          if (profileError) {
            console.error(
              "Profiles error:",
              profileError
            );
          }

          const profileMap: Record<
            string,
            Profile
          > = {};

          (
            (profileData as Profile[] | null) ??
            []
          ).forEach((profile) => {
            profileMap[profile.id] =
              profile;
          });

          setProfiles(profileMap);
        }
      } catch (loadError) {
        console.error(loadError);

        setError(
          "Something went wrong while loading games."
        );
      } finally {
        setLoading(false);
      }
    }

    loadGames();
  }, [router, supabase]);

  const sportMap = useMemo(() => {
    const map: Record<number, Sport> = {};

    sports.forEach((sport) => {
      map[sport.id] = sport;
    });

    return map;
  }, [sports]);

  const playerCounts = useMemo(() => {
    const counts: Record<number, number> =
      {};

    gamePlayers.forEach((player) => {
      counts[player.game_id] =
        (counts[player.game_id] ?? 0) + 1;
    });

    return counts;
  }, [gamePlayers]);

  const joinedGameIds = useMemo(() => {
    if (!currentUserId) {
      return new Set<number>();
    }

    return new Set(
      gamePlayers
        .filter(
          (player) =>
            player.user_id ===
            currentUserId
        )
        .map(
          (player) => player.game_id
        )
    );
  }, [
    currentUserId,
    gamePlayers,
  ]);

  /*
   * Upcoming games.
   *
   * Cancelled and past games are removed here.
   */

  const upcomingGames = useMemo(() => {
    if (nowMs === null) {
      return [];
    }

    return games.filter((game) => {
      const status =
        game.status.toLowerCase();

      if (status === "cancelled") {
        return false;
      }

      return (
        getGameDateTime(game) >=
        nowMs
      );
    });
  }, [games, nowMs]);

  /*
   * Apply search and filters.
   */

  const filteredGames = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    return upcomingGames.filter(
      (game) => {
        const sport =
          sportMap[game.sport_id];

        const host =
          profiles[game.host_id];

        const searchableText = [
          game.title,
          game.location_name,
          game.description,
          sport?.name,
          host?.full_name,
          host?.username,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (
          normalizedSearch &&
          !searchableText.includes(
            normalizedSearch
          )
        ) {
          return false;
        }

        if (
          selectedSport !== "all" &&
          String(game.sport_id) !==
            selectedSport
        ) {
          return false;
        }

        if (
          selectedSkill !== "all" &&
          game.skill_level !==
            selectedSkill
        ) {
          return false;
        }

        if (
          selectedGameType !== "all" &&
          game.game_type !==
            selectedGameType
        ) {
          return false;
        }

        if (
          selectedGender !== "all" &&
          (game.gender_preference ||
            "everyone") !==
            selectedGender
        ) {
          return false;
        }

        if (
          selectedCost === "free" &&
          Number(
            game.cost_per_player
          ) > 0
        ) {
          return false;
        }

        if (
          selectedCost === "under10" &&
          Number(
            game.cost_per_player
          ) >= 10
        ) {
          return false;
        }

        if (
          selectedCost === "under20" &&
          Number(
            game.cost_per_player
          ) >= 20
        ) {
          return false;
        }

        if (
          selectedDate !== "all" &&
          todayDateKey
        ) {
          const tomorrowDateKey =
            addDaysToDateKey(
              todayDateKey,
              1
            );

          const weekEndDateKey =
            addDaysToDateKey(
              todayDateKey,
              7
            );

          if (
            selectedDate === "today" &&
            game.game_date !==
              todayDateKey
          ) {
            return false;
          }

          if (
            selectedDate ===
              "tomorrow" &&
            game.game_date !==
              tomorrowDateKey
          ) {
            return false;
          }

          if (
            selectedDate === "week" &&
            (game.game_date <
              todayDateKey ||
              game.game_date >=
                weekEndDateKey)
          ) {
            return false;
          }
        }

        return true;
      }
    );
  }, [
    upcomingGames,
    search,
    selectedSport,
    selectedSkill,
    selectedGameType,
    selectedGender,
    selectedCost,
    selectedDate,
    todayDateKey,
    sportMap,
    profiles,
  ]);

  /*
   * Only games that:
   *
   * 1. are open
   * 2. still have at least one available spot
   *
   * appear as available games.
   */

  const availableGames = useMemo(() => {
    const gamesWithAvailability =
      filteredGames.filter((game) => {
        const status =
          game.status.toLowerCase();

        const playerCount =
          playerCounts[game.id] ?? 0;

        const spotsLeft = Math.max(
          game.max_players -
            playerCount,
          0
        );

        return (
          status === "open" &&
          spotsLeft > 0
        );
      });

    return [
      ...gamesWithAvailability,
    ].sort((a, b) => {
      const playersA =
        playerCounts[a.id] ?? 0;

      const playersB =
        playerCounts[b.id] ?? 0;

      const spotsA = Math.max(
        a.max_players - playersA,
        0
      );

      const spotsB = Math.max(
        b.max_players - playersB,
        0
      );

      if (sortBy === "most-spots") {
        if (spotsB !== spotsA) {
          return spotsB - spotsA;
        }
      }

      if (sortBy === "lowest-cost") {
        const costA =
          Number(a.cost_per_player) ||
          0;

        const costB =
          Number(b.cost_per_player) ||
          0;

        if (costA !== costB) {
          return costA - costB;
        }
      }

      if (sortBy === "highest-cost") {
        const costA =
          Number(a.cost_per_player) ||
          0;

        const costB =
          Number(b.cost_per_player) ||
          0;

        if (costA !== costB) {
          return costB - costA;
        }
      }

      return (
        getGameDateTime(a) -
        getGameDateTime(b)
      );
    });
  }, [
    filteredGames,
    playerCounts,
    sortBy,
  ]);

  function clearFilters() {
    setSearch("");
    setSelectedSport("all");
    setSelectedSkill("all");
    setSelectedGameType("all");
    setSelectedGender("all");
    setSelectedCost("all");
    setSelectedDate("all");
  }

  const hasActiveFilters =
    search.trim() !== "" ||
    selectedSport !== "all" ||
    selectedSkill !== "all" ||
    selectedGameType !== "all" ||
    selectedGender !== "all" ||
    selectedCost !== "all" ||
    selectedDate !== "all";

  if (
    loading ||
    nowMs === null
  ) {
    return (
      <main className="min-h-screen bg-[#f7f7f5]">
        <Navbar />

        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-black/10 border-t-black" />

            <p className="text-sm text-slate-500">
              Finding games...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-black">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 pb-24 pt-10 md:px-8">
        {/* HEADER */}

        <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-slate-400">
              The Rally
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Find a game
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Discover upcoming games
              with UoA students and find a
              group that matches your sport,
              skill level and preferences.
            </p>
          </div>

          <Link
            href="/create-game"
            className="inline-flex h-12 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white transition hover:bg-slate-900"
          >
            Create a game →
          </Link>
        </section>

        {/* SEARCH */}

        <section className="mt-10">
          <div className="rounded-[28px] border border-black/10 bg-white p-4 shadow-[0_20px_60px_rgba(0,0,0,0.03)]">
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <svg
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="7"
                  />

                  <path d="m20 20-4-4" />
                </svg>

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search games, sports, locations or hosts..."
                  className="h-12 w-full rounded-2xl border border-black/10 bg-[#f7f7f5] pl-12 pr-4 text-sm outline-none transition focus:border-black/30"
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowFilters(
                    (value) => !value
                  )
                }
                className={`h-12 rounded-2xl border px-5 text-sm font-semibold transition ${
                  showFilters ||
                  hasActiveFilters
                    ? "border-black bg-black text-white"
                    : "border-black/10 bg-white text-black hover:bg-slate-50"
                }`}
              >
                Filters
                {hasActiveFilters
                  ? " •"
                  : ""}
              </button>
            </div>

            {showFilters && (
              <div className="mt-4 border-t border-black/10 pt-5">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  {/* SPORT */}

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                      Sport
                    </span>

                    <select
                      value={
                        selectedSport
                      }
                      onChange={(event) =>
                        setSelectedSport(
                          event.target.value
                        )
                      }
                      className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:border-black/30"
                    >
                      <option value="all">
                        All sports
                      </option>

                      {sports.map(
                        (sport) => (
                          <option
                            key={sport.id}
                            value={String(
                              sport.id
                            )}
                          >
                            {sport.emoji
                              ? `${sport.emoji} `
                              : ""}
                            {
                              sport.name
                            }
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  {/* DATE */}

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                      Date
                    </span>

                    <select
                      value={
                        selectedDate
                      }
                      onChange={(event) =>
                        setSelectedDate(
                          event.target.value
                        )
                      }
                      className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:border-black/30"
                    >
                      <option value="all">
                        Any date
                      </option>

                      <option value="today">
                        Today
                      </option>

                      <option value="tomorrow">
                        Tomorrow
                      </option>

                      <option value="week">
                        Next 7 days
                      </option>
                    </select>
                  </label>

                  {/* SKILL */}

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                      Skill
                    </span>

                    <select
                      value={
                        selectedSkill
                      }
                      onChange={(event) =>
                        setSelectedSkill(
                          event.target.value
                        )
                      }
                      className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:border-black/30"
                    >
                      <option value="all">
                        Any level
                      </option>

                      <option value="beginner">
                        Beginner
                      </option>

                      <option value="intermediate">
                        Intermediate
                      </option>

                      <option value="advanced">
                        Advanced
                      </option>

                      <option value="expert">
                        Expert
                      </option>
                    </select>
                  </label>

                  {/* GAME TYPE */}

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                      Game type
                    </span>

                    <select
                      value={
                        selectedGameType
                      }
                      onChange={(event) =>
                        setSelectedGameType(
                          event.target.value
                        )
                      }
                      className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:border-black/30"
                    >
                      <option value="all">
                        Any type
                      </option>

                      <option value="casual">
                        Casual
                      </option>

                      <option value="competitive">
                        Competitive
                      </option>

                      <option value="training">
                        Training
                      </option>
                    </select>
                  </label>

                  {/* GENDER */}

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                      Players
                    </span>

                    <select
                      value={
                        selectedGender
                      }
                      onChange={(event) =>
                        setSelectedGender(
                          event.target.value
                        )
                      }
                      className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:border-black/30"
                    >
                      <option value="all">
                        Everyone
                      </option>

                      <option value="everyone">
                        Everyone
                      </option>

                      <option value="male">
                        Men
                      </option>

                      <option value="female">
                        Women
                      </option>
                    </select>
                  </label>

                  {/* COST */}

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                      Cost
                    </span>

                    <select
                      value={
                        selectedCost
                      }
                      onChange={(event) =>
                        setSelectedCost(
                          event.target.value
                        )
                      }
                      className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:border-black/30"
                    >
                      <option value="all">
                        Any price
                      </option>

                      <option value="free">
                        Free
                      </option>

                      <option value="under10">
                        Under $10
                      </option>

                      <option value="under20">
                        Under $20
                      </option>
                    </select>
                  </label>
                </div>

                {hasActiveFilters && (
                  <div className="mt-5 flex justify-end">
                    <button
                      type="button"
                      onClick={
                        clearFilters
                      }
                      className="text-sm font-semibold text-slate-500 transition hover:text-black"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* RESULTS HEADER */}

        <section className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
              Upcoming games
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              {availableGames.length}{" "}
              {availableGames.length === 1
                ? "game"
                : "games"}{" "}
              available
            </h2>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <label className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
              Sort by
            </label>

            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(
                  event.target
                    .value as SortOption
                )
              }
              className="h-11 min-w-[190px] rounded-xl border border-black/10 bg-white px-4 text-sm font-medium outline-none focus:border-black/30"
            >
              <option value="soonest">
                Soonest first
              </option>

              <option value="most-spots">
                Most spots available
              </option>

              <option value="lowest-cost">
                Lowest cost
              </option>

              <option value="highest-cost">
                Highest cost
              </option>
            </select>
          </div>
        </section>

        {hasActiveFilters && (
          <p className="mt-2 text-sm text-slate-500">
            Showing filtered results
          </p>
        )}

        {error && (
          <div className="mt-6 rounded-2xl bg-red-50 p-4">
            <p className="text-sm leading-6 text-red-700">
              {error}
            </p>
          </div>
        )}

        {/* GAME GRID */}

        {availableGames.length === 0 ? (
          <section className="mt-8 rounded-[28px] border border-black/10 bg-white p-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f1f1ef] text-2xl">
              🏸
            </div>

            <h3 className="mt-5 text-xl font-semibold">
              No games found
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              There are currently no
              upcoming games with
              available spots matching
              your filters.
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={
                    clearFilters
                  }
                  className="h-11 rounded-full border border-black/10 bg-white px-5 text-sm font-semibold transition hover:bg-slate-50"
                >
                  Clear filters
                </button>
              )}

              <Link
                href="/create-game"
                className="inline-flex h-11 items-center justify-center rounded-full bg-black px-5 text-sm font-semibold text-white transition hover:bg-slate-900"
              >
                Create a game
              </Link>
            </div>
          </section>
        ) : (
          <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {availableGames.map(
              (game) => {
                const sport =
                  sportMap[
                    game.sport_id
                  ];

                const host =
                  profiles[
                    game.host_id
                  ];

                const playerCount =
                  playerCounts[
                    game.id
                  ] ?? 0;

                const spotsLeft =
                  Math.max(
                    game.max_players -
                      playerCount,
                    0
                  );

                const isJoined =
                  joinedGameIds.has(
                    game.id
                  );

                const isHost =
                  currentUserId ===
                  game.host_id;

                const progress =
                  game.max_players >
                  0
                    ? Math.min(
                        100,
                        (playerCount /
                          game.max_players) *
                          100
                      )
                    : 0;

                return (
                  <Link
                    key={game.id}
                    href={`/games/${game.id}`}
                    className="group flex flex-col overflow-hidden rounded-[28px] border border-black/10 bg-white transition hover:-translate-y-1 hover:border-black/20 hover:shadow-[0_20px_60px_rgba(0,0,0,0.06)]"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f1f1ef] text-2xl">
                            {sport?.emoji ||
                              "🏅"}
                          </div>

                          <div>
                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                              {sport?.name ||
                                "Sport"}
                            </p>

                            <p className="mt-1 text-sm font-semibold">
                              {formatEnum(
                                game.game_type
                              )}
                            </p>
                          </div>
                        </div>

                        {isJoined ? (
                          <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-[10px] font-semibold text-emerald-700">
                            Joined
                          </span>
                        ) : isHost ? (
                          <span className="rounded-full bg-black px-3 py-1.5 text-[10px] font-semibold text-white">
                            Your game
                          </span>
                        ) : (
                          <span className="rounded-full bg-[#f1f1ef] px-3 py-1.5 text-[10px] font-semibold text-slate-600">
                            Open
                          </span>
                        )}
                      </div>

                      <h3 className="mt-6 line-clamp-2 text-2xl font-semibold tracking-tight transition group-hover:text-slate-700">
                        {game.title ||
                          "Untitled game"}
                      </h3>

                      <div className="mt-6 space-y-3">
                        {/* DATE */}

                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f1f1ef] text-sm">
                            📅
                          </span>

                          <div>
                            <p className="text-xs text-slate-400">
                              Date
                            </p>

                            <p className="text-sm font-semibold">
                              {formatDate(
                                game.game_date
                              )}
                            </p>
                          </div>
                        </div>

                        {/* TIME */}

                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f1f1ef] text-sm">
                            🕐
                          </span>

                          <div>
                            <p className="text-xs text-slate-400">
                              Time
                            </p>

                            <p className="text-sm font-semibold">
                              {formatTime(
                                game.start_time
                              )}

                              {game.end_time
                                ? ` – ${formatTime(
                                    game.end_time
                                  )}`
                                : ""}
                            </p>
                          </div>
                        </div>

                        {/* LOCATION */}

                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f1f1ef] text-sm">
                            📍
                          </span>

                          <div className="min-w-0">
                            <p className="text-xs text-slate-400">
                              Location
                            </p>

                            <p className="truncate text-sm font-semibold">
                              {
                                game.location_name
                              }
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* TAGS */}

                      <div className="mt-6 flex flex-wrap gap-2">
                        <span className="rounded-full bg-black px-3 py-1.5 text-[11px] font-semibold text-white">
                          {formatEnum(
                            game.skill_level
                          )}
                        </span>

                        {game.gender_preference && (
                          <span className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-[11px] font-medium">
                            {formatEnum(
                              game.gender_preference
                            )}
                          </span>
                        )}

                        <span className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-[11px] font-medium">
                          {Number(
                            game.cost_per_player
                          ) === 0
                            ? "Free"
                            : `$${Number(
                                game.cost_per_player
                              ).toFixed(
                                2
                              )}`}
                        </span>
                      </div>
                    </div>

                    {/* CARD FOOTER */}

                    <div className="mt-auto border-t border-black/10 bg-[#fafaf8] px-6 py-5">
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-xs text-slate-400">
                            Players
                          </p>

                          <p className="mt-1 text-sm font-semibold">
                            {playerCount} /{" "}
                            {
                              game.max_players
                            }
                          </p>
                        </div>

                        <p className="text-xs font-medium text-slate-500">
                          {spotsLeft ===
                          0
                            ? "Full"
                            : `${spotsLeft} ${
                                spotsLeft ===
                                1
                                  ? "spot"
                                  : "spots"
                              } left`}
                        </p>
                      </div>

                      {/* PROGRESS */}

                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-black transition-all"
                          style={{
                            width: `${progress}%`,
                          }}
                        />
                      </div>

                      {/* HOST */}

                      <div className="mt-5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {host?.avatar_url ? (
                            <img
                              src={
                                host.avatar_url
                              }
                              alt=""
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-[10px] font-semibold text-white">
                              {(
                                host?.full_name ||
                                "UoA student"
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                          )}

                          <div>
                            <p className="text-[10px] text-slate-400">
                              Hosted by
                            </p>

                            <p className="text-xs font-semibold">
                              {host?.full_name ||
                                "UoA student"}
                            </p>
                          </div>
                        </div>

                        <span className="text-sm font-semibold transition group-hover:translate-x-1">
                          View →
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              }
            )}
          </section>
        )}
      </div>
    </main>
  );
}