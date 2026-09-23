"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/navbar";

type UserProfile = {
  id?: string;
  full_name?: string | null;
  username?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  selected_sports?: string[];
  sport_skills?: Record<string, string>;
  preferred_days?: string[];
  preferred_times?: string[];
  game_type?: string | null;
  travel_distance?: number | null;
  game_cost?: string | null;
};

type Sport = {
  id: number;
  name: string;
  slug?: string | null;
  emoji?: string | null;
  description?: string | null;
  is_active?: boolean;
};

type DatabaseGame = {
  id: number;
  host_id: string;
  sport_id: number;
  title?: string | null;
  game_date: string;
  start_time: string;
  end_time?: string | null;
  location_name: string;
  facility_id?: number | null;
  max_players: number;
  skill_level: string;
  game_type: string;
  gender_preference?: string | null;
  cost_per_player: number;
  description?: string | null;
  status: string;
};

type GamePlayer = {
  game_id: number;
  user_id: string;
  status?: string | null;
};

type HostProfile = {
  id: string;
  full_name?: string | null;
  username?: string | null;
};

type Review = {
  game_id: number;
  reviewer_id?: string;
  reviewed_user_id: string;
  rating: number;
};

type DisplayGame = {
  id: number;
  sport: string;
  emoji: string;
  title: string;
  date: string;
  rawDate: string;
  time: string;
  location: string;
  skill: string;
  players: string;
  currentPlayers: number;
  maxPlayers: number;
  host: string;
  hostId: string;
  rating: string;
  cost: string;
  costValue: number;
  gameType: string;
  score: number;
  matchPercentage: number;
  isJoined: boolean;
  isHosted: boolean;
  status: string;
  isPast: boolean;
  isCancelled: boolean;
  hasReviewedHost: boolean;
};

const supabase = createClient();

function normalize(
  value: string | null | undefined
) {
  return (value || "").trim().toLowerCase();
}

function titleCase(value: string) {
  if (!value) return "";

  return value
    .replace(/[_-]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1).toLowerCase()
    )
    .join(" ");
}

