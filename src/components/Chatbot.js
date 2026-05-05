import React, { useState, useEffect, useRef } from "react";
import axiosInstance, { baseURL } from "../axiosInstance";
import { AiOutlinePaperClip, AiOutlineClose } from "react-icons/ai";
import { FiEdit2, FiCheck, FiX } from "react-icons/fi";
import MessageContentRenderer from "./Common/DocumentImage";
import DocumentAnalysisLoading from "./Common/DocumentAnalysisLoading";
import CustomDropdown from "./Common/CustomDropdown";
import ReviewLinkCard from "./Common/ReviewLinkCard";
import PDFViewerCard from "./Common/PDFViewerCard";
import GeneralDocumentDownloadCard from "./Common/GeneralDocumentDownloadCard";
import { getTranslation, detectLanguageFromMessages } from "../services/language";

/** Backend document_upload_request → extract/upload endpoints (same map as determineEndpoint). */
const DOCUMENT_UPLOAD_EXTRACT_ENDPOINTS = {
  emirates_id_front: "/extract-front-page-emirate/",
  emirates_id_back: "/extract-back-page-emirate/",
  driving_license: "/extract-licence/",
  mulkiya: "/extract-mulkiya/",
  /** Alternate backend keys for Mulkiya / vehicle registration */
  vehicle_registration: "/extract-mulkiya/",
  vehicle_registration_card: "/extract-mulkiya/",
  excel: "/upload-excel/",
  emirates_id: "/extract-emirate/",
};

/** Ensures /chat/ receives document_type when is_extracted_info is true (backend validation). */
const EXTRACT_ENDPOINT_TO_CHAT_DOCUMENT_TYPE = {
  "/extract-mulkiya/": "mulkiya",
  "/extract-licence/": "driving_license",
  "/extract-front-page-emirate/": "emirates_id_front",
  "/extract-back-page-emirate/": "emirates_id_back",
  "/extract-emirate/": "emirates_id",
};

/** Backend copy is often "Vehicle Registration Card (Mulkiya)" — not "Please Upload Mulkiya". */
const botTextRequestsMulkiyaUpload = (text) => {
  if (!text || typeof text !== "string") return false;
  const t = text.toLowerCase();
  const aboutMulkiya =
    t.includes("mulkiya") ||
    (t.includes("vehicle") && t.includes("registration"));
  if (!aboutMulkiya) return false;
  const asksUpload =
    t.includes("upload") ||
    t.includes("attach") ||
    t.includes("required documents");
  const legacyPhrasing =
    t.includes("please upload mulkiya") ||
    t.includes("move on to: please upload mulkiya") ||
    t.includes("let's move back to please upload mulkiya");
  return asksUpload || legacyPhrasing;
};

const botTextConfirmsMulkiyaUploaded = (text) => {
  if (!text || typeof text !== "string") return false;
  const t = text.toLowerCase();
  if (!t.includes("thank you")) return false;
  if (t.includes("please upload") || t.includes("upload required")) {
    return false;
  }
  return (
    t.includes("mulkiya") ||
    t.includes("vehicle registration") ||
    (t.includes("vehicle") && t.includes("registration"))
  );
};

const isClaimFlowMessage = (msg) => msg?.flow_type === "claim";

const normalizeMessageText = (text) =>
  typeof text === "string" ? text.toLowerCase() : "";

const botTextRequestsDrivingLicenseUpload = (text) => {
  const t = normalizeMessageText(text);
  if (!t || !t.includes("driving license")) return false;
  return t.includes("please upload") || t.includes("upload your valid");
};

const botTextConfirmsDrivingLicenseUploaded = (text) => {
  const t = normalizeMessageText(text);
  return t.includes("thank you for uploading your driving license");
};

const botTextRequestsEmiratesIdUpload = (text) => {
  const t = normalizeMessageText(text);
  if (!t || !t.includes("emirates id")) return false;
  return t.includes("please upload");
};

const botTextRequestsPoliceVerificationUpload = (text) => {
  const t = normalizeMessageText(text);
  return (
    t.includes("please upload") &&
    t.includes("police verification") &&
    t.includes("incident")
  );
};

const botTextRequestsInsuranceCardUpload = (text) => {
  const t = normalizeMessageText(text);
  return t.includes("please upload") && t.includes("insurance card");
};

const GENERAL_INSURANCE_FORM_UPLOAD_TYPE = "general_insurance_form";

const isGeneralInsuranceFlow = (msg) =>
  msg?.flow_type === "general_insurance" ||
  msg?.upload_category === "general_insurance";

/** General-insurance uploads that use /upload-document/ (not OCR extract endpoints). */
const GENERAL_INSURANCE_UPLOAD_DOCUMENT_TYPES = new Set([
  "trade_license",
  "vat_certificate",
]);

