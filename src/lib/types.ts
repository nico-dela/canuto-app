import type { CodeKindId, CostTypeId, EventTypeId } from "./constants";

export type Visibility = "public" | "private";
export type EventStatus = "pending" | "approved" | "rejected";
export type EventSource = "organizer" | "scrape";
export type UserRole = "user" | "admin";
export type RsvpStatus = "going" | "maybe" | "cancelled";

export type Profile = {
  id: string;
  display_name: string | null;
  role: UserRole;
  email?: string;
};

export type CanutoEvent = {
  id: string;
  title: string;
  description: string | null;
  event_type: EventTypeId;
  starts_at: string;
  ends_at: string | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  cost_type: CostTypeId;
  price: number | null;
  visibility: Visibility;
  status: EventStatus;
  source: EventSource;
  source_url: string | null;
  source_name: string | null;
  /** Image, GIF, video file, YouTube o Vimeo */
  cover_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type EventAccessCode = {
  id: string;
  event_id: string;
  code: string;
  kind: CodeKindId;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
};

export type Rsvp = {
  user_id: string;
  event_id: string;
  status: RsvpStatus;
  created_at: string;
};

export type EventFilters = {
  types?: EventTypeId[];
  cost?: CostTypeId[];
  when?: "now" | "today" | "weekend" | "all" | "day" | "month";
  /** YYYY-MM-DD when when=day */
  date?: string;
  /** YYYY-MM when when=month */
  month?: string;
  query?: string;
};

export type CreateEventInput = {
  title: string;
  description?: string;
  event_type: EventTypeId;
  starts_at: string;
  ends_at?: string;
  lat?: number;
  lng?: number;
  address?: string;
  cost_type: CostTypeId;
  price?: number;
  /** Link a Passline, Altopocket, etc. (se guarda en source_url) */
  ticket_url?: string;
  /** Imagen, GIF, video o link de YouTube/Vimeo */
  cover_url?: string;
  visibility: Visibility;
  codes?: Array<{
    kind: CodeKindId;
    code?: string;
    max_uses?: number;
  }>;
};
