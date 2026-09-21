"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type UserProfile = {
  full_name?: string;
  username?: string;
  selected_sports?: string[];
  sport_skills?: Record<string, string>;
};

type Game = {
  id: number;
  sport: string;
  emoji: string;
  date: string;
  time: string;
  location: string;
  skill: string;
  players: string;
  host: string;
  rating: string;
};

const recommendedGames: Game[] = [
  {
    id: 1,
    sport: "Badminton",
    emoji: "🏸",
    date: "Today",
    time: "6:00 PM",
    location: "Hiwa Recreation Centre",
    skill: "Intermediate",
    players: "3 / 4 players",
    host: "Daniel",
    rating: "4.8",
  },
  {
    id: 2,
    sport: "Football",
    emoji: "⚽",
    date: "Tomorrow",
    time: "5:30 PM",
    location: "Rooftop Turf",
    skill: "Beginner",
    players: "7 / 10 players",
    host: "Daniel",
    rating: "4.9",
  },
  {
    id: 3,
    sport: "Tennis",
    emoji: "🎾",
    date: "Saturday",
    time: "2:00 PM",
    location: "UoA Tennis Courts",
    skill: "Intermediate",
    players: "1 / 2 players",
    host: "Sarah",
    rating: "4.7",
  },
];

export default function DashboardPage() {
  const supabase = createClient();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          window.location.href = "/auth/login";
          return;
        }

        setEmail(user.email || "");

        const metadata = user.user_metadata || {};

        setProfile({
          full_name: metadata.full_name || "",
          username: metadata.username || "",
          selected_sports: Array.isArray(metadata.selected_sports)
            ? metadata.selected_sports
            : [],
          sport_skills: metadata.sport_skills || {},
        });
      } catch (error) {
        console.error("Failed to load profile:", error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f7f5] flex items-center justify-center">
        <div className="text-gray-500 text-sm">
          Loading your dashboard...
        </div>
      </main>
    );
  }

  /*
   * Use the name from onboarding.
   *
   * If the user hasn't created a name yet, use their email
   * as a temporary fallback instead of showing "Alex".
   */
  const displayName =
    profile?.full_name?.trim() ||
    profile?.username?.trim() ||
    email.split("@")[0] ||
    "there";

  const firstName = displayName.split(" ")[0];

  const avatarLetter = displayName.charAt(0).toUpperCase();

  const userSports = profile?.selected_sports || [];

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-black">
      {/* -------------------------------- */}
      {/* NAVIGATION */}
      {/* -------------------------------- */}

      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-[1600px] mx-auto px-8 md:px-16 h-24 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="text-2xl font-semibold tracking-tight"
          >
            The Rally
          </Link>

          <nav className="flex items-center gap-8">
            <Link
              href="/games"
              className="text-sm text-gray-600 hover:text-black transition"
            >
              My Games
            </Link>

            <Link
              href="/create-game"
              className="text-sm text-gray-600 hover:text-black transition"
            >
              Create Game
            </Link>

            <Link
              href="/profile"
              className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center font-medium"
              title="Profile"
            >
              {avatarLetter}
            </Link>
          </nav>
        </div>
      </header>

      {/* -------------------------------- */}
      {/* HERO */}
      {/* -------------------------------- */}

      <section className="max-w-[1600px] mx-auto px-8 md:px-16 pt-20 pb-16">
        <div className="max-w-4xl">
          <p className="text-sm tracking-[0.3em] text-gray-400 uppercase mb-6">
            Dashboard
          </p>

          <h1 className="text-6xl md:text-7xl font-semibold tracking-[-0.05em] leading-[0.95]">
            Good morning, {firstName}.
          </h1>

          <p className="text-xl md:text-2xl text-gray-500 mt-8 max-w-3xl leading-relaxed">
            Ready to play? Find a game that fits your schedule or create one
            for other students to join.
          </p>
        </div>
      </section>

      {/* -------------------------------- */}
      {/* MAIN ACTIONS */}
      {/* -------------------------------- */}

      <section className="max-w-[1600px] mx-auto px-8 md:px-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* FIND GAME */}

          <Link
            href="/games"
            className="group bg-black text-white rounded-[32px] p-10 md:p-12 min-h-[330px] flex flex-col justify-between hover:scale-[1.01] transition duration-300"
          >
            <div>
              <p className="text-sm tracking-wide text-gray-500 uppercase mb-8">
                Discover
              </p>

              <h2 className="text-4xl md:text-5xl font-medium tracking-tight">
                Find a game
              </h2>

              <p className="text-lg text-gray-400 mt-5 max-w-xl leading-relaxed">
                Find students playing your favourite sports at a time that
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
            className="group bg-white border border-gray-200 rounded-[32px] p-10 md:p-12 min-h-[330px] flex flex-col justify-between hover:scale-[1.01] transition duration-300"
          >
            <div>
              <p className="text-sm tracking-wide text-gray-400 uppercase mb-8">
                Host
              </p>

              <h2 className="text-4xl md:text-5xl font-medium tracking-tight">
                Create a game
              </h2>

              <p className="text-lg text-gray-500 mt-5 max-w-xl leading-relaxed">
                Choose a sport, time and number of players and find people to
                play with.
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

      {/* -------------------------------- */}
      {/* UPCOMING GAME */}
      {/* -------------------------------- */}

      <section className="max-w-[1600px] mx-auto px-8 md:px-16 mt-28">
        <p className="text-sm tracking-[0.3em] text-gray-400 uppercase mb-5">
          Your activity
        </p>

        <h2 className="text-4xl font-medium tracking-tight mb-10">
          Upcoming game
        </h2>

        <div className="bg-white rounded-[30px] border border-gray-200 p-8 md:p-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-[#f3f3f1] flex items-center justify-center text-4xl">
                🏸
              </div>

              <div>
                <h3 className="text-3xl font-medium">
                  No upcoming games yet
                </h3>

                <p className="text-gray-500 mt-2">
                  Join a game to see it here.
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
        </div>
      </section>

      {/* -------------------------------- */}
      {/* RECOMMENDED GAMES */}
      {/* -------------------------------- */}

      <section className="max-w-[1600px] mx-auto px-8 md:px-16 mt-28">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-sm tracking-[0.3em] text-gray-400 uppercase mb-5">
              Recommended
            </p>

            <h2 className="text-4xl font-medium tracking-tight">
              Games for you
            </h2>
          </div>

          <Link
            href="/games"
            className="hidden md:block text-sm font-medium hover:underline"
          >
            View all →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {recommendedGames.map((game) => {
            const userSkill = profile?.sport_skills?.[game.sport];

            return (
              <div
                key={game.id}
                className="bg-white border border-gray-200 rounded-[30px] p-8 min-h-[500px] flex flex-col"
              >
                <div className="flex items-center justify-between">
                  <div className="w-16 h-16 rounded-2xl bg-[#f3f3f1] flex items-center justify-center text-3xl">
                    {game.emoji}
                  </div>

                  <div className="bg-green-50 text-green-600 rounded-full px-4 py-2 text-xs font-medium">
                    {game.players}
                  </div>
                </div>

                <div className="mt-10">
                  <h3 className="text-3xl font-medium">
                    {game.sport}
                  </h3>

                  <div className="space-y-2 mt-6 text-gray-500">
                    <p>
                      {game.date} · {game.time}
                    </p>

                    <p>{game.location}</p>

                    <p>{game.skill}</p>
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

                <div className="mt-auto pt-10">
                  <div className="flex justify-between mb-6">
                    <div>
                      <p className="text-xs text-gray-400 uppercase">
                        Host
                      </p>

                      <p className="mt-1 font-medium">
                        {game.host} ✓
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400 uppercase">
                        Rating
                      </p>

                      <p className="mt-1 font-medium">
                        ★ {game.rating}
                      </p>
                    </div>
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
          })}
        </div>
      </section>

      {/* -------------------------------- */}
      {/* USER SPORTS */}
      {/* -------------------------------- */}

      <section className="max-w-[1600px] mx-auto px-8 md:px-16 mt-28 pb-24">
        <p className="text-sm tracking-[0.3em] text-gray-400 uppercase mb-5">
          Your interests
        </p>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <h2 className="text-4xl font-medium tracking-tight">
            Sports you play
          </h2>

          <Link
            href="/profile"
            className="text-sm font-medium hover:underline"
          >
            Edit preferences →
          </Link>
        </div>

        {userSports.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {userSports.map((sport) => {
              const sportInfo = recommendedGames.find(
                (game) => game.sport === sport
              );

              const emoji = sportInfo?.emoji || "🏅";
              const skill = profile?.sport_skills?.[sport];

              return (
                <Link
                  key={sport}
                  href={`/games?sport=${encodeURIComponent(sport)}`}
                  className="group bg-white border border-gray-200 rounded-full px-6 py-4 flex items-center gap-3 hover:border-black transition"
                >
                  <span>{emoji}</span>

                  <span className="font-medium">
                    {sport}
                  </span>

                  {skill && (
                    <span className="text-xs text-gray-400">
                      {skill}
                    </span>
                  )}

                  <span className="group-hover:translate-x-1 transition">
                    →
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-3xl p-8">
            <p className="text-gray-500">
              You haven&apos;t selected any sports yet.
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