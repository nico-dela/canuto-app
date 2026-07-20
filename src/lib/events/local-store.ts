import { randomUUID } from "crypto";
import { SEED_EVENTS } from "./seed";
import type {
  CanutoEvent,
  CreateEventInput,
  EventAccessCode,
  Profile,
  Rsvp,
} from "../types";

type LocalDb = {
  events: CanutoEvent[];
  codes: EventAccessCode[];
  unlocks: Array<{ user_id: string; event_id: string; unlocked_at: string }>;
  rsvps: Rsvp[];
  profiles: Profile[];
  sessions: Map<string, string>; // token -> userId
};

declare global {
  // eslint-disable-next-line no-var
  var __canutoDb: LocalDb | undefined;
}

function db(): LocalDb {
  if (!globalThis.__canutoDb) {
    globalThis.__canutoDb = {
      events: structuredClone(SEED_EVENTS),
      codes: [
        {
          id: "code-seed-private",
          event_id: "will-set",
          code: "AMIGOS26",
          kind: "permanent",
          max_uses: null,
          uses_count: 0,
          expires_at: null,
        },
      ],
      unlocks: [],
      rsvps: [],
      profiles: [
        {
          id: "local-admin",
          display_name: "Admin Canuto",
          role: "admin",
          email: "admin@canuto.local",
        },
      ],
      sessions: new Map(),
    };

    // Demo private event
    const privateEvent: CanutoEvent = {
      id: "seed-private-1",
      title: "Asado de amigos — patio Güemes",
      description: "Evento privado de demo. Código: AMIGOS26",
      event_type: "gastronomico",
      starts_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      ends_at: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString(),
      lat: -31.425,
      lng: -64.19,
      address: "Barrio Güemes (ubicación exacta al desbloquear)",
      cost_type: "gratis",
      price: null,
      visibility: "private",
      status: "approved",
      source: "organizer",
      source_url: null,
      source_name: null,
      created_by: "local-admin",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    globalThis.__canutoDb.events.push(privateEvent);
    globalThis.__canutoDb.codes[0].event_id = privateEvent.id;
  }
  return globalThis.__canutoDb;
}

function randomCode(len = 8) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export const localStore = {
  listPublicEvents(): CanutoEvent[] {
    return db()
      .events.filter((e) => e.visibility === "public" && e.status === "approved")
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  },

  getEvent(id: string, userId?: string | null): CanutoEvent | null {
    const event = db().events.find((e) => e.id === id);
    if (!event) return null;
    if (event.visibility === "public" && event.status === "approved") return event;
    if (event.created_by && event.created_by === userId) return event;
    if (userId && db().unlocks.some((u) => u.user_id === userId && u.event_id === id)) {
      return event;
    }
    const profile = userId ? db().profiles.find((p) => p.id === userId) : null;
    if (profile?.role === "admin") return event;
    return null;
  },

  listPending(): CanutoEvent[] {
    return db().events.filter((e) => e.visibility === "public" && e.status === "pending");
  },

  createEvent(input: CreateEventInput, userId: string): { event: CanutoEvent; codes: EventAccessCode[] } {
    const now = new Date().toISOString();
    const isPrivate = input.visibility === "private";
    const event: CanutoEvent = {
      id: randomUUID(),
      title: input.title,
      description: input.description ?? null,
      event_type: input.event_type,
      starts_at: input.starts_at,
      ends_at: input.ends_at ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      address: input.address ?? null,
      cost_type: input.cost_type,
      price: input.price ?? null,
      visibility: input.visibility,
      status: isPrivate ? "approved" : "pending",
      source: "organizer",
      source_url: null,
      source_name: null,
      created_by: userId,
      created_at: now,
      updated_at: now,
    };
    db().events.push(event);

    const codes: EventAccessCode[] = [];
    if (isPrivate) {
      const specs = input.codes?.length
        ? input.codes
        : [{ kind: "permanent" as const }];
      for (const spec of specs) {
        const code: EventAccessCode = {
          id: randomUUID(),
          event_id: event.id,
          code: (spec.code ?? randomCode()).toUpperCase(),
          kind: spec.kind,
          max_uses: spec.kind === "group" ? (spec.max_uses ?? 10) : null,
          uses_count: 0,
          expires_at: null,
        };
        db().codes.push(code);
        codes.push(code);
      }
    }
    return { event, codes };
  },

  upsertScraped(events: Omit<CanutoEvent, "id" | "created_at" | "updated_at" | "created_by">[]): number {
    let count = 0;
    const now = new Date().toISOString();
    for (const raw of events) {
      if (!raw.source_url) continue;
      const existing = db().events.find((e) => e.source_url === raw.source_url);
      if (existing) {
        Object.assign(existing, raw, { updated_at: now });
      } else {
        db().events.push({
          ...raw,
          id: randomUUID(),
          created_by: null,
          created_at: now,
          updated_at: now,
        });
      }
      count += 1;
    }
    return count;
  },

  setStatus(id: string, status: CanutoEvent["status"]) {
    const event = db().events.find((e) => e.id === id);
    if (!event) return null;
    event.status = status;
    event.updated_at = new Date().toISOString();
    return event;
  },

  redeemCode(code: string, userId: string): string {
    const row = db().codes.find((c) => c.code.toUpperCase() === code.trim().toUpperCase());
    if (!row) throw new Error("Código inválido");
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      throw new Error("Código expirado");
    }
    if (row.kind === "one_time" && row.uses_count >= 1) {
      throw new Error("Código ya utilizado");
    }
    if (row.kind === "group" && row.max_uses != null && row.uses_count >= row.max_uses) {
      throw new Error("Límite de usos alcanzado");
    }
    const event = db().events.find((e) => e.id === row.event_id);
    if (!event || event.visibility !== "private") throw new Error("Evento no disponible");

    if (!db().unlocks.some((u) => u.user_id === userId && u.event_id === row.event_id)) {
      db().unlocks.push({
        user_id: userId,
        event_id: row.event_id,
        unlocked_at: new Date().toISOString(),
      });
    }
    row.uses_count += 1;
    return row.event_id;
  },

  setRsvp(userId: string, eventId: string, status: Rsvp["status"]) {
    const existing = db().rsvps.find((r) => r.user_id === userId && r.event_id === eventId);
    if (existing) {
      existing.status = status;
      return existing;
    }
    const rsvp: Rsvp = {
      user_id: userId,
      event_id: eventId,
      status,
      created_at: new Date().toISOString(),
    };
    db().rsvps.push(rsvp);
    return rsvp;
  },

  listMyEvents(userId: string) {
    const created = db().events.filter((e) => e.created_by === userId);
    const unlockedIds = new Set(
      db().unlocks.filter((u) => u.user_id === userId).map((u) => u.event_id),
    );
    const unlocked = db().events.filter((e) => unlockedIds.has(e.id));
    const rsvpIds = new Set(
      db().rsvps.filter((r) => r.user_id === userId && r.status === "going").map((r) => r.event_id),
    );
    const going = db().events.filter((e) => rsvpIds.has(e.id));
    return { created, unlocked, going };
  },

  getCodesForEvent(eventId: string, userId: string) {
    const event = db().events.find((e) => e.id === eventId);
    const profile = db().profiles.find((p) => p.id === userId);
    if (!event) return [];
    if (event.created_by !== userId && profile?.role !== "admin") return [];
    return db().codes.filter((c) => c.event_id === eventId);
  },

  // Auth helpers for local mode
  register(email: string, password: string, displayName: string): { token: string; profile: Profile } {
    void password;
    let profile = db().profiles.find((p) => p.email === email);
    if (!profile) {
      profile = {
        id: randomUUID(),
        display_name: displayName || email.split("@")[0],
        role: email === "admin@canuto.local" ? "admin" : "user",
        email,
      };
      db().profiles.push(profile);
    }
    const token = randomUUID();
    db().sessions.set(token, profile.id);
    return { token, profile };
  },

  login(email: string, password: string): { token: string; profile: Profile } {
    void password;
    let profile = db().profiles.find((p) => p.email === email);
    if (!profile) {
      return this.register(email, password, email.split("@")[0]);
    }
    const token = randomUUID();
    db().sessions.set(token, profile.id);
    return { token, profile };
  },

  sessionUser(token?: string | null): Profile | null {
    if (!token) return null;
    const userId = db().sessions.get(token);
    if (!userId) return null;
    return db().profiles.find((p) => p.id === userId) ?? null;
  },

  getProfile(userId: string) {
    return db().profiles.find((p) => p.id === userId) ?? null;
  },
};
