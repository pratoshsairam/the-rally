"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type UserSafetyMenuProps = {
  targetUserId: string;
  targetName?: string | null;
  compact?: boolean;
  onActionComplete?: () => void;
};

type SafetyAction =
  | "block"
  | "unblock"
  | "report"
  | null;

const REPORT_REASONS = [
  "Harassment or bullying",
  "Spam or unwanted messages",
  "Inappropriate behaviour",
  "Fake or misleading profile",
  "Unsafe behaviour",
  "Other",
];

export default function UserSafetyMenu({
  targetUserId,
  targetName,
  compact = false,
  onActionComplete,
}: UserSafetyMenuProps) {
  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  const [isBlocked, setIsBlocked] =
    useState(false);

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [modal, setModal] =
    useState<SafetyAction>(null);

  const [reportReason, setReportReason] =
    useState("");

  const [reportDescription, setReportDescription] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadSafetyState();
  }, [targetUserId]);

  async function loadSafetyState() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setCurrentUserId(null);
        return;
      }

      setCurrentUserId(user.id);

      if (!targetUserId) {
        return;
      }

      if (user.id === targetUserId) {
        return;
      }

      /*
       * The live database uses:
       * blocker_id
       * blocked_user_id
       */
      const {
        data,
        error: blockError,
      } = await supabase
        .from("user_blocks")
        .select("id")
        .eq("blocker_id", user.id)
        .eq("blocked_user_id", targetUserId)
        .maybeSingle();

      if (blockError) {
        console.error(
          "Could not load block status:",
          blockError,
        );

        return;
      }

      setIsBlocked(!!data);
    } catch (loadError) {
      console.error(
        "Could not load safety state:",
        loadError,
      );
    }
  }

  function openModal(action: SafetyAction) {
    setError("");
    setMessage("");
    setMenuOpen(false);
    setModal(action);
  }

  function closeModal() {
    if (loading) {
      return;
    }

    setModal(null);
    setReportReason("");
    setReportDescription("");
    setError("");
  }

  async function handleBlock() {
    if (!currentUserId) {
      setError("You must be logged in.");
      return;
    }

    if (!targetUserId) {
      setError("Unable to identify this user.");
      return;
    }

    if (currentUserId === targetUserId) {
      setError("You cannot block yourself.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      /*
       * The live database uses:
       * blocker_id
       * blocked_user_id
       */
      const {
        error: blockError,
      } = await supabase
        .from("user_blocks")
        .insert({
          blocker_id: currentUserId,
          blocked_user_id: targetUserId,
        });

      if (blockError) {
        if (blockError.code === "23505") {
          setIsBlocked(true);
          setModal(null);

          setMessage(
            `${targetName || "This user"} is already blocked.`,
          );

          onActionComplete?.();

          return;
        }

        console.error(
          "Could not block user:",
          blockError,
        );

        setError(
          blockError.message ||
            "We couldn't block this user.",
        );

        return;
      }

      setIsBlocked(true);

      setModal(null);
      setReportReason("");
      setReportDescription("");

      setMessage(
        `${targetName || "This user"} has been blocked.`,
      );

      onActionComplete?.();
    } catch (blockError) {
      console.error(
        "Could not block user:",
        blockError,
      );

      setError(
        "Something went wrong while blocking this user.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleUnblock() {
    if (!currentUserId) {
      setError("You must be logged in.");
      return;
    }

    if (!targetUserId) {
      setError("Unable to identify this user.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const {
        error: unblockError,
      } = await supabase
        .from("user_blocks")
        .delete()
        .eq("blocker_id", currentUserId)
        .eq("blocked_user_id", targetUserId);

      if (unblockError) {
        console.error(
          "Could not unblock user:",
          unblockError,
        );

        setError(
          unblockError.message ||
            "We couldn't unblock this user.",
        );

        return;
      }

      setIsBlocked(false);

      setMessage(
        `${targetName || "This user"} has been unblocked.`,
      );

      setMenuOpen(false);

      onActionComplete?.();
    } catch (unblockError) {
      console.error(
        "Could not unblock user:",
        unblockError,
      );

      setError(
        "Something went wrong while unblocking this user.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleReport() {
    if (!currentUserId) {
      setError("You must be logged in.");
      return;
    }

    if (!targetUserId) {
      setError("Unable to identify this user.");
      return;
    }

    if (currentUserId === targetUserId) {
      setError("You cannot report yourself.");
      return;
    }

    if (!reportReason) {
      setError(
        "Please select a reason for the report.",
      );
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      /*
       * The live database uses:
       *
       * reporter_id
       * reported_user_id
       * reason
       * description
       * status
       *
       * IMPORTANT:
       * status must be "open".
       */
      const {
        error: reportError,
      } = await supabase
        .from("user_reports")
        .insert({
          reporter_id: currentUserId,
          reported_user_id: targetUserId,
          reason: reportReason,
          description:
            reportDescription.trim() || null,
          status: "open",
        });

      if (reportError) {
        console.error(
          "Could not submit report:",
          reportError,
        );

        setError(
          reportError.message ||
            "We couldn't submit the report.",
        );

        return;
      }

      setMessage(
        "Thanks. Your report has been submitted.",
      );

      setModal(null);
      setReportReason("");
      setReportDescription("");

      onActionComplete?.();
    } catch (reportError) {
      console.error(
        "Could not submit report:",
        reportError,
      );

      setError(
        "Something went wrong while submitting the report.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (
    !currentUserId ||
    currentUserId === targetUserId
  ) {
    return null;
  }

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() =>
            setMenuOpen((open) => !open)
          }
          className={
            compact
              ? "flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-black"
              : "rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-black"
          }
          aria-label="Safety options"
          aria-expanded={menuOpen}
        >
          {compact ? "⋯" : "Safety"}
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() =>
                setMenuOpen(false)
              }
            />

            <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-black/10 bg-white p-1.5 shadow-xl">
              {isBlocked ? (
                <button
                  type="button"
                  onClick={handleUnblock}
                  disabled={loading}
                  className="flex w-full items-center rounded-xl px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {loading
                    ? "Unblocking..."
                    : "🔓 Unblock user"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    openModal("block")
                  }
                  className="flex w-full items-center rounded-xl px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  🚫 Block user
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  openModal("report")
                }
                className="flex w-full items-center rounded-xl px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50"
              >
                ⚠️ Report user
              </button>
            </div>
          </>
        )}
      </div>

      {message && (
        <div className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-full bg-black px-5 py-3 text-sm font-medium text-white shadow-xl">
          {message}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 px-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">

            {modal === "block" && (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-xl">
                  🚫
                </div>

                <h2 className="mt-5 text-2xl font-semibold tracking-tight">
                  Block user?
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  You are about to block{" "}
                  <span className="font-semibold text-slate-800">
                    {targetName ||
                      "this user"}
                  </span>
                  .
                </p>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  They will not be able to
                  join games with you, and
                  you will not be able to join
                  games with them.
                </p>

                <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3">
                  <p className="text-xs leading-5 text-amber-800">
                    Blocking is a personal
                    safety setting. You can
                    unblock this user later.
                  </p>
                </div>

                {error && (
                  <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="mt-7 flex gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={loading}
                    className="flex-1 rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-medium transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleBlock}
                    disabled={loading}
                    className="flex-1 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                  >
                    {loading
                      ? "Blocking..."
                      : "Block user"}
                  </button>
                </div>
              </>
            )}

            {modal === "report" && (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-xl">
                  ⚠️
                </div>

                <h2 className="mt-5 text-2xl font-semibold tracking-tight">
                  Report user
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Tell us what happened.
                  Reports are reviewed to
                  help keep The Rally safe.
                </p>

                <div className="mt-6">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Reason
                  </label>

                  <select
                    value={reportReason}
                    onChange={(event) =>
                      setReportReason(
                        event.target.value,
                      )
                    }
                    className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-white px-4 text-sm outline-none transition focus:border-black"
                  >
                    <option value="">
                      Select a reason
                    </option>

                    {REPORT_REASONS.map(
                      (reason) => (
                        <option
                          key={reason}
                          value={reason}
                        >
                          {reason}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div className="mt-5">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Additional details
                  </label>

                  <textarea
                    value={reportDescription}
                    onChange={(event) =>
                      setReportDescription(
                        event.target.value.slice(
                          0,
                          1000,
                        ),
                      )
                    }
                    placeholder="Optional details..."
                    rows={4}
                    className="mt-2 w-full resize-none rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black"
                  />

                  <p className="mt-1 text-right text-xs text-slate-400">
                    {reportDescription.length} / 1000
                  </p>
                </div>

                {error && (
                  <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={loading}
                    className="flex-1 rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-medium transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleReport}
                    disabled={
                      loading ||
                      !reportReason
                    }
                    className="flex-1 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-50"
                  >
                    {loading
                      ? "Submitting..."
                      : "Submit report"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}