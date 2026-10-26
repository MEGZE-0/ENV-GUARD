"use client";

import { useEffect, useState } from "react";

/** Live local readout for the footer status block. */
export function LocalTime({ timeZone = "Europe/Berlin" }: { timeZone?: string }) {
  const [time, setTime] = useState<string>("--:--:--");

  useEffect(() => {
    const format = () =>
      new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone,
      }).format(new Date());

    setTime(format());
    const id = window.setInterval(() => setTime(format()), 1000);
    return () => window.clearInterval(id);
  }, [timeZone]);

  return (
    <span className="font-mono text-[10px] tabular text-bone/60" aria-label="Local time in Berlin">
      {time}
      <span className="ml-1.5 text-[8px] uppercase tracking-[0.16em] text-bone/25">CET</span>
    </span>
  );
}
