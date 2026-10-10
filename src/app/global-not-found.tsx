import { Readex_Pro, Reem_Kufi } from "next/font/google";
import { defaultLocale, directionOf } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import "../styles/global.css";

const reemKufi = Reem_Kufi({ weight: ["500", "600", "700"], subsets: ["arabic", "latin"], variable: "--font-kufi" });
const readexPro = Readex_Pro({ weight: ["400", "500", "600"], subsets: ["arabic", "latin"], variable: "--font-readex" });

export default function GlobalNotFound() {
  const messages = getMessages(defaultLocale);
  return (
    <html
      lang={defaultLocale}
      dir={directionOf(defaultLocale)}
      className={`${reemKufi.variable} ${readexPro.variable}`}
    >
      <body>
        <p>{messages.site.productName}</p>
      </body>
    </html>
  );
}
