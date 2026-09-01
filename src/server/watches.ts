import "server-only";

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { id } from "@/lib/id";
import { isWatchSnapshot, type WatchSnapshot } from "@/lib/watch-snapshot";
import { createServerSupabase } from "@/lib/supabase/server";
import { watchUrl } from "@/server/app-url";

const LOCAL_FILE = join(process.cwd(), ".decision-watches.local.json");

type WatchRow = {
  token: string;
  writeKey: string;
  snapshot: WatchSnapshot;
  updatedAt: string;
};

type GlobalWatches = typeof globalThis & {
  __daWatches?: Map<string, WatchRow>;
};

function memory() {
  const g = globalThis as GlobalWatches;
  if (!g.__daWatches) g.__daWatches = new Map();
  return g.__daWatches;
}

function readLocal(): WatchRow[] {
  try {
    if (!existsSync(LOCAL_FILE)) return [];
    const raw = JSON.parse(readFileSync(LOCAL_FILE, "utf8")) as unknown;
    return Array.isArray(raw) ? (raw as WatchRow[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(rows: WatchRow[]) {
  try {
    writeFileSync(LOCAL_FILE, `${JSON.stringify(rows.slice(0, 40), null, 2)}\n`);
  } catch {
    /* optional local cache */
  }
}

function remember(row: WatchRow) {
  memory().set(row.token, row);
  writeLocal([row, ...readLocal().filter((item) => item.token !== row.token)]);
}

function lookup(token: string): WatchRow | null {
  return memory().get(token) ?? readLocal().find((row) => row.token === token) ?? null;
}

export async function createWatch(
  snapshot: WatchSnapshot,
  request?: Request,
): Promise<{ token: string; writeKey: string; url: string }> {
  const token = id("wch");
  const writeKey = id("wck");
  const updatedAt = new Date().toISOString();
  const row: WatchRow = { token, writeKey, snapshot, updatedAt };
  const supabase = createServerSupabase();
  if (supabase) {
    const { error } = await supabase.from("decision_watches").insert({
      token,
      write_key: writeKey,
      snapshot,
      updated_at: updatedAt,
    });
    if (!error) {
      remember(row);
      return { token, writeKey, url: watchUrl(token, request) };
    }
  }
  remember(row);
  return { token, writeKey, url: watchUrl(token, request) };
}

export async function updateWatch(
  token: string,
  writeKey: string,
  snapshot: WatchSnapshot,
): Promise<boolean> {
  const updatedAt = new Date().toISOString();
  const supabase = createServerSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("decision_watches")
      .update({ snapshot, updated_at: updatedAt })
      .eq("token", token)
      .eq("write_key", writeKey)
      .select("token")
      .maybeSingle();
    if (!error && data) {
      remember({ token, writeKey, snapshot, updatedAt });
      return true;
    }
  }

  const existing = lookup(token);
  if (!existing || existing.writeKey !== writeKey) return false;
  remember({ token, writeKey, snapshot, updatedAt });
  return true;
}

export async function readWatch(token: string): Promise<WatchSnapshot | null> {
  const supabase = createServerSupabase();
  if (supabase) {
    const { data } = await supabase
      .from("decision_watches")
      .select("snapshot")
      .eq("token", token)
      .maybeSingle();
    if (data && isWatchSnapshot(data.snapshot)) return data.snapshot;
  }
  const local = lookup(token);
  return local && isWatchSnapshot(local.snapshot) ? local.snapshot : null;
}
