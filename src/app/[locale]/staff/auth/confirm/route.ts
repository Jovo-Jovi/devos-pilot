import { NextResponse, connection, type NextRequest } from "next/server";
import { isLocale } from "@/i18n/config";
import { isStaffClaim, parseInviteLink } from "@/lib/supabase/staff-access";
import {
  createStaffServerClient,
  type StaffSessionCookie,
} from "@/lib/supabase/server";

function noStore(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function applySessionCookies(
  response: NextResponse,
  pendingCookies: StaffSessionCookie[],
): NextResponse {
  for (const { name, value, options } of pendingCookies) {
    response.cookies.set(name, value, options);
  }
  return response;
}

/**
 * A clean staff URL. The invitation token never leaves the confirm request.
 * `nextUrl` rewrites 127.0.0.1 to localhost, which would store the session
 * cookie on a different host from the browser's next request.
 */
function redirectTo(
  request: NextRequest,
  pathname: string,
  error?: "link" | "refused",
): NextResponse {
  const url = new URL(request.url);
  const host = request.headers.get("host");
  if (host) url.host = host;
  url.pathname = pathname;
  url.search = "";
  if (error) url.searchParams.set("error", error);
  return noStore(NextResponse.redirect(url));
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ locale: string }> },
) {
  await connection();
  const { locale } = await context.params;
  if (!isLocale(locale)) {
    return noStore(new NextResponse(null, { status: 404 }));
  }
  const parsed = parseInviteLink(request.nextUrl.searchParams);
  if (!parsed) {
    return redirectTo(request, `/${locale}/staff/sign-in`, "link");
  }
  const pendingCookies: StaffSessionCookie[] = [];
  const supabase = await createStaffServerClient(pendingCookies);
  const verified = await supabase.auth.verifyOtp({
    type: "invite",
    token_hash: parsed.tokenHash,
  });
  if (verified.error) {
    return applySessionCookies(
      redirectTo(request, `/${locale}/staff/sign-in`, "link"),
      pendingCookies,
    );
  }
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user || !isStaffClaim(user.app_metadata?.staff)) {
    await supabase.auth.signOut();
    return applySessionCookies(
      redirectTo(request, `/${locale}/staff/sign-in`, "refused"),
      pendingCookies,
    );
  }
  return applySessionCookies(
    redirectTo(request, `/${locale}/staff/password`),
    pendingCookies,
  );
}
