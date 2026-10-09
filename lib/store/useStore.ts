"use client";
import { useCallback, useEffect, useState } from "react";
import { store } from "./db";
import type { Workspace } from "./types";

/** Subscribes a component to the workspace. Re-renders whenever anything is saved. */
export function useWorkspace(): [Workspace, typeof store] {
  const [, bump] = useState(0);
  useEffect(() => store.subscribe(() => bump((n) => n + 1)), []);
  return [store.read(), store];
}

/** True once the browser has actually read storage, so the first paint does not flash empty. */
export function useHydrated(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready;
}

export function useProfile() {
  const [ws] = useWorkspace();
  const save = useCallback((p: Parameters<typeof store.saveProfile>[0]) => store.saveProfile(p), []);
  return { profile: ws.profile, saveProfile: save };
}
