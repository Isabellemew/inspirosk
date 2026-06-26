import React, { createContext, useState, useContext, useEffect } from "react";
import ru from "../i18n/ru.json";
import en from "../i18n/en.json";
import kk from "../i18n/kk.json";

const translations = { ru, en, kk };

const TranslationContext = createContext();

const setCookie = (name, value) => {
  document.cookie = `${name}=${value};path=/;max-age=31536000`;
  document.cookie = `${name}=${value};path=/;domain=${window.location.hostname};max-age=31536000`;
};

export function TranslationProvider({ children }) {
  const [lang, setLangState] = useState(localStorage.getItem("inspiro-lang") || "ru");

  useEffect(() => {
    // 1. Add google translate container and script if not present
    if (!document.getElementById("google-translate-container")) {
      const container = document.createElement("div");
      container.id = "google-translate-container";
      container.style.display = "none";
      document.body.appendChild(container);
      
      const el = document.createElement("div");
      el.id = "google_translate_element";
      container.appendChild(el);
    }

    if (!document.getElementById("google-translate-script")) {
      const script = document.createElement("script");
      script.id = "google-translate-script";
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);

      window.googleTranslateElementInit = () => {
        new window.google.translate.TranslateElement({
          pageLanguage: 'ru',
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false
        }, 'google_translate_element');
      };
    }
  }, []);

  const setLang = (newLang) => {
    setLangState(newLang);
    localStorage.setItem("inspiro-lang", newLang);
    
    // Set cookie for google translate
    setCookie("googtrans", `/ru/${newLang}`);
    
    // Trigger google translate dropdown change
    const combo = document.querySelector(".goog-te-combo");
    if (combo) {
      combo.value = newLang;
      combo.dispatchEvent(new Event("change"));
    } else {
      // If combo not loaded yet, reload might be needed to apply set cookie
      setTimeout(() => {
        const checkAgain = document.querySelector(".goog-te-combo");
        if (checkAgain) {
          checkAgain.value = newLang;
          checkAgain.dispatchEvent(new Event("change"));
        } else {
          window.location.reload();
        }
      }, 500);
    }
  };

  useEffect(() => {
    // Handle RTL
    if (lang === "ar" || lang === "he") {
      document.documentElement.dir = "rtl";
    } else {
      document.documentElement.dir = "ltr";
    }

    // Set cookie on mount for persistence
    setCookie("googtrans", `/ru/${lang}`);

    // Try to trigger google translate after load
    const timer = setInterval(() => {
      const combo = document.querySelector(".goog-te-combo");
      if (combo) {
        combo.value = lang;
        combo.dispatchEvent(new Event("change"));
        clearInterval(timer);
      }
    }, 500);

    return () => clearInterval(timer);
  }, [lang]);

  const t = (key, replacements = {}) => {
    const keys = key.split(".");
    // Use fallback translations if translations[lang] exists, else fallback to Russian
    let text = translations[lang] || translations["ru"];
    
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
