"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type SkillLevel = "Beginner" | "Intermediate" | "Advanced";

type Sport = {
  name: string;
  emoji: string;
};

const SPORTS: Sport[] = [
  { name: "Badminton", emoji: "🏸" },
  { name: "Football", emoji: "⚽" },
  { name: "Tennis", emoji: "🎾" },
  { name: "Cricket", emoji: "🏏" },
  { name: "Basketball", emoji: "🏀" },
  { name: "Volleyball", emoji: "🏐" },
  { name: "Table Tennis", emoji: "🏓" },
  { name: "Running", emoji: "🏃" },
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

const TIMES = ["Morning", "Afternoon", "Evening"];

const GAME_TYPES = ["Casual", "Competitive", "Either"];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // STEP 1
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");

  // STEP 2
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [sportSkills, setSportSkills] = useState<
    Record<string, SkillLevel>
  >({});

  // STEP 3
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [gameType, setGameType] = useState("Either");
  const [travelDistance, setTravelDistance] = useState(10);
  const [gameCost, setGameCost] = useState("Any");

  // ============================================
  // LOAD USER + EXISTING PROFILE
  // ============================================

  useEffect(() => {
    async function loadUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/auth/login");
          return;
        }

        // Load profile from the DATABASE
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error loading profile:", error);
        }

        // If onboarding has already been completed,
        // NEVER show onboarding again.
        if (profile?.onboarding_completed === true) {
          router.replace("/dashboard");
          return;
        }

        // Load existing information if available.
        if (profile) {
          setFullName(profile.full_name || "");
          setUsername(profile.username || "");
          setBio(profile.bio || "");

          if (Array.isArray(profile.selected_sports)) {
            setSelectedSports(profile.selected_sports);
          }

          if (
            profile.sport_skills &&
            typeof profile.sport_skills === "object"
          ) {
            setSportSkills(profile.sport_skills);
          }

          if (Array.isArray(profile.preferred_days)) {
            setSelectedDays(profile.preferred_days);
          }

          if (Array.isArray(profile.preferred_times)) {
            setSelectedTimes(profile.preferred_times);
          }

          setGameType(profile.game_type || "Either");
          setTravelDistance(profile.travel_distance || 10);
          setGameCost(profile.game_cost || "Any");
        } else {
          // If profile doesn't exist for some reason,
          // use Auth metadata as a fallback.
          const metadata = user.user_metadata || {};

          setFullName(metadata.full_name || "");
          setUsername(metadata.username || "");
          setBio(metadata.bio || "");

          if (Array.isArray(metadata.selected_sports)) {
            setSelectedSports(metadata.selected_sports);
          }

          if (metadata.sport_skills) {
            setSportSkills(metadata.sport_skills);
          }

          if (Array.isArray(metadata.preferred_days)) {
            setSelectedDays(metadata.preferred_days);
          }

          if (Array.isArray(metadata.preferred_times)) {
            setSelectedTimes(metadata.preferred_times);
          }

          setGameType(metadata.game_type || "Either");
          setTravelDistance(metadata.travel_distance || 10);
          setGameCost(metadata.game_cost || "Any");
        }
      } catch (error) {
        console.error("Error loading onboarding:", error);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [router, supabase]);

  // ============================================
  // SPORT SELECTION
  // ============================================

  function toggleSport(sport: string) {
    setSelectedSports((current) => {
      if (current.includes(sport)) {
        setSportSkills((skills) => {
          const updatedSkills = { ...skills };
          delete updatedSkills[sport];
          return updatedSkills;
        });

        return current.filter((item) => item !== sport);
      }

      setSportSkills((skills) => ({
        ...skills,
        [sport]: skills[sport] || "Beginner",
      }));

      return [...current, sport];
    });
  }

  function setSportSkill(sport: string, skill: SkillLevel) {
    setSportSkills((current) => ({
      ...current,
      [sport]: skill,
    }));
  }

  // ============================================
  // DAYS
  // ============================================

  function toggleDay(day: string) {
    setSelectedDays((current) => {
      if (current.includes(day)) {
        return current.filter((item) => item !== day);
      }

      return [...current, day];
    });
  }

  // ============================================
  // TIMES
  // ============================================

  function toggleTime(time: string) {
    setSelectedTimes((current) => {
      if (current.includes(time)) {
        return current.filter((item) => item !== time);
      }

      return [...current, time];
    });
  }

  // ============================================
  // VALIDATION
  // ============================================

  function canContinue() {
    if (step === 1) {
      return fullName.trim().length >= 2;
    }

    if (step === 2) {
      return selectedSports.length > 0;
    }

    return true;
  }

  // ============================================
  // NEXT
  // ============================================

  function nextStep() {
    if (!canContinue()) return;

    if (step < 3) {
      setStep(step + 1);
    }
  }

  // ============================================
  // BACK
  // ============================================

  function previousStep() {
    if (step > 1) {
      setStep(step - 1);
    }
  }

  // ============================================
  // SAVE EVERYTHING
  // ============================================

  async function saveProfile() {
    if (!canContinue()) return;

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/auth/login");
        return;
      }

      // Make sure every selected sport has a skill.
      const finalSportSkills: Record<string, SkillLevel> = {};

      selectedSports.forEach((sport) => {
        finalSportSkills[sport] =
          sportSkills[sport] || "Beginner";
      });

      // ============================================
      // SAVE TO PROFILES TABLE
      // ============================================

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,

            full_name: fullName.trim(),

            username: username.trim() || null,

            bio: bio.trim() || null,

            selected_sports: selectedSports,

            sport_skills: finalSportSkills,

            preferred_days: selectedDays,

            preferred_times: selectedTimes,

            game_type: gameType,

            travel_distance: travelDistance,

            game_cost: gameCost,

            onboarding_completed: true,

            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "id",
          }
        );

      if (profileError) {
        console.error(
          "Profile save error:",
          profileError
        );

        throw new Error(
          profileError.message
        );
      }

      // ============================================
      // ALSO SAVE TO AUTH METADATA
      // ============================================
      //
      // Keeping this means older parts of the app
      // that use user.user_metadata will continue
      // working while we migrate everything to profiles.

      const { error: metadataError } =
        await supabase.auth.updateUser({
          data: {
            onboarding_completed: true,

            full_name: fullName.trim(),

            username: username.trim(),

            bio: bio.trim(),

            selected_sports: selectedSports,

            sport_skills: finalSportSkills,

            preferred_days: selectedDays,

            preferred_times: selectedTimes,

            game_type: gameType,

            travel_distance: travelDistance,

            game_cost: gameCost,
          },
        });

      if (metadataError) {
        console.warn(
          "Auth metadata update warning:",
          metadataError
        );
      }

      // ============================================
      // GO TO DASHBOARD
      // ============================================

      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      console.error(
        "Error saving profile:",
        error
      );

      alert(
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
      <main className="min-h-screen bg-[#f7f7f5] flex items-center justify-center">
        <div className="text-gray-500">
          Loading your profile...
        </div>
      </main>
    );
  }

  // ============================================
  // STEP 1
  // ============================================

  function renderStepOne() {
    return (
      <>
        <div className="mb-10">
          <p className="text-sm tracking-wide text-gray-400 uppercase mb-4">
            Step 1 of 3
          </p>

          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white">
            Tell us about you
          </h1>

          <p className="text-lg text-gray-400 mt-4">
            Create your profile so other students know who they&apos;re
            playing with.
          </p>
        </div>

        <div className="space-y-7">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Full name
            </label>

            <input
              type="text"
              value={fullName}
              onChange={(e) =>
                setFullName(e.target.value)
              }
              placeholder="Your name"
              className="w-full rounded-2xl bg-[#1b1b1b] border border-gray-700 px-5 py-4 text-white placeholder:text-gray-500 outline-none focus:border-white transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Username
            </label>

            <input
              type="text"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
              placeholder="@yourusername"
              className="w-full rounded-2xl bg-[#1b1b1b] border border-gray-700 px-5 py-4 text-white placeholder:text-gray-500 outline-none focus:border-white transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              About you
              <span className="text-gray-500 font-normal ml-2">
                Optional
              </span>
            </label>

            <textarea
              value={bio}
              onChange={(e) =>
                setBio(e.target.value)
              }
              placeholder="Tell people a little about yourself..."
              rows={4}
              className="w-full rounded-2xl bg-[#1b1b1b] border border-gray-700 px-5 py-4 text-white placeholder:text-gray-500 outline-none focus:border-white transition resize-none"
            />
          </div>
        </div>
      </>
    );
  }

  // ============================================
  // STEP 2
  // ============================================

  function renderStepTwo() {
    return (
      <>
        <div className="mb-10">
          <p className="text-sm tracking-wide text-gray-400 uppercase mb-4">
            Step 2 of 3
          </p>

          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white">
            What do you play?
          </h1>

          <p className="text-lg text-gray-400 mt-4">
            Select your sports and tell us how good you are at each one.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-medium text-white mb-4">
            Choose your sports
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {SPORTS.map((sport) => {
              const selected =
                selectedSports.includes(
                  sport.name
                );

              return (
                <button
                  key={sport.name}
                  type="button"
                  onClick={() =>
                    toggleSport(sport.name)
                  }
                  className={`min-h-[70px] rounded-2xl border px-4 py-4 transition text-left ${
                    selected
                      ? "bg-white text-black border-white"
                      : "bg-[#1b1b1b] text-white border-gray-700 hover:border-gray-400"
                  }`}
                >
                  <div className="text-2xl mb-1">
                    {sport.emoji}
                  </div>

                  <div className="font-medium text-sm">
                    {sport.name}
                  </div>

                  {selected && (
                    <div className="text-xs mt-1 opacity-60">
                      Selected
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {selectedSports.length > 0 && (
          <div className="mt-10">
            <div className="mb-5">
              <h2 className="text-sm font-medium text-white">
                Your skill level
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Set your level separately for every sport.
              </p>
            </div>

            <div className="space-y-4">
              {selectedSports.map((sport) => {
                const sportInfo =
                  SPORTS.find(
                    (item) =>
                      item.name === sport
                  );

                const currentSkill =
                  sportSkills[sport] ||
                  "Beginner";

                return (
                  <div
                    key={sport}
                    className="rounded-2xl bg-[#1b1b1b] border border-gray-800 p-5"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">
                        {sportInfo?.emoji}
                      </span>

                      <span className="text-white font-medium">
                        {sport}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          "Beginner",
                          "Intermediate",
                          "Advanced",
                        ] as SkillLevel[]
                      ).map((skill) => {
                        const selected =
                          currentSkill === skill;

                        return (
                          <button
                            key={skill}
                            type="button"
                            onClick={() =>
                              setSportSkill(
                                sport,
                                skill
                              )
                            }
                            className={`min-h-[48px] rounded-xl text-sm font-medium border transition ${
                              selected
                                ? "bg-white text-black border-white"
                                : "bg-transparent text-gray-400 border-gray-700 hover:border-gray-500 hover:text-white"
                            }`}
                          >
                            {skill}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {selectedSports.length === 0 && (
          <p className="text-sm text-gray-500 mt-5">
            Select at least one sport to continue.
          </p>
        )}
      </>
    );
  }

  // ============================================
  // STEP 3
  // ============================================

  function renderStepThree() {
    return (
      <>
        <div className="mb-10">
          <p className="text-sm tracking-wide text-gray-400 uppercase mb-4">
            Step 3 of 3
          </p>

          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white">
            Your preferences
          </h1>

          <p className="text-lg text-gray-400 mt-4">
            We&apos;ll use these to personalize the games you see.
          </p>
        </div>

        {/* DAYS */}

        <div className="mb-10">
          <h2 className="text-sm font-medium text-white mb-4">
            When do you usually play?
          </h2>

          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => {
              const selected =
                selectedDays.includes(day);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() =>
                    toggleDay(day)
                  }
                  className={`rounded-full px-5 py-3 border text-sm transition ${
                    selected
                      ? "bg-white text-black border-white"
                      : "bg-[#1b1b1b] text-gray-300 border-gray-700 hover:border-gray-500"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* TIME */}

        <div className="mb-10">
          <h2 className="text-sm font-medium text-white mb-4">
            Preferred time
          </h2>

          <div className="flex flex-wrap gap-2">
            {TIMES.map((time) => {
              const selected =
                selectedTimes.includes(time);

              return (
                <button
                  key={time}
                  type="button"
                  onClick={() =>
                    toggleTime(time)
                  }
                  className={`rounded-full px-6 py-3 border text-sm transition ${
                    selected
                      ? "bg-white text-black border-white"
                      : "bg-[#1b1b1b] text-gray-300 border-gray-700 hover:border-gray-500"
                  }`}
                >
                  {time}
                </button>
              );
            })}
          </div>
        </div>

        {/* GAME TYPE */}

        <div className="mb-10">
          <h2 className="text-sm font-medium text-white mb-4">
            What kind of games do you prefer?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {GAME_TYPES.map((type) => {
              const selected =
                gameType === type;

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setGameType(type)
                  }
                  className={`rounded-2xl px-5 py-5 border text-left transition ${
                    selected
                      ? "bg-white text-black border-white"
                      : "bg-[#1b1b1b] text-gray-300 border-gray-700 hover:border-gray-500"
                  }`}
                >
                  <div className="font-medium">
                    {type}
                  </div>

                  <div
                    className={`text-xs mt-1 ${
                      selected
                        ? "text-gray-600"
                        : "text-gray-500"
                    }`}
                  >
                    {type === "Casual" &&
                      "Just play and have fun."}

                    {type === "Competitive" &&
                      "I want a serious game."}

                    {type === "Either" &&
                      "I'm happy with either."}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* TRAVEL DISTANCE */}

        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-white">
              How far are you willing to travel?
            </h2>

            <span className="text-sm text-gray-400">
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
                Number(e.target.value)
              )
            }
            className="w-full accent-white"
          />

          <div className="flex justify-between text-xs text-gray-500 mt-3">
            <span>1 km</span>
            <span>15 km</span>
            <span>30 km</span>
          </div>
        </div>

        {/* GAME COST */}

        <div>
          <h2 className="text-sm font-medium text-white mb-4">
            Game cost
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              "Free",
              "Under $5",
              "Under $10",
              "Any",
            ].map((cost) => {
              const selected =
                gameCost === cost;

              return (
                <button
                  key={cost}
                  type="button"
                  onClick={() =>
                    setGameCost(cost)
                  }
                  className={`rounded-xl px-4 py-3 border text-sm transition ${
                    selected
                      ? "bg-white text-black border-white"
                      : "bg-[#1b1b1b] text-gray-300 border-gray-700 hover:border-gray-500"
                  }`}
                >
                  {cost}
                </button>
              );
            })}
          </div>
        </div>
      </>
    );
  }

  // ============================================
  // MAIN UI
  // ============================================

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-4 py-8 md:px-8">
      <div className="max-w-5xl mx-auto">

        {/* LOGO */}

        <div className="mb-8">
          <div className="text-2xl font-semibold text-black">
            The Rally
          </div>

          <div className="text-sm text-gray-500 mt-1">
            Your profile
          </div>
        </div>

        {/* MAIN CARD */}

        <div className="bg-black rounded-[32px] overflow-hidden">

          {/* PROGRESS */}

          <div className="px-8 md:px-12 pt-8">
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((number) => (
                <div
                  key={number}
                  className={`h-1.5 rounded-full transition ${
                    number <= step
                      ? "bg-white"
                      : "bg-[#333333]"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* CONTENT */}

          <div className="px-8 md:px-12 py-10 md:py-14">
            <div className="max-w-4xl mx-auto">
              {step === 1 &&
                renderStepOne()}

              {step === 2 &&
                renderStepTwo()}

              {step === 3 &&
                renderStepThree()}
            </div>
          </div>

          {/* FOOTER */}

          <div className="border-t border-gray-800 px-8 md:px-12 py-6">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">

              {/* BACK */}

              <button
                type="button"
                onClick={previousStep}
                disabled={
                  step === 1 || saving
                }
                className={`px-5 py-3 rounded-full text-sm font-medium transition ${
                  step === 1
                    ? "text-gray-700 cursor-not-allowed"
                    : "text-white hover:bg-[#1b1b1b]"
                }`}
              >
                Back
              </button>

              {/* CONTINUE / FINISH */}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={
                    !canContinue()
                  }
                  className={`px-7 py-3 rounded-full text-sm font-medium transition ${
                    canContinue()
                      ? "bg-white text-black hover:bg-gray-200"
                      : "bg-gray-800 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={saving}
                  className="px-7 py-3 rounded-full bg-white text-black text-sm font-medium hover:bg-gray-200 transition disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : "Finish setup"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* FOOTNOTE */}

        <p className="text-center text-xs text-gray-400 mt-6">
          You can change these preferences later from your profile.
        </p>
      </div>
    </main>
  );
}