function formatDate(dateString: string) {
  if (!dateString) return "";

  const date = new Date(
    `${dateString}T12:00:00`
  );

  return date.toLocaleDateString("en-NZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatShortDate(
  dateString: string
) {
  if (!dateString) return "";

  const date = new Date(
    `${dateString}T12:00:00`
  );

  return date.toLocaleDateString("en-NZ", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatTime(time: string) {
  if (!time) return "";

  const parts = time.split(":");
  const hour = Number(parts[0]);
  const minute = parts[1] || "00";

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${minute} ${suffix}`;
}

function getDayName(dateString: string) {
  if (!dateString) return "";

  const date = new Date(
    `${dateString}T12:00:00`
  );

  return date.toLocaleDateString("en-NZ", {
    weekday: "long",
  });
}

function getTimePeriod(time: string) {
  if (!time) return "";

  const hour = Number(
    time.split(":")[0]
  );

  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";

  return "evening";
}

function skillScore(
  userSkill: string | undefined,
  gameSkill: string
) {
  const user = normalize(userSkill);
  const game = normalize(gameSkill);

  if (!user || !game) {
    return 5;
  }

  if (user === game) {
    return 35;
  }

  const levels = [
    "beginner",
    "intermediate",
    "advanced",
  ];

  const userIndex = levels.indexOf(user);
  const gameIndex = levels.indexOf(game);

  if (
    userIndex !== -1 &&
    gameIndex !== -1 &&
    Math.abs(userIndex - gameIndex) === 1
  ) {
    return 20;
  }

  return 5;
}

function gameTypeScore(
  preferredType: string | null | undefined,
  gameType: string
) {
  const preferred =
    normalize(preferredType);

  const actual = normalize(gameType);

  if (
    !preferred ||
    preferred === "either"
  ) {
    return 15;
  }

  if (preferred === actual) {
    return 15;
  }

  return 5;
}

function costScore(
  preference: string | null | undefined,
  cost: number
) {
  const value = normalize(preference);

  if (!value || value === "any") {
    return 10;
  }

  if (
    value.includes("free") &&
    cost === 0
  ) {
    return 15;
  }

  if (
    value.includes("shared") &&
    cost > 0
  ) {
    return 15;
  }

  return 5;
}

function getGameDateTime(
  game: DatabaseGame
) {
  return new Date(
    `${game.game_date}T${game.start_time}`
  );
}

function isGameFinished(
  game: DatabaseGame
) {
  const endTime =
    game.end_time || game.start_time;

  const gameEnd = new Date(
    `${game.game_date}T${endTime}`
  );

  return gameEnd.getTime() < Date.now();
}

export default function DashboardPage() {
  const [profile, setProfile] =
    useState<UserProfile | null>(null);

  const [email, setEmail] = useState("");

  const [sports, setSports] =
    useState<Sport[]>([]);

  const [games, setGames] =
    useState<DisplayGame[]>([]);

  const [userGames, setUserGames] =
    useState<DisplayGame[]>([]);

  const [upcomingGame, setUpcomingGame] =
    useState<DisplayGame | null>(null);

  const [greeting, setGreeting] =
    useState("Hello");

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    const hour = new Date().getHours();

    if (hour < 12) {
      setGreeting("Good morning");
    } else if (hour < 18) {
      setGreeting("Good afternoon");
    } else {
      setGreeting("Good evening");
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setErrorMessage("");

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          window.location.href =
            "/auth/login";
          return;
        }

        if (!mounted) return;

        setEmail(user.email || "");

        const metadata =
          user.user_metadata || {};

        // =====================================================
        // PROFILE
        // =====================================================

        const {
          data: databaseProfile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(
            `
              id,
              full_name,
              username,
              bio,
              avatar_url,
              selected_sports,
              sport_skills,
              preferred_days,
              preferred_times,
              game_type,
              travel_distance,
              game_cost
            `
          )
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error(
            "Could not load profile:",
            profileError
          );
        }

        const profileData: UserProfile = {
          id: user.id,

          full_name:
            databaseProfile?.full_name ||
            metadata.full_name ||
            "",

          username:
            databaseProfile?.username ||
            metadata.username ||
            "",

          bio:
            databaseProfile?.bio ||
            metadata.bio ||
            "",

          avatar_url:
            databaseProfile?.avatar_url ||
            metadata.avatar_url ||
            null,

          selected_sports:
            Array.isArray(
              databaseProfile?.selected_sports
            )
              ? databaseProfile.selected_sports
              : Array.isArray(
                    metadata.selected_sports
                  )
                ? metadata.selected_sports
                : [],

          sport_skills:
            databaseProfile?.sport_skills &&
            typeof databaseProfile.sport_skills ===
              "object"
              ? databaseProfile.sport_skills
              : metadata.sport_skills || {},

          preferred_days:
            Array.isArray(
              databaseProfile?.preferred_days
            )
              ? databaseProfile.preferred_days
              : Array.isArray(
                    metadata.preferred_days
                  )
                ? metadata.preferred_days
                : [],

          preferred_times:
            Array.isArray(
              databaseProfile?.preferred_times
            )
              ? databaseProfile.preferred_times
              : Array.isArray(
                    metadata.preferred_times
                  )
                ? metadata.preferred_times
                : [],

          game_type:
            databaseProfile?.game_type ||
            metadata.game_type ||
            "Either",

          travel_distance:
            databaseProfile?.travel_distance ??
            metadata.travel_distance ??
            10,

          game_cost:
            databaseProfile?.game_cost ||
            metadata.game_cost ||
            "Any",
        };

        if (!mounted) return;

        setProfile(profileData);

        // =====================================================
        // SPORTS
        // =====================================================

        const {
          data: sportsData,
          error: sportsError,
        } = await supabase
          .from("sports")
          .select(
            "id, name, slug, emoji, description, is_active"
          )
          .eq("is_active", true)
          .order("name");

        if (sportsError) {
          console.error(
            "Could not load sports:",
            sportsError
          );
        }

        const loadedSports: Sport[] =
          sportsData || [];

        if (!mounted) return;

        setSports(loadedSports);

        // =====================================================
        // FUTURE / GENERAL GAMES
        // =====================================================

        const today = new Date();

        const todayString =
          `${today.getFullYear()}-${String(
            today.getMonth() + 1
          ).padStart(
            2,
            "0"
          )}-${String(
            today.getDate()
          ).padStart(2, "0")}`;

        const {
          data: gamesData,
          error: gamesError,
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
          .gte("game_date", todayString)
          .order("game_date", {
            ascending: true,
          })
          .order("start_time", {
            ascending: true,
          })
          .limit(100);

        if (gamesError) {
          console.error(
            "Could not load games:",
            gamesError
          );
        }

        const databaseGames: DatabaseGame[] =
          gamesData || [];

        // =====================================================
        // USER PARTICIPATION
        // =====================================================

        const {
          data: userPlayerRows,
          error: userPlayerError,
        } = await supabase
          .from("game_players")
          .select(
            "game_id, user_id, status"
          )
          .eq("user_id", user.id);

        if (userPlayerError) {
          console.error(
            "Could not load user games:",
            userPlayerError
          );
        }

        const userPlayerData: GamePlayer[] =
          userPlayerRows || [];

        // =====================================================
        // USER HOSTED GAMES
        // =====================================================

        const {
          data: userHostedRows,
          error: userHostedError,
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
          .eq("host_id", user.id)
          .order("game_date", {
            ascending: false,
          })
          .limit(50);

        if (userHostedError) {
          console.error(
            "Could not load hosted games:",
            userHostedError
          );
        }

        const hostedGames: DatabaseGame[] =
          userHostedRows || [];

        // =====================================================
        // MERGE GAMES NEEDED FOR USER HISTORY
        // =====================================================

        const userGameIds =
          new Set<number>();

        userPlayerData.forEach((row) => {
          if (row.status === "joined") {
            userGameIds.add(row.game_id);
          }
        });

        hostedGames.forEach((game) => {
          userGameIds.add(game.id);
        });

        const missingUserGameIds =
          Array.from(userGameIds).filter(
            (id) =>
              !databaseGames.some(
                (game) =>
                  game.id === id
              )
          );

        let historyGames: DatabaseGame[] =
          [...databaseGames];

        if (
          missingUserGameIds.length > 0
        ) {
          const {
            data: missingGames,
            error: missingGamesError,
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
            .in(
              "id",
              missingUserGameIds
            );

          if (missingGamesError) {
            console.error(
              "Could not load game history:",
              missingGamesError
            );
          } else {
            historyGames = [
              ...historyGames,
              ...(missingGames || []),
            ];
          }
        }

        // =====================================================
        // GAME PLAYERS FOR ALL LOADED GAMES
        // =====================================================

        const allGameIds =
          Array.from(
            new Set(
              historyGames.map(
                (game) => game.id
              )
            )
          );

        let playerRows: GamePlayer[] =
          [];

        if (allGameIds.length > 0) {
          const {
            data,
            error,
          } = await supabase
            .from("game_players")
            .select(
              "game_id, user_id, status"
            )
            .in(
              "game_id",
              allGameIds
            );

          if (error) {
            console.error(
              "Could not load game players:",
              error
            );
          } else {
            playerRows = data || [];
          }
        }

        // =====================================================
        // HOST PROFILES
        // =====================================================

        const hostIds =
          Array.from(
            new Set(
              historyGames.map(
                (game) =>
                  game.host_id
              )
            )
          );

        let hostProfiles: HostProfile[] =
          [];

        if (hostIds.length > 0) {
          const {
            data,
            error,
          } = await supabase
            .from("profiles")
            .select(
              "id, full_name, username"
            )
            .in(
              "id",
              hostIds
            );

          if (error) {
            console.error(
              "Could not load host profiles:",
              error
            );
          } else {
            hostProfiles = data || [];
          }
        }

        // =====================================================
        // REVIEWS
        // =====================================================

        let reviewRows: Review[] = [];

        if (hostIds.length > 0) {
          const {
            data,
            error,
          } = await supabase
            .from("reviews")
            .select(
              "game_id, reviewer_id, reviewed_user_id, rating"
            )
            .in(
              "reviewed_user_id",
              hostIds
            );

          if (error) {
            console.error(
              "Could not load reviews:",
              error
            );
          } else {
            reviewRows = data || [];
          }
        }

        // =====================================================
        // USER'S OWN REVIEWS
        // =====================================================

        const myReviewRows =
          reviewRows.filter(
            (review) =>
              review.reviewer_id ===
              user.id
          );

        // =====================================================
        // LOOKUPS
        // =====================================================

        const sportLookup =
          new Map<number, Sport>();

        loadedSports.forEach(
          (sport) => {
            sportLookup.set(
              sport.id,
              sport
            );
          }
        );

        const hostLookup =
          new Map<
            string,
            HostProfile
          >();

        hostProfiles.forEach(
          (host) => {
            hostLookup.set(
              host.id,
              host
            );
          }
        );

        const playerCountLookup =
          new Map<number, number>();

        const joinedGameIds =
          new Set<number>();

        playerRows.forEach(
          (player) => {
            if (
              player.status !==
              "joined"
            ) {
              return;
            }

            const current =
              playerCountLookup.get(
                player.game_id
              ) || 0;

            playerCountLookup.set(
              player.game_id,
              current + 1
            );

            if (
              player.user_id ===
              user.id
            ) {
              joinedGameIds.add(
                player.game_id
              );
            }
          }
        );

        const ratingLookup =
          new Map<
            string,
            number[]
          >();

        reviewRows.forEach(
          (review) => {
            const existing =
              ratingLookup.get(
                review.reviewed_user_id
              ) || [];

            existing.push(
              review.rating
            );

            ratingLookup.set(
              review.reviewed_user_id,
              existing
            );
          }
        );

        const reviewedGameIds =
          new Set<number>();

        myReviewRows.forEach(
          (review) => {
            reviewedGameIds.add(
              review.game_id
            );
          }
        );

        // =====================================================
        // CONVERT ALL GAMES
        // =====================================================

        const convertedGames: DisplayGame[] =
          historyGames.map(
            (game) => {
              const sport =
                sportLookup.get(
                  game.sport_id
                );

              const host =
                hostLookup.get(
                  game.host_id
                );

              const currentPlayers =
                playerCountLookup.get(
                  game.id
                ) || 0;

              const isJoined =
                joinedGameIds.has(
                  game.id
                );

              const isHosted =
                game.host_id ===
                user.id;

              const ratings =
                ratingLookup.get(
                  game.host_id
                ) || [];

              const averageRating =
                ratings.length > 0
                  ? (
                      ratings.reduce(
                        (
                          sum,
                          rating
                        ) =>
                          sum + rating,
                        0
                      ) /
                      ratings.length
                    ).toFixed(1)
                  : "New";

              const sportName =
                sport?.name ||
                "Sport";

              const gameFinished =
                isGameFinished(
                  game
                );

              let score = 0;

              // =================================================
              // RECOMMENDATION SCORING
              // =================================================

              const selectedSports =
                profileData.selected_sports ||
                [];

              const sportMatches =
                selectedSports.some(
                  (
                    selectedSport
                  ) =>
                    normalize(
                      selectedSport
                    ) ===
                    normalize(
                      sportName
                    )
                );

              if (
                sportMatches
              ) {
                score += 50;
              }

              const userSkill =
                profileData
                  .sport_skills?.[
                  sportName
                ];

              score +=
                skillScore(
                  userSkill,
                  game.skill_level
                );

              const gameDay =
                normalize(
                  getDayName(
                    game.game_date
                  )
                );

              const preferredDays =
                profileData.preferred_days ||
                [];

              if (
                preferredDays.some(
                  (day) =>
                    normalize(
                      day
                    ) === gameDay
                )
              ) {
                score += 20;
              }

              const gamePeriod =
                getTimePeriod(
                  game.start_time
                );

              const preferredTimes =
                profileData.preferred_times ||
                [];

              if (
                preferredTimes.some(
                  (time) =>
                    normalize(
                      time
                    ) ===
                    gamePeriod
                )
              ) {
                score += 20;
              }

              score +=
                gameTypeScore(
                  profileData.game_type,
                  game.game_type
                );

              const cost =
                Number(
                  game.cost_per_player ||
                    0
                );

              score +=
                costScore(
                  profileData.game_cost,
                  cost
                );

              const openSpots =
                game.max_players -
                currentPlayers;

              if (
                openSpots > 0
              ) {
                score += 10;
              }

              const gameDate =
                getGameDateTime(
                  game
                );

              const now =
                new Date();

              const hoursUntil =
                (gameDate.getTime() -
                  now.getTime()) /
                (1000 * 60 * 60);

              if (
                hoursUntil >= 0 &&
                hoursUntil <= 48
              ) {
                score += 5;
              }

              const maxScore =
                170;

              const matchPercentage =
                Math.min(
                  100,
                  Math.max(
                    1,
                    Math.round(
                      (score /
                        maxScore) *
                        100
                    )
                  )
                );

              return {
                id: game.id,

                sport:
                  sportName,

                emoji:
                  sport?.emoji ||
                  "🏅",

                title:
                  game.title ||
                  sportName,

                date:
                  formatShortDate(
                    game.game_date
                  ),

                rawDate:
                  game.game_date,

                time:
                  formatTime(
                    game.start_time
                  ),

                location:
                  game.location_name,

                skill:
                  titleCase(
                    game.skill_level
                  ),

                players:
                  `${currentPlayers} / ${game.max_players} players`,

                currentPlayers,

                maxPlayers:
                  game.max_players,

                host:
                  host?.full_name ||
                  host?.username ||
                  "UoA student",

                hostId:
                  game.host_id,

                rating:
                  averageRating,

                cost:
                  cost === 0
                    ? "Free"
                    : `$${cost.toFixed(
                        2
                      )}`,

                costValue:
                  cost,

                gameType:
                  titleCase(
                    game.game_type
                  ),

                score,

                matchPercentage,

                isJoined,

                isHosted,

                status:
                  game.status,

                isPast:
                  gameFinished,

                isCancelled:
                  normalize(
                    game.status
                  ) ===
                  "cancelled",

                hasReviewedHost:
                  reviewedGameIds.has(
                    game.id
                  ),
              };
            }
          );

        // =====================================================
        // AVAILABLE RECOMMENDATIONS
        // =====================================================

        const availableGames =
          convertedGames.filter(
            (game) =>
              !game.isPast &&
              !game.isCancelled &&
              game.status ===
                "open" &&
              !game.isJoined &&
              !game.isHosted &&
              game.currentPlayers <
                game.maxPlayers
          );

        const sortedGames =
          [...availableGames].sort(
            (a, b) => {
              if (
                b.score !==
                a.score
              ) {
                return (
                  b.score -
                  a.score
                );
              }

              return (
                a.rawDate.localeCompare(
                  b.rawDate
                ) ||
                a.time.localeCompare(
                  b.time
                )
              );
            }
          );

        // =====================================================
        // USER GAME HISTORY
        // =====================================================

        const userActivity =
          convertedGames.filter(
            (game) =>
              game.isJoined ||
              game.isHosted
          );

        const sortedUserActivity =
          [...userActivity].sort(
            (a, b) => {
              const dateA =
                `${a.rawDate} ${a.time}`;

              const dateB =
                `${b.rawDate} ${b.time}`;

              return dateB.localeCompare(
                dateA
              );
            }
          );

        // Upcoming games only

        const upcomingUserGames =
          userActivity
            .filter(
              (game) =>
                !game.isPast &&
                !game.isCancelled
            )
            .sort(
              (a, b) => {
                const dateA =
                  `${a.rawDate} ${a.time}`;

                const dateB =
                  `${b.rawDate} ${b.time}`;

                return dateA.localeCompare(
                  dateB
                );
              }
            );

        const userUpcomingGame =
          upcomingUserGames[0] ||
          null;

        if (!mounted) return;

        setGames(
          sortedGames.slice(
            0,
            6
          )
        );

        setUserGames(
          sortedUserActivity.slice(
            0,
            8
          )
        );

        setUpcomingGame(
          userUpcomingGame
        );
      } catch (error) {
        console.error(
          "Dashboard loading error:",
          error
        );

        if (!mounted) return;

        setErrorMessage(
          "We couldn't load some of your dashboard data. Please refresh and try again."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  // ===========================================================
  // DISPLAY INFORMATION
  // ===========================================================

  const displayName =
    profile?.full_name?.trim() ||
    profile?.username?.trim() ||
    email.split("@")[0] ||
    "there";

  const firstName =
    displayName.split(" ")[0];

  const avatarLetter =
    displayName
      .charAt(0)
      .toUpperCase() ||
    "U";

  const userSports =
    profile?.selected_sports ||
    [];

  const sportLookup = useMemo(() => {
    const lookup =
      new Map<string, Sport>();

    sports.forEach(
      (sport) => {
        lookup.set(
          normalize(
            sport.name
          ),
          sport
        );
      }
    );

    return lookup;
  }, [sports]);

  const pastGames =
    userGames.filter(
      (game) =>
        game.isPast &&
        !game.isCancelled
    );

  const cancelledGames =
    userGames.filter(
      (game) =>
        game.isCancelled
    );

  // ===========================================================
  // LOADING
  // ===========================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f7f5] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto" />

          <p className="text-gray-500 text-sm mt-5">
            Loading your dashboard...
          </p>
        </div>
      </main>
    );
  }

  // ===========================================================
  // PAGE
  // ===========================================================

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-black">

      {/* =====================================================
          NAVIGATION
      ===================================================== */}

      <Navbar />

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="max-w-[1600px] mx-auto px-6 md:px-16 pt-16 md:pt-20 pb-14">

        <div className="max-w-4xl">

          <p className="text-sm tracking-[0.3em] text-gray-400 uppercase mb-6">
            Dashboard
          </p>

          <h1 className="text-5xl md:text-7xl font-semibold tracking-[-0.05em] leading-[0.95]">
            {greeting},{""} {firstName}.
          </h1>

          <p className="text-lg md:text-2xl text-gray-500 mt-8 max-w-3xl leading-relaxed">
            Ready to play? Find a game
            that fits your schedule or
            create one for other students
            to join.
          </p>

        </div>

      </section>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {errorMessage && (
        <section className="max-w-[1600px] mx-auto px-6 md:px-16 mb-8">

          <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-5 text-red-700 text-sm">
            {errorMessage}
          </div>

        </section>
      )}

      {/* =====================================================
          MAIN ACTIONS
      ===================================================== */}

      <section className="max-w-[1600px] mx-auto px-6 md:px-16">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* FIND GAME */}

          <Link
            href="/games"
            className="group bg-black text-white rounded-[32px] p-8 md:p-12 min-h-[330px] flex flex-col justify-between hover:scale-[1.01] transition duration-300"
          >

            <div>

              <p className="text-sm tracking-wide text-gray-500 uppercase mb-8">
                Discover
              </p>

              <h2 className="text-4xl md:text-5xl font-medium tracking-tight">
                Find a game
              </h2>

              <p className="text-lg text-gray-400 mt-5 max-w-xl leading-relaxed">
                Find UoA students
                playing your favourite
                sports at a time that
                works for you.
              </p>

            </div>

            <div className="text-white font-medium">
              Explore games

              <span className="inline-block ml-2 group-hover:translate-x-1 transition">
                →
              </span>
            </div>

          </Link>

          {/* CREATE GAME */}

          <Link
            href="/create-game"
            className="group bg-white border border-gray-200 rounded-[32px] p-8 md:p-12 min-h-[330px] flex flex-col justify-between hover:scale-[1.01] transition duration-300"
          >

            <div>

              <p className="text-sm tracking-wide text-gray-400 uppercase mb-8">
                Host
              </p>

              <h2 className="text-4xl md:text-5xl font-medium tracking-tight">
                Create a game
              </h2>

              <p className="text-lg text-gray-500 mt-5 max-w-xl leading-relaxed">
                Choose a sport, time,
                location and number of
                players.
              </p>

            </div>

            <div className="text-black font-medium">
              Create game

              <span className="inline-block ml-2 group-hover:translate-x-1 transition">
                →
              </span>
            </div>

          </Link>

        </div>

      </section>

      {/* =====================================================
          UPCOMING GAME
      ===================================================== */}

      <section className="max-w-[1600px] mx-auto px-6 md:px-16 mt-24 md:mt-28">

        <p className="text-sm tracking-[0.3em] text-gray-400 uppercase mb-5">
          Your activity
        </p>

        <h2 className="text-4xl font-medium tracking-tight mb-10">
          Upcoming game
        </h2>

        <div className="bg-white rounded-[30px] border border-gray-200 p-8 md:p-10">

          {upcomingGame ? (

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">

              <div className="flex items-center gap-6">

                <div className="w-20 h-20 rounded-2xl bg-[#f3f3f1] flex items-center justify-center text-4xl">
                  {upcomingGame.emoji}
                </div>

                <div>

                  <p className="text-sm text-gray-400 uppercase tracking-wide">
                    {upcomingGame.isHosted
                      ? "You are hosting"
                      : "You are playing"}
                  </p>

                  <h3 className="text-2xl md:text-3xl font-medium mt-1">
                    {upcomingGame.title}
                  </h3>

                  <p className="text-gray-500 mt-2">
                    {formatDate(
                      upcomingGame.rawDate
                    )}{" "}
                    ·{" "}
                    {upcomingGame.time}
                  </p>

                  <p className="text-gray-500">
                    {upcomingGame.location}
                  </p>

                </div>

              </div>

              <Link
                href={`/games/${upcomingGame.id}`}
                className="bg-black text-white rounded-full px-7 py-4 text-sm font-medium hover:bg-gray-800 transition text-center"
              >
                View game
              </Link>

            </div>

          ) : (

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">

              <div className="flex items-center gap-6">

                <div className="w-20 h-20 rounded-2xl bg-[#f3f3f1] flex items-center justify-center text-4xl">
                  🏸
                </div>

                <div>

                  <h3 className="text-2xl md:text-3xl font-medium">
                    No upcoming games yet
                  </h3>

                  <p className="text-gray-500 mt-2">
                    Join a game to see it
                    here.
                  </p>

                </div>

              </div>

              <Link
                href="/games"
                className="bg-black text-white rounded-full px-7 py-4 text-sm font-medium hover:bg-gray-800 transition text-center"
              >
                Find a game
              </Link>

            </div>

          )}

        </div>

      </section>

      {/* =====================================================
          GAME HISTORY
      ===================================================== */}

      <section className="max-w-[1600px] mx-auto px-6 md:px-16 mt-24 md:mt-28">

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">

          <div>

            <p className="text-sm tracking-[0.3em] text-gray-400 uppercase mb-5">
              Your activity
            </p>

            <h2 className="text-4xl font-medium tracking-tight">
              Game history
            </h2>

            <p className="text-gray-500 mt-3 max-w-2xl">
              Keep track of games you
              have played, hosted or
              cancelled.
            </p>

          </div>

          <Link
            href="/profile"
            className="text-sm font-medium hover:underline"
          >
            View profile →
          </Link>

        </div>

        {userGames.length > 0 ? (

          <div className="space-y-4">

            {userGames.map(
              (game) => {

                const statusLabel =
                  game.isCancelled
                    ? "Cancelled"
                    : game.isPast
                      ? "Finished"
                      : game.isHosted
                        ? "Hosting"
                        : "Joined";

                const statusClass =
                  game.isCancelled
                    ? "bg-red-50 text-red-600 border-red-100"
                    : game.isPast
                      ? "bg-gray-100 text-gray-600 border-gray-200"
                      : "bg-green-50 text-green-700 border-green-100";

                return (

                  <div
                    key={game.id}
                    className="bg-white border border-gray-200 rounded-[26px] p-6 md:p-7"
                  >

                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

                      <div className="flex items-center gap-5">

                        <div className="w-16 h-16 rounded-2xl bg-[#f3f3f1] flex items-center justify-center text-3xl shrink-0">
                          {game.emoji}
                        </div>

                        <div>

                          <div className="flex flex-wrap items-center gap-3">

                            <h3 className="text-xl md:text-2xl font-medium">
                              {game.title}
                            </h3>

                            <span
                              className={`border rounded-full px-3 py-1 text-xs font-medium ${statusClass}`}
                            >
                              {statusLabel}
                            </span>

                          </div>

                          <p className="text-gray-500 mt-2">
                            {game.date} ·{" "}
                            {game.time}
                          </p>

                          <p className="text-gray-400 text-sm mt-1">
                            {game.location}
                          </p>

                        </div>

                      </div>

                      <div className="flex flex-wrap gap-3">

                        <Link
                          href={`/games/${game.id}`}
                          className="border border-gray-300 rounded-full px-5 py-3 text-sm font-medium hover:border-black transition"
                        >
                          View game
                        </Link>

                        {game.isPast &&
                          !game.isCancelled &&
                          game.isJoined &&
                          !game.isHosted &&
                          !game.hasReviewedHost && (
                            <Link
                              href={`/games/${game.id}/review`}
                              className="bg-black text-white rounded-full px-5 py-3 text-sm font-medium hover:bg-gray-800 transition"
                            >
                              Rate host
                            </Link>
                          )}

                        {game.isPast &&
                          !game.isCancelled &&
                          game.isJoined &&
                          !game.isHosted &&
                          game.hasReviewedHost && (
                            <span className="bg-gray-100 text-gray-600 rounded-full px-5 py-3 text-sm font-medium">
                              ✓ Reviewed
                            </span>
                          )}

                      </div>

                    </div>

                  </div>

                );
              }
            )}

          </div>

        ) : (

          <div className="bg-white border border-gray-200 rounded-[30px] p-10">

            <div className="text-5xl mb-6">
              🏟️
            </div>

            <h3 className="text-2xl font-medium">
              No game history yet
            </h3>

            <p className="text-gray-500 mt-3 max-w-xl">
              Join or create your first
              game and your activity will
              appear here.
            </p>

            <div className="flex flex-wrap gap-3 mt-7">

              <Link
                href="/games"
                className="bg-black text-white rounded-full px-6 py-3 text-sm font-medium"
              >
                Browse games
              </Link>

              <Link
                href="/create-game"
                className="bg-gray-100 text-black rounded-full px-6 py-3 text-sm font-medium"
              >
                Create a game
              </Link>

            </div>

          </div>

        )}

      </section>

      {/* =====================================================
          FINISHED GAMES
      ===================================================== */}

      {pastGames.length > 0 && (
        <section className="max-w-[1600px] mx-auto px-6 md:px-16 mt-16">

          <div className="bg-white border border-gray-200 rounded-[30px] p-8 md:p-10">

            <div className="flex items-center justify-between gap-5">

              <div>

                <p className="text-sm tracking-[0.3em] text-gray-400 uppercase mb-3">
                  Completed
                </p>

                <h2 className="text-3xl font-medium">
                  Games you have finished
                </h2>

              </div>

              <span className="text-3xl font-semibold">
                {pastGames.length}
              </span>

            </div>

            <p className="text-gray-500 mt-4">
              Completed games can be
              reviewed from the game
              history above.
            </p>

          </div>

        </section>
      )}

      {/* =====================================================
          CANCELLED GAMES
      ===================================================== */}

      {cancelledGames.length > 0 && (
        <section className="max-w-[1600px] mx-auto px-6 md:px-16 mt-16">

          <div className="bg-white border border-gray-200 rounded-[30px] p-8 md:p-10">

            <div className="flex items-center justify-between gap-5">

              <div>

                <p className="text-sm tracking-[0.3em] text-gray-400 uppercase mb-3">
                  Cancelled
                </p>

                <h2 className="text-3xl font-medium">
                  Cancelled games
                </h2>

              </div>

              <span className="text-3xl font-semibold">
                {cancelledGames.length}
              </span>

            </div>

            <p className="text-gray-500 mt-4">
              These games are kept in your
              history but are no longer
              active.
            </p>

          </div>

        </section>
      )}

      {/* =====================================================
          RECOMMENDED GAMES
      ===================================================== */}

      <section className="max-w-[1600px] mx-auto px-6 md:px-16 mt-24 md:mt-28">

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">

          <div>

            <p className="text-sm tracking-[0.3em] text-gray-400 uppercase mb-5">
              Recommended
            </p>

            <h2 className="text-4xl font-medium tracking-tight">
              Games for you
            </h2>

            <p className="text-gray-500 mt-3 max-w-2xl">
              Games are ranked using your
              sports, skill levels, preferred
              days, preferred times and game
              preferences.
            </p>

          </div>

          <Link
            href="/games"
            className="text-sm font-medium hover:underline"
          >
            View all →
          </Link>

        </div>

        {games.length > 0 ? (

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

            {games.map(
              (game) => {

                const userSkill =
                  profile?.sport_skills?.[
                    game.sport
                  ];

                return (

                  <div
                    key={game.id}
                    className="bg-white border border-gray-200 rounded-[30px] p-8 min-h-[540px] flex flex-col hover:border-gray-300 transition"
                  >

                    {/* GAME HEADER */}

                    <div className="flex items-center justify-between gap-4">

                      <div className="w-16 h-16 rounded-2xl bg-[#f3f3f1] flex items-center justify-center text-3xl">
                        {game.emoji}
                      </div>

                      <div className="bg-black text-white rounded-full px-4 py-2 text-xs font-semibold">
                        {game.matchPercentage}% match
                      </div>

                    </div>

                    {/* GAME DETAILS */}

                    <div className="mt-10">

                      <h3 className="text-3xl font-medium">
                        {game.title}
                      </h3>

                      <p className="text-sm text-gray-400 mt-2">
                        {game.sport}
                      </p>

                      <div className="space-y-2 mt-6 text-gray-500">

                        <p>
                          {game.date} ·{" "}
                          {game.time}
                        </p>

                        <p>
                          {game.location}
                        </p>

                        <p>
                          {game.skill} level
                        </p>

                        <p>
                          {game.gameType} game
                        </p>

                        <p>
                          {game.cost}
                          {game.cost !==
                            "Free" &&
                            " per player"}
                        </p>

                      </div>

                      {userSkill && (
                        <div className="mt-5 text-sm text-gray-400">
                          Your level:{" "}
                          <span className="text-black font-medium">
                            {userSkill}
                          </span>
                        </div>
                      )}

                    </div>

                    {/* GAME FOOTER */}

                    <div className="mt-auto pt-10">

                      <div className="flex justify-between mb-6">

                        <div>

                          <p className="text-xs text-gray-400 uppercase">
                            Host
                          </p>

                          <p className="mt-1 font-medium">
                            {game.host}
                          </p>

                        </div>

                        <div className="text-right">

                          <p className="text-xs text-gray-400 uppercase">
                            Rating
                          </p>

                          <p className="mt-1 font-medium">
                            {game.rating ===
                            "New"
                              ? "New host"
                              : `★ ${game.rating}`}
                          </p>

                        </div>

                      </div>

                      <div className="flex items-center justify-between mb-5">

                        <p className="text-sm text-gray-500">
                          {game.players}
                        </p>

                        <p className="text-sm font-medium">
                          {game.maxPlayers -
                            game.currentPlayers}{" "}
                          spot
                          {game.maxPlayers -
                            game.currentPlayers ===
                          1
                            ? ""
                            : "s"}{" "}
                          left
                        </p>

                      </div>

                      <Link
                        href={`/games/${game.id}`}
                        className="block w-full bg-black text-white text-center rounded-full py-4 font-medium hover:bg-gray-800 transition"
                      >
                        View game
                      </Link>

                    </div>

                  </div>

                );
              }
            )}

          </div>

        ) : (

          <div className="bg-white border border-gray-200 rounded-[30px] p-10">

            <div className="text-5xl mb-6">
              🏟️
            </div>

            <h3 className="text-2xl font-medium">
              No open games available
            </h3>

            <p className="text-gray-500 mt-3 max-w-xl">
              There are currently no
              available games with open
              player spots. You can browse
              all games or create one for
              other UoA students to join.
            </p>

            <div className="flex flex-wrap gap-3 mt-7">

              <Link
                href="/games"
                className="bg-black text-white rounded-full px-6 py-3 text-sm font-medium"
              >
                Browse all games
              </Link>

              <Link
                href="/create-game"
                className="bg-gray-100 text-black rounded-full px-6 py-3 text-sm font-medium"
              >
                Create a game
              </Link>

            </div>

          </div>

        )}

      </section>

      {/* =====================================================
          YOUR SPORTS
      ===================================================== */}

      <section className="max-w-[1600px] mx-auto px-6 md:px-16 mt-24 md:mt-28 pb-24">

        <p className="text-sm tracking-[0.3em] text-gray-400 uppercase mb-5">
          Your interests
        </p>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">

          <div>

            <h2 className="text-4xl font-medium tracking-tight">
              Sports you play
            </h2>

            <p className="text-gray-500 mt-3">
              Your selected sports and
              individual skill levels.
            </p>

          </div>

          <Link
            href="/profile"
            className="text-sm font-medium hover:underline"
          >
            Edit preferences →
          </Link>

        </div>

        {userSports.length > 0 ? (

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

            {userSports.map(
              (sportName) => {

                const sportInfo =
                  sportLookup.get(
                    normalize(
                      sportName
                    )
                  );

                const emoji =
                  sportInfo?.emoji ||
                  "🏅";

                const skill =
                  profile?.sport_skills?.[
                    sportName
                  ];

                return (

                  <Link
                    key={sportName}
                    href={`/games?sport=${encodeURIComponent(
                      sportName
                    )}`}
                    className="group bg-white border border-gray-200 rounded-3xl p-6 flex items-center gap-4 hover:border-black hover:-translate-y-0.5 transition"
                  >

                    <div className="w-12 h-12 rounded-xl bg-[#f3f3f1] flex items-center justify-center text-2xl">
                      {emoji}
                    </div>

                    <div className="flex-1 min-w-0">

                      <p className="font-medium truncate">
                        {sportName}
                      </p>

                      {skill && (
                        <p className="text-sm text-gray-400 mt-1">
                          {skill}
                        </p>
                      )}

                    </div>

                    <span className="group-hover:translate-x-1 transition text-gray-400">
                      →
                    </span>

                  </Link>

                );
              }
            )}

          </div>

        ) : (

          <div className="bg-white border border-gray-200 rounded-3xl p-8">

            <p className="text-gray-500">
              You haven't selected any
              sports yet.
            </p>

            <Link
              href="/profile"
              className="inline-block mt-4 font-medium underline"
            >
              Add your sports
            </Link>

          </div>

        )}

      </section>

    </main>
  );
}