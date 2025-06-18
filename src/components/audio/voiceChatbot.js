import React, { useState, useEffect, useRef } from "react";
import axiosInstance, { baseURL } from "../../axiosInstance";
import {
  AiOutlinePaperClip,
  AiOutlineClose,
  AiOutlineAudio,
  AiOutlineSend,
} from "react-icons/ai";
import { FiEdit2, FiCheck, FiX } from "react-icons/fi";
import MessageContentRenderer from "../Common/DocumentImage";
import DocumentAnalysisLoading from "../Common/DocumentAnalysisLoading";
import CustomDropdown from "../Common/CustomDropdown";
import ReviewLinkCard from "../Common/ReviewLinkCard";
import WhatsAppAudioPlayer from "./WhatsAppAudioPlayer";
import VoiceRecorder from "./VoiceRecorder";

const VoiceChatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [documentOptions, setDocumentOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("");
  const [awaitingName, setAwaitingName] = useState(false);
  const messagesEndRef = useRef(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [extractedInfo, setExtractedInfo] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [file, setFile] = useState(null);
  const [analysisStage, setAnalysisStage] = useState(null);
  const [dropdownOptions, setDropdownOptions] = useState([]);
  const [dropdownPlaceholder, setDropdownPlaceholder] =
    useState("Select an option");
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState("");
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

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
      setUploadLoading(true);
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
      console.error("Error details:", {
        message: error.message,
        response: error.response,
        request: error.request,
      });
      setAnalysisStage("error");
      const errorMessage =
        error.response?.data?.message ||
        "Sorry, I couldn't process your document. Please try again.";
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
      setUploadLoading(false);
      e.target.value = null;
    }

    // Helper function to upload the file
    async function uploadFile(fileToUpload) {
      const formData = new FormData();
      formData.append("file", fileToUpload);
      formData.append("user_id", userId);

      // Debug log
      console.log("FormData contents:", ...formData);

      // Determine document type and appropriate endpoint
      const endpoint = determineEndpoint(fileToUpload);

      // Make API call
      const response = await axiosInstance.post(endpoint, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        retries: 3,
      });

      // Set analysis stage to complete - this will show "Analysis complete!" to the user
      setAnalysisStage("complete");
      console.log("Extracted Information:", response.data);
      setExtractedInfo(response.data);

      // Add a slight delay before showing the confirmation message
      // This ensures the user sees the "Analysis complete!" notification
      setTimeout(() => {
        // Hide analysis stage
        setAnalysisStage(null);

        // Update messages based on document type
        updateMessageForDocumentType(endpoint);
      }, 500);
    }

    // Helper to determine the correct endpoint based on conversation state
    function determineEndpoint(fileToUpload) {
      // Get the last bot message to determine what was most recently requested
      const recentMessages = [...messages].reverse();
      const lastBotMessage = recentMessages.find((msg) => msg.sender === "bot");

      // First, check if we have a direct match from the most recent bot message
      if (lastBotMessage) {
        if (
          lastBotMessage.text.includes(
            "Please Upload Front Page of Your Document"
          )
        ) {
          return "/extract-front-page-emirate/";
        }
        // Check for driving license request in the most recent message
        if (
          lastBotMessage.text.includes("Please Upload Your Driving license") ||
          lastBotMessage.text.includes(
            "Let's move back to Please Upload Your Driving license"
          ) ||
          lastBotMessage.text.includes(
            "Thank you, Please upload your driving license"
          )
        ) {
          return "/extract-licence/";
        }

        // Check for mulkiya request in the most recent message
        if (
          lastBotMessage.text.includes("Please Upload Mulkiya") ||
          lastBotMessage.text.includes(
            "Let's Move back to Please Upload Mulkiya"
          ) ||
          lastBotMessage.text.includes("move on to: Please Upload Mulkiya")
        ) {
          return "/extract-mulkiya/";
        }

        // Check for back page request in the most recent message
        if (
          lastBotMessage.text.includes(
            "Please Upload Back Page of Your Document"
          )
        ) {
          return "/extract-back-page-emirate/";
        }
      }

      const frontPageRequested = messages.some(
        (msg) =>
          msg.sender === "bot" &&
          msg.text.includes("Please Upload Front Page of Your Document")
      );
      const frontPageCompleted = messages.some(
        (msg) =>
          msg.sender === "bot" &&
          msg.text.includes("Thank you for uploading the Front Page")
      );

      // If no direct match from the most recent message, fall back to the previous logic
      // Check document request status in conversation history
      const licenseRequested = messages.some(
        (msg) =>
          msg.sender === "bot" &&
          (msg.text.includes("Please Upload Your Driving license") ||
            msg.text.includes(
              "Let's move back to Please Upload Your Driving license"
            ) ||
            msg.text.includes("Thank you, Please upload your driving license"))
      );

      const licenseCompleted = messages.some(
        (msg) =>
          msg.sender === "bot" &&
          msg.text.includes("Thank you for uploading the Driving license")
      );

      const mulkiyaRequested = messages.some(
        (msg) =>
          msg.sender === "bot" &&
          (msg.text.includes("Please Upload Mulkiya") ||
            msg.text.includes("Let's Move back to Please Upload Mulkiya") ||
            msg.text.includes("move on to: Please Upload Mulkiya"))
      );

      const mulkiyaCompleted = messages.some(
        (msg) =>
          msg.sender === "bot" &&
          msg.text.includes("Thank you for uploading the Mulkiya")
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
      if (frontPageRequested && !frontPageCompleted) {
        return "/extract-front-page-emirate/";
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

    // Helper to update messages based on document type
    function updateMessageForDocumentType(endpoint) {
      let confirmationMessage = "Thank you for uploading the document.";
      let nextStep = "";

      // Determine confirmation message based on the endpoint
      if (endpoint === "/extract-front-page-emirate/") {
        confirmationMessage = "Thank you for uploading the Front Page";
      } else {
        // For Emirates ID front page, check if we need to request the back page
        const frontPageRequested = messages.some(
          (msg) =>
            msg.sender === "bot" &&
            msg.text.includes("Please Upload Front Page of Your Document")
        );

        const frontPageCompleted = messages.some(
          (msg) =>
            msg.sender === "bot" &&
            msg.text.includes("Thank you for uploading the Front Page")
        );

        const licenseRequested = messages.some(
          (msg) =>
            msg.sender === "bot" &&
            msg.text.includes("Please Upload Your Driving license")
        );

        const licenseCompleted = messages.some(
          (msg) =>
            msg.sender === "bot" &&
            msg.text.includes("Thank you for uploading the Driving license")
        );

        if (!licenseRequested && !licenseCompleted) {
          nextStep =
            " Now, let's move on to: Please Upload Your Driving license";
        } else if (!frontPageRequested && !frontPageCompleted) {
          nextStep =
            " Now, let's move on to: Please Upload front Page of Your Document";
        }
      }
      if (endpoint === "/extract-licence/") {
        confirmationMessage = "Thank you for uploading the Driving license";

        // Check if mulkiya is the next required document
        const mulkiyaRequested = messages.some(
          (msg) =>
            msg.sender === "bot" && msg.text.includes("Please Upload Mulkiya")
        );

        const mulkiyaCompleted = messages.some(
          (msg) =>
            msg.sender === "bot" &&
            msg.text.includes("Thank you for uploading the Mulkiya")
        );

        if (!mulkiyaRequested && !mulkiyaCompleted) {
          nextStep = " Now, let's move on to: Please Upload Mulkiya";
        }
      } else if (endpoint === "/extract-mulkiya/") {
        confirmationMessage = "Thank you for uploading the Mulkiya";

        // Check if back page is the next required document
        const backPageRequested = messages.some(
          (msg) =>
            msg.sender === "bot" &&
            msg.text.includes("Please Upload Back Page of Your Document")
        );

        const backPageCompleted = messages.some(
          (msg) =>
            msg.sender === "bot" &&
            msg.text.includes("Thank you for uploading the Back Page")
        );

        if (!backPageRequested && !backPageCompleted) {
          nextStep =
            " Now, let's move on to: Please Upload Back Page of Your Document";
        }
      } else if (endpoint === "/extract-back-page-emirate/") {
        confirmationMessage = "Thank you for uploading the Back Page";

        // Add any final step or completion message here if needed
        nextStep = " Your document processing is now complete.";
      } else {
        // For Emirates ID front page, check if we need to request the back page
        const backPageRequested = messages.some(
          (msg) =>
            msg.sender === "bot" &&
            msg.text.includes("Please Upload Back Page of Your Document")
        );

        const backPageCompleted = messages.some(
          (msg) =>
            msg.sender === "bot" &&
            msg.text.includes("Thank you for uploading the Back Page")
        );

        const licenseRequested = messages.some(
          (msg) =>
            msg.sender === "bot" &&
            msg.text.includes("Please Upload Your Driving license")
        );

        const licenseCompleted = messages.some(
          (msg) =>
            msg.sender === "bot" &&
            msg.text.includes("Thank you for uploading the Driving license")
        );

        if (!licenseRequested && !licenseCompleted) {
          nextStep =
            " Now, let's move on to: Please Upload Your Driving license";
        } else if (!backPageRequested && !backPageCompleted) {
          nextStep =
            " Now, let's move on to: Please Upload Back Page of Your Document";
        }
      }

      // Update conversation with confirmation and next step
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: confirmationMessage + nextStep,
          time: getCurrentTime(),
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
          text: "Sorry, something went wrong. Please try again later!",
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
        { sender: "bot", text: response.data.response, time: getCurrentTime() },
        ...(response.data.question
          ? [
              {
                sender: "bot",
                text: response.data.question,
                time: getCurrentTime(),
              },
            ]
          : []),
      ]);

      setOptions(
        response.data.options ? response.data.options.split(", ") : []
      );
      setDocumentOptions(
        response.data.document_options
          ? response.data.document_options.split(", ")
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
        return JSON.stringify(sanitizeData(extractedData));
      }
      return input ? input.trim() : "";
    };

    // If no input, no extracted data, no document completion, no dropdown selection, and no recorded audio, return early
    if (
      !extractedData &&
      !isDocumentCompleted &&
      !dropdownSelection &&
      !input?.trim() &&
      !recordedAudio
    ) {
      return;
    }

    try {
      let messageText;
      let userMessage;
      let displayMessageText;

      // Handle voice message
      if (recordedAudio) {
        displayMessageText = "Voice Message";
        userMessage = {
          sender: "user",
          text: displayMessageText,
          time: getCurrentTime(),
          audio: URL.createObjectURL(recordedAudio),
          audioDuration: `${Math.floor(recordingTime / 60)}:${String(
            recordingTime % 60
          ).padStart(2, "0")}`,
        };

        // Handle audio transcription
        const formData = new FormData();
        formData.append(
          "file",
          recordedAudio,
          `voice_message.${mediaRecorder.mimeType.split("/")[1]}`
        );
        try {
          const response = await axiosInstance.post("/transcribe/", formData);
          if (response.data.transcript) {
            messageText = response.data.transcript.trim();
            setTranscript(messageText);
          } else {
            throw new Error("No transcript received");
          }
        } catch (transcriptError) {
          console.error("Transcription error:", transcriptError);
          setMessages((prev) => [
            ...prev,
            {
              sender: "bot",
              text: "Failed to transcribe audio. Please try again.",
              time: getCurrentTime(),
            },
          ]);
          setLoading(false);
          return;
        }
      } else {
        // Handle text message, extracted data, document completion, or dropdown
        messageText = isDocumentCompleted
          ? "Download completed"
          : dropdownSelection
          ? dropdownSelection
          : formatMessageText(extractedData, input);
        if (!messageText) return;

        displayMessageText = extractedData
          ? "Document Upload successfully"
          : messageText;

        userMessage = {
          sender: "user",
          text: displayMessageText,
          time: getCurrentTime(),
        };
      }

      setMessages((prev) => [...prev, userMessage]);

      if (!extractedData && !isDocumentCompleted) {
        setInput("");
      }

      // Reset voice/audio related states
      if (recordedAudio) {
        setRecordedAudio(null);
        setRecordingTime(0);
        setTranscript("");
      }

      if (awaitingName) {
        setUserId(messageText);
        setAwaitingName(false);
        await sendInitialTrigger(messageText);
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

      let botResponses = [];
      if (response.data.response) {
        botResponses.push({
          sender: "bot",
          text: response.data.response,
          time: getCurrentTime(),
        });
      }

      if (response.data.link) {
        botResponses.push({
          sender: "bot",
          text: response.data.link,
          time: getCurrentTime(),
        });
      }

      if (response.data.question) {
        botResponses.push({
          sender: "bot",
          text: response.data.question,
          time: getCurrentTime(),
        });
      }

      if (response.data.example) {
        botResponses.push({
          sender: "bot",
          text: response.data.example,
          time: getCurrentTime(),
        });
      }

      if (response.data.review_message) {
        botResponses.push({
          sender: "bot",
          text: response.data.review_message,
          time: getCurrentTime(),
        });
      }

      if (response.data.review_link) {
        botResponses.push({
          sender: "bot",
          text: response.data.review_link,
          time: getCurrentTime(),
        });
      }

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

      if (response.data.document_name) {
        botResponses.push({
          sender: "bot",
          text: `Document ${response.data.document_name} is ready.`,
          time: getCurrentTime(),
        });
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
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Sorry, something went wrong. Please try again.",
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
        { sender: "bot", text: response.data.response, time: getCurrentTime() },
        ...(response.data.question
          ? [
              {
                sender: "bot",
                text: response.data.question,
                time: getCurrentTime(),
              },
            ]
          : []),
      ]);

      setOptions(
        response.data.options ? response.data.options.split(", ") : []
      );
      setDocumentOptions(
        response.data.document_options
          ? response.data.document_options.split(", ")
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

  const getSupportedMimeType = () => {
    const mimeTypes = ["audio/ogg", "audio/webm", "audio/mp4", "audio/aac"];
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }
    return null;
  };

  const startRecording = async () => {
    try {
      if (!window.isSecureContext) {
        throw new Error("SecureContextError");
      }

      if (!window.MediaRecorder) {
        throw new Error("MediaRecorderNotSupported");
      }

      const mimeType = getSupportedMimeType();
      if (!mimeType) {
        throw new Error("NoSupportedMimeType");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      let errorMessage = "Failed to access microphone. Please try again.";

      if (error.name === "NotAllowedError") {
        errorMessage =
          "Microphone access denied. Please allow microphone access in your browser settings.";
      } else if (error.name === "NotFoundError") {
        errorMessage =
          "No microphone found. Please ensure a microphone is connected.";
      } else if (error.message === "SecureContextError") {
        errorMessage =
          "Microphone access requires a secure connection (HTTPS). Please access this site over HTTPS.";
      } else if (error.message === "MediaRecorderNotSupported") {
        errorMessage =
          "Your browser does not support audio recording. Please use a modern browser like Chrome or Firefox.";
      } else if (error.message === "NoSupportedMimeType") {
        errorMessage =
          "Your browser does not support any compatible audio formats for recording.";
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: errorMessage,
          time: getCurrentTime(),
        },
      ]);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      clearInterval(timerRef.current);
      setIsRecording(false);
      setOptions([]); // Hide options when voice message is sent

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType;
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size === 0 || recordingTime < 1) {
          setMessages((prev) => [
            ...prev,
            {
              sender: "bot",
              text: "No audio recorded. Please try again.",
              time: getCurrentTime(),
            },
          ]);
          mediaRecorder.stream.getTracks().forEach((track) => track.stop());
          setRecordingTime(0);
          setRecordedAudio(null);
          setTranscript("");
          return;
        }
        setRecordedAudio(audioBlob);
        setRecordingTime(recordingTime); // Ensure recordingTime is preserved
        mediaRecorder.stream.getTracks().forEach((track) => track.stop());

        // Call handleSendMessage to process the audio
        await handleSendMessage();

        const audio = new Audio(URL.createObjectURL(audioBlob));
        let audioDuration = "0:00";

        audio.addEventListener("loadedmetadata", () => {
          const minutes = Math.floor(audio.duration / 60);
          const seconds = Math.floor(audio.duration % 60);
          audioDuration = `${minutes}:${
            seconds < 10 ? "0" + seconds : seconds
          }`;
        });

        // Immediately add the voice message to the chat
        const userMessage = {
          sender: "user",
          text: "Voice Message",
          time: getCurrentTime(),
          audio: URL.createObjectURL(audioBlob),
          audioDuration: audioDuration,
        };
        setMessages((prev) => [...prev, userMessage]);
        setRecordedAudio(audioBlob); // Store the audio blob for processing
        setLoading(true); // Show loading indicator

        const formData = new FormData();
        formData.append(
          "file",
          audioBlob,
          `voice_message.${mimeType.split("/")[1]}`
        );

        try {
          // Step 1: Transcribe the audio
          const transcriptResponse = await axiosInstance.post(
            "/transcribe/",
            formData
          );

          if (!transcriptResponse.data.transcript) {
            throw new Error("No transcript received from server");
          }

          const transcribedText = transcriptResponse.data.transcript.trim();
          setTranscript(transcribedText);

          // Log the transcribed text for debugging
          console.log("Transcribed Text:", transcribedText);

          // Validate the transcribed text (basic check for name-like input)
          if (!transcribedText || transcribedText.length < 2) {
            setMessages((prev) => [
              ...prev,
              {
                sender: "bot",
                text: "I couldn't understand your name. Could you please repeat it clearly?",
                time: getCurrentTime(),
              },
            ]);
            mediaRecorder.stream.getTracks().forEach((track) => track.stop());
            setLoading(false);
            return;
          }

          // Step 2: Send transcript to chat API
          if (awaitingName) {
            setUserId(transcribedText);
            setAwaitingName(false);
            await sendInitialTrigger(transcribedText);
          } else {
            const chatResponse = await axiosInstance.post("/chat/", {
              message: transcribedText,
              user_id: userId,
            });

            // Log the backend response for debugging
            console.log("Backend Response:", chatResponse.data);

            setMessages((prev) => [
              ...prev,
              {
                sender: "bot",
                text: chatResponse.data.response,
                time: getCurrentTime(),
              },
              ...(chatResponse.data.question
                ? [
                    {
                      sender: "bot",
                      text: chatResponse.data.question,
                      time: getCurrentTime(),
                    },
                  ]
                : []),
              ...(chatResponse.data.example
                ? [
                    {
                      sender: "bot",
                      text: chatResponse.data.example,
                      time: getCurrentTime(),
                    },
                  ]
                : []),
            ]);

            setOptions(
              chatResponse.data.options
                ? chatResponse.data.options.split(", ")
                : []
            );
          }
        } catch (error) {
          console.error("Processing voice message error:", error);
          setMessages((prev) => [
            ...prev,
            {
              sender: "bot",
              text: "Failed to process voice message. Please try again in a quieter environment or type your message.",
              time: getCurrentTime(),
            },
          ]);
        } finally {
          mediaRecorder.stream.getTracks().forEach((track) => track.stop());
          setLoading(false);
          setRecordedAudio(null);
          setTranscript("");
        }
      };
    }
  };

  const cancelRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      clearInterval(timerRef.current);
      setIsRecording(false);
      setRecordingTime(0);
      setRecordedAudio(null);
      setTranscript("");
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const ExtractedField = ({ field, value: initialValue, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(initialValue);
    const [editValue, setEditValue] = useState(initialValue);
    const inputRef = useRef(null);

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
          {isEditing ? (
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
              <span className="text-gray-900">{value}</span>
              <button
                onClick={handleEditStart}
                className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
                title="Edit"
              >
                <FiEdit2 className="w-4 h-4" />
              </button>
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
              {loading && <div className="text-black text-sm">Typing...</div>}
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
                {/* Check if the message is a review link */}
                {msg.sender === "bot" &&
                msg.text.includes("review") &&
                msg.text.startsWith("http") ? (
                  <ReviewLinkCard url={msg.text} />
                ) : (
                  <span
                    className={`relative inline-block px-4 py-6 rounded-lg ${
                      msg.sender === "bot"
                        ? "bg-botBackgroundColor text-black border border-black-500"
                        : "bg-sendColor text-black"
                    }`}
                    style={{ minHeight: "2.5rem", minWidth: "4.7rem" }}
                  >
                    {msg.audio ? (
                      <div className="flex flex-col w-full relative">
                        <div className="flex items-center">
                          <WhatsAppAudioPlayer audioSrc={msg.audio} />
                        </div>
                        {/* {msg.audioDuration && (
                          <div className="text-xs text-gray-500 mt-1">
                            {msg.audioDuration}
                          </div>
                        )} */}
                        <span className="absolute bottom-1 right-2 text-sm text-gray-500">
                          {msg.time}
                        </span>
                      </div>
                    ) : (
                      <>
                        <MessageContentRenderer msg={msg} baseURL={baseURL} />
                        <span className="absolute bottom-1 right-2 text-sm text-gray-500">
                          {msg.time}
                        </span>
                      </>
                    )}
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
                    Submit All
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
                disabled={isRecording || loading} // Disable options during recording or loading
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
                  disabled={isRecording || loading} // Disable dropdown during recording or loading
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
              <div className="flex items-center justify-between bg-gray-100 p-2 rounded-lg mx-2">
                <span className="text-gray-700 text-sm">{file.name}</span>
                <div className="flex space-x-2">
                  <button
                    className="text-blue-500 text-sm underline hover:text-blue-700"
                    onClick={handleFileLocate}
                    disabled={isRecording || loading} // Disable file locate during recording or loading
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

            <div className="border-t border-gray-300 mt-2 pt-4 flex items-center w-full px-2">
              <label className="mr-2 cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileAttach}
                  accept="image/*,.pdf,.doc,.docx"
                  multiple
                  disabled={isRecording || loading || uploadLoading} // Disable file input during recording or loading
                />
                <AiOutlinePaperClip
                  className={`pl-2 h-8 w-8 ${
                    isRecording || loading || uploadLoading
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-500 hover:text-black"
                  }`}
                />
              </label>

              {isRecording ? (
                <VoiceRecorder
                  recordingTime={recordingTime}
                  cancelRecording={cancelRecording}
                />
              ) : (
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 p-2 border rounded-lg border-gray-300 focus:outline-none focus:ring focus:ring-gray-200"
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !isRecording &&
                      !loading &&
                      !uploadLoading
                    ) {
                      handleSendMessage();
                    }
                  }}
                  disabled={isRecording || loading || uploadLoading} // Disable input during recording or loading
                />
              )}

              <div className="ml-2 mr-2">
                {input.trim() ? (
                  <button
                    onClick={() => handleSendMessage()}
                    className={`p-2 rounded-full ${
                      isRecording || loading || uploadLoading
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-sendColor text-black hover:bg-sendColor/90"
                    } transition`}
                    disabled={isRecording || loading || uploadLoading} // Disable send button during recording or loading
                  >
                    <AiOutlineSend className="h-6 w-6" />
                  </button>
                ) : (
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`p-2 rounded-full ${
                      isRecording
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : loading || uploadLoading
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-gray-200 text-black hover:bg-gray-300"
                    } transition`}
                    disabled={loading || uploadLoading} // Disable voice button during loading
                  >
                    <AiOutlineAudio className="h-6 w-6" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceChatbot;
