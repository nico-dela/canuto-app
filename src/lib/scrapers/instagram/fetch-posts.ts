import { SCRAPER_UA } from "../normalize";
import {
  getInstagramMaxPosts,
  getInstagramProfiles,
  getInstagramSessionId,
} from "./config";

export type InstagramPost = {
  handle: string;
  shortcode: string;
  postUrl: string;
  imageUrl: string;
  caption: string | null;
};

const IG_APP_ID = "936619743392459";

type EdgeNode = {
  id?: string;
  shortcode?: string;
  display_url?: string;
  thumbnail_src?: string;
  edge_media_to_caption?: {
    edges?: Array<{ node?: { text?: string } }>;
  };
};

type WebProfileResponse = {
  data?: {
    user?: {
      edge_owner_to_timeline_media?: {
        edges?: Array<{ node?: EdgeNode }>;
      };
    };
  };
};

type EnvLike = Record<string, string | undefined>;

function buildHeaders(sessionId: string | null): HeadersInit {
  const headers: Record<string, string> = {
    "User-Agent": SCRAPER_UA,
    Accept: "application/json",
    "X-IG-App-ID": IG_APP_ID,
    "X-Requested-With": "XMLHttpRequest",
    Referer: "https://www.instagram.com/",
  };
  if (sessionId) {
    headers.Cookie = `sessionid=${sessionId}`;
  }
  return headers;
}

function nodeToPost(handle: string, node: EdgeNode): InstagramPost | null {
  const shortcode = node.shortcode?.trim();
  const imageUrl = (node.display_url ?? node.thumbnail_src)?.trim();
  if (!shortcode || !imageUrl) return null;
  const caption =
    node.edge_media_to_caption?.edges?.[0]?.node?.text?.trim() || null;
  return {
    handle,
    shortcode,
    postUrl: `https://www.instagram.com/${handle}/p/${shortcode}/`,
    imageUrl,
    caption,
  };
}

async function fetchProfilePosts(
  handle: string,
  maxPosts: number,
  sessionId: string | null,
): Promise<InstagramPost[]> {
  const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(handle)}`;
  const res = await fetch(url, {
    headers: buildHeaders(sessionId),
    redirect: "follow",
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error(
      `Instagram bloqueó el perfil @${handle} (HTTP ${res.status}). Probá INSTAGRAM_SESSIONID.`,
    );
  }
  if (!res.ok) {
    throw new Error(`Instagram @${handle}: HTTP ${res.status}`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  const bodyText = await res.text();
  if (
    !contentType.includes("application/json") ||
    /login|Log in|Create an account/i.test(bodyText.slice(0, 2000))
  ) {
    throw new Error(
      `Instagram devolvió login wall para @${handle}. Configurá INSTAGRAM_SESSIONID.`,
    );
  }

  let data: WebProfileResponse;
  try {
    data = JSON.parse(bodyText) as WebProfileResponse;
  } catch {
    throw new Error(`Instagram @${handle}: respuesta JSON inválida`);
  }

  const edges =
    data.data?.user?.edge_owner_to_timeline_media?.edges ?? [];
  if (!edges.length) {
    throw new Error(
      `Instagram @${handle}: sin posts (perfil vacío, privado o bloqueado)`,
    );
  }

  const posts: InstagramPost[] = [];
  for (const edge of edges) {
    if (posts.length >= maxPosts) break;
    const post = edge.node ? nodeToPost(handle, edge.node) : null;
    if (post) posts.push(post);
  }
  return posts;
}

export async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": SCRAPER_UA,
      Referer: "https://www.instagram.com/",
    },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`No se pudo bajar imagen (${res.status})`);
  }
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

/** Fetch recent posts for configured profiles. Throws on hard failures (soft-fail in runScrapers). */
export async function fetchInstagramPosts(
  env: EnvLike = process.env,
): Promise<InstagramPost[]> {
  const profiles = getInstagramProfiles(env);
  if (!profiles.length) {
    throw new Error("INSTAGRAM_PROFILES vacío");
  }
  const maxPosts = getInstagramMaxPosts(env);
  const sessionId = getInstagramSessionId(env);
  const all: InstagramPost[] = [];
  const errors: string[] = [];

  for (const handle of profiles) {
    try {
      const posts = await fetchProfilePosts(handle, maxPosts, sessionId);
      all.push(...posts);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  if (!all.length) {
    throw new Error(
      errors.join(" | ") || "Instagram: no se obtuvieron posts",
    );
  }
  return all;
}
