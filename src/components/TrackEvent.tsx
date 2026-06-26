"use client";

import { useEffect, useRef } from "react";
import { track, type EventType, type TrackPayload } from "@/src/lib/analytics";

// Fires a single analytics event when mounted. Lets server components (which
// can't call client-side track()) record a page-level event by dropping this in.
// Renders nothing.
export default function TrackEvent({
  event,
  payload,
}: {
  event: EventType;
  payload?: TrackPayload;
}) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return; // guard React StrictMode double-mount in dev
    fired.current = true;
    track(event, payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
