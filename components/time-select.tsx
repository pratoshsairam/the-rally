"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

type TimeSelectProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
};

const hours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const minutes = Array.from({ length: 6 }, (_, index) => String(index * 10).padStart(2, "0"));
const itemHeight = 40;

export default function TimeSelect({ id, label, value, onChange }: TimeSelectProps) {
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState("00");
  const [minute, setMinute] = useState("00");
  const [extraMinute, setExtraMinute] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const hourWheelRef = useRef<HTMLDivElement>(null);
  const minuteWheelRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef({ hour: "00", minute: "00" });
  const initializingRef = useRef(false);
  const availableMinutes = useMemo(
    () => extraMinute && !minutes.includes(extraMinute)
      ? [...minutes, extraMinute].sort()
      : minutes,
    [extraMinute]
  );

  useLayoutEffect(() => {
    if (!open) return;
    initializingRef.current = true;
    if (hourWheelRef.current) {
      hourWheelRef.current.scrollTop = hours.indexOf(selectionRef.current.hour) / (hours.length - 1) * (hours.length - 4) * itemHeight;
    }
    if (minuteWheelRef.current) {
      minuteWheelRef.current.scrollTop = availableMinutes.indexOf(selectionRef.current.minute) / (availableMinutes.length - 1) * (availableMinutes.length - 4) * itemHeight;
    }
    const frame = requestAnimationFrame(() => { initializingRef.current = false; });
    return () => cancelAnimationFrame(frame);
  }, [open, availableMinutes]);

  useEffect(() => {
    if (!open) return;
    function handleOutsidePointer(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handleOutsidePointer);
    return () => document.removeEventListener("pointerdown", handleOutsidePointer);
  }, [open]);

  function select(part: "hour" | "minute", selected: string) {
    if (selectionRef.current[part] === selected) return;
    selectionRef.current = { ...selectionRef.current, [part]: selected };
    if (part === "hour") setHour(selected);
    else setMinute(selected);
    onChange(`${selectionRef.current.hour}:${selectionRef.current.minute}`);
  }

  function wheel(part: "hour" | "minute", options: string[], selected: string) {
    const wheelRef = part === "hour" ? hourWheelRef : minuteWheelRef;
    return (
      <div>
        <div className="relative">
          <div
            ref={wheelRef}
            role="group"
            aria-label={part === "hour" ? "Hour" : "Minute"}
            onScroll={(event) => {
              if (initializingRef.current) return;
              const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
              const index = Math.max(0, Math.min(options.length - 1, Math.round(scrollTop / (scrollHeight - clientHeight) * (options.length - 1))));
              select(part, options[index]);
            }}
            className="relative h-40 overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none" }}
          >
            {options.map((option, index) => (
              <button
                key={option}
                type="button"
                aria-label={`${option} ${part === "hour" ? "hours" : "minutes"}`}
                aria-pressed={selected === option}
                tabIndex={selected === option ? 0 : -1}
                onClick={() => {
                  wheelRef.current?.scrollTo({ top: index / (options.length - 1) * (options.length - 4) * itemHeight });
                  select(part, option);
                }}
                onKeyDown={(event) => {
                  const direction = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
                  if (!direction) return;
                  event.preventDefault();
                  const next = Math.max(0, Math.min(options.length - 1, index + direction));
                  wheelRef.current?.scrollTo({ top: next / (options.length - 1) * (options.length - 4) * itemHeight });
                  select(part, options[next]);
                  wheelRef.current?.querySelectorAll("button")[next]?.focus();
                }}
                className={`block h-10 w-full text-sm outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black ${selected === option ? "bg-slate-100 font-semibold text-black" : "text-slate-500"}`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative min-w-0">
      <label htmlFor={id} className="mb-3 block text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
        {label}
      </label>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? `${id}-picker` : undefined}
        onClick={() => {
          if (!open) {
            const [savedHour, savedMinute] = value.split(":");
            const nextHour = hours.includes(savedHour) ? savedHour : "00";
            const nextMinute = /^\d{2}$/.test(savedMinute) && Number(savedMinute) < 60 ? savedMinute : "00";
            selectionRef.current = { hour: nextHour, minute: nextMinute };
            setHour(nextHour);
            setMinute(nextMinute);
            setExtraMinute(nextMinute);
          }
          setOpen((current) => !current);
        }}
        className={`h-14 w-full rounded-2xl border border-slate-200 bg-[#fafafa] px-4 text-left text-sm outline-none transition focus:border-black focus:bg-white ${value ? "text-black" : "text-slate-400"}`}
      >
        {value || "Choose a time"}
      </button>
      {open && (
        <div
          id={`${id}-picker`}
          role="dialog"
          aria-label={`${label} picker`}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              triggerRef.current?.focus();
            }
          }}
          className="absolute right-0 top-full z-30 mt-2 w-48 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg sm:left-0 sm:right-auto"
        >
          <div className="grid grid-cols-2 gap-0">
            {wheel("hour", hours, hour)}
            {wheel("minute", availableMinutes, minute)}
          </div>
        </div>
      )}
    </div>
  );
}
