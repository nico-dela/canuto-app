import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth";
import { localStore } from "@/lib/events/local-store";
import { filterEvents } from "@/lib/events/filters";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { CostTypeId, EventTypeId } from "@/lib/constants";
import type { EventFilters } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filters: EventFilters = {
    when: (searchParams.get("when") as EventFilters["when"]) || "all",
    date: searchParams.get("date") || undefined,
    month: searchParams.get("month") || undefined,
    query: searchParams.get("q") || undefined,
    types: searchParams.get("types")?.split(",").filter(Boolean) as EventTypeId[] | undefined,
    cost: searchParams.get("cost")?.split(",").filter(Boolean) as CostTypeId[] | undefined,
  };

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("visibility", "public")
      .eq("status", "approved")
      .order("starts_at", { ascending: true });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ events: filterEvents(data ?? [], filters), mode: "supabase" });
  }

  const events = filterEvents(localStore.listPublicEvents(), filters);
  return NextResponse.json({ events, mode: "local" });
}

const schema = z
  .object({
    title: z.string().min(3),
    description: z.string().optional(),
    event_type: z.enum([
      "musica",
      "teatro",
      "cine",
      "fiesta",
      "deporte",
      "gastronomico",
      "feria",
      "exposicion",
      "infantil",
      "otro",
    ]),
    starts_at: z.string(),
    ends_at: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    address: z.string().optional(),
    cost_type: z.enum(["gratis", "a_la_gorra", "pago"]),
    price: z.number().optional(),
    ticket_url: z.string().optional(),
    visibility: z.enum(["public", "private"]),
    codes: z
      .array(
        z.object({
          kind: z.enum(["one_time", "group", "permanent"]),
          code: z.string().optional(),
          max_uses: z.number().optional(),
        }),
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.cost_type !== "pago") return;
    const url = data.ticket_url?.trim();
    if (!url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Los eventos pagos necesitan un link de compra",
        path: ["ticket_url"],
      });
      return;
    }
    try {
      new URL(url);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El link de compra no es válido",
        path: ["ticket_url"],
      });
    }
  });

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Tenés que iniciar sesión" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;
  const ticketUrl = input.ticket_url?.trim() || null;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const isPrivate = input.visibility === "private";
    const { data: event, error } = await supabase
      .from("events")
      .insert({
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
        source_url: ticketUrl,
        source_name: ticketUrl ? "Entradas" : null,
        created_by: profile.id,
      })
      .select("*")
      .single();

    if (error || !event) {
      return NextResponse.json({ error: error?.message ?? "Error" }, { status: 500 });
    }

    const codes = [];
    if (isPrivate) {
      const specs =
        input.codes?.length
          ? input.codes
          : ([{ kind: "permanent" as const }] as NonNullable<typeof input.codes>);
      for (const spec of specs) {
        const code =
          ("code" in spec && spec.code ? spec.code.toUpperCase() : null) ||
          Math.random().toString(36).slice(2, 10).toUpperCase();
        const { data: codeRow, error: codeError } = await supabase
          .from("event_access_codes")
          .insert({
            event_id: event.id,
            code,
            kind: spec.kind,
            max_uses: spec.kind === "group" ? (spec.max_uses ?? 10) : null,
          })
          .select("*")
          .single();
        if (codeError) {
          return NextResponse.json({ error: codeError.message }, { status: 500 });
        }
        codes.push(codeRow);
      }
    }

    return NextResponse.json({ event, codes });
  }

  const result = localStore.createEvent(
    {
      ...input,
      event_type: input.event_type as never,
      cost_type: input.cost_type as never,
      codes: input.codes as never,
    },
    profile.id,
  );
  return NextResponse.json(result);
}
