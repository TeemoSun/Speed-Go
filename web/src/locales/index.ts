import { zhCN } from "./zh-CN";
import type { Translations } from "./zh-CN";
import { zhTW } from "./zh-TW";
import { enUS } from "./en-US";
import { jaJP } from "./ja-JP";
import { koKR } from "./ko-KR";
import { deDE } from "./de-DE";
import { frFR } from "./fr-FR";
import { esES } from "./es-ES";
import { ruRU } from "./ru-RU";
import { ptBR } from "./pt-BR";
import { itIT } from "./it-IT";
import { viVN } from "./vi-VN";

export type { Translations };

export type LangCode =
  | "zh-CN"
  | "zh-TW"
  | "en-US"
  | "ja-JP"
  | "ko-KR"
  | "de-DE"
  | "fr-FR"
  | "es-ES"
  | "ru-RU"
  | "pt-BR"
  | "it-IT"
  | "vi-VN";

export interface LanguageItem {
  code: LangCode;
  name: string;
  nativeName: string;
}

export const supportedLanguages: LanguageItem[] = [
  { code: "zh-CN", name: "Simplified Chinese", nativeName: "简体中文" },
  { code: "zh-TW", name: "Traditional Chinese", nativeName: "繁體中文" },
  { code: "en-US", name: "English", nativeName: "English" },
  { code: "ja-JP", name: "Japanese", nativeName: "日本語" },
  { code: "ko-KR", name: "Korean", nativeName: "한국어" },
  { code: "de-DE", name: "German", nativeName: "Deutsch" },
  { code: "fr-FR", name: "French", nativeName: "Français" },
  { code: "es-ES", name: "Spanish", nativeName: "Español" },
  { code: "ru-RU", name: "Russian", nativeName: "Русский" },
  { code: "pt-BR", name: "Portuguese", nativeName: "Português" },
  { code: "it-IT", name: "Italian", nativeName: "Italiano" },
  { code: "vi-VN", name: "Vietnamese", nativeName: "Tiếng Việt" },
];

export const translations: Record<LangCode, Translations> = {
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  "en-US": enUS,
  "ja-JP": jaJP,
  "ko-KR": koKR,
  "de-DE": deDE,
  "fr-FR": frFR,
  "es-ES": esES,
  "ru-RU": ruRU,
  "pt-BR": ptBR,
  "it-IT": itIT,
  "vi-VN": viVN,
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
  const cookieLang = getCookie("speed_lang") as LangCode | null;
  if (cookieLang && cookieLang in translations) {
    return cookieLang;
  }

  // 2. IP Geo suggestion
  if (suggestedFromIP && suggestedFromIP in translations) {
    return suggestedFromIP as LangCode;
  }

  // 3. Browser language
  const navLang = (navigator.language || "").toLowerCase();
  if (navLang.startsWith("zh-tw") || navLang.startsWith("zh-hk") || navLang.startsWith("zh-mo")) {
    return "zh-TW";
  }
  if (navLang.startsWith("zh")) {
    return "zh-CN";
  }
  if (navLang.startsWith("ja")) {
    return "ja-JP";
  }
  if (navLang.startsWith("ko")) {
    return "ko-KR";
  }
  if (navLang.startsWith("de")) {
    return "de-DE";
  }
  if (navLang.startsWith("fr")) {
    return "fr-FR";
  }
  if (navLang.startsWith("es")) {
    return "es-ES";
  }
  if (navLang.startsWith("ru")) {
    return "ru-RU";
  }
  if (navLang.startsWith("pt")) {
    return "pt-BR";
  }
  if (navLang.startsWith("it")) {
    return "it-IT";
  }
  if (navLang.startsWith("vi")) {
    return "vi-VN";
  }

  return "en-US";
}

