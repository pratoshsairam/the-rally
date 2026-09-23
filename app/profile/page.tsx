"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/navbar";

type SkillLevel =
  | "Beginner"
  | "Intermediate"
  | "Advanced";

type Sport = {
  id: number;
  name: string;
  emoji: string | null;
  slug?: string | null;
};

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  selected_sports: string[] | null;
  sport_skills: Record<string, string> | null;
  preferred_days: string[] | null;
  preferred_times: string[] | null;
  game_type: string | null;
  travel_distance: number | null;
  game_cost: string | null;
  onboarding_completed: boolean | null;
};

const FALLBACK_SPORTS: Sport[] = [
  {
    id: 1,
    name: "Badminton",
    emoji: "🏸",
    slug: "badminton",
  },
  {
    id: 2,
    name: "Basketball",
    emoji: "🏀",
    slug: "basketball",
  },
  {
    id: 3,
    name: "Cricket",
    emoji: "🏏",
    slug: "cricket",
  },
  {
    id: 4,
    name: "Football",
    emoji: "⚽",
    slug: "football",
  },
  {
    id: 5,
    name: "Hockey",
    emoji: "🏑",
    slug: "hockey",
  },
  {
    id: 6,
    name: "Rugby",
    emoji: "🏉",
    slug: "rugby",
  },
  {
    id: 7,
    name: "Running",
    emoji: "🏃",
    slug: "running",
  },
  {
    id: 8,
    name: "Table Tennis",
    emoji: "🏓",
    slug: "table-tennis",
  },
  {
    id: 9,
    name: "Tennis",
    emoji: "🎾",
    slug: "tennis",
  },
  {
    id: 10,
    name: "Volleyball",
    emoji: "🏐",
    slug: "volleyball",
  },
];

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const TIMES = [
  "Morning",
  "Afternoon",
  "Evening",
];

const SKILL_LEVELS: SkillLevel[] = [
  "Beginner",
  "Intermediate",
  "Advanced",
];

const GAME_TYPES = [
  "Casual",
  "Competitive",
  "Either",
];

