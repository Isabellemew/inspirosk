import React, { createContext, useState, useContext, useEffect } from "react";
import ru from "../i18n/ru.json";
import en from "../i18n/en.json";
import kk from "../i18n/kk.json";

const translations = { ru, en, kk };

const TranslationContext = createContext();

export function TranslationProvider({ children }) {
  const [lang, setLang] = useState(localStorage.getItem("inspiro-lang") || "ru");

  useEffect(() => {
    localStorage.setItem("inspiro-lang", lang);
    if (lang === "ar" || lang === "he") {
      document.documentElement.dir = "rtl";
    } else {
      document.documentElement.dir = "ltr";
    }
  }, [lang]);

  const t = (key, replacements = {}) => {
    const keys = key.split(".");
    let text = translations[lang];
    
    for (const k of keys) {
      if (text && text[k] !== undefined) {
        text = text[k];
      } else {
        return key;
      }
    }
    
    if (typeof text !== "string") return key;

    let formattedText = text;
    Object.keys(replacements).forEach((placeholder) => {
      formattedText = formattedText.replaceAll(`{${placeholder}}`, replacements[placeholder]);
    });
    
    return formattedText;
  };

  return (
    <TranslationContext.Provider value={{ lang, setLang, t }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error("useTranslation must be used within a TranslationProvider");
  }
  return context;
}
