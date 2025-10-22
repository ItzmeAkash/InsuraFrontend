/**
 * Translation dictionary for common UI messages in the chatbot
 * These translations should match the backend's language support
 */

export const translations = {
  // Document upload messages
  documentUploadSuccess: {
    en: "Document Upload successfully",
    ar: "تم تحميل المستند بنجاح",
    hi: "दस्तावेज़ सफलतापूर्वक अपलोड किया गया",
    ur: "دستاویز کامیابی سے اپ لوڈ ہو گئی",
    fr: "Document téléchargé avec succès",
  },
  
  excelUploadSuccess: {
    en: "Excel sheet uploaded successfully",
    ar: "تم تحميل ورقة Excel بنجاح",
    hi: "एक्सेल शीट सफलतापूर्वक अपलोड की गई",
    ur: "Excel شیٹ کامیابی سے اپ لوڈ ہو گئی",
    fr: "Feuille Excel téléchargée avec succès",
  },

  // Typing indicator
  typing: {
    en: "Typing...",
    ar: "يكتب...",
    hi: "लिख रहे हैं...",
    ur: "ٹائپ کر رہا ہے...",
    fr: "En train d'écrire...",
  },

  // Input placeholder
  inputPlaceholder: {
    en: "Type your message...",
    ar: "اكتب رسالتك...",
    hi: "अपना संदेश लिखें...",
    ur: "اپنا پیغام لکھیں...",
    fr: "Tapez votre message...",
  },

  // Button labels
  send: {
    en: "Send",
    ar: "إرسال",
    hi: "भेजें",
    ur: "بھیجیں",
    fr: "Envoyer",
  },

  submitAll: {
    en: "Submit All",
    ar: "إرسال الكل",
    hi: "सभी सबमिट करें",
    ur: "سب جمع کروائیں",
    fr: "Tout soumettre",
  },

  // Extracted information
  extractedInformation: {
    en: "Extracted Information",
    ar: "المعلومات المستخرجة",
    hi: "निकाली गई जानकारी",
    ur: "نکالی گئی معلومات",
    fr: "Informations extraites",
  },

  // Error messages
  errorProcessingDocument: {
    en: "Sorry, I couldn't process your document. Please try again.",
    ar: "عذراً، لم أتمكن من معالجة المستند. يرجى المحاولة مرة أخرى.",
    hi: "क्षमा करें, मैं आपका दस्तावेज़ संसाधित नहीं कर सका। कृपया पुनः प्रयास करें।",
    ur: "معاف کیجیے، میں آپ کی دستاویز پر کارروائی نہیں کر سکا۔ براہ کرم دوبارہ کوشش کریں۔",
    fr: "Désolé, je n'ai pas pu traiter votre document. Veuillez réessayer.",
  },

  errorSendingMessage: {
    en: "Sorry, something went wrong. Please try again.",
    ar: "عذراً، حدث خطأ ما. يرجى المحاولة مرة أخرى.",
    hi: "क्षमा करें, कुछ गलत हो गया। कृपया पुनः प्रयास करें।",
    ur: "معاف کیجیے، کچھ غلط ہو گیا۔ براہ کرم دوبارہ کوشش کریں۔",
    fr: "Désolé, quelque chose s'est mal passé. Veuillez réessayer.",
  },

  // File actions
  view: {
    en: "View",
    ar: "عرض",
    hi: "देखें",
    ur: "دیکھیں",
    fr: "Voir",
  },
};

/**
 * Get the translation for a given key and language code
 * @param {string} key - The translation key
 * @param {string} langCode - The language code (en, ar, hi, ur, fr)
 * @returns {string} The translated text or English fallback
 */
export const getTranslation = (key, langCode = 'en') => {
  // Normalize language code to lowercase
  const normalizedLangCode = langCode?.toLowerCase() || 'en';
  
  // Get the translation object for the key
  const translationObj = translations[key];
  
  if (!translationObj) {
    console.warn(`Translation key '${key}' not found`);
    return key;
  }
  
  // Return the translation for the language, fallback to English
  return translationObj[normalizedLangCode] || translationObj.en || key;
};

/**
 * Detect language code from language name (matches backend format)
 * @param {string} language - Language name (e.g., "Arabic", "English", "Hindi")
 * @returns {string} Language code (e.g., "ar", "en", "hi")
 */
export const getLanguageCode = (language) => {
  const languageMap = {
    'english': 'en',
    'arabic': 'ar',
    'hindi': 'hi',
    'urdu': 'ur',
    'french': 'fr',
  };
  
  return languageMap[language?.toLowerCase()] || 'en';
};

/**
 * Detect language from backend response metadata
 * Extracts language information from bot messages
 * @param {Array} messages - Array of chat messages
 * @returns {string} Language code
 */
export const detectLanguageFromMessages = (messages) => {
  // Look for the most recent bot message with language metadata
  const recentBotMessages = [...messages].reverse().filter(msg => msg.sender === 'bot');
  
  // Check if any recent message has language metadata
  for (const msg of recentBotMessages) {
    if (msg.language_code) {
      return msg.language_code;
    }
    if (msg.language) {
      return getLanguageCode(msg.language);
    }
  }
  
  // Default to English
  return 'en';
};


