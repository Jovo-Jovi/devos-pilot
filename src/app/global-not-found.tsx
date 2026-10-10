import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { defaultLocale, directionOf } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import "../styles/global.css";

const plexSans = IBM_Plex_Sans_Arabic({
  weight: ["400", "600"],
  subsets: ["arabic", "latin"],
  variable: "--font-sans",
});

export default function GlobalNotFound() {
  const messages = getMessages(defaultLocale);
  return (
    <html
      lang={defaultLocale}
      dir={directionOf(defaultLocale)}
      className={plexSans.variable}
    >
      <body>
        <p>{messages.site.productName}</p>
      </body>
    </html>
  );
}