const COST_OPTIONS = [
  "Free only",
  "Shared cost",
  "Any",
];

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [sports, setSports] = useState<Sport[]>([]);

  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [gamesHosted, setGamesHosted] = useState(0);
  const [rating, setRating] =
    useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");

  const [selectedSports, setSelectedSports] =
    useState<string[]>([]);

  const [sportSkills, setSportSkills] =
    useState<Record<string, SkillLevel>>({});

  const [preferredDays, setPreferredDays] =
    useState<string[]>([]);

  const [preferredTimes, setPreferredTimes] =
    useState<string[]>([]);

  const [gameType, setGameType] =
    useState("Either");

  const [travelDistance, setTravelDistance] =
    useState(10);

  const [gameCost, setGameCost] =
    useState("Any");

  // ============================================
  // LOAD PROFILE
  // ============================================

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setErrorMessage("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.push("/auth/login");
          return;
        }

        setUserId(user.id);
        setEmail(user.email || "");

        // -----------------------------
        // PROFILE
        // -----------------------------

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
              bio,
              avatar_url,
              selected_sports,
              sport_skills,
              preferred_days,
              preferred_times,
              game_type,
              travel_distance,
              game_cost,
              onboarding_completed
            `
          )
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error(
            "PROFILE LOAD ERROR:",
            profileError
          );

          throw profileError;
        }

        const metadata =
          user.user_metadata || {};

        const finalProfile: Profile = {
          id: user.id,

          full_name:
            profileData?.full_name ||
            metadata.full_name ||
            user.email?.split("@")[0] ||
            "UoA Student",

          username:
            profileData?.username ||
            metadata.username ||
            null,

          bio:
            profileData?.bio ||
            metadata.bio ||
            null,

          avatar_url:
            profileData?.avatar_url ||
            metadata.avatar_url ||
            null,

          selected_sports:
            profileData?.selected_sports ||
            metadata.selected_sports ||
            [],

          sport_skills:
            profileData?.sport_skills ||
            metadata.sport_skills ||
            {},

          preferred_days:
            profileData?.preferred_days ||
            metadata.preferred_days ||
            [],

          preferred_times:
            profileData?.preferred_times ||
            metadata.preferred_times ||
            [],

          game_type:
            profileData?.game_type ||
            metadata.game_type ||
            "Either",

          travel_distance:
            profileData?.travel_distance ??
            metadata.travel_distance ??
            10,

          game_cost:
            profileData?.game_cost ||
            metadata.game_cost ||
            "Any",

          onboarding_completed:
            profileData?.onboarding_completed ??
            metadata.onboarding_completed ??
            false,
        };

        setProfile(finalProfile);

        // -----------------------------
        // EDIT FORM
        // -----------------------------

        setFullName(
          finalProfile.full_name || ""
        );

        setUsername(
          finalProfile.username || ""
        );

        setBio(finalProfile.bio || "");

        setSelectedSports(
          finalProfile.selected_sports || []
        );

        const existingSkills =
          finalProfile.sport_skills || {};

        const cleanedSkills: Record<
          string,
          SkillLevel
        > = {};

        Object.entries(existingSkills).forEach(
          ([sport, skill]) => {
            if (
              skill === "Beginner" ||
              skill === "Intermediate" ||
              skill === "Advanced"
            ) {
              cleanedSkills[sport] = skill;
            } else {
              cleanedSkills[sport] =
                "Beginner";
            }
          }
        );

        setSportSkills(cleanedSkills);

        setPreferredDays(
          finalProfile.preferred_days || []
        );

        setPreferredTimes(
          finalProfile.preferred_times || []
        );

        setGameType(
          finalProfile.game_type || "Either"
        );

        setTravelDistance(
          finalProfile.travel_distance ?? 10
        );

        setGameCost(
          finalProfile.game_cost || "Any"
        );

        // -----------------------------
        // SPORTS
        // -----------------------------

        const {
          data: sportsData,
          error: sportsError,
        } = await supabase
          .from("sports")
          .select(
            "id, name, emoji, slug"
          )
          .order("name");

        if (sportsError) {
          console.error(
            "SPORTS LOAD ERROR:",
            sportsError
          );

          setSports(FALLBACK_SPORTS);
        } else {
          setSports(
            sportsData &&
              sportsData.length > 0
              ? sportsData
              : FALLBACK_SPORTS
          );
        }

        // -----------------------------
        // GAMES PLAYED
        // -----------------------------

        const {
          data: joinedGames,
          error: joinedGamesError,
        } = await supabase
          .from("game_players")
          .select("game_id")
          .eq("user_id", user.id)
          .eq("status", "joined");

        if (joinedGamesError) {
          console.error(
            "GAMES PLAYED ERROR:",
            joinedGamesError
          );
        } else {
          setGamesPlayed(
            joinedGames?.length || 0
          );
        }

        // -----------------------------
        // GAMES HOSTED
        // -----------------------------

        const {
          data: hostedGames,
          error: hostedGamesError,
        } = await supabase
          .from("games")
          .select("id")
          .eq("host_id", user.id);

        if (hostedGamesError) {
          console.error(
            "GAMES HOSTED ERROR:",
            hostedGamesError
          );
        } else {
          setGamesHosted(
            hostedGames?.length || 0
          );
        }

        // -----------------------------
        // RATINGS
        // -----------------------------

        const {
          data: reviews,
          error: reviewsError,
        } = await supabase
          .from("reviews")
          .select("rating")
          .eq(
            "reviewed_user_id",
            user.id
          );

        if (reviewsError) {
          console.error(
            "REVIEWS ERROR:",
            reviewsError
          );
        } else if (
          reviews &&
          reviews.length > 0
        ) {
          const total =
            reviews.reduce(
              (sum, review) =>
                sum +
                Number(
                  review.rating || 0
                ),
              0
            );

          const average =
            total / reviews.length;

          setRating(average);
          setRatingCount(
            reviews.length
          );
        } else {
          setRating(null);
          setRatingCount(0);
        }
      } catch (error) {
        console.error(
          "PROFILE PAGE ERROR:",
          error
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load your profile."
        );
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  // ============================================
  // SPORT LOOKUP
  // ============================================

  const sportMap = useMemo(() => {
    const map = new Map<
      string,
      Sport
    >();

    sports.forEach((sport) => {
      map.set(
        sport.name.toLowerCase(),
        sport
      );
    });

    return map;
  }, [sports]);

  // ============================================
  // START EDITING
  // ============================================

  function startEditing() {
    setSaveMessage("");
    setErrorMessage("");

    if (profile) {
      setFullName(
        profile.full_name || ""
      );

      setUsername(
        profile.username || ""
      );

      setBio(profile.bio || "");

      setSelectedSports(
        profile.selected_sports || []
      );

      const existingSkills =
        profile.sport_skills || {};

      const cleanedSkills: Record<
        string,
        SkillLevel
      > = {};

      Object.entries(existingSkills).forEach(
        ([sport, skill]) => {
          if (
            skill === "Beginner" ||
            skill === "Intermediate" ||
            skill === "Advanced"
          ) {
            cleanedSkills[sport] =
              skill;
          } else {
            cleanedSkills[sport] =
              "Beginner";
          }
        }
      );

      setSportSkills(cleanedSkills);

      setPreferredDays(
        profile.preferred_days || []
      );

      setPreferredTimes(
        profile.preferred_times || []
      );

      setGameType(
        profile.game_type || "Either"
      );

      setTravelDistance(
        profile.travel_distance ?? 10
      );

      setGameCost(
        profile.game_cost || "Any"
      );
    }

    setEditing(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // ============================================
  // CANCEL EDITING
  // ============================================

  function cancelEditing() {
    setEditing(false);
    setSaveMessage("");
    setErrorMessage("");

    if (profile) {
      setFullName(
        profile.full_name || ""
      );

      setUsername(
        profile.username || ""
      );

      setBio(profile.bio || "");

      setSelectedSports(
        profile.selected_sports || []
      );

      setSportSkills(
        (profile.sport_skills ||
          {}) as Record<
          string,
          SkillLevel
        >
      );

      setPreferredDays(
        profile.preferred_days || []
      );

      setPreferredTimes(
        profile.preferred_times || []
      );

      setGameType(
        profile.game_type || "Either"
      );

      setTravelDistance(
        profile.travel_distance ?? 10
      );

      setGameCost(
        profile.game_cost || "Any"
      );
    }
  }

  // ============================================
  // SPORTS
  // ============================================

  function toggleSport(
    sportName: string
  ) {
    setSelectedSports((current) => {
      if (current.includes(sportName)) {
        setSportSkills((skills) => {
          const updated = {
            ...skills,
          };

          delete updated[
            sportName
          ];

          return updated;
        });

        return current.filter(
          (sport) =>
            sport !== sportName
        );
      }

      setSportSkills((skills) => ({
        ...skills,
        [sportName]:
          skills[sportName] ||
          "Beginner",
      }));

      return [
        ...current,
        sportName,
      ];
    });
  }

  function changeSportSkill(
    sportName: string,
    skill: SkillLevel
  ) {
    setSportSkills((current) => ({
      ...current,
      [sportName]: skill,
    }));
  }

  // ============================================
  // DAYS
  // ============================================

  function toggleDay(day: string) {
    setPreferredDays((current) => {
      if (current.includes(day)) {
        return current.filter(
          (item) => item !== day
        );
      }

      return [...current, day];
    });
  }

  // ============================================
  // TIMES
  // ============================================

  function toggleTime(time: string) {
    setPreferredTimes((current) => {
      if (current.includes(time)) {
        return current.filter(
          (item) => item !== time
        );
      }

      return [...current, time];
    });
  }

  // ============================================
  // SAVE PROFILE
  // ============================================

  async function saveProfile() {
    setSaveMessage("");
    setErrorMessage("");

    if (fullName.trim().length < 2) {
      setErrorMessage(
        "Please enter your full name."
      );

      return;
    }

    if (username.trim().length < 2) {
      setErrorMessage(
        "Please enter a username."
      );

      return;
    }

    if (selectedSports.length === 0) {
      setErrorMessage(
        "Please select at least one sport."
      );

      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace(
          "/auth/login"
        );

        return;
      }

      const cleanedSportSkills: Record<
        string,
        SkillLevel
      > = {};

      selectedSports.forEach(
        (sport) => {
          cleanedSportSkills[
            sport
          ] =
            sportSkills[sport] ||
            "Beginner";
        }
      );

      // -----------------------------
      // SAVE TO PROFILES
      // -----------------------------

      const {
        data: updatedProfile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,

            full_name:
              fullName.trim(),

            username:
              username.trim(),

            bio:
              bio.trim(),

            selected_sports:
              selectedSports,

            sport_skills:
              cleanedSportSkills,

            preferred_days:
              preferredDays,

            preferred_times:
              preferredTimes,

            game_type:
              gameType,

            travel_distance:
              travelDistance,

            game_cost:
              gameCost,

            onboarding_completed:
              true,

            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict: "id",
          }
        )
        .select()
        .single();

      if (profileError) {
        console.error(
          "SAVE PROFILE ERROR:",
          profileError
        );

        throw profileError;
      }

      // -----------------------------
      // UPDATE AUTH METADATA
      // -----------------------------

      const {
        error: authError,
      } =
        await supabase.auth.updateUser(
          {
            data: {
              full_name:
                fullName.trim(),

              username:
                username.trim(),

              bio:
                bio.trim(),

              selected_sports:
                selectedSports,

              sport_skills:
                cleanedSportSkills,

              preferred_days:
                preferredDays,

              preferred_times:
                preferredTimes,

              game_type:
                gameType,

              travel_distance:
                travelDistance,

              game_cost:
                gameCost,

              onboarding_completed:
                true,
            },
          }
        );

      if (authError) {
        console.warn(
          "AUTH METADATA UPDATE WARNING:",
          authError
        );
      }

      const newProfile: Profile = {
        id: userId,

        full_name:
          updatedProfile?.full_name ??
          fullName.trim(),

        username:
          updatedProfile?.username ??
          username.trim(),

        bio:
          updatedProfile?.bio ??
          bio.trim(),

        avatar_url:
          profile?.avatar_url ||
          null,

        selected_sports:
          updatedProfile?.selected_sports ??
          selectedSports,

        sport_skills:
          updatedProfile?.sport_skills ??
          cleanedSportSkills,

        preferred_days:
          updatedProfile?.preferred_days ??
          preferredDays,

        preferred_times:
          updatedProfile?.preferred_times ??
          preferredTimes,

        game_type:
          updatedProfile?.game_type ??
          gameType,

        travel_distance:
          updatedProfile?.travel_distance ??
          travelDistance,

        game_cost:
          updatedProfile?.game_cost ??
          gameCost,

        onboarding_completed:
          true,
      };

      setProfile(newProfile);

      setSelectedSports(
        updatedProfile?.selected_sports ??
          selectedSports
      );

      setSportSkills(
        (updatedProfile?.sport_skills ??
          cleanedSportSkills) as Record<
          string,
          SkillLevel
        >
      );

      setPreferredDays(
        updatedProfile?.preferred_days ??
          preferredDays
      );

      setPreferredTimes(
        updatedProfile?.preferred_times ??
          preferredTimes
      );

      setGameType(
        updatedProfile?.game_type ??
          gameType
      );

      setTravelDistance(
        updatedProfile?.travel_distance ??
          travelDistance
      );

      setGameCost(
        updatedProfile?.game_cost ??
          gameCost
      );

      setEditing(false);

      setSaveMessage(
        "Profile updated successfully."
      );

      router.refresh();

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error(
        "SAVE PROFILE FAILED:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while saving your profile."
      );
    } finally {
      setSaving(false);
    }
  }

  // ============================================
  // LOADING
  // ============================================

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f7f5] text-black">
        <Navbar />

        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-black/10 border-t-black" />

            <p className="text-sm text-gray-500">
              Loading your profile...
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ============================================
  // ERROR
  // ============================================

  if (!profile) {
    return (
      <main className="min-h-screen bg-[#f7f7f5] text-black">
        <Navbar />

        <div className="max-w-[800px] mx-auto px-6 py-24">
          <div className="bg-white border border-red-200 rounded-3xl p-8">
            <h1 className="text-2xl font-semibold">
              Unable to load your profile
            </h1>

            <p className="text-gray-500 mt-3">
              {errorMessage ||
                "Please refresh the page and try again."}
            </p>

            <Link
              href="/dashboard"
              className="inline-block mt-6 bg-black text-white rounded-full px-6 py-3"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ============================================
  // DISPLAY DATA
  // ============================================

  const displayName =
    profile.full_name ||
    email.split("@")[0] ||
    "UoA Student";

  const firstLetter =
    displayName
      .charAt(0)
      .toUpperCase();

  const usernameDisplay =
    profile.username
      ? `@${profile.username.replace(
          /^@/,
          ""
        )}`
      : "@student";

  const selectedSportNames =
    profile.selected_sports || [];

  // ============================================
  // PAGE
  // ============================================

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-black">
      <Navbar />

      <div className="max-w-[900px] mx-auto px-6 md:px-10 py-14 md:py-16">
        {/* BACK */}

        <Link
          href="/dashboard"
          className="text-sm text-gray-500 hover:text-black transition"
        >
          ← Back to dashboard
        </Link>

        {/* SUCCESS */}

        {saveMessage && (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-700">
            {saveMessage}
          </div>
        )}

        {/* ERROR */}

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {/* ====================================== */}
        {/* PROFILE HEADER */}
        {/* ====================================== */}

        <section className="bg-white border border-gray-200 rounded-[30px] p-8 md:p-10 mt-8">
          <div className="flex flex-col md:flex-row md:items-center gap-7">
            <div className="w-24 h-24 rounded-full bg-black text-white flex items-center justify-center text-3xl font-medium shrink-0">
              {firstLetter}
            </div>

            <div className="flex-1">
              <p className="text-xs tracking-[0.3em] text-gray-400 uppercase mb-3">
                University of Auckland
              </p>

              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
                {displayName}
              </h1>

              <p className="text-gray-500 mt-2">
                {usernameDisplay}
              </p>

              <p className="text-sm text-gray-400 mt-1">
                {email}
              </p>
            </div>

            {!editing && (
              <button
                type="button"
                onClick={startEditing}
                className="border border-gray-300 rounded-full px-6 py-3 text-sm font-medium hover:border-black transition"
              >
                Edit profile
              </button>
            )}
          </div>

          {profile.bio && (
            <div className="border-t border-gray-200 mt-8 pt-7">
              <p className="text-gray-600 leading-7">
                {profile.bio}
              </p>
            </div>
          )}
        </section>

        {/* ====================================== */}
        {/* EDIT PROFILE */}
        {/* ====================================== */}

        {editing && (
          <section className="bg-white border border-gray-200 rounded-[30px] p-8 md:p-10 mt-6">
            <div className="flex items-start justify-between gap-6 mb-10">
              <div>
                <p className="text-xs tracking-[0.3em] text-gray-400 uppercase mb-3">
                  Edit profile
                </p>

                <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
                  Make it yours.
                </h2>

                <p className="text-gray-500 mt-3">
                  Update your information and playing preferences.
                </p>
              </div>

              <button
                type="button"
                onClick={cancelEditing}
                className="text-sm text-gray-500 hover:text-black"
              >
                Cancel
              </button>
            </div>

            {/* BASIC INFORMATION */}

            <div className="space-y-7">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Full name
                </label>

                <input
                  type="text"
                  value={fullName}
                  onChange={(e) =>
                    setFullName(
                      e.target.value
                    )
                  }
                  className="w-full rounded-2xl border border-gray-300 bg-white px-5 py-4 outline-none focus:border-black transition"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Username
                </label>

                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400">
                    @
                  </span>

                  <input
                    type="text"
                    value={username.replace(
                      /^@/,
                      ""
                    )}
                    onChange={(e) =>
                      setUsername(
                        e.target.value.replace(
                          /^@/,
                          ""
                        )
                      )
                    }
                    className="w-full rounded-2xl border border-gray-300 bg-white pl-10 pr-5 py-4 outline-none focus:border-black transition"
                    placeholder="yourusername"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  About you
                </label>

                <textarea
                  value={bio}
                  onChange={(e) =>
                    setBio(
                      e.target.value
                    )
                  }
                  rows={4}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-5 py-4 outline-none focus:border-black transition resize-none"
                  placeholder="Tell people a little about yourself..."
                />
              </div>
            </div>

            {/* SPORTS */}

            <div className="border-t border-gray-200 mt-12 pt-10">
              <p className="text-xs tracking-[0.3em] text-gray-400 uppercase mb-3">
                Sports
              </p>

              <h3 className="text-2xl font-semibold">
                What do you play?
              </h3>

              <p className="text-gray-500 mt-2">
                Select your sports and set your skill level for each one.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-7">
                {sports.map((sport) => {
                  const selected =
                    selectedSports.includes(
                      sport.name
                    );

                  return (
                    <div
                      key={sport.id}
                      className={`border rounded-2xl p-4 transition ${
                        selected
                          ? "border-black bg-[#fafafa]"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          toggleSport(
                            sport.name
                          )
                        }
                        className="w-full flex items-center gap-3 text-left"
                      >
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${
                            selected
                              ? "bg-black text-white"
                              : "bg-[#f3f3f1]"
                          }`}
                        >
                          {sport.emoji ||
                            "🏅"}
                        </div>

                        <span className="font-medium flex-1">
                          {sport.name}
                        </span>

                        <span
                          className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs ${
                            selected
                              ? "bg-black border-black text-white"
                              : "border-gray-300"
                          }`}
                        >
                          {selected
                            ? "✓"
                            : ""}
                        </span>
                      </button>

                      {selected && (
                        <div className="mt-4">
                          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">
                            Skill level
                          </label>

                          <select
                            value={
                              sportSkills[
                                sport.name
                              ] ||
                              "Beginner"
                            }
                            onChange={(e) =>
                              changeSportSkill(
                                sport.name,
                                e.target
                                  .value as SkillLevel
                              )
                            }
                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                          >
                            {SKILL_LEVELS.map(
                              (
                                skill
                              ) => (
                                <option
                                  key={
                                    skill
                                  }
                                  value={
                                    skill
                                  }
                                >
                                  {skill}
                                </option>
                              )
                            )}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PREFERENCES */}

            <div className="border-t border-gray-200 mt-12 pt-10">
              <p className="text-xs tracking-[0.3em] text-gray-400 uppercase mb-3">
                Preferences
              </p>

              <h3 className="text-2xl font-semibold">
                How do you like to play?
              </h3>

              {/* DAYS */}

              <div className="mt-8">
                <label className="block text-sm font-medium mb-3">
                  Preferred days
                </label>

                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day) => {
                    const selected =
                      preferredDays.includes(
                        day
                      );

                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() =>
                          toggleDay(
                            day
                          )
                        }
                        className={`rounded-full border px-4 py-2.5 text-sm transition ${
                          selected
                            ? "bg-black border-black text-white"
                            : "bg-white border-gray-300 hover:border-black"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TIMES */}

              <div className="mt-8">
                <label className="block text-sm font-medium mb-3">
                  Preferred times
                </label>

                <div className="flex flex-wrap gap-2">
                  {TIMES.map((time) => {
                    const selected =
                      preferredTimes.includes(
                        time
                      );

                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() =>
                          toggleTime(
                            time
                          )
                        }
                        className={`rounded-full border px-5 py-2.5 text-sm transition ${
                          selected
                            ? "bg-black border-black text-white"
                            : "bg-white border-gray-300 hover:border-black"
                        }`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* GAME TYPE */}

              <div className="mt-8">
                <label className="block text-sm font-medium mb-3">
                  Game type
                </label>

                <div className="grid grid-cols-3 gap-2">
                  {GAME_TYPES.map(
                    (type) => {
                      const selected =
                        gameType ===
                        type;

                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() =>
                            setGameType(
                              type
                            )
                          }
                          className={`rounded-xl border px-4 py-3 text-sm transition ${
                            selected
                              ? "bg-black border-black text-white"
                              : "bg-white border-gray-300 hover:border-black"
                          }`}
                        >
                          {type}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* TRAVEL DISTANCE */}

              <div className="mt-8">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium">
                    Travel distance
                  </label>

                  <span className="text-sm font-medium">
                    {travelDistance} km
                  </span>
                </div>

                <input
                  type="range"
                  min="1"
                  max="30"
                  value={travelDistance}
                  onChange={(e) =>
                    setTravelDistance(
                      Number(
                        e.target.value
                      )
                    )
                  }
                  className="w-full accent-black"
                />

                <div className="flex justify-between text-xs text-gray-400 mt-2">
                  <span>
                    1 km
                  </span>
                  <span>
                    15 km
                  </span>
                  <span>
                    30 km
                  </span>
                </div>
              </div>

              {/* COST */}

              <div className="mt-8">
                <label className="block text-sm font-medium mb-3">
                  Cost preference
                </label>

                <select
                  value={gameCost}
                  onChange={(e) =>
                    setGameCost(
                      e.target.value
                    )
                  }
                  className="w-full rounded-2xl border border-gray-300 bg-white px-5 py-4 outline-none focus:border-black"
                >
                  {COST_OPTIONS.map(
                    (option) => (
                      <option
                        key={option}
                        value={option}
                      >
                        {option}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            {/* SAVE */}

            <div className="border-t border-gray-200 mt-12 pt-8 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={saveProfile}
                disabled={saving}
                className="flex-1 bg-black text-white rounded-full px-7 py-4 font-medium hover:bg-gray-800 transition disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Save changes"}
              </button>

              <button
                type="button"
                onClick={cancelEditing}
                disabled={saving}
                className="sm:w-40 border border-gray-300 rounded-full px-7 py-4 font-medium hover:border-black transition disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </section>
        )}

        {/* ====================================== */}
        {/* STATS */}
        {/* ====================================== */}

        {!editing && (
          <>
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {/* RATING */}

              <div className="bg-white border border-gray-200 rounded-[26px] p-7">
                <p className="text-xs tracking-[0.25em] text-gray-400 uppercase">
                  Rating
                </p>

                <p className="text-4xl font-semibold mt-5">
                  {rating !== null
                    ? rating.toFixed(1)
                    : "—"}
                </p>

                <p className="text-sm text-gray-400 mt-2">
                  {ratingCount > 0
                    ? `${ratingCount} rating${
                        ratingCount ===
                        1
                          ? ""
                          : "s"
                      }`
                    : "No ratings yet"}
                </p>
              </div>

              {/* PLAYED */}

              <div className="bg-white border border-gray-200 rounded-[26px] p-7">
                <p className="text-xs tracking-[0.25em] text-gray-400 uppercase">
                  Games played
                </p>

                <p className="text-4xl font-semibold mt-5">
                  {gamesPlayed}
                </p>

                <p className="text-sm text-gray-400 mt-2">
                  Games you've joined
                </p>
              </div>

              {/* HOSTED */}

              <div className="bg-white border border-gray-200 rounded-[26px] p-7">
                <p className="text-xs tracking-[0.25em] text-gray-400 uppercase">
                  Games hosted
                </p>

                <p className="text-4xl font-semibold mt-5">
                  {gamesHosted}
                </p>

                <p className="text-sm text-gray-400 mt-2">
                  Games you've created
                </p>
              </div>
            </section>

            {/* ====================================== */}
            {/* SPORTS DISPLAY */}
            {/* ====================================== */}

            <section className="bg-white border border-gray-200 rounded-[30px] p-8 md:p-10 mt-6">
              <div className="flex items-end justify-between gap-5">
                <div>
                  <p className="text-xs tracking-[0.3em] text-gray-400 uppercase mb-3">
                    Sports
                  </p>

                  <h2 className="text-3xl font-semibold tracking-tight">
                    What you play
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={startEditing}
                  className="text-sm font-medium hover:underline"
                >
                  Edit →
                </button>
              </div>

              {selectedSportNames.length >
              0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-8">
                  {selectedSportNames.map(
                    (sportName) => {
                      const sport =
                        sportMap.get(
                          sportName.toLowerCase()
                        );

                      const skill =
                        profile
                          .sport_skills?.[
                          sportName
                        ] ||
                        "Beginner";

                      return (
                        <Link
                          key={
                            sportName
                          }
                          href={`/games?sport=${encodeURIComponent(
                            sportName
                          )}`}
                          className="border border-gray-200 rounded-2xl p-4 flex items-center gap-4 hover:border-black transition"
                        >
                          <div className="w-12 h-12 rounded-xl bg-[#f3f3f1] flex items-center justify-center text-xl">
                            {sport?.emoji ||
                              "🏅"}
                          </div>

                          <div className="flex-1">
                            <p className="font-medium">
                              {
                                sportName
                              }
                            </p>

                            <p className="text-sm text-gray-400 mt-1">
                              {skill}
                            </p>
                          </div>

                          <span className="text-gray-400">
                            →
                          </span>
                        </Link>
                      );
                    }
                  )}
                </div>
              ) : (
                <div className="mt-7 rounded-2xl bg-[#f7f7f5] p-6">
                  <p className="text-gray-500">
                    You haven't selected any sports yet.
                  </p>
                </div>
              )}
            </section>

            {/* ====================================== */}
            {/* PREFERENCES DISPLAY */}
            {/* ====================================== */}

            <section className="bg-white border border-gray-200 rounded-[30px] p-8 md:p-10 mt-6">
              <div className="flex items-end justify-between gap-5">
                <div>
                  <p className="text-xs tracking-[0.3em] text-gray-400 uppercase mb-3">
                    Preferences
                  </p>

                  <h2 className="text-3xl font-semibold tracking-tight">
                    How you like to play
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={startEditing}
                  className="text-sm font-medium hover:underline"
                >
                  Edit →
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                {/* DAYS */}

                <div>
                  <p className="text-xs tracking-[0.2em] text-gray-400 uppercase mb-3">
                    Preferred days
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {(
                      profile.preferred_days ||
                      []
                    ).length > 0 ? (
                      profile.preferred_days!.map(
                        (day) => (
                          <span
                            key={day}
                            className="border border-gray-200 rounded-full px-4 py-2 text-sm"
                          >
                            {day}
                          </span>
                        )
                      )
                    ) : (
                      <span className="text-gray-400">
                        No preference
                      </span>
                    )}
                  </div>
                </div>

                {/* TIMES */}

                <div>
                  <p className="text-xs tracking-[0.2em] text-gray-400 uppercase mb-3">
                    Preferred times
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {(
                      profile.preferred_times ||
                      []
                    ).length > 0 ? (
                      profile.preferred_times!.map(
                        (time) => (
                          <span
                            key={time}
                            className="border border-gray-200 rounded-full px-4 py-2 text-sm"
                          >
                            {time}
                          </span>
                        )
                      )
                    ) : (
                      <span className="text-gray-400">
                        No preference
                      </span>
                    )}
                  </div>
                </div>

                {/* GAME TYPE */}

                <div>
                  <p className="text-xs tracking-[0.2em] text-gray-400 uppercase mb-2">
                    Game type
                  </p>

                  <p className="text-lg font-medium">
                    {profile.game_type ||
                      "Either"}
                  </p>
                </div>

                {/* TRAVEL */}

                <div>
                  <p className="text-xs tracking-[0.2em] text-gray-400 uppercase mb-2">
                    Travel distance
                  </p>

                  <p className="text-lg font-medium">
                    {profile.travel_distance ??
                      10}{" "}
                    km
                  </p>
                </div>

                {/* COST */}

                <div>
                  <p className="text-xs tracking-[0.2em] text-gray-400 uppercase mb-2">
                    Cost preference
                  </p>

                  <p className="text-lg font-medium">
                    {profile.game_cost ||
                      "Any"}
                  </p>
                </div>
              </div>
            </section>

            {/* ====================================== */}
            {/* ACCOUNT */}
            {/* ====================================== */}

            <section className="bg-white border border-gray-200 rounded-[30px] p-8 md:p-10 mt-6 mb-10">
              <p className="text-xs tracking-[0.3em] text-gray-400 uppercase mb-3">
                Account
              </p>

              <h2 className="text-2xl font-semibold">
                University account
              </h2>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 mt-7">
                <div>
                  <p className="font-medium">
                    University email
                  </p>

                  <p className="text-sm text-gray-400 mt-1">
                    {email}
                  </p>
                </div>

                <span className="inline-flex w-fit rounded-full bg-[#f3f3f1] px-4 py-2 text-sm">
                  UoA student
                </span>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}