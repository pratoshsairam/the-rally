"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import UserSafetyMenu from "@/components/user-safety-menu";

type Sport = {
  id: number;
  name: string;
  slug: string;
  emoji: string | null;
};

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
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
  facility_id: number | null;
  max_players: number;
  skill_level: string;
  game_type: string;
  gender_preference: string | null;
  cost_per_player: number;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type Player = {
  id: number;
  user_id: string;
  status: string;
  joined_at: string;
  profile: Profile | null;
};

type Review = {
  id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_id: string;
  reviewer: Profile | null;
};

function formatDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);

  return new Intl.DateTimeFormat("en-NZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatShortDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);

  return new Intl.DateTimeFormat("en-NZ", {
    day: "numeric",
    month: "short",
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
    hours % 12 === 0
      ? 12
      : hours % 12;

  return `${displayHour}:${minutesString} ${suffix}`;
}

function formatEnum(
  value: string | null | undefined,
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
        word.slice(1).toLowerCase(),
    )
    .join(" ");
}

function getInitials(
  name: string | null | undefined,
) {
  if (!name) {
    return "U";
  }

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0]
      .charAt(0)
      .toUpperCase();
  }

  return (
    parts[0].charAt(0) +
    parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

function hasGameFinished(game: Game) {
  const endTime =
    game.end_time || game.start_time;

  const gameEnd = new Date(
    `${game.game_date}T${endTime}`,
  );

  return (
    !Number.isNaN(gameEnd.getTime()) &&
    gameEnd.getTime() <= Date.now()
  );
}

function getEffectiveStatus(
  game: Game,
  playerCount: number,
) {
  const databaseStatus =
    game.status.toLowerCase();

  if (databaseStatus === "cancelled") {
    return "cancelled";
  }

  if (
    databaseStatus === "completed" ||
    hasGameFinished(game)
  ) {
    return "completed";
  }

  if (
    databaseStatus === "full" ||
    playerCount >= game.max_players
  ) {
    return "full";
  }

  return "open";
}

function getStatusLabel(status: string) {
  switch (status.toLowerCase()) {
    case "cancelled":
      return "Cancelled";

    case "full":
      return "Full";

    case "completed":
      return "Completed";

    default:
      return "Open";
  }
}

function getStatusClasses(status: string) {
  switch (status.toLowerCase()) {
    case "cancelled":
      return "bg-red-50 text-red-700";

    case "full":
      return "bg-slate-100 text-slate-700";

    case "completed":
      return "bg-blue-50 text-blue-700";

    default:
      return "bg-emerald-50 text-emerald-700";
  }
}

export default function GameDetailsPage() {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [gameId, setGameId] =
    useState<string | null>(null);

  const [game, setGame] =
    useState<Game | null>(null);

  const [sport, setSport] =
    useState<Sport | null>(null);

  const [host, setHost] =
    useState<Profile | null>(null);

  const [players, setPlayers] =
    useState<Player[]>([]);

  const [reviews, setReviews] =
    useState<Review[]>([]);

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  /*
   * =========================================================
   * BLOCK STATE
   * =========================================================
   */

  const [hasBlockedHost, setHasBlockedHost] =
    useState(false);

  const [isBlockedByHost, setIsBlockedByHost] =
    useState(false);

  const [blockCheckLoading, setBlockCheckLoading] =
    useState(true);

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [cancelLoading, setCancelLoading] =
    useState(false);

  const [showCancelConfirm, setShowCancelConfirm] =
    useState(false);

  const [error, setError] =
    useState("");

  const [actionMessage, setActionMessage] =
    useState("");

  /*
   * =========================================================
   * GET GAME ID
   * =========================================================
   */

  useEffect(() => {
    const parts =
      window.location.pathname
        .split("/")
        .filter(Boolean);

    const gamesIndex =
      parts.indexOf("games");

    if (
      gamesIndex !== -1 &&
      parts[gamesIndex + 1]
    ) {
      setGameId(
        parts[gamesIndex + 1],
      );
    } else {
      setError("Invalid game URL.");
      setLoading(false);
    }
  }, []);

  /*
   * =========================================================
   * CHECK BLOCK BETWEEN CURRENT USER AND HOST
   * =========================================================
   */

  async function checkBlockStatus(
    userId: string | null,
    hostId: string,
  ) {
    setBlockCheckLoading(true);

    if (!userId || userId === hostId) {
      setHasBlockedHost(false);
      setIsBlockedByHost(false);
      setBlockCheckLoading(false);
      return;
    }

    try {
      /*
       * Check whether the current user blocked
       * the game host.
       */
      const {
        data: currentUserBlock,
        error: currentUserBlockError,
      } = await supabase
        .from("user_blocks")
        .select("id")
        .eq(
          "blocker_id",
          userId,
        )
        .eq(
          "blocked_id",
          hostId,
        )
        .maybeSingle();

      /*
       * Check whether the game host blocked
       * the current user.
       */
      const {
        data: hostBlock,
        error: hostBlockError,
      } = await supabase
        .from("user_blocks")
        .select("id")
        .eq(
          "blocker_id",
          hostId,
        )
        .eq(
          "blocked_id",
          userId,
        )
        .maybeSingle();

      if (currentUserBlockError) {
        console.error(
          "Could not check current user's block:",
          currentUserBlockError,
        );
      }

      if (hostBlockError) {
        console.error(
          "Could not check host block:",
          hostBlockError,
        );
      }

      setHasBlockedHost(
        !!currentUserBlock,
      );

      setIsBlockedByHost(
        !!hostBlock,
      );
    } catch (blockError) {
      console.error(
        "Could not check block status:",
        blockError,
      );

      setHasBlockedHost(false);
      setIsBlockedByHost(false);
    } finally {
      setBlockCheckLoading(false);
    }
  }

  /*
   * =========================================================
   * LOAD GAME
   * =========================================================
   */

  async function loadGame(id: string) {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(userError);
      }

      if (user) {
        setCurrentUserId(user.id);
      } else {
        setCurrentUserId(null);
      }

      const numericId = Number(id);

      if (Number.isNaN(numericId)) {
        setError("Invalid game ID.");
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
            facility_id,
            max_players,
            skill_level,
            game_type,
            gender_preference,
            cost_per_player,
            description,
            status,
            created_at,
            updated_at
          `,
        )
        .eq("id", numericId)
        .single();

      if (gameError || !gameData) {
        console.error(gameError);

        setError(
          "This game could not be found.",
        );

        return;
      }

      const loadedGame =
        gameData as Game;

      setGame(loadedGame);

      /*
       * Check block status immediately after
       * loading the game and current user.
       */
      await checkBlockStatus(
        user?.id ?? null,
        loadedGame.host_id,
      );

      const [
        sportResult,
        hostResult,
        playersResult,
        reviewsResult,
      ] = await Promise.all([
        supabase
          .from("sports")
          .select(
            "id, name, slug, emoji",
          )
          .eq(
            "id",
            loadedGame.sport_id,
          )
          .maybeSingle(),

        supabase
          .from("profiles")
          .select(
            "id, full_name, username, avatar_url",
          )
          .eq(
            "id",
            loadedGame.host_id,
          )
          .maybeSingle(),

        supabase
          .from("game_players")
          .select(
            `
              id,
              user_id,
              status,
              joined_at
            `,
          )
          .eq(
            "game_id",
            numericId,
          )
          .eq(
            "status",
            "joined",
          )
          .order(
            "joined_at",
            {
              ascending: true,
            },
          ),

        supabase
          .from("reviews")
          .select(
            `
              id,
              rating,
              comment,
              created_at,
              reviewer_id
            `,
          )
          .eq(
            "reviewed_user_id",
            loadedGame.host_id,
          )
          .order(
            "created_at",
            {
              ascending: false,
            },
          ),
      ]);

      if (sportResult.error) {
        console.error(
          sportResult.error,
        );
      }

      if (hostResult.error) {
        console.error(
          hostResult.error,
        );
      }

      if (playersResult.error) {
        console.error(
          playersResult.error,
        );
      }

      if (reviewsResult.error) {
        console.error(
          reviewsResult.error,
        );
      }

      setSport(
        (sportResult.data as
          | Sport
          | null) ?? null,
      );

      setHost(
        (hostResult.data as
          | Profile
          | null) ?? null,
      );

      const rawPlayers =
        (playersResult.data ??
          []) as Array<{
          id: number;
          user_id: string;
          status: string;
          joined_at: string;
        }>;

      const playerIds =
        rawPlayers.map(
          (player) =>
            player.user_id,
        );

      let playerProfiles:
        Profile[] = [];

      if (playerIds.length > 0) {
        const {
          data: profilesData,
          error: profilesError,
        } = await supabase
          .from("profiles")
          .select(
            "id, full_name, username, avatar_url",
          )
          .in(
            "id",
            playerIds,
          );

        if (profilesError) {
          console.error(
            profilesError,
          );
        }

        playerProfiles =
          (profilesData ??
            []) as Profile[];
      }

      const profileMap =
        new Map<string, Profile>();

      playerProfiles.forEach(
        (profile) => {
          profileMap.set(
            profile.id,
            profile,
          );
        },
      );

      setPlayers(
        rawPlayers.map(
          (player) => ({
            ...player,
            profile:
              profileMap.get(
                player.user_id,
              ) ?? null,
          }),
        ),
      );

      const rawReviews =
        (reviewsResult.data ??
          []) as Array<{
          id: number;
          rating: number;
          comment: string | null;
          created_at: string;
          reviewer_id: string;
        }>;

      const reviewerIds =
        rawReviews.map(
          (review) =>
            review.reviewer_id,
        );

      let reviewerProfiles:
        Profile[] = [];

      if (reviewerIds.length > 0) {
        const {
          data: reviewerData,
          error: reviewerError,
        } = await supabase
          .from("profiles")
          .select(
            "id, full_name, username, avatar_url",
          )
          .in(
            "id",
            reviewerIds,
          );

        if (reviewerError) {
          console.error(
            reviewerError,
          );
        }

        reviewerProfiles =
          (reviewerData ??
            []) as Profile[];
      }

      const reviewerMap =
        new Map<string, Profile>();

      reviewerProfiles.forEach(
        (profile) => {
          reviewerMap.set(
            profile.id,
            profile,
          );
        },
      );

      setReviews(
        rawReviews.map(
          (review) => ({
            ...review,
            reviewer:
              reviewerMap.get(
                review.reviewer_id,
              ) ?? null,
          }),
        ),
      );
    } catch (loadError) {
      console.error(loadError);

      setError(
        "Something went wrong while loading this game.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!gameId) {
      return;
    }

    loadGame(gameId);
  }, [gameId]);

  /*
   * =========================================================
   * DERIVED GAME STATE
   * =========================================================
   */

  const isHost =
    !!currentUserId &&
    !!game &&
    currentUserId ===
      game.host_id;

  const joinedPlayers =
    players.filter(
      (player) =>
        player.status.toLowerCase() ===
        "joined",
    );

  const playerCount =
    joinedPlayers.length;

  const spotsLeft = Math.max(
    game
      ? game.max_players -
          playerCount
      : 0,
    0,
  );

  const currentUserJoined =
    joinedPlayers.some(
      (player) =>
        player.user_id ===
        currentUserId,
    );

  const effectiveStatus = game
    ? getEffectiveStatus(
        game,
        playerCount,
      )
    : "open";

  const isCancelled =
    effectiveStatus ===
    "cancelled";

  const isCompleted =
    effectiveStatus ===
    "completed";

  const isFull =
    effectiveStatus === "full" ||
    spotsLeft <= 0;

  const blockedFromGame =
    hasBlockedHost ||
    isBlockedByHost;

  const currentUserReview =
    currentUserId
      ? reviews.find(
          (review) =>
            review.reviewer_id ===
            currentUserId,
        ) ?? null
      : null;

  const averageRating =
    reviews.length > 0
      ? reviews.reduce(
          (total, review) =>
            total + review.rating,
          0,
        ) / reviews.length
      : null;

  /*
   * =========================================================
   * NOTIFICATION HELPERS
   * =========================================================
   */

  async function getCurrentUserDisplayName() {
    if (!currentUserId) {
      return "A student";
    }

    try {
      const {
        data,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          "full_name, username",
        )
        .eq(
          "id",
          currentUserId,
        )
        .maybeSingle();

      if (profileError) {
        console.error(
          "Could not load notification profile:",
          profileError,
        );

        return "A student";
      }

      return (
        data?.full_name ||
        data?.username ||
        "A student"
      );
    } catch (profileError) {
      console.error(
        "Could not load notification profile:",
        profileError,
      );

      return "A student";
    }
  }

  async function createGameNotification({
    userId,
    type,
    title,
    message,
    gameId,
    actorId,
  }: {
    userId: string;
    type: string;
    title: string;
    message: string;
    gameId: number;
    actorId: string;
  }) {
    if (!userId || !actorId) {
      return;
    }

    if (userId === actorId) {
      return;
    }

    try {
      const {
        error: notificationError,
      } = await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          type,
          title,
          message,
          game_id: gameId,
          actor_id: actorId,
        });

      if (notificationError) {
        console.error(
          "Could not create game notification:",
          notificationError,
        );
      }
    } catch (notificationError) {
      console.error(
        "Could not create game notification:",
        notificationError,
      );
    }
  }

  /*
   * =========================================================
   * JOIN GAME
   * =========================================================
   */

  async function handleJoinGame() {
    if (!game || !currentUserId) {
      router.push(
        "/auth/login",
      );

      return;
    }

    if (actionLoading) {
      return;
    }

    setActionLoading(true);
    setError("");
    setActionMessage("");

    try {
      if (isHost) {
        setError(
          "You are already hosting this game.",
        );

        return;
      }

      /*
       * =====================================================
       * BLOCK PROTECTION
       * =====================================================
       *
       * Check again immediately before joining.
       *
       * This protects against someone blocking the
       * host after the page was loaded.
       */

      const {
        data: currentUserBlock,
        error: currentUserBlockError,
      } = await supabase
        .from("user_blocks")
        .select("id")
        .eq(
          "blocker_id",
          currentUserId,
        )
        .eq(
          "blocked_id",
          game.host_id,
        )
        .maybeSingle();

      const {
        data: hostBlock,
        error: hostBlockError,
      } = await supabase
        .from("user_blocks")
        .select("id")
        .eq(
          "blocker_id",
          game.host_id,
        )
        .eq(
          "blocked_id",
          currentUserId,
        )
        .maybeSingle();

      if (currentUserBlockError) {
        console.error(
          "Could not check your block:",
          currentUserBlockError,
        );
      }

      if (hostBlockError) {
        console.error(
          "Could not check host block:",
          hostBlockError,
        );
      }

      const currentlyBlocked =
        !!currentUserBlock ||
        !!hostBlock;

      if (currentlyBlocked) {
        setHasBlockedHost(
          !!currentUserBlock,
        );

        setIsBlockedByHost(
          !!hostBlock,
        );

        setError(
          "You can't join this game because you or the host has blocked the other user.",
        );

        return;
      }

      /*
       * Get the latest game state.
       */

      const {
        data: latestGameData,
        error: latestGameError,
      } = await supabase
        .from("games")
        .select(
          `
            id,
            host_id,
            game_date,
            start_time,
            end_time,
            max_players,
            status
          `,
        )
        .eq(
          "id",
          game.id,
        )
        .single();

      if (
        latestGameError ||
        !latestGameData
      ) {
        console.error(
          latestGameError,
        );

        setError(
          "We couldn't verify that this game is still available.",
        );

        return;
      }

      const latestGame =
        latestGameData as Pick<
          Game,
          | "id"
          | "host_id"
          | "game_date"
          | "start_time"
          | "end_time"
          | "max_players"
          | "status"
        >;

      if (
        latestGame.host_id ===
        currentUserId
      ) {
        setError(
          "You are already hosting this game.",
        );

        return;
      }

      /*
       * Check again using the latest host ID.
       *
       * This covers the extremely unlikely case where
       * the game host changed between page load and join.
       */

      if (
        latestGame.host_id !==
        game.host_id
      ) {
        const {
          data: latestUserBlock,
        } = await supabase
          .from("user_blocks")
          .select("id")
          .eq(
            "blocker_id",
            currentUserId,
          )
          .eq(
            "blocked_id",
            latestGame.host_id,
          )
          .maybeSingle();

        const {
          data: latestHostBlock,
        } = await supabase
          .from("user_blocks")
          .select("id")
          .eq(
            "blocker_id",
            latestGame.host_id,
          )
          .eq(
            "blocked_id",
            currentUserId,
          )
          .maybeSingle();

        if (
          latestUserBlock ||
          latestHostBlock
        ) {
          setError(
            "You can't join this game because you or the host has blocked the other user.",
          );

          return;
        }
      }

      /*
       * Check scheduled completion.
       */

      const latestGameForStatus =
        latestGame as Game;

      const latestFinished =
        hasGameFinished(
          latestGameForStatus,
        );

      if (
        latestGame.status.toLowerCase() ===
        "cancelled"
      ) {
        setError(
          "This game has been cancelled.",
        );

        return;
      }

      if (
        latestGame.status.toLowerCase() ===
          "completed" ||
        latestFinished
      ) {
        setError(
          "This game has already finished.",
        );

        return;
      }

      /*
       * Check membership.
       */

      const {
        data: existingPlayer,
        error: existingPlayerError,
      } = await supabase
        .from("game_players")
        .select(
          "id, user_id, status",
        )
        .eq(
          "game_id",
          game.id,
        )
        .eq(
          "user_id",
          currentUserId,
        )
        .maybeSingle();

      if (existingPlayerError) {
        console.error(
          existingPlayerError,
        );

        setError(
          "We couldn't check your game membership.",
        );

        return;
      }

      if (
        existingPlayer &&
        existingPlayer.status ===
          "joined"
      ) {
        setError(
          "You have already joined this game.",
        );

        await loadGame(
          String(game.id),
        );

        return;
      }

      /*
       * Get latest player count.
       */

      const {
        count: latestPlayerCount,
        error: countError,
      } = await supabase
        .from("game_players")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq(
          "game_id",
          game.id,
        )
        .eq(
          "status",
          "joined",
        );

      if (countError) {
        console.error(
          countError,
        );

        setError(
          "We couldn't check the available spots.",
        );

        return;
      }

      const currentCount =
        latestPlayerCount ?? 0;

      if (
        currentCount >=
        latestGame.max_players
      ) {
        setError(
          "This game is already full.",
        );

        await loadGame(
          String(game.id),
        );

        return;
      }

      /*
       * Join or reactivate membership.
       */

      if (existingPlayer) {
        const {
          error:
            updatePlayerError,
        } = await supabase
          .from("game_players")
          .update({
            status: "joined",
            joined_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            existingPlayer.id,
          )
          .eq(
            "user_id",
            currentUserId,
          );

        if (updatePlayerError) {
          console.error(
            updatePlayerError,
          );

          setError(
            updatePlayerError.message ||
              "We couldn't join this game.",
          );

          return;
        }
      } else {
        const {
          error: joinError,
        } = await supabase
          .from("game_players")
          .insert({
            game_id: game.id,
            user_id:
              currentUserId,
            status: "joined",
          });

        if (joinError) {
          console.error(
            joinError,
          );

          setError(
            joinError.message ||
              "We couldn't join this game.",
          );

          return;
        }
      }

      /*
       * CREATE JOIN NOTIFICATION
       */

      const displayName =
        await getCurrentUserDisplayName();

      await createGameNotification({
        userId:
          game.host_id,
        type:
          "game_joined",
        title:
          "Someone joined your game",
        message:
          `${displayName} joined "${game.title || "your game"}".`,
        gameId:
          game.id,
        actorId:
          currentUserId,
      });

      setActionMessage(
        "You're in! The game has been added to your upcoming games.",
      );

      await loadGame(
        String(game.id),
      );
    } catch (joinError) {
      console.error(
        joinError,
      );

      setError(
        "Something went wrong while joining the game.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  /*
   * =========================================================
   * LEAVE GAME
   * =========================================================
   */

  async function handleLeaveGame() {
    if (!game || !currentUserId) {
      return;
    }

    if (actionLoading) {
      return;
    }

    if (isHost) {
      setError(
        "The host cannot leave their own game. You can cancel the game instead.",
      );

      return;
    }

    if (isCompleted) {
      setError(
        "You can't leave a game that has already finished.",
      );

      return;
    }

    if (isCancelled) {
      setError(
        "This game has been cancelled.",
      );

      return;
    }

    if (!currentUserJoined) {
      setError(
        "You are not currently part of this game.",
      );

      return;
    }

    setActionLoading(true);
    setError("");
    setActionMessage("");

    try {
      const {
        error: leaveError,
      } = await supabase
        .from("game_players")
        .delete()
        .eq(
          "game_id",
          game.id,
        )
        .eq(
          "user_id",
          currentUserId,
        );

      if (leaveError) {
        console.error(
          leaveError,
        );

        setError(
          leaveError.message ||
            "We couldn't remove you from this game.",
        );

        return;
      }

      /*
       * CREATE LEAVE NOTIFICATION
       */

      const displayName =
        await getCurrentUserDisplayName();

      await createGameNotification({
        userId:
          game.host_id,
        type:
          "game_left",
        title:
          "Someone left your game",
        message:
          `${displayName} left "${game.title || "your game"}".`,
        gameId:
          game.id,
        actorId:
          currentUserId,
      });

      setActionMessage(
        "You've left the game.",
      );

      await loadGame(
        String(game.id),
      );
    } catch (leaveError) {
      console.error(
        leaveError,
      );

      setError(
        "Something went wrong while leaving the game.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  /*
   * =========================================================
   * CANCEL GAME
   * =========================================================
   */

  async function handleCancelGame() {
    if (!game || !currentUserId) {
      return;
    }

    if (!isHost) {
      setError(
        "Only the host can cancel this game.",
      );

      return;
    }

    if (isCompleted) {
      setError(
        "A completed game cannot be cancelled.",
      );

      return;
    }

    if (isCancelled) {
      setError(
        "This game is already cancelled.",
      );

      return;
    }

    setCancelLoading(true);
    setError("");
    setActionMessage("");

    try {
      /*
       * Get currently joined players
       * before cancelling.
       */

      const {
        data: joinedPlayersData,
        error: playersError,
      } = await supabase
        .from("game_players")
        .select("user_id")
        .eq(
          "game_id",
          game.id,
        )
        .eq(
          "status",
          "joined",
        );

      if (playersError) {
        console.error(
          "Could not load joined players:",
          playersError,
        );

        setError(
          "We couldn't find the players in this game.",
        );

        return;
      }

      /*
       * CANCEL GAME
       */

      const {
        error: cancelError,
      } = await supabase
        .from("games")
        .update({
          status:
            "cancelled",
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          game.id,
        )
        .eq(
          "host_id",
          currentUserId,
        );

      if (cancelError) {
        console.error(
          cancelError,
        );

        setError(
          cancelError.message ||
            "We couldn't cancel this game.",
        );

        return;
      }

      /*
       * CREATE CANCELLATION NOTIFICATIONS
       */

      const notificationRecipients =
        (
          joinedPlayersData ??
          []
        )
          .map(
            (player) =>
              player.user_id,
          )
          .filter(
            (userId) =>
              userId !==
              currentUserId,
          );

      if (
        notificationRecipients.length >
        0
      ) {
        const notificationRows =
          notificationRecipients.map(
            (userId) => ({
              user_id:
                userId,
              type:
                "game_cancelled",
              title:
                "Game cancelled",
              message:
                `"${game.title || "This game"}" has been cancelled by the host.`,
              game_id:
                game.id,
              actor_id:
                currentUserId,
            }),
          );

        const {
          error:
            notificationError,
        } = await supabase
          .from("notifications")
          .insert(
            notificationRows,
          );

        if (
          notificationError
        ) {
          console.error(
            "Could not create cancellation notifications:",
            notificationError,
          );
        }
      }

      setShowCancelConfirm(
        false,
      );

      setActionMessage(
        "The game has been cancelled.",
      );

      await loadGame(
        String(game.id),
      );
    } catch (cancelError) {
      console.error(
        cancelError,
      );

      setError(
        "Something went wrong while cancelling the game.",
      );
    } finally {
      setCancelLoading(false);
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
                className="text-sm text-slate-600 hover:text-black"
              >
                Dashboard
              </Link>

              <Link
                href="/games"
                className="text-sm text-slate-600 hover:text-black"
              >
                Find a Game
              </Link>

              <Link
                href="/create-game"
                className="text-sm text-slate-600 hover:text-black"
              >
                Create Game
              </Link>

              <Link
                href="/profile"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-sm font-medium text-white"
              >
                U
              </Link>
            </nav>
          </div>
        </header>

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
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h1 className="text-4xl font-semibold tracking-tight">
            Game unavailable
          </h1>

          <p className="mt-4 text-slate-500">
            {error ||
              "This game could not be loaded."}
          </p>

          <Link
            href="/games"
            className="mt-8 inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
          >
            Back to games
          </Link>
        </div>
      </main>
    );
  }

  /*
   * =========================================================
   * PAGE
   * =========================================================
   */

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
              href="/create-game"
              className="text-sm text-slate-600 transition hover:text-black"
            >
              Create Game
            </Link>

            <Link
              href="/profile"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-sm font-medium text-white"
            >
              {getInitials(
                currentUserId ===
                  host?.id
                  ? host.full_name
                  : "User",
              )}
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 pb-24 pt-10">
        <Link
          href="/games"
          className="text-sm text-slate-500 transition hover:text-black"
        >
          ← Back to games
        </Link>

        <section className="mt-16 grid gap-12 lg:grid-cols-[1fr_380px] lg:items-start">
          <div>
            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border border-black/10 bg-white text-4xl shadow-sm">
                {sport?.emoji ||
                  "🏅"}
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.3em] text-slate-400">
                  {sport?.name ||
                    "Sport"}
                </p>

                <h1 className="mt-2 text-5xl font-semibold tracking-[-0.045em] sm:text-6xl">
                  {game.title ||
                    "Untitled game"}
                </h1>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <span className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white">
                {formatEnum(
                  game.skill_level,
                )}
              </span>

              <span className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm text-slate-700">
                {formatEnum(
                  game.game_type,
                )}
              </span>

              {game.gender_preference &&
                game.gender_preference !==
                  "everyone" && (
                  <span className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm text-slate-700">
                    {formatEnum(
                      game.gender_preference,
                    )}
                  </span>
                )}

              <span
                className={`rounded-full px-5 py-2.5 text-sm font-medium ${getStatusClasses(
                  effectiveStatus,
                )}`}
              >
                {getStatusLabel(
                  effectiveStatus,
                )}
              </span>
            </div>

            <div className="mt-12 grid gap-5 sm:grid-cols-2">
              <div className="rounded-3xl border border-black/10 bg-white p-7">
                <p className="text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
                  Date
                </p>

                <p className="mt-4 text-lg font-medium">
                  {formatDate(
                    game.game_date,
                  )}
                </p>
              </div>

              <div className="rounded-3xl border border-black/10 bg-white p-7">
                <p className="text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
                  Time
                </p>

                <p className="mt-4 text-lg font-medium">
                  {formatTime(
                    game.start_time,
                  )}

                  {game.end_time && (
                    <>
                      {" "}–{" "}
                      {formatTime(
                        game.end_time,
                      )}
                    </>
                  )}
                </p>
              </div>

              <div className="rounded-3xl border border-black/10 bg-white p-7">
                <p className="text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
                  Location
                </p>

                <p className="mt-4 text-lg font-medium">
                  {game.location_name}
                </p>
              </div>

              <div className="rounded-3xl border border-black/10 bg-white p-7">
                <p className="text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
                  Cost
                </p>

                <p className="mt-4 text-lg font-medium">
                  $
                  {Number(
                    game.cost_per_player,
                  ).toFixed(2)}{" "}
                  <span className="text-sm font-normal text-slate-400">
                    per player
                  </span>
                </p>
              </div>
            </div>

            {game.description && (
              <section className="mt-8 rounded-3xl border border-black/10 bg-white p-8">
                <p className="text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
                  About this game
                </p>

                <p className="mt-5 whitespace-pre-wrap text-[15px] leading-7 text-slate-700">
                  {game.description}
                </p>
              </section>
            )}

            <section className="mt-8 rounded-3xl border border-black/10 bg-white p-8">
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
                Hosted by
              </p>

              <div className="mt-5 flex items-center gap-4">
                {host?.avatar_url ? (
                  <img
                    src={
                      host.avatar_url
                    }
                    alt=""
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
                    {getInitials(
                      host?.full_name,
                    )}
                  </div>
                )}

                <div>
                  <p className="font-semibold">
                    {host?.full_name ||
                      "UoA student"}
                  </p>

                  {host?.username && (
                    <p className="mt-1 text-sm text-slate-400">
                      @
                      {
                        host.username
                      }
                    </p>
                  )}
                </div>

                {averageRating !==
                  null && (
                  <div className="ml-auto text-right">
                    <p className="text-lg font-semibold">
                      {averageRating.toFixed(
                        1,
                      )}{" "}
                      ★
                    </p>

                    <p className="text-xs text-slate-400">
                      {
                        reviews.length
                      }{" "}
                      review
                      {reviews.length ===
                      1
                        ? ""
                        : "s"}
                    </p>
                  </div>
                )}

                {!isHost &&
                  host && (
                    <div className="ml-auto">
                      <UserSafetyMenu
                        targetUserId={
                          host.id
                        }
                        targetName={
                          host.full_name
                        }
                        compact
                        onActionComplete={() =>
                          checkBlockStatus(
                            currentUserId,
                            host.id,
                          )
                        }
                      />
                    </div>
                  )}
              </div>

              {!isHost &&
                !blockCheckLoading &&
                blockedFromGame && (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-900">
                      This game is unavailable
                      to you.
                    </p>

                    <p className="mt-1 text-xs leading-5 text-amber-800">
                      You or the host has
                      blocked the other user.
                      You cannot join this
                      game while that block is
                      active.
                    </p>
                  </div>
                )}
            </section>

            <section className="mt-8 rounded-3xl border border-black/10 bg-white p-8">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
                    Players
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                    Who's playing
                  </h2>
                </div>

                <p className="text-sm text-slate-500">
                  {playerCount} /{" "}
                  {
                    game.max_players
                  }
                </p>
              </div>

              {joinedPlayers.length ===
              0 ? (
                <div className="mt-7 rounded-2xl bg-[#f7f7f5] px-5 py-6 text-center">
                  <p className="text-sm text-slate-500">
                    No players have
                    joined yet.
                  </p>
                </div>
              ) : (
                <div className="mt-7 space-y-3">
                  {joinedPlayers.map(
                    (player) => (
                      <div
                        key={
                          player.id
                        }
                        className="flex items-center gap-4 rounded-2xl border border-black/5 bg-[#fafafa] px-4 py-4"
                      >
                        {player
                          .profile
                          ?.avatar_url ? (
                          <img
                            src={
                              player
                                .profile
                                .avatar_url
                            }
                            alt=""
                            className="h-11 w-11 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-xs font-semibold text-white">
                            {getInitials(
                              player
                                .profile
                                ?.full_name,
                            )}
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {player
                              .profile
                              ?.full_name ||
                              "UoA student"}
                          </p>

                          {player
                            .profile
                            ?.username && (
                            <p className="mt-0.5 truncate text-xs text-slate-400">
                              @
                              {
                                player
                                  .profile
                                  .username
                              }
                            </p>
                          )}
                        </div>

                        {player.user_id ===
                          game.host_id && (
                          <span className="ml-auto rounded-full bg-black px-3 py-1 text-xs font-medium text-white">
                            Host
                          </span>
                        )}
                      </div>
                    ),
                  )}
                </div>
              )}
            </section>

            <section className="mt-8 rounded-3xl border border-black/10 bg-white p-8">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
                    Reputation
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                    Host reviews
                  </h2>
                </div>

                {averageRating !==
                  null && (
                  <div className="text-right">
                    <p className="text-xl font-semibold">
                      {averageRating.toFixed(
                        1,
                      )}{" "}
                      / 5
                    </p>

                    <p className="text-xs text-slate-400">
                      {
                        reviews.length
                      }{" "}
                      review
                      {reviews.length ===
                      1
                        ? ""
                        : "s"}
                    </p>
                  </div>
                )}
              </div>

              {reviews.length ===
              0 ? (
                <div className="mt-7 rounded-2xl bg-[#f7f7f5] px-5 py-6 text-center">
                  <p className="text-sm text-slate-500">
                    No reviews yet.
                  </p>
                </div>
              ) : (
                <div className="mt-7 space-y-5">
                  {reviews.map(
                    (review) => (
                      <div
                        key={
                          review.id
                        }
                        className="border-b border-black/5 pb-5 last:border-0 last:pb-0"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-xs font-semibold text-white">
                              {getInitials(
                                review
                                  .reviewer
                                  ?.full_name,
                              )}
                            </div>

                            <div>
                              <p className="text-sm font-medium">
                                {review
                                  .reviewer
                                  ?.full_name ||
                                  "UoA student"}
                              </p>

                              <p className="text-xs text-slate-400">
                                {formatShortDate(
                                  review.created_at.slice(
                                    0,
                                    10,
                                  ),
                                )}
                              </p>
                            </div>
                          </div>

                          <p className="text-sm font-semibold">
                            {"★".repeat(
                              Math.max(
                                0,
                                Math.min(
                                  5,
                                  review.rating,
                                ),
                              ),
                            )}
                          </p>
                        </div>

                        {review.comment && (
                          <p className="mt-4 text-sm leading-6 text-slate-600">
                            {
                              review.comment
                            }
                          </p>
                        )}
                      </div>
                    ),
                  )}
                </div>
              )}
            </section>
          </div>

          <aside className="lg:sticky lg:top-8">
            <div className="rounded-[28px] border border-black/10 bg-white p-7 shadow-[0_20px_60px_rgba(0,0,0,0.04)]">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
                    Players
                  </p>

                  <p className="mt-2 text-4xl font-semibold tracking-tight">
                    {playerCount}

                    <span className="text-slate-300">
                      {" "}
                      /{" "}
                      {
                        game.max_players
                      }
                    </span>
                  </p>
                </div>

                <p className="pb-1 text-sm text-slate-500">
                  {spotsLeft > 0
                    ? `${spotsLeft} spot${
                        spotsLeft ===
                        1
                          ? ""
                          : "s"
                      } left`
                    : "No spots left"}
                </p>
              </div>

              <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-black transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      (playerCount /
                        Math.max(
                          game.max_players,
                          1,
                        )) *
                        100,
                    )}%`,
                  }}
                />
              </div>

              {isCompleted &&
                !isCancelled &&
                !isHost &&
                currentUserJoined && (
                  <div className="mt-7 rounded-2xl bg-blue-50 p-5">
                    <p className="text-sm font-semibold text-blue-900">
                      This game has
                      finished.
                    </p>

                    <p className="mt-2 text-xs leading-5 text-blue-700">
                      Thanks for playing.
                      You can leave
                      feedback for the
                      host.
                    </p>

                    {currentUserReview ? (
                      <div className="mt-5 rounded-xl bg-white px-4 py-4">
                        <p className="text-sm font-semibold">
                          ✓ You reviewed
                          this host
                        </p>

                        <p className="mt-2 text-lg">
                          {"★".repeat(
                            currentUserReview.rating,
                          )}
                        </p>
                      </div>
                    ) : (
                      <Link
                        href={`/games/${game.id}/review`}
                        className="mt-5 flex h-12 items-center justify-center rounded-full bg-black text-sm font-semibold text-white transition hover:bg-slate-900"
                      >
                        Rate host →
                      </Link>
                    )}
                  </div>
                )}

              {isHost && (
                <div className="mt-7 rounded-2xl bg-[#f3f3f3] p-5">
                  <p className="text-sm font-semibold">
                    You're hosting this
                    game.
                  </p>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Manage the game,
                    update its details,
                    or cancel it from
                    here.
                  </p>

                  <div className="mt-5 grid gap-3">
                    {!isCompleted &&
                      !isCancelled && (
                        <Link
                          href={`/games/${game.id}/edit`}
                          className="flex h-12 items-center justify-center rounded-full bg-black text-sm font-semibold text-white transition hover:bg-slate-900"
                        >
                          Edit game
                        </Link>
                      )}

                    {!isCancelled &&
                      !isCompleted && (
                        <button
                          type="button"
                          onClick={() =>
                            setShowCancelConfirm(
                              true,
                            )
                          }
                          className="flex h-12 items-center justify-center rounded-full border border-red-200 bg-white text-sm font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          Cancel game
                        </button>
                      )}

                    {isCompleted &&
                      !isCancelled && (
                        <div className="rounded-xl bg-blue-50 px-4 py-4">
                          <p className="text-sm font-medium text-blue-800">
                            This game has
                            finished.
                          </p>

                          <p className="mt-1 text-xs leading-5 text-blue-700">
                            Game management
                            actions are no
                            longer available.
                          </p>
                        </div>
                      )}
                  </div>
                </div>
              )}

              {showCancelConfirm && (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5">
                  <p className="text-sm font-semibold text-red-800">
                    Cancel this game?
                  </p>

                  <p className="mt-2 text-xs leading-5 text-red-700">
                    This will mark the
                    game as cancelled.
                    Players will no
                    longer be able to
                    join.
                  </p>

                  <div className="mt-5 flex gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setShowCancelConfirm(
                          false,
                        )
                      }
                      disabled={
                        cancelLoading
                      }
                      className="flex-1 rounded-full border border-black/10 bg-white px-4 py-3 text-sm font-medium"
                    >
                      Keep game
                    </button>

                    <button
                      type="button"
                      onClick={
                        handleCancelGame
                      }
                      disabled={
                        cancelLoading
                      }
                      className="flex-1 rounded-full bg-red-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {cancelLoading
                        ? "Cancelling..."
                        : "Yes, cancel"}
                    </button>
                  </div>
                </div>
              )}

              {/* JOIN / LEAVE */}

              {!isHost &&
                !isCancelled &&
                !isCompleted && (
                  <div className="mt-7">
                    {blockedFromGame ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
                        <p className="text-sm font-semibold text-amber-900">
                          Joining unavailable
                        </p>

                        <p className="mt-1 text-xs leading-5 text-amber-800">
                          You or the host has
                          blocked the other user.
                        </p>
                      </div>
                    ) : currentUserJoined ? (
                      <button
                        type="button"
                        onClick={
                          handleLeaveGame
                        }
                        disabled={
                          actionLoading
                        }
                        className="flex h-14 w-full items-center justify-center rounded-full border border-black/10 bg-white text-sm font-semibold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {actionLoading
                          ? "Leaving..."
                          : "Leave game"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={
                          handleJoinGame
                        }
                        disabled={
                          actionLoading ||
                          isFull ||
                          blockCheckLoading
                        }
                        className="flex h-14 w-full items-center justify-center rounded-full bg-black text-sm font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {actionLoading
                          ? "Joining..."
                          : blockCheckLoading
                            ? "Checking..."
                            : isFull
                              ? "Game is full"
                              : "Join game →"}
                      </button>
                    )}
                  </div>
                )}

              {isCompleted &&
                !isCancelled &&
                !isHost &&
                !currentUserJoined && (
                  <div className="mt-7 rounded-2xl bg-slate-100 px-5 py-4">
                    <p className="text-sm font-medium text-slate-700">
                      This game has already
                      finished.
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      You can no longer join
                      this game.
                    </p>
                  </div>
                )}

              {isCancelled && (
                <div className="mt-7 rounded-2xl bg-red-50 px-5 py-4">
                  <p className="text-sm font-semibold text-red-800">
                    This game has been
                    cancelled.
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-700">
                    Players can no longer
                    join or leave this game.
                  </p>
                </div>
              )}

              {actionMessage && (
                <div className="mt-5 rounded-2xl bg-emerald-50 px-5 py-4">
                  <p className="text-sm leading-6 text-emerald-700">
                    {actionMessage}
                  </p>
                </div>
              )}

              {error && (
                <div className="mt-5 rounded-2xl bg-red-50 px-5 py-4">
                  <p className="text-sm leading-6 text-red-700">
                    {error}
                  </p>
                </div>
              )}

              <div className="mt-7 border-t border-black/10 pt-7">
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-5">
                    <span className="text-sm text-slate-500">
                      Sport
                    </span>

                    <span className="text-right text-sm font-medium">
                      {sport?.emoji}{" "}
                      {sport?.name ||
                        "Unknown"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-5">
                    <span className="text-sm text-slate-500">
                      Level
                    </span>

                    <span className="text-right text-sm font-medium">
                      {formatEnum(
                        game.skill_level,
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-5">
                    <span className="text-sm text-slate-500">
                      Game type
                    </span>

                    <span className="text-right text-sm font-medium">
                      {formatEnum(
                        game.game_type,
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-5">
                    <span className="text-sm text-slate-500">
                      Price
                    </span>

                    <span className="text-right text-sm font-medium">
                      $
                      {Number(
                        game.cost_per_player,
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}