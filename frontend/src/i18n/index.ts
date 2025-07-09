import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import ja from "./locales/ja.json";
import en from "./locales/en.json";
import zh from "./locales/zh.json";
import ko from "./locales/ko.json";
import es from "./locales/es.json";
import ru from "./locales/ru.json";

const resources = {
    ja: { translation: ja },
    en: { translation: en },
    zh: { translation: zh },
    ko: { translation: ko },
    es: { translation: es },
    ru: { translation: ru },
};

i18n.use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: "ja",
        debug: false,
        interpolation: {
            escapeValue: false,
        },
        detection: {
            order: ["localStorage", "navigator", "htmlTag"],
            caches: ["localStorage"],
        },
    });

export default i18n;