const isGeneralInsuranceUploadDocumentRequest = (msg) =>
  msg?.sender === "bot" &&
  msg?.message_type === "document_upload_request" &&
  msg?.document_type &&
  GENERAL_INSURANCE_UPLOAD_DOCUMENT_TYPES.has(msg.document_type) &&
  isGeneralInsuranceFlow(msg);

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [documentOptions, setDocumentOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("");
  const [awaitingName, setAwaitingName] = useState(false);
  const messagesEndRef = useRef(null);
  /** Set when /chat returns general_link; cleared after successful /upload-document/ upload. */
  const pendingGeneralInsuranceUploadRef = useRef(null);
  /** Which /upload-document/ variant ran (general form vs trade licence); set before POST, cleared after /chat follow-up. */
  const uploadDocumentContextRef = useRef(null);
  /** Last OCR/extract endpoint that succeeded; used to attach document_type on /chat/ payload. */
  const lastSuccessfulExtractEndpointRef = useRef(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [extractedInfo, setExtractedInfo] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [file, setFile] = useState(null);
  const [analysisStage, setAnalysisStage] = useState(null);
  const [dropdownOptions, setDropdownOptions] = useState([]);
  const [dropdownPlaceholder, setDropdownPlaceholder] =
    useState("Select an option");

  const langCode = detectLanguageFromMessages(messages);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isChatOpen) scrollToBottom();
  }, [messages, isChatOpen, loading]);

  useEffect(() => {
    if (loading) {
      setOptions([]);
      setDocumentOptions([]);
    }
  }, [loading]);

  const formatExtractedInfoAsText = (info) => {
    if (!info) return "";
    return Object.entries(info)
      .map(([key, value]) => {
        const formattedKey = key
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
        return `${formattedKey}: ${value}`;
      })
      .join("\n");
  };

  const handleFileAttach = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
  
    try {
      setFile(uploadedFile);
      setLoading(true);
      setAnalysisStage("uploading");
  
      // Handle multiple files if selected
      if (e.target.files.length > 1) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const images = await Promise.all(
          Array.from(e.target.files).map((file) => {
            return new Promise((resolve, reject) => {
              const img = new Image();
              img.onload = () => resolve(img);
              img.onerror = reject;
              img.src = URL.createObjectURL(file);
            });
          })
        );
  
        const totalWidth = images.reduce((sum, img) => sum + img.width, 0);
        const maxHeight = Math.max(...images.map((img) => img.height));
        canvas.width = totalWidth;
        canvas.height = maxHeight;
  
        let xOffset = 0;
        images.forEach((img) => {
          ctx.drawImage(img, xOffset, 0);
          xOffset += img.width;
        });
  
        canvas.toBlob(async (blob) => {
          const combinedFile = new File([blob], "combined.png", {
            type: "image/png",
          });
  
          // Use the combined file instead of the original
          await uploadFile(combinedFile);
        }, "image/png");
      } else {
        // Process single file
        await uploadFile(uploadedFile);
      }
    } catch (error) {
      lastSuccessfulExtractEndpointRef.current = null;
      console.error("Error details:", {
        message: error.message,
        response: error.response,
        request: error.request,
      });
      setAnalysisStage("error");
      const errorMessage =
        error.response?.data?.message ||
        getTranslation('errorProcessingDocument', langCode);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: errorMessage,
          time: getCurrentTime(),
        },
      ]);
  
      // Hide error stage after 1.5 seconds
      setTimeout(() => setAnalysisStage(null), 1500);
    } finally {
      setLoading(false);
      e.target.value = null;
    }
  
    // Helper function to upload the file
    async function uploadFile(fileToUpload) {
      const recentMessages = [...messages].reverse();
      const lastBotMessage = recentMessages.find((msg) => msg.sender === "bot");

      let uploadDocumentFileLabel = null;
      const formData = new FormData();
      let endpoint;

      const pendingGeneral = pendingGeneralInsuranceUploadRef.current;

      let resolvedExplicitEndpoint =
        lastBotMessage?.message_type === "document_upload_request" &&
        lastBotMessage.document_type &&
        DOCUMENT_UPLOAD_EXTRACT_ENDPOINTS[lastBotMessage.document_type];

      // Backend often sends document_type "excel" with general_link; that flow must use /upload-document/, not /upload-excel/
      if (
        resolvedExplicitEndpoint === "/upload-excel/" &&
        pendingGeneral
      ) {
        resolvedExplicitEndpoint = null;
      }

      const generalInsuranceDocUpload =
        lastBotMessage &&
        isGeneralInsuranceUploadDocumentRequest(lastBotMessage);
      const claimPoliceVerificationUpload =
        lastBotMessage &&
        isClaimFlowMessage(lastBotMessage) &&
        botTextRequestsPoliceVerificationUpload(lastBotMessage.text);
      const claimInsuranceCardUpload =
        lastBotMessage &&
        isClaimFlowMessage(lastBotMessage) &&
        botTextRequestsInsuranceCardUpload(lastBotMessage.text);

      if (resolvedExplicitEndpoint) {
        pendingGeneralInsuranceUploadRef.current = null;
        endpoint = resolvedExplicitEndpoint;
        formData.append("file", fileToUpload);
        formData.append("user_id", userId);
        console.log(
          `[Upload routing] document_upload_request (${lastBotMessage.document_type}) → ${endpoint}`
        );
      } else if (generalInsuranceDocUpload) {
        pendingGeneralInsuranceUploadRef.current = null;
        endpoint = "/upload-document/";
        const docType = lastBotMessage.document_type;
        uploadDocumentFileLabel =
          fileToUpload.name?.trim() || docType || "document";
        const uploadType =
          lastBotMessage.upload_type || docType || "document";
        uploadDocumentContextRef.current = {
          variant: docType,
          fileLabel: uploadDocumentFileLabel,
        };
        formData.append("user_id", userId);
        formData.append("type", uploadType);
        formData.append("file_name", uploadDocumentFileLabel);
        formData.append("file", fileToUpload);
        if (lastBotMessage.upload_category) {
          formData.append("upload_category", lastBotMessage.upload_category);
        }
        if (lastBotMessage.flow_type) {
          formData.append("flow_type", lastBotMessage.flow_type);
        }
        console.log(
          `[Upload routing] general_insurance ${docType} → /upload-document/`
        );
      } else if (pendingGeneralInsuranceUploadRef.current) {
        endpoint = "/upload-document/";
        const pending = pendingGeneralInsuranceUploadRef.current;
        uploadDocumentFileLabel =
          fileToUpload.name?.trim() ||
          suggestedFilledFileName(pending.templateFileName);
        uploadDocumentContextRef.current = {
          variant: "general_insurance_form",
          fileLabel: uploadDocumentFileLabel,
          finalResponses: pending.finalResponses ?? null,
        };
        formData.append("user_id", userId);
        formData.append("type", GENERAL_INSURANCE_FORM_UPLOAD_TYPE);
        formData.append("file_name", uploadDocumentFileLabel);
        formData.append("file", fileToUpload);
        console.log("[Upload routing] general_link pending → /upload-document/");
      } else if (claimPoliceVerificationUpload) {
        endpoint = "/upload-document/";
        uploadDocumentFileLabel = fileToUpload.name?.trim() || "document";
        uploadDocumentContextRef.current = {
          variant: "claim_police_verification",
          fileLabel: uploadDocumentFileLabel,
        };
        formData.append("user_id", userId);
        formData.append("type", "police_verification");
        formData.append("file_name", uploadDocumentFileLabel);
        formData.append("file", fileToUpload);
        formData.append("flow_type", "claim");
        console.log("[Upload routing] claim police verification → /upload-document/");
      } else if (claimInsuranceCardUpload) {
        endpoint = "/upload-document/";
        uploadDocumentFileLabel = fileToUpload.name?.trim() || "document";
        uploadDocumentContextRef.current = {
          variant: "claim_insurance_card",
          fileLabel: uploadDocumentFileLabel,
        };
        formData.append("user_id", userId);
        formData.append("type", "insurance_card");
        formData.append("file_name", uploadDocumentFileLabel);
        formData.append("file", fileToUpload);
        formData.append("flow_type", "claim");
        console.log("[Upload routing] claim insurance card → /upload-document/");
      } else {
        endpoint = determineEndpoint(fileToUpload);
        formData.append("file", fileToUpload);
        formData.append("user_id", userId);
      }

      console.log("Upload endpoint:", endpoint);

      const response = await axiosInstance.post(endpoint, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        retries: 3,
      });

      // /upload-document/ (filled general-insurance Excel or trade licence in general flow) → /chat/
      if (endpoint === "/upload-document/") {
        const ctx = uploadDocumentContextRef.current;
        uploadDocumentContextRef.current = null;
        pendingGeneralInsuranceUploadRef.current = null;

        const fileLabel =
          ctx?.fileLabel ||
          uploadDocumentFileLabel ||
          suggestedFilledFileName("");

        const userUploadLine =
          ctx?.variant === "trade_license"
            ? `Uploaded trade licence: ${fileLabel}`
            : ctx?.variant === "vat_certificate"
              ? `Uploaded VAT certificate: ${fileLabel}`
              : ctx?.variant === "claim_police_verification"
                ? `Uploaded police verification document: ${fileLabel}`
                : ctx?.variant === "claim_insurance_card"
                  ? `Uploaded insurance card: ${fileLabel}`
              : `Uploaded filled form: ${fileLabel}`;

        setAnalysisStage("complete");
        setMessages((prev) => [
          ...prev,
          {
            sender: "user",
            text: userUploadLine,
            time: getCurrentTime(),
          },
        ]);
        setTimeout(() => setAnalysisStage(null), 500);

        setTimeout(async () => {
          try {
            setLoading(true);
            const chatBody =
              ctx?.variant === "trade_license"
                ? {
                    message: JSON.stringify({
                      event: "trade_license_uploaded",
                      file_name: fileLabel,
                      flow_type: "general_insurance",
                      document_type: "trade_license",
                    }),
                    user_id: userId,
                    is_extracted_info: true,
                  }
                : ctx?.variant === "vat_certificate"
                  ? {
                      message: JSON.stringify({
                        event: "vat_certificate_uploaded",
                        file_name: fileLabel,
                        flow_type: "general_insurance",
                        document_type: "vat_certificate",
                      }),
                      user_id: userId,
                      is_extracted_info: true,
                    }
                  : ctx?.variant === "claim_police_verification"
                    ? {
                        message: JSON.stringify({
                          event: "claim_police_verification_uploaded",
                          file_name: fileLabel,
                          flow_type: "claim",
                          document_type: "police_verification",
                        }),
                        user_id: userId,
                        is_extracted_info: true,
                      }
                  : ctx?.variant === "claim_insurance_card"
                    ? {
                        message: JSON.stringify({
                          event: "claim_insurance_card_uploaded",
                          file_name: fileLabel,
                          flow_type: "claim",
                          document_type: "insurance_card",
                        }),
                        user_id: userId,
                        is_extracted_info: true,
                      }
                  : {
                      message: JSON.stringify({
                        event: "general_insurance_form_uploaded",
                        file_name: fileLabel,
                        final_responses: ctx?.finalResponses ?? null,
                      }),
                      user_id: userId,
                      is_extracted_info: true,
                    };

            const chatResponse = await axiosInstance.post("/chat/", chatBody);

            const botResponses = buildBotMessagesFromChatResponse(chatResponse.data);

            if (chatResponse.data.dropdown) {
              if (Array.isArray(chatResponse.data.dropdown.options)) {
                setDropdownOptions(chatResponse.data.dropdown.options);
                if (chatResponse.data.dropdown.placeholder) {
                  setDropdownPlaceholder(chatResponse.data.dropdown.placeholder);
                }
              } else if (typeof chatResponse.data.dropdown === "string") {
                setDropdownOptions(chatResponse.data.dropdown.split(", "));
              }
            } else {
              setDropdownOptions([]);
            }

            setMessages((prev) => [...prev, ...botResponses]);
            setOptions(
              chatResponse.data.options ? chatResponse.data.options.split(", ") : []
            );
            setDocumentOptions(
              chatResponse.data.document_options &&
                typeof chatResponse.data.document_options === "string"
                ? chatResponse.data.document_options.split(", ")
                : Array.isArray(chatResponse.data.document_options)
                ? chatResponse.data.document_options
                : []
            );
          } catch (error) {
            console.error("Error continuing chat after general insurance upload:", error);
            setMessages((prev) => [
              ...prev,
              {
                sender: "bot",
                text: "Form uploaded but failed to continue. Please send a message or try again.",
                time: getCurrentTime(),
              },
            ]);
          } finally {
            setLoading(false);
          }
        }, 600);

        return;
      }

      // Excel uploads: do not show detailed data in chat, but send to backend
      if (endpoint === "/upload-excel/") {
        console.log("[upload-excel] Full response:", response);
        console.log("[upload-excel] Response data:", response.data);
        setAnalysisStage("complete");
        setMessages((prev) => [
          ...prev,
          {
            sender: "user",
            text: getTranslation('excelUploadSuccess', langCode),
            time: getCurrentTime(),
          },
        ]);
        setTimeout(() => setAnalysisStage(null), 500);
        
        // Send the extracted data to chat endpoint automatically
        setTimeout(async () => {
          try {
            setLoading(true);
            const chatResponse = await axiosInstance.post("/chat/", {
              message: JSON.stringify(response.data),
              user_id: userId,
              is_extracted_info: true,
            });

            const botResponses = buildBotMessagesFromChatResponse(chatResponse.data);

            if (chatResponse.data.dropdown) {
              if (Array.isArray(chatResponse.data.dropdown.options)) {
                setDropdownOptions(chatResponse.data.dropdown.options);
                if (chatResponse.data.dropdown.placeholder) {
                  setDropdownPlaceholder(chatResponse.data.dropdown.placeholder);
                }
              } else if (typeof chatResponse.data.dropdown === "string") {
                setDropdownOptions(chatResponse.data.dropdown.split(", "));
              }
            } else {
              setDropdownOptions([]);
            }

            setMessages((prev) => [...prev, ...botResponses]);
            setOptions(
              chatResponse.data.options ? chatResponse.data.options.split(", ") : []
            );
            setDocumentOptions(
              chatResponse.data.document_options &&
                typeof chatResponse.data.document_options === "string"
                ? chatResponse.data.document_options.split(", ")
                : Array.isArray(chatResponse.data.document_options)
                ? chatResponse.data.document_options
                : []
            );
          } catch (error) {
            console.error("Error sending excel data to chat:", error);
            setMessages((prev) => [
              ...prev,
              {
                sender: "bot",
                text: "Excel uploaded but failed to process. Please try again.",
                time: getCurrentTime(),
              },
            ]);
          } finally {
            setLoading(false);
          }
        }, 600);
        
        return;
      }

      // Non-excel: proceed to show extracted information
      lastSuccessfulExtractEndpointRef.current = endpoint;
      setAnalysisStage("complete");
      console.log("Extracted Information:", response.data);
      setExtractedInfo(response.data);

      // Hide analysis stage after 0.5 seconds
      setTimeout(() => {
        setAnalysisStage(null);
      }, 500);
    }
  
    // Helper to determine the correct endpoint based on metadata (multilingual support)
    function determineEndpoint(fileToUpload) {
      // Get the last bot message to determine what was most recently requested
      const recentMessages = [...messages].reverse();
      const lastBotMessage = recentMessages.find((msg) => msg.sender === "bot");
  
      // First, check if we have metadata from the backend (recommended approach)
      if (lastBotMessage && lastBotMessage.message_type === "document_upload_request") {
        const endpoint =
          DOCUMENT_UPLOAD_EXTRACT_ENDPOINTS[lastBotMessage.document_type];
        if (endpoint) {
          console.log(`[Metadata-based routing] Using endpoint: ${endpoint} for document_type: ${lastBotMessage.document_type}`);
          return endpoint;
        }
      }
      
      // Fallback: String matching for backwards compatibility (works only in English)
      console.log('[Fallback routing] Using text-based matching - metadata not available');
      
      const isExcelRequest = (text) => {
        const t = (text || "").toLowerCase();
        return t.includes("upload an excel") && t.includes("medical insurance");
      };
  
      // Check if we have a direct match from the most recent bot message
      if (lastBotMessage) {
        if (isExcelRequest(lastBotMessage.text)) {
          return "/upload-excel/";
        }
        if (isClaimFlowMessage(lastBotMessage) && botTextRequestsPoliceVerificationUpload(lastBotMessage.text)) {
          return "/upload-document/";
        }
        if (isClaimFlowMessage(lastBotMessage) && botTextRequestsInsuranceCardUpload(lastBotMessage.text)) {
          return "/upload-document/";
        }
        if (botTextRequestsEmiratesIdUpload(lastBotMessage.text)) {
          return "/extract-emirate/";
        }
        if (
          lastBotMessage.text.includes(
            "Please Upload Front Page of Your Document"
          )
        ) {
          return "/extract-front-page-emirate/";
        }
        if (botTextRequestsDrivingLicenseUpload(lastBotMessage.text)) {
          return "/extract-licence/";
        }
        if (botTextRequestsMulkiyaUpload(lastBotMessage.text)) {
          return "/extract-mulkiya/";
        }
        if (
          lastBotMessage.text.includes(
            "Please Upload Back Page of Your Document"
          )
        ) {
          return "/extract-back-page-emirate/";
        }
      }
  
      const excelRequested = messages.some(
        (msg) => msg.sender === "bot" && isExcelRequest(msg.text)
      );

      const licenseRequested = messages.some(
        (msg) =>
          msg.sender === "bot" &&
          botTextRequestsDrivingLicenseUpload(msg.text)
      );
  
      const licenseCompleted = messages.some(
        (msg) =>
          msg.sender === "bot" &&
          botTextConfirmsDrivingLicenseUploaded(msg.text)
      );
  
      const mulkiyaRequested = messages.some(
        (msg) =>
          msg.sender === "bot" && botTextRequestsMulkiyaUpload(msg.text)
      );

      const mulkiyaCompleted = messages.some(
        (msg) =>
          msg.sender === "bot" && botTextConfirmsMulkiyaUploaded(msg.text)
      );
  
      const emirateBackPageRequested = messages.some(
        (msg) =>
          msg.sender === "bot" &&
          msg.text.includes("Please Upload Back Page of Your Document")
      );
  
      const emirateBackPageCompleted = messages.some(
        (msg) =>
          msg.sender === "bot" &&
          msg.text.includes("Thank you for uploading the Back Page")
      );
  
      // Determine appropriate endpoint based on conversation flow
      if (excelRequested) {
        return "/upload-excel/";
      } else if (licenseRequested && !licenseCompleted) {
        return "/extract-licence/";
      } else if (mulkiyaRequested && !mulkiyaCompleted) {
        return "/extract-mulkiya/";
      } else if (emirateBackPageRequested && !emirateBackPageCompleted) {
        return "/extract-back-page-emirate/";
      } else {
        // Default to emirates ID extraction if no specific document is requested
          return "/extract-emirate/";
      }
    }

    // Helper to update messages based on document type using metadata (multilingual support)
    function updateMessageForDocumentType(endpoint) {
      // Get the last bot message to access metadata
      const recentMessages = [...messages].reverse();
      const lastBotMessage = recentMessages.find((msg) => msg.sender === "bot");
      
      let confirmationMessage = "Thank you for uploading the document.";
      let nextStep = "";

      // Use metadata if available (recommended, language-independent)
      if (lastBotMessage && lastBotMessage.document_type) {
        const confirmations = {
          'emirates_id_front': 'Thank you for uploading the Front Page',
          'emirates_id_back': 'Thank you for uploading the Back Page',
          'driving_license': 'Thank you for uploading the Driving license',
          'mulkiya': 'Thank you for uploading the Mulkiya',
          vehicle_registration: 'Thank you for uploading the Mulkiya',
          vehicle_registration_card: 'Thank you for uploading the Mulkiya',
          'excel': 'Thank you for uploading the Excel file',
          'emirates_id': 'Thank you for uploading the Emirates ID',
        };

        confirmationMessage = confirmations[lastBotMessage.document_type] || confirmationMessage;
        console.log(`[Metadata-based confirmation] Using confirmation for document_type: ${lastBotMessage.document_type}`);
      } else {
        // Fallback: endpoint-based confirmation (legacy approach)
        console.log('[Fallback confirmation] Using endpoint-based confirmation');
        
        if (endpoint === "/extract-front-page-emirate/") {
          confirmationMessage = "Thank you for uploading the Front Page";
        } else if (endpoint === "/extract-licence/") {
          confirmationMessage = "Thank you for uploading the Driving license";
        } else if (endpoint === "/extract-mulkiya/") {
          confirmationMessage = "Thank you for uploading the Mulkiya";
        } else if (endpoint === "/extract-back-page-emirate/") {
          confirmationMessage = "Thank you for uploading the Back Page";
        }
      }

      // Update conversation with confirmation
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: confirmationMessage,
          time: getCurrentTime(),
          message_type: "confirmation", // Mark as confirmation
        },
      ]);
    }
  };

  const handleSaveField = (field, newValue) => {
    setExtractedInfo((prev) => ({
      ...prev,
      [field]: newValue,
    }));
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const constructFullUrl = (url) => {
    if (!url) return url;
    if (url.startsWith("http")) return url;
    if (url.startsWith('/pdf/') || url.startsWith('/pdf-view/')) {
      return `${baseURL}${url}`;
    }
    return url;
  };

  const resolveGeneralDocumentUrl = (generalLink) => {
    if (!generalLink || typeof generalLink !== "string") return "";
    const trimmed = generalLink.trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return `${baseURL}${path}`;
  };

  const filenameFromGeneralLink = (generalLink) => {
    try {
      const trimmed = (generalLink || "").trim();
      if (!trimmed) return "document";
      const path = /^https?:\/\//i.test(trimmed)
        ? new URL(trimmed).pathname
        : trimmed.startsWith("/")
          ? trimmed
          : `/${trimmed}`;
      const last = path.split("/").filter(Boolean).pop();
      return last ? decodeURIComponent(last) : "document";
    } catch {
      return "document";
    }
  };

  /** e.g. Travel Insurance.XLSX → Travel Insurance filled.xlsx */
  const suggestedFilledFileName = (templateFileName) => {
    const name = templateFileName || "document";
    const match = name.match(/^(.+?)(\.[^.]+)?$/i);
    const base = (match?.[1] ? match[1] : name.replace(/\.[^/.]+$/, "")).trim();
    const ext = match?.[2] ? match[2].toLowerCase() : ".xlsx";
    return `${base} filled${ext}`;
  };

  /** Order: response → link → general_link → review_message → review_link → question → example → pdf → document_name */
  const buildBotMessagesFromChatResponse = (data) => {
    const botResponses = [];
    const meta = {
      message_type: data.message_type,
      document_type: data.document_type,
      language: data.language,
      language_code: data.language_code,
      ...(data.flow_type != null && { flow_type: data.flow_type }),
      ...(data.upload_category != null && { upload_category: data.upload_category }),
      ...(data.upload_type != null && { upload_type: data.upload_type }),
    };

    if (data.response) {
      botResponses.push({
        sender: "bot",
        text: data.response,
        time: getCurrentTime(),
        ...meta,
      });
    }
    if (data.link) {
      botResponses.push({
        sender: "bot",
        text: constructFullUrl(data.link),
        time: getCurrentTime(),
        language: data.language,
        language_code: data.language_code,
      });
    }
    if (data.general_link) {
      const generalFilename = filenameFromGeneralLink(data.general_link);
      pendingGeneralInsuranceUploadRef.current = {
        templateFileName: generalFilename,
        finalResponses: data.final_responses ?? null,
      };
      const fullUrl = resolveGeneralDocumentUrl(data.general_link);
      if (fullUrl) {
        botResponses.push({
          sender: "bot",
          text: generalFilename,
          time: getCurrentTime(),
          language: data.language,
          language_code: data.language_code,
          generalDownloadUrl: fullUrl,
          generalDownloadFilename: generalFilename,
        });
      }
    }
    if (data.review_message) {
      botResponses.push({
        sender: "bot",
        text: data.review_message,
        time: getCurrentTime(),
        language: data.language,
        language_code: data.language_code,
      });
    }
    if (data.review_link) {
      botResponses.push({
        sender: "bot",
        text: constructFullUrl(data.review_link),
        time: getCurrentTime(),
        language: data.language,
        language_code: data.language_code,
        isReviewLink: true,
      });
    }
    if (data.question) {
      botResponses.push({
        sender: "bot",
        text: data.question,
        time: getCurrentTime(),
        ...meta,
      });
    }
    if (data.example) {
      botResponses.push({
        sender: "bot",
        text: data.example,
        time: getCurrentTime(),
        language: data.language,
        language_code: data.language_code,
      });
    }
    if (data.pdf_link) {
      botResponses.push({
        sender: "bot",
        text: constructFullUrl(data.pdf_link),
        time: getCurrentTime(),
        language: data.language,
        language_code: data.language_code,
      });
    }
    if (data.document_name) {
      botResponses.push({
        sender: "bot",
        text: `Document ${data.document_name} is ready.`,
        time: getCurrentTime(),
        language: data.language,
        language_code: data.language_code,
      });
    }
    return botResponses;
  };

  const sendHiddenMessage = async () => {
    setLoading(true);
    try {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Hi there! My name is Insura from Wehbe Insurance Broker, your AI insurance assistant. I will be happy to assist you with your insurance requirements.",
          time: getCurrentTime(),
        },
        {
          sender: "bot",
          text: "Before we proceed, may I know your name?",
          time: getCurrentTime(),
        },
      ]);
      setAwaitingName(true);
    } catch (error) {
      console.error("Error sending hidden message:", error);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: getTranslation('errorSendingMessage', langCode),
          time: getCurrentTime(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sendInitialTrigger = async (name) => {
    try {
      const response = await axiosInstance.post("/chat/", {
        message: "Hey",
        user_id: name,
      });

      setMessages((prev) => [
        ...prev,
        ...buildBotMessagesFromChatResponse(response.data),
      ]);

      setOptions(
        response.data.options ? response.data.options.split(", ") : []
      );
      setDocumentOptions(
        response.data.document_options &&
          typeof response.data.document_options === "string"
          ? response.data.document_options.split(", ")
          : Array.isArray(response.data.document_options)
          ? response.data.document_options
          : []
      );
    } catch (error) {
      console.error("Error triggering initial message:", error);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Sorry, something went wrong. Please try again later!",
          time: getCurrentTime(),
        },
      ]);
    }
  };

  const handleSendMessage = async (
    extractedData = null,
    isDocumentCompleted = false,
    dropdownSelection = null
  ) => {
    console.log("handleSendMessage called with:", {
      extractedData,
      isDocumentCompleted,
    });

    const getCurrentTime = () => {
      return new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    };

    const isCircularReference = (obj, seen = new WeakSet()) => {
      if (obj && typeof obj === "object") {
        if (seen.has(obj)) {
          return true;
        }
        seen.add(obj);
        for (const key in obj) {
          if (isCircularReference(obj[key], seen)) {
            return true;
          }
        }
      }
      return false;
    };

    const sanitizeData = (value, seen = new WeakSet()) => {
      if (value === null || typeof value !== "object") {
        return value;
      }

      if (Array.isArray(value)) {
        return value.map((item) => sanitizeData(item, seen));
      }

      if (
        value instanceof Element ||
        value instanceof HTMLElement ||
        value === window ||
        value === document ||
        typeof value === "function" ||
        isCircularReference(value, seen)
      ) {
        return null;
      }

      const sanitized = {};
      seen.add(value);
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = sanitizeData(val, seen);
      }
      return sanitized;
    };

    const formatMessageText = (extractedData, input) => {
      if (extractedData) {
        const sanitized = sanitizeData(extractedData);
        const endpoint = lastSuccessfulExtractEndpointRef.current;
        const docType =
          endpoint && EXTRACT_ENDPOINT_TO_CHAT_DOCUMENT_TYPE[endpoint];
        if (
          docType &&
          sanitized &&
          typeof sanitized === "object" &&
          !Array.isArray(sanitized)
        ) {
          const payload = {
            ...sanitized,
            document_type: sanitized.document_type ?? docType,
          };
          return JSON.stringify(payload);
        }
        return JSON.stringify(sanitized);
      }
      return input ? input.trim() : "";
    };

    try {
      const messageText = isDocumentCompleted
        ? "Download completed"
        : dropdownSelection
        ? dropdownSelection
        : formatMessageText(extractedData, input);
      if (!messageText) return;

      const userMessage = {
        sender: "user",
        text: messageText,
        time: getCurrentTime(),
      };

      const displayMessageText = extractedData
        ? getTranslation('documentUploadSuccess', langCode)
        : messageText;

      setMessages((prev) => [
        ...prev,
        {
          sender: "user",
          text: displayMessageText,
          time: getCurrentTime(),
        },
      ]);

      if (!extractedData && !isDocumentCompleted) {
        setInput("");
      }

      if (awaitingName) {
        setUserId(messageText);
        setAwaitingName(false);
        sendInitialTrigger(messageText);
        return;
      }

      setLoading(true);

      if (isDocumentCompleted) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const response = await axiosInstance.post("/chat/", {
        message: messageText,
        user_id: userId,
        is_extracted_info: Boolean(extractedData),
      });

      const botResponses = buildBotMessagesFromChatResponse(response.data);

      if (response.data.dropdown) {
        if (Array.isArray(response.data.dropdown.options)) {
          setDropdownOptions(response.data.dropdown.options);
          if (response.data.dropdown.placeholder) {
            setDropdownPlaceholder(response.data.dropdown.placeholder);
          }
        } else if (typeof response.data.dropdown === "string") {
          setDropdownOptions(response.data.dropdown.split(", "));
        }
      } else {
        setDropdownOptions([]);
      }

      setMessages((prev) => [...prev, ...botResponses]);
      setOptions(
        response.data.options ? response.data.options.split(", ") : []
      );
      setDocumentOptions(
        response.data.document_options &&
          typeof response.data.document_options === "string"
          ? response.data.document_options.split(", ")
          : Array.isArray(response.data.document_options)
          ? response.data.document_options
          : []
      );

      if (extractedData) {
        setExtractedInfo(null);
        lastSuccessfulExtractEndpointRef.current = null;
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: getTranslation('errorSendingMessage', langCode),
          time: getCurrentTime(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = (url, filename) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePDFDownload = async (message) => {
    // If the user has not provided a name yet, skip sending the chat event
    if (!userId) {
      return;
    }
    // Add a user message indicating PDF was downloaded
    const userMessage = {
      sender: "user",
      text: message,
      time: getCurrentTime(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Send the message to the chat endpoint
    try {
      const response = await axiosInstance.post("/chat/", {
        message: message,
        user_id: userId,
      });

      const botResponses = buildBotMessagesFromChatResponse(response.data);

      if (response.data.dropdown) {
        if (Array.isArray(response.data.dropdown.options)) {
          setDropdownOptions(response.data.dropdown.options);
          if (response.data.dropdown.placeholder) {
            setDropdownPlaceholder(response.data.dropdown.placeholder);
          }
        } else if (typeof response.data.dropdown === "string") {
          setDropdownOptions(response.data.dropdown.split(", "));
        }
      } else {
        setDropdownOptions([]);
      }

      setMessages((prev) => [...prev, ...botResponses]);
      setOptions(
        response.data.options ? response.data.options.split(", ") : []
      );
      setDocumentOptions(
        response.data.document_options &&
          typeof response.data.document_options === "string"
          ? response.data.document_options.split(", ")
          : Array.isArray(response.data.document_options)
          ? response.data.document_options
          : []
      );

    } catch (error) {
      console.error("Error sending PDF download message:", error);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Sorry, something went wrong. Please try again.",
          time: getCurrentTime(),
        },
      ]);
    }
  };

  const handleSubmitExtractedInfo = () => {
    if (extractedInfo) {
      handleSendMessage(extractedInfo);
    }
  };

  const handleOptionClick = async (option) => {
    const userMessage = {
      sender: "user",
      text: option,
      time: getCurrentTime(),
    };
    setMessages((prev) => [...prev, userMessage]);

    setLoading(true);
    try {
      const response = await axiosInstance.post("/chat/", {
        message: option,
        user_id: userId,
      });

      setMessages((prev) => [
        ...prev,
        ...buildBotMessagesFromChatResponse(response.data),
      ]);

      setOptions(
        response.data.options ? response.data.options.split(", ") : []
      );
      setDocumentOptions(
        response.data.document_options &&
          typeof response.data.document_options === "string"
          ? response.data.document_options.split(", ")
          : Array.isArray(response.data.document_options)
          ? response.data.document_options
          : []
      );
    } catch (error) {
      console.error("Error sending option:", error);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Sorry, something went wrong. Please try again later!",
          time: getCurrentTime(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentOptionClick = async (option) => {
    setLoading(true);
    try {
      const pdfURL = `${baseURL}/pdf/${option}`;
      downloadPDF(pdfURL, option);

      await handleSendMessage(null, true);
    } catch (error) {
      console.error("Error generating document:", error);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Sorry, something went wrong. Please try again later!",
          time: getCurrentTime(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleChat = () => {
    setIsChatOpen((prev) => {
      const willOpen = !prev;
      if (willOpen && messages.length === 0) sendHiddenMessage();
      return willOpen;
    });
  };

  const handleFileLocate = () => {
    if (file) {
      const fileURL = URL.createObjectURL(file);
      window.open(fileURL, "_blank");
    }
  };

  const handleDropdownSelect = (option) => {
    handleSendMessage(null, false, option);
    setDropdownOptions([]);
  };

  const handleFileRemove = () => {
    setFile(null);
  };

  const ExtractedField = ({ field, value: initialValue, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(initialValue);
    const [editValue, setEditValue] = useState(initialValue);
    const inputRef = useRef(null);
    const isComplexValue =
      initialValue !== null && typeof initialValue === "object";
    const displayValue = isComplexValue
      ? JSON.stringify(initialValue, null, 2)
      : value;
    const isEditable = !isComplexValue;


    const displayName = field
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    useEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus();
      }
    }, [isEditing]);

    const handleEditStart = () => {
      setIsEditing(true);
      setEditValue(value);
    };

    const handleSave = () => {
      setValue(editValue);
      setIsEditing(false);
      if (onSave) {
        onSave(field, editValue);
      }
    };

    const handleCancel = () => {
      setIsEditing(false);
      setEditValue(value);
    };

    const handleKeyDown = (e) => {
      if (e.key === "Enter") {
        handleSave();
      } else if (e.key === "Escape") {
        handleCancel();
      }
    };

    return (
      <div className="flex items-center justify-between p-2 border-b border-gray-200 hover:bg-gray-50">
        <div className="font-medium text-gray-700">{displayName}</div>
        <div className="flex items-center gap-2">
          {isEditable && isEditing ? (
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-200 w-full"
                autoFocus
              />
              <button
                onClick={handleSave}
                className="p-1 text-green-600 hover:text-green-800 transition-colors"
                title="Save"
              >
                <FiCheck className="w-4 h-4" />
              </button>
              <button
                onClick={handleCancel}
                className="p-1 text-red-600 hover:text-red-800 transition-colors"
                title="Cancel"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {isComplexValue ? (
                <pre className="text-gray-900 whitespace-pre-wrap break-words max-w-[18rem]">
                  {displayValue}
                </pre>
              ) : (
                <span className="text-gray-900">{displayValue}</span>
              )}
              {isEditable && (
                <button
                  onClick={handleEditStart}
                  className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
                  title="Edit"
                >
                  <FiEdit2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative">
      <button
        className="fixed bottom-5 right-5 bg-gray-600 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg hover:bg-gray-600 transition"
        onClick={handleToggleChat}
      >
        <img
          className="w-14 h-14 rounded-full object-cover"
          src="Insura.jpeg"
          alt="Chatbot Avatar"
        />
      </button>

      {isChatOpen && (
        <div className="fixed bottom-20 right-5 w-84 bg-white rounded-lg shadow-lg flex flex-col max-h-custom overflow-hidden">
          {/* Header */}
          <div className="bg-white text-black flex items-center justify-end p-4 border-t-8 border-chatbotHeaderColor">
            <div className="flex flex-col items-start space-y-1">
              <h3 className="font-semibold text-lg">Insura</h3>
              {loading && <div className="text-black text-sm">{getTranslation('typing', langCode)}</div>}
            </div>
            <img
              src="/Insura.jpeg"
              alt="Insurance Avatar"
              className="w-10 h-10 rounded-full object-cover ml-4 mr-4"
            />
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`mb-3 ${
                  msg.sender === "bot" ? "text-left" : "text-right"
                }`}
              >
                {/* general_link → button download; review_link uses isReviewLink or URL heuristic */}
                {msg.sender === "bot" && msg.generalDownloadUrl ? (
                  <GeneralDocumentDownloadCard
                    url={msg.generalDownloadUrl}
                    filename={msg.generalDownloadFilename || msg.text}
                    time={msg.time}
                  />
                ) : msg.sender === "bot" &&
                msg.text &&
                (msg.isReviewLink ||
                  (msg.text.includes("review") &&
                    msg.text.startsWith("http"))) ? (
                  <ReviewLinkCard url={msg.text} />
                ) : msg.sender === "bot" &&
                  msg.text.startsWith("http") &&
                  (msg.text.includes(".pdf") || msg.text.includes("pdf-link") || msg.text.includes("/pdf/") || msg.text.includes("/pdf-view/")) ? (
                  <PDFViewerCard url={msg.text} onDownload={handlePDFDownload} />
                ) : (
                  <span
                    className={`relative inline-block px-4 py-6 rounded-lg ${
                      msg.sender === "bot"
                        ? "bg-botBackgroundColor text-black border border-black-500"
                        : "bg-sendColor text-black"
                    }`}
                    style={{ minHeight: "2.5rem", minWidth: "4.7rem" }}
                  >
                    <MessageContentRenderer msg={msg} baseURL={baseURL} />

                    <span className="absolute bottom-1 right-2 text-sm text-gray-500">
                      {msg.time}
                    </span>
                  </span>
                )}
              </div>
            ))}
            {analysisStage && <DocumentAnalysisLoading stage={analysisStage} />}
            {/* Extracted Information Displays */}
            {extractedInfo && (
              <div className="mb-4 p-4 bg-white rounded-lg shadow border border-gray-200">
                <h3 className="font-semibold mb-2 text-lg">
                  Extracted Information
                </h3>
                <div className="space-y-2">
                  {Object.entries(extractedInfo).map(([field, value]) => (
                    <ExtractedField
                      key={field}
                      field={field}
                      value={value}
                      onSave={handleSaveField}
                    />
                  ))}
                </div>
                <div className="flex justify-end mt-4">
                  <button
                    onClick={handleSubmitExtractedInfo}
                    disabled={loading}
                    className={`px-4 py-2 bg-sendColor text-black rounded-lg hover:bg-sendColor transition ${
                      loading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {getTranslation('submitAll', langCode)}
                  </button>
                </div>
              </div>
            )}

            {loading && messages.length > 0 && (
              <div className="mb-3 text-left">
                <div className="inline-block px-4 py-2 rounded-lg bg-gray-200 text-black">
                  <div className="flex space-x-1">
                    <div className="h-2 w-2 rounded-full bg-gray-500 animate-bounce"></div>
                    <div className="h-2 w-2 rounded-full bg-gray-500 animate-bounce delay-200"></div>
                    <div className="h-2 w-2 rounded-full bg-gray-500 animate-bounce delay-400"></div>
                  </div>
                </div>
              </div>
            )}

            {[...options, ...documentOptions].map((option, index) => (
              <button
                key={index}
                onClick={() => {
                  if (documentOptions.includes(option)) {
                    handleDocumentOptionClick(option);
                  } else {
                    handleOptionClick(option);
                  }
                }}
                className="block w-full bg-gray-200 text-black text-sm py-2 px-4 rounded-lg mb-2 hover:bg-gray-300 transition"
              >
                {option}
              </button>
            ))}
            {dropdownOptions.length > 0 && (
              <div className="mb-4">
                <CustomDropdown
                  options={dropdownOptions}
                  onSelect={handleDropdownSelect}
                  placeholder={dropdownPlaceholder}
                  className="w-full"
                />
              </div>
            )}

            <div ref={messagesEndRef}></div>
          </div>

          {/* Input */}
          <div className="pb-4">
            {(uploadLoading || loading) && (
              <div className="px-4 py-2">
                <div className="animate-pulse flex space-x-4">
                  <div className="flex-1 space-y-4 py-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* {file && (
              <div className="flex items-center justify-between bg-gray-100 p-2 rounded-lg">
                <span className="text-gray-700 text-sm">{file.name}</span>
                <div className="flex space-x-2">
                  <button
                    className="text-blue-500 text-sm underline hover:text-blue-700"
                    onClick={handleFileLocate}
                  >
                    View
                  </button>
                  <AiOutlineClose
                    className="h-5 w-5 text-gray-500 hover:text-black cursor-pointer"
                    onClick={handleFileRemove}
                  />
                </div>
              </div>
            )} */}

            <div className="border-t border-gray-300 mt-2 pt-4 flex items-center w-full">
              <label className="mr-2 cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileAttach}
                  accept="image/*,.pdf,.doc,.docx,.xlsx,.xls"
                  multiple
                />
                <AiOutlinePaperClip
                  className={`pl-2 h-8 w-8 text-gray-500 hover:text-black ${
                    uploadLoading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                />
              </label>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={getTranslation('inputPlaceholder', langCode)}
                className="flex-1 p-2 border rounded-lg border-gray-300 focus:outline-none focus:ring focus:ring-gray-200"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSendMessage();
                  }
                }}
              />
              <button
                onClick={() => handleSendMessage()}
                className={`ml-2 px-4 py-3 mr-3 bg-sendColor text-black rounded-lg hover:bg-sendColor transition ${
                  uploadLoading || loading
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
                disabled={uploadLoading || loading}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
