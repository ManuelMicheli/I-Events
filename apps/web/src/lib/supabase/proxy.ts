import { createServerClient } from "@supabase/ssr";
import type { Database } from "@i-events/db";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "../env";

/** Public paths that never require a session. */
const PUBLIC_PREFIXES = ["/", "/login", "/auth", "/invito", "/eventi"];

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => (p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(`${p}/`)));
}

/** Refreshes the auth cookie on every request and sends signed-out users to /login. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(env.supabaseUrl, env.supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  if (!signedIn && !isPublic(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return response;
}
