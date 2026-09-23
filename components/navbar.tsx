"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Notification = {
  id: number;
  type: string;
  title: string;
  message: string;
  game_id: number | null;
  actor_id: string | null;
  is_read: boolean;
  created_at: string;
};

export default function Navbar() {
  const supabase = useMemo(() => createClient(), []);

  const [pathname, setPathname] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("UoA Student");

  const [notifications, setNotifications] = useState<Notification[]>(
    []
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] =
    useState(false);
  const [loadingNotifications, setLoadingNotifications] =
    useState(false);

  // =========================================================
  // CURRENT PATH
  // =========================================================

  useEffect(() => {
    setPathname(window.location.pathname);
  }, []);

  // =========================================================
  // LOAD USER
  // =========================================================

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        setUserId(null);
        return;
      }

      setUserId(user.id);

      const metadataName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        "";

      if (metadataName) {
        setDisplayName(metadataName);
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (!mounted) return;

      if (profile?.full_name) {
        setDisplayName(profile.full_name);
      }
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  // =========================================================
  // LOAD NOTIFICATIONS
  // =========================================================

  async function loadNotifications() {
    if (!userId) return;

    setLoadingNotifications(true);

    const { data, error } = await supabase
      .from("notifications")
      .select(
        `
          id,
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
      })
      .limit(20);

    if (error) {
      console.error("Notifications error:", error);
      setNotifications([]);
      setUnreadCount(0);
      setLoadingNotifications(false);
      return;
    }

    const notificationRows = (data || []) as Notification[];

    setNotifications(notificationRows);

    setUnreadCount(
      notificationRows.filter(
        (notification) => !notification.is_read
      ).length
    );

    setLoadingNotifications(false);
  }

  useEffect(() => {
    if (!userId) return;

    loadNotifications();

    const channel = supabase
      .channel(`notifications-${userId}`)
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

          setUnreadCount((current) => current + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  // =========================================================
  // MARK ONE NOTIFICATION AS READ
  // =========================================================

  async function markAsRead(notificationId: number) {
    if (!userId) return;

    const notification = notifications.find(
      (item) => item.id === notificationId
    );

    if (!notification || notification.is_read) {
      return;
    }

    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
      })
      .eq("id", notificationId)
      .eq("user_id", userId);

    if (error) {
      console.error(
        "Mark notification as read error:",
        error
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

    setUnreadCount((current) =>
      Math.max(0, current - 1)
    );
  }

  // =========================================================
  // MARK ALL AS READ
  // =========================================================

  async function markAllAsRead() {
    if (!userId || unreadCount === 0) return;

    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
      })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      console.error(
        "Mark all notifications as read error:",
        error
      );
      return;
    }

    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        is_read: true,
      }))
    );

    setUnreadCount(0);
  }

  // =========================================================
  // SIGN OUT
  // =========================================================

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }

  // =========================================================
  // HELPERS
  // =========================================================

  const firstLetter =
    displayName.trim().charAt(0).toUpperCase() || "U";

  function isActive(path: string) {
    if (!pathname) return false;

    if (path === "/dashboard") {
      return pathname === "/dashboard";
    }

    if (path === "/games") {
      return pathname === "/games" ||
        pathname.startsWith("/games/")
        ? true
        : false;
    }

    if (path === "/create-game") {
      return pathname.startsWith("/create-game");
    }

    if (path === "/profile") {
      return pathname.startsWith("/profile");
    }

    return false;
  }

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

  // =========================================================
  // NAVIGATION
  // =========================================================

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-20 max-w-[1400px] items-center justify-between px-5 md:px-10">
        {/* LOGO */}

        <Link
          href="/dashboard"
          className="text-xl font-semibold tracking-tight md:text-2xl"
        >
          The Rally
        </Link>

        {/* DESKTOP NAV */}

        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/dashboard"
            className={`text-sm transition ${
              isActive("/dashboard")
                ? "font-medium text-black"
                : "text-gray-500 hover:text-black"
            }`}
          >
            Dashboard
          </Link>

          <Link
            href="/games"
            className={`text-sm transition ${
              isActive("/games")
                ? "font-medium text-black"
                : "text-gray-500 hover:text-black"
            }`}
          >
            Find Games
          </Link>

          <Link
            href="/create-game"
            className={`text-sm transition ${
              isActive("/create-game")
                ? "font-medium text-black"
                : "text-gray-500 hover:text-black"
            }`}
          >
            Create Game
          </Link>
        </nav>

        {/* RIGHT SIDE */}

        <div className="flex items-center gap-3">
          {/* ================================================= */}
          {/* NOTIFICATION BELL */}
          {/* ================================================= */}

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowNotifications(
                  (current) => !current
                );

                if (!showNotifications) {
                  loadNotifications();
                }
              }}
              className="relative flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition hover:border-black hover:text-black"
              aria-label="Notifications"
              title="Notifications"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 21h4"
                  strokeLinecap="round"
                />
              </svg>

              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex min-h-[19px] min-w-[19px] items-center justify-center rounded-full bg-black px-1 text-[10px] font-semibold text-white">
                  {unreadCount > 99
                    ? "99+"
                    : unreadCount}
                </span>
              )}
            </button>

            {/* ================================================= */}
            {/* NOTIFICATION DROPDOWN */}
            {/* ================================================= */}

            {showNotifications && (
              <>
                <button
                  type="button"
                  aria-label="Close notifications"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() =>
                    setShowNotifications(false)
                  }
                />

                <div className="absolute right-0 z-50 mt-3 w-[360px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                  {/* HEADER */}

                  <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                    <div>
                      <h3 className="text-base font-semibold text-black">
                        Notifications
                      </h3>

                      {unreadCount > 0 && (
                        <p className="mt-1 text-xs text-gray-500">
                          {unreadCount} unread
                        </p>
                      )}
                    </div>

                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllAsRead}
                        className="text-xs font-medium text-gray-500 transition hover:text-black"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* CONTENT */}

                  <div className="max-h-[420px] overflow-y-auto">
                    {loadingNotifications ? (
                      <div className="px-5 py-10 text-center">
                        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-black" />

                        <p className="mt-3 text-sm text-gray-500">
                          Loading notifications...
                        </p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="px-5 py-12 text-center">
                        <div className="text-3xl">
                          🔔
                        </div>

                        <p className="mt-3 text-sm font-medium text-black">
                          You're all caught up
                        </p>

                        <p className="mt-1 text-xs leading-5 text-gray-500">
                          New game activity and updates
                          will appear here.
                        </p>
                      </div>
                    ) : (
                      <div>
                        {notifications.map(
                          (notification) => (
                            <button
                              key={notification.id}
                              type="button"
                              onClick={() => {
                                markAsRead(
                                  notification.id
                                );

                                if (
                                  notification.game_id
                                ) {
                                  setShowNotifications(
                                    false
                                  );

                                  window.location.href = `/games/${notification.game_id}`;
                                }
                              }}
                              className={`flex w-full gap-3 border-b border-gray-100 px-5 py-4 text-left transition hover:bg-gray-50 ${
                                !notification.is_read
                                  ? "bg-gray-50"
                                  : "bg-white"
                              }`}
                            >
                              {/* ICON */}

                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f3f3f1] text-lg">
                                {getNotificationIcon(
                                  notification.type
                                )}
                              </div>

                              {/* TEXT */}

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p
                                    className={`text-sm ${
                                      notification.is_read
                                        ? "font-medium text-gray-700"
                                        : "font-semibold text-black"
                                    }`}
                                  >
                                    {
                                      notification.title
                                    }
                                  </p>

                                  {!notification.is_read && (
                                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-black" />
                                  )}
                                </div>

                                <p className="mt-1 text-xs leading-5 text-gray-500">
                                  {
                                    notification.message
                                  }
                                </p>

                                <p className="mt-2 text-[11px] text-gray-400">
                                  {formatNotificationTime(
                                    notification.created_at
                                  )}
                                </p>
                              </div>
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {/* FOOTER */}

                  {notifications.length > 0 && (
                    <div className="border-t border-gray-100 px-5 py-3">
                      <Link
                        href="/notifications"
                        onClick={() =>
                          setShowNotifications(false)
                        }
                        className="block text-center text-xs font-medium text-gray-500 transition hover:text-black"
                      >
                        View all notifications →
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ================================================= */}
          {/* PROFILE */}
          {/* ================================================= */}

          <Link
            href="/profile"
            className={`flex h-11 w-11 items-center justify-center rounded-full bg-black text-sm font-medium text-white transition hover:bg-gray-800 ${
              isActive("/profile")
                ? "ring-2 ring-black ring-offset-2"
                : ""
            }`}
            title="Profile"
          >
            {firstLetter}
          </Link>

          {/* ================================================= */}
          {/* SIGN OUT */}
          {/* ================================================= */}

          <button
            type="button"
            onClick={handleSignOut}
            className="hidden rounded-full border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 transition hover:border-black hover:text-black sm:block"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* ===================================================== */}
      {/* MOBILE NAVIGATION */}
      {/* ===================================================== */}

      <div className="border-t border-gray-100 bg-white px-4 py-3 md:hidden">
        <div className="flex items-center justify-center gap-6">
          <Link
            href="/dashboard"
            className={`text-xs ${
              isActive("/dashboard")
                ? "font-semibold text-black"
                : "text-gray-500"
            }`}
          >
            Dashboard
          </Link>

          <Link
            href="/games"
            className={`text-xs ${
              isActive("/games")
                ? "font-semibold text-black"
                : "text-gray-500"
            }`}
          >
            Find Games
          </Link>

          <Link
            href="/create-game"
            className={`text-xs ${
              isActive("/create-game")
                ? "font-semibold text-black"
                : "text-gray-500"
            }`}
          >
            Create
          </Link>

          <Link
            href="/profile"
            className={`text-xs ${
              isActive("/profile")
                ? "font-semibold text-black"
                : "text-gray-500"
            }`}
          >
            Profile
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            className="text-xs text-gray-500"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}