import { zhCN } from "./zh-CN";
import type { Translations } from "./zh-CN";
import { enUS } from "./en-US";

export type LangCode = "zh-CN" | "en-US";

export const translations: Record<LangCode, Translations> = {
  "zh-CN": zhCN,
  "en-US": enUS,
};

// Cookie helper
export function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

export function setCookie(name: string, value: string, days = 365): void {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${date.toUTCString()};path=/;SameSite=Lax`;
}

// Initial language detection
export function detectLanguage(suggestedFromIP?: string): LangCode {
  // 1. Cookie priority
  const cookieLang = getCookie("speed_lang");
  if (cookieLang === "zh-CN" || cookieLang === "en-US") {
    return cookieLang;
  }

  // 2. IP Geo suggestion
  if (suggestedFromIP === "zh-CN" || suggestedFromIP === "zh-TW") {
    return "zh-CN";
  }

  // 3. Browser language
  const navLang = navigator.language || "";
  if (navLang.startsWith("zh")) {
    return "zh-CN";
  }

  return "en-US";
}
