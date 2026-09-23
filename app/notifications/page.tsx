"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/navbar";
import { createClient } from "@/lib/supabase/client";

type Notification = {
  id: number;
  user_id: string;
  type: string;
  title: string;
  message: string;
  game_id: number | null;
  actor_id: string | null;
  is_read: boolean;
  created_at: string;
};

function formatNotificationTime(
  createdAt: string
) {
  const date = new Date(createdAt);
  const now = new Date();

  const difference =
    now.getTime() - date.getTime();

  const minutes = Math.floor(
    difference / (1000 * 60)
  );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getNotificationIcon(type: string) {
  if (type === "game_joined") {
    return "👋";
  }

  if (type === "game_left") {
    return "🚪";
  }

  if (type === "game_cancelled") {
    return "⚠️";
  }

  if (type === "game_updated") {
    return "✏️";
  }

  if (type === "game_reminder") {
    return "⏰";
  }

  if (type === "review_reminder") {
    return "⭐";
  }

  return "🔔";
}

function getNotificationLabel(type: string) {
  if (type === "game_joined") {
    return "Game activity";
  }

  if (type === "game_left") {
    return "Game activity";
  }

  if (type === "game_cancelled") {
    return "Game update";
  }

  if (type === "game_updated") {
    return "Game update";
  }

  if (type === "game_reminder") {
    return "Reminder";
  }

  if (type === "review_reminder") {
    return "Review";
  }

  return "Notification";
}

export default function NotificationsPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [userId, setUserId] = useState<
    string | null
  >(null);

  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =========================================================
  // LOAD USER
  // =========================================================

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        window.location.href = "/auth/login";
        return;
      }

      setUserId(user.id);
    }

    loadUser();
  }, [supabase]);

  // =========================================================
  // LOAD NOTIFICATIONS
  // =========================================================

  async function loadNotifications() {
    if (!userId) return;

    setLoading(true);
    setError("");

    const { data, error: notificationsError } =
      await supabase
        .from("notifications")
        .select(
          `
            id,
            user_id,
            type,
            title,
            message,
            game_id,
            actor_id,
            is_read,
            created_at
          `
        )
        .eq("user_id", userId)
        .order("created_at", {
          ascending: false,
        });

    if (notificationsError) {
      console.error(
        "Notifications loading error:",
        notificationsError
      );

      setError(
        "We couldn't load your notifications."
      );

      setNotifications([]);
      setLoading(false);
      return;
    }

    setNotifications(
      (data || []) as Notification[]
    );

    setLoading(false);
  }

  useEffect(() => {
    if (!userId) return;

    loadNotifications();

    // =======================================================
    // REAL-TIME NOTIFICATIONS
    // =======================================================

    const channel = supabase
      .channel(
        `notifications-page-${userId}`
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification =
            payload.new as Notification;

          setNotifications((current) => [
            newNotification,
            ...current,
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  // =========================================================
  // MARK ONE AS READ
  // =========================================================

  async function markAsRead(
    notificationId: number
  ) {
    if (!userId) return;

    const notification =
      notifications.find(
        (item) =>
          item.id === notificationId
      );

    if (!notification || notification.is_read) {
      return;
    }

    const { error: updateError } =
      await supabase
        .from("notifications")
        .update({
          is_read: true,
        })
        .eq("id", notificationId)
        .eq("user_id", userId);

    if (updateError) {
      console.error(
        "Mark notification read error:",
        updateError
      );
      return;
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === notificationId
          ? {
              ...item,
              is_read: true,
            }
          : item
      )
    );
  }

  // =========================================================
  // MARK ALL AS READ
  // =========================================================

  async function markAllAsRead() {
    if (!userId) return;

    const unreadExists = notifications.some(
      (notification) => !notification.is_read
    );

    if (!unreadExists) return;

    const { error: updateError } =
      await supabase
        .from("notifications")
        .update({
          is_read: true,
        })
        .eq("user_id", userId)
        .eq("is_read", false);

    if (updateError) {
      console.error(
        "Mark all notifications read error:",
        updateError
      );
      return;
    }

    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        is_read: true,
      }))
    );
  }

  // =========================================================
  // COUNTS
  // =========================================================

  const unreadCount =
    notifications.filter(
      (notification) =>
        !notification.is_read
    ).length;

  // =========================================================
  // LOADING
  // =========================================================

  if (!userId || loading) {
    return (
      <main className="min-h-screen bg-[#f7f7f5] text-black">
        <Navbar />

        <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-6">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-black" />

            <p className="mt-4 text-sm text-gray-500">
              Loading notifications...
            </p>
          </div>
        </div>
      </main>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-black">
      <Navbar />

      <div className="mx-auto max-w-4xl px-5 pb-24 pt-10 md:px-8 md:pt-14">
        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <section className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-gray-400">
              The Rally
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Notifications
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-500 sm:text-base">
              Stay up to date with your games,
              players and important updates.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="inline-flex h-11 items-center justify-center rounded-full border border-gray-300 bg-white px-5 text-sm font-medium transition hover:border-black"
            >
              Mark all as read
            </button>
          )}
        </section>

        {/* ================================================= */}
        {/* ERROR */}
        {/* ================================================= */}

        {error && (
          <div className="mt-8 rounded-[22px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ================================================= */}
        {/* NOTIFICATION LIST */}
        {/* ================================================= */}

        <section className="mt-10">
          {notifications.length === 0 ? (
            <div className="rounded-[30px] border border-gray-200 bg-white px-6 py-16 text-center shadow-[0_20px_60px_rgba(0,0,0,0.03)]">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f3f3f1] text-3xl">
                🔔
              </div>

              <h2 className="mt-6 text-2xl font-semibold">
                You're all caught up
              </h2>

              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500">
                You don't have any notifications
                yet. When someone joins your game,
                leaves your game or updates a game,
                you'll see it here.
              </p>

              <Link
                href="/games"
                className="mt-7 inline-flex h-11 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Find a game →
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[30px] border border-gray-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.03)]">
              {notifications.map(
                (notification, index) => (
                  <div
                    key={notification.id}
                    className={`relative px-5 py-5 md:px-7 md:py-6 ${
                      index !==
                      notifications.length - 1
                        ? "border-b border-gray-100"
                        : ""
                    } ${
                      !notification.is_read
                        ? "bg-gray-50/70"
                        : "bg-white"
                    }`}
                  >
                    <div className="flex gap-4">
                      {/* ICON */}

                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl ${
                          notification.is_read
                            ? "bg-gray-100"
                            : "bg-black text-white"
                        }`}
                      >
                        {getNotificationIcon(
                          notification.type
                        )}
                      </div>

                      {/* CONTENT */}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h2
                                className={`text-sm md:text-base ${
                                  notification.is_read
                                    ? "font-medium text-gray-700"
                                    : "font-semibold text-black"
                                }`}
                              >
                                {
                                  notification.title
                                }
                              </h2>

                              {!notification.is_read && (
                                <span className="rounded-full bg-black px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-white">
                                  New
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-gray-400">
                              {getNotificationLabel(
                                notification.type
                              )}
                            </p>
                          </div>

                          <p className="shrink-0 text-xs text-gray-400">
                            {formatNotificationTime(
                              notification.created_at
                            )}
                          </p>
                        </div>

                        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
                          {
                            notification.message
                          }
                        </p>

                        {/* ACTIONS */}

                        <div className="mt-4 flex flex-wrap gap-2">
                          {!notification.is_read && (
                            <button
                              type="button"
                              onClick={() =>
                                markAsRead(
                                  notification.id
                                )
                              }
                              className="rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-600 transition hover:border-black hover:text-black"
                            >
                              Mark as read
                            </button>
                          )}

                          {notification.game_id && (
                            <Link
                              href={`/games/${notification.game_id}`}
                              onClick={() =>
                                markAsRead(
                                  notification.id
                                )
                              }
                              className="rounded-full bg-black px-4 py-2 text-xs font-medium text-white transition hover:bg-gray-800"
                            >
                              View game →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}