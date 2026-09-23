"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
  status: string;
};

type Sport = {
  id: number;
  name: string;
  emoji: string | null;
};

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type ExistingReview = {
  id: number;
  rating: number;
  comment: string | null;
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

function formatEnum(value: string | null | undefined) {
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

function getInitials(
  name: string | null | undefined
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

export default function ReviewGamePage() {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [gameId, setGameId] = useState<
    string | null
  >(null);

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  const [game, setGame] = useState<Game | null>(
    null
  );

  const [sport, setSport] = useState<Sport | null>(
    null
  );

  const [host, setHost] =
    useState<Profile | null>(null);

  const [selectedRating, setSelectedRating] =
    useState(0);

  const [hoverRating, setHoverRating] =
    useState(0);

  const [comment, setComment] =
    useState("");

  const [existingReview, setExistingReview] =
    useState<ExistingReview | null>(null);

  const [isPlayer, setIsPlayer] =
    useState(false);

  const [loading, setLoading] = useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] =
    useState(false);

  useEffect(() => {
    const parts = window.location.pathname
      .split("/")
      .filter(Boolean);

    const gamesIndex = parts.indexOf("games");

    if (
      gamesIndex !== -1 &&
      parts[gamesIndex + 1]
    ) {
      setGameId(parts[gamesIndex + 1]);
    } else {
      setError("Invalid game URL.");
      setLoading(false);
    }
  }, []);

  async function loadReviewPage(id: string) {
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
            max_players,
            skill_level,
            game_type,
            status
          `
        )
        .eq("id", numericId)
        .single();

      if (gameError || !gameData) {
        console.error(gameError);

        setError(
          "This game could not be found."
        );

        return;
      }

      const loadedGame =
        gameData as Game;

      setGame(loadedGame);

      const [
        sportResult,
        hostResult,
        playerResult,
        reviewResult,
      ] = await Promise.all([
        supabase
          .from("sports")
          .select("id, name, emoji")
          .eq("id", loadedGame.sport_id)
          .maybeSingle(),

        supabase
          .from("profiles")
          .select(
            "id, full_name, username, avatar_url"
          )
          .eq("id", loadedGame.host_id)
          .maybeSingle(),

        supabase
          .from("game_players")
          .select("id, status")
          .eq("game_id", numericId)
          .eq("user_id", user.id)
          .maybeSingle(),

        supabase
          .from("reviews")
          .select("id, rating, comment")
          .eq("game_id", numericId)
          .eq("reviewer_id", user.id)
          .maybeSingle(),
      ]);

      if (sportResult.error) {
        console.error(
          sportResult.error
        );
      }

      if (hostResult.error) {
        console.error(
          hostResult.error
        );
      }

      if (playerResult.error) {
        console.error(
          playerResult.error
        );
      }

      if (reviewResult.error) {
        console.error(
          reviewResult.error
        );
      }

      setSport(
        (sportResult.data as Sport | null) ??
          null
      );

      setHost(
        (hostResult.data as Profile | null) ??
          null
      );

      const playerWasFound =
        !!playerResult.data &&
        playerResult.data.status ===
          "joined";

      setIsPlayer(playerWasFound);

      if (reviewResult.data) {
        const review =
          reviewResult.data as ExistingReview;

        setExistingReview(review);
        setSelectedRating(review.rating);
        setComment(review.comment ?? "");
      }
    } catch (loadError) {
      console.error(loadError);

      setError(
        "Something went wrong while loading this page."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!gameId) {
      return;
    }

    loadReviewPage(gameId);
  }, [gameId]);

  const gameHasFinished =
    !!game &&
    new Date(
      `${game.game_date}T${
        game.end_time ||
        game.start_time
      }`
    ).getTime() <
      Date.now();

  const isCancelled =
    game?.status.toLowerCase() ===
    "cancelled";

  const isHost =
    !!currentUserId &&
    !!game &&
    currentUserId === game.host_id;

  const canSubmitReview =
    !!game &&
    !!currentUserId &&
    isPlayer &&
    gameHasFinished &&
    !isCancelled &&
    !isHost &&
    selectedRating >= 1 &&
    selectedRating <= 5 &&
    !submitting &&
    !success;

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess(false);

    if (!game || !currentUserId) {
      setError(
        "You need to be signed in to leave a review."
      );

      return;
    }

    if (isHost) {
      setError(
        "You cannot review yourself."
      );

      return;
    }

    if (!isPlayer) {
      setError(
        "Only students who joined this game can review the host."
      );

      return;
    }

    if (!gameHasFinished) {
      setError(
        "You can review the host after the game has finished."
      );

      return;
    }

    if (isCancelled) {
      setError(
        "Cancelled games cannot be reviewed."
      );

      return;
    }

    if (
      selectedRating < 1 ||
      selectedRating > 5
    ) {
      setError(
        "Please select a rating from 1 to 5 stars."
      );

      return;
    }

    if (comment.length > 500) {
      setError(
        "Your comment must be 500 characters or fewer."
      );

      return;
    }

    setSubmitting(true);

    try {
      if (existingReview) {
        const {
          error: updateError,
        } = await supabase
          .from("reviews")
          .update({
            rating: selectedRating,
            comment:
              comment.trim() || null,
          })
          .eq("id", existingReview.id)
          .eq(
            "reviewer_id",
            currentUserId
          );

        if (updateError) {
          console.error(updateError);

          setError(
            updateError.message ||
              "We couldn't update your review."
          );

          return;
        }
      } else {
        const {
          error: insertError,
        } = await supabase
          .from("reviews")
          .insert({
            game_id: game.id,
            reviewer_id: currentUserId,
            reviewed_user_id: game.host_id,
            rating: selectedRating,
            comment:
              comment.trim() || null,
          });

        if (insertError) {
          console.error(insertError);

          setError(
            insertError.message ||
              "We couldn't submit your review."
          );

          return;
        }
      }

      setSuccess(true);

      if (existingReview) {
        setExistingReview({
          id: existingReview.id,
          rating: selectedRating,
          comment:
            comment.trim() || null,
        });
      } else {
        setExistingReview({
          id: 0,
          rating: selectedRating,
          comment:
            comment.trim() || null,
        });
      }

      setTimeout(() => {
        router.push(`/games/${game.id}`);
      }, 1200);
    } catch (submitError) {
      console.error(submitError);

      setError(
        "Something went wrong while saving your review."
      );
    } finally {
      setSubmitting(false);
    }
  }

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
              Loading review...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!game) {
    return (
      <main className="min-h-screen bg-[#f7f7f5]">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h1 className="text-4xl font-semibold tracking-tight">
            Review unavailable
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
                currentUserId === host?.id
                  ? host.full_name
                  : "User"
              )}
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 pb-24 pt-14">
        <Link
          href={`/games/${game.id}`}
          className="text-sm text-slate-500 transition hover:text-black"
        >
          ← Back to game
        </Link>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_360px]">
          <section className="rounded-[32px] border border-black/10 bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.04)] sm:p-10">
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-slate-400">
              Your experience
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Rate your host.
            </h1>

            <p className="mt-4 max-w-xl text-[15px] leading-7 text-slate-500">
              Your feedback helps other UoA
              students know what to expect
              when joining games.
            </p>

            <div className="mt-12">
              <p className="text-sm font-medium">
                How was your experience?
              </p>

              <div
                className="mt-5 flex gap-2"
                onMouseLeave={() =>
                  setHoverRating(0)
                }
              >
                {[1, 2, 3, 4, 5].map(
                  (star) => {
                    const active =
                      star <=
                      (hoverRating ||
                        selectedRating);

                    return (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() =>
                          setHoverRating(
                            star
                          )
                        }
                        onClick={() =>
                          setSelectedRating(
                            star
                          )
                        }
                        aria-label={`${star} star${
                          star === 1
                            ? ""
                            : "s"
                        }`}
                        className={`text-5xl leading-none transition-transform hover:scale-110 ${
                          active
                            ? "text-black"
                            : "text-slate-200"
                        }`}
                      >
                        ★
                      </button>
                    );
                  }
                )}
              </div>

              <div className="mt-3 h-6">
                {(hoverRating ||
                  selectedRating) >
                  0 && (
                  <p className="text-sm text-slate-500">
                    {
                      [
                        "",
                        "Poor",
                        "Fair",
                        "Good",
                        "Very good",
                        "Excellent",
                      ][
                        hoverRating ||
                          selectedRating
                      ]
                    }
                  </p>
                )}
              </div>
            </div>

            <div className="mt-10">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="comment"
                  className="text-sm font-medium"
                >
                  Add a comment
                  <span className="ml-2 font-normal text-slate-400">
                    Optional
                  </span>
                </label>

                <span className="text-xs text-slate-400">
                  {comment.length}/500
                </span>
              </div>

              <textarea
                id="comment"
                value={comment}
                onChange={(event) =>
                  setComment(
                    event.target.value
                  )
                }
                maxLength={500}
                rows={6}
                placeholder="Tell other players about your experience..."
                className="mt-4 w-full resize-none rounded-2xl border border-black/10 bg-[#fafafa] px-5 py-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-black"
              />
            </div>

            {!gameHasFinished &&
              !isCancelled && (
                <div className="mt-6 rounded-2xl bg-amber-50 px-5 py-4">
                  <p className="text-sm leading-6 text-amber-700">
                    You can review the host
                    after the game has
                    finished.
                  </p>
                </div>
              )}

            {!isPlayer && (
              <div className="mt-6 rounded-2xl bg-red-50 px-5 py-4">
                <p className="text-sm leading-6 text-red-700">
                  Only students who joined
                  this game can review the
                  host.
                </p>
              </div>
            )}

            {isHost && (
              <div className="mt-6 rounded-2xl bg-slate-100 px-5 py-4">
                <p className="text-sm leading-6 text-slate-600">
                  Hosts cannot review
                  themselves.
                </p>
              </div>
            )}

            {isCancelled && (
              <div className="mt-6 rounded-2xl bg-red-50 px-5 py-4">
                <p className="text-sm leading-6 text-red-700">
                  Cancelled games cannot be
                  reviewed.
                </p>
              </div>
            )}

            {error && (
              <div className="mt-6 rounded-2xl bg-red-50 px-5 py-4">
                <p className="text-sm leading-6 text-red-700">
                  {error}
                </p>
              </div>
            )}

            {success && (
              <div className="mt-6 rounded-2xl bg-emerald-50 px-5 py-4">
                <p className="text-sm leading-6 text-emerald-700">
                  Review saved. Taking you
                  back to the game...
                </p>
              </div>
            )}

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href={`/games/${game.id}`}
                className="flex h-12 items-center justify-center rounded-full border border-black/10 bg-white px-6 text-sm font-medium transition hover:bg-slate-50"
              >
                Cancel
              </Link>

              <button
                type="button"
                onClick={() => {
                  const fakeEvent = {
                    preventDefault: () => {},
                  } as React.FormEvent<HTMLFormElement>;

                  handleSubmit(fakeEvent);
                }}
                disabled={!canSubmitReview}
                className="flex h-12 items-center justify-center rounded-full bg-black px-8 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {submitting
                  ? "Saving..."
                  : existingReview
                  ? "Update review →"
                  : "Submit review →"}
              </button>
            </div>
          </section>

          <aside>
            <div className="rounded-[28px] border border-black/10 bg-white p-7">
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
                Game
              </p>

              <div className="mt-5 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-black/10 bg-[#fafafa] text-2xl">
                  {sport?.emoji ||
                    "🏅"}
                </div>

                <div>
                  <p className="font-semibold">
                    {game.title ||
                      "Untitled game"}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {sport?.name ||
                      "Sport"}
                  </p>
                </div>
              </div>

              <div className="mt-7 space-y-5 border-t border-black/10 pt-7">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Date
                  </p>

                  <p className="mt-2 text-sm font-medium">
                    {formatDate(
                      game.game_date
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Time
                  </p>

                  <p className="mt-2 text-sm font-medium">
                    {formatTime(
                      game.start_time
                    )}

                    {game.end_time && (
                      <>
                        {" "}
                        –{" "}
                        {formatTime(
                          game.end_time
                        )}
                      </>
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Location
                  </p>

                  <p className="mt-2 text-sm font-medium">
                    {game.location_name}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Level
                  </p>

                  <p className="mt-2 text-sm font-medium">
                    {formatEnum(
                      game.skill_level
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-7 border-t border-black/10 pt-7">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Host
                </p>

                <div className="mt-4 flex items-center gap-3">
                  {host?.avatar_url ? (
                    <img
                      src={host.avatar_url}
                      alt=""
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-xs font-semibold text-white">
                      {getInitials(
                        host?.full_name
                      )}
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-semibold">
                      {host?.full_name ||
                        "UoA student"}
                    </p>

                    {host?.username && (
                      <p className="mt-0.5 text-xs text-slate-400">
                        @{host.username}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-[#ecece9] p-5">
              <p className="text-sm font-semibold">
                Rating eligibility
              </p>

              <div className="mt-4 space-y-3 text-xs leading-5 text-slate-600">
                <p>
                  {isPlayer
                    ? "✓ You joined this game."
                    : "○ You need to have joined this game."}
                </p>

                <p>
                  {gameHasFinished
                    ? "✓ The game has finished."
                    : "○ Rating becomes available after the game."}
                </p>

                <p>
                  {isHost
                    ? "○ Hosts cannot rate themselves."
                    : "✓ You are not the host."}
                </p>

                <p>
                  {isCancelled
                    ? "○ This game was cancelled."
                    : "✓ Game is eligible for reviews."}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}