import en from "./en";
import kn from "./kn";
import tcy from "./tcy";
import be from "./be";

export type TranslationKeys = keyof typeof en;
export type LanguageModule = Record<TranslationKeys, string>;

export const languages: Record<
  string,
  { label: string; translations: LanguageModule }
> = {
  en: { label: "English", translations: en as unknown as LanguageModule },
  kn: { label: "ಕನ್ನಡ", translations: kn as unknown as LanguageModule },
  tcy: { label: "ತುಳು", translations: tcy as unknown as LanguageModule },
  be: { label: "Beary", translations: be as unknown as LanguageModule },
};

export type Language = keyof typeof languages;

export const LANGUAGE_OPTIONS = Object.entries(languages).map(
  ([code, { label }]) => ({ code: code as Language, label }),
);

export function t(lang: Language, key: TranslationKeys): string {
  return (
    languages[lang]?.translations[key] ?? languages.en.translations[key] ?? key
  );
}
