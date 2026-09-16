/**
 * Simple Auto-Translation Utility
 * Fetches translations from Google Translate and persists them to the backend.
 */

import { apiUrl } from "@/config/api";

export const translateText = async (text: string, targetLang: string): Promise<string> => {
  if (!text || targetLang === 'en') return text;
  
  // Mapping i18n codes to Google Translate codes
  const langMap: Record<string, string> = {
    'am': 'am',
    'om': 'om',
    'sid': 'sid' // Sidama might not be perfectly supported in gtx, typically falls back to closest
  };

  const tl = langMap[targetLang] || targetLang;
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    // Google Translate GTX response structure: [[["translated", "source", ...]]]
    if (data && data[0] && data[0][0] && data[0][0][0]) {
      return data[0].map((s: any) => s[0]).join("");
    }
    return text;
  } catch (error) {
    console.error("Translation error:", error);
    return text;
  }
};

export const saveTranslation = async (id: number, field: string, translatedText: string) => {
  try {
    const response = await fetch(apiUrl('/services'), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        [field]: translatedText
      })
    });
    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error("Failed to save translation:", error);
    return false;
  }
};

/**
 * High-level function to translate and persist
 */
export const translateAndPersist = async (
  id: number, 
  text: string, 
  targetLang: string, 
  fieldType: 'name' | 'description'
): Promise<string> => {
  const translated = await translateText(text, targetLang);
  
  if (translated && translated !== text) {
    const dbField = `${fieldType}_${targetLang}`;
    // Save in background
    saveTranslation(id, dbField, translated);
  }
  
  return translated;
};
