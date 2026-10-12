import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isStaffClaim } from "@/lib/supabase/staff-access";
import { supabasePublicEnv } from "@/lib/supabase/env";

type PendingCookie = { name: string; value: string; options: CookieOptions };

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  let pending: PendingCookie[] = [];
  let pendingHeaders: Record<string, string> = {};

  const { url, publishableKey } = supabasePublicEnv();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        pending = cookiesToSet;
        pendingHeaders = headers;
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        applyCookies(response, cookiesToSet, headers);
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (user && !isStaffClaim(user.app_metadata?.staff)) {
    await supabase.auth.signOut();
    const locale = request.nextUrl.pathname.split("/")[1] === "en" ? "en" : "ar";
    const signInPath = `/${locale}/staff/sign-in`;
    if (request.nextUrl.pathname !== signInPath) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = signInPath;
      redirectUrl.search = "error=refused";
      const redirectResponse = NextResponse.redirect(redirectUrl);
      applyCookies(redirectResponse, pending, pendingHeaders);
      return redirectResponse;
    }
  }

  return response;
}

function applyCookies(
  target: NextResponse,
  cookiesToSet: PendingCookie[],
  headers: Record<string, string>,
) {
  cookiesToSet.forEach(({ name, value, options }) => {
    target.cookies.set(name, value, options);
  });
  for (const [key, value] of Object.entries(headers)) {
    target.headers.set(key, value);
  }
}

export const config = {
  matcher: ["/(ar|en)/staff/:path*"],
};
