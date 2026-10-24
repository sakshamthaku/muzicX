const chat = document.getElementById("chat");
const form = document.getElementById("chatForm");
const input = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const micButton = document.getElementById("micButton");
const voiceButton = document.getElementById("voiceButton");
const stopButton = document.getElementById("stopButton");
const statusText = document.getElementById("statusText");
const avatar = document.getElementById("avatar");

let voiceEnabled = true;
let recognition = null;
let isListening = false;

function setStatus(text, mode = "") {
  statusText.textContent = text;
  avatar.classList.remove("speaking", "listening");

  if (mode) {
    avatar.classList.add(mode);
  }
}

function addMessage(role, text) {
  const bubble = document.createElement("div");
  bubble.className = `message ${role}`;

  const label = document.createElement("strong");
  label.textContent = role === "user" ? "YOU" : "JARVIS";

  bubble.appendChild(label);
  bubble.appendChild(document.createTextNode(text));
  chat.appendChild(bubble);
  chat.scrollTop = chat.scrollHeight;
}

function speak(text) {
  if (!voiceEnabled || !("speechSynthesis" in window)) {
    setStatus("Ready for your next question.");
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-IN";
  utterance.rate = 1;
  utterance.pitch = 1;

  utterance.onstart = () => {
    setStatus("JARVIS is speaking...", "speaking");
  };

  utterance.onend = () => {
    setStatus("Ready for your next question.");
  };

  utterance.onerror = () => {
    setStatus("Voice unavailable. You can still read the answer.");
  };

  window.speechSynthesis.speak(utterance);
}

async function askJarvis(message) {
  addMessage("user", message);
  setStatus("Thinking...");
  sendButton.disabled = true;
  micButton.disabled = true;

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "The request failed.");
    }

    addMessage("ai", data.reply);
    speak(data.reply);
  } catch (error) {
    const message = error.message || "Could not connect to JARVIS.";
    addMessage("ai", `Sorry, I encountered an error: ${message}`);
    setStatus("Check that Ollama and the backend are running.");
  } finally {
    sendButton.disabled = false;
    micButton.disabled = false;
    input.focus();
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = input.value.trim();
  if (!message || sendButton.disabled) return;

  input.value = "";
  await askJarvis(message);
});

voiceButton.addEventListener("click", () => {
  voiceEnabled = !voiceEnabled;
  voiceButton.textContent = voiceEnabled
    ? "🔊 Voice: On"
    : "🔇 Voice: Off";

  if (!voiceEnabled && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    setStatus("Voice disabled. Text chat is still available.");
  }
});

stopButton.addEventListener("click", () => {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  setStatus("Speech stopped.");
});

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = "en-IN";
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onstart = () => {
    isListening = true;
    micButton.textContent = "Listening...";
    setStatus("I'm listening. Speak now.", "listening");
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    input.value = transcript;
    form.requestSubmit();
  };

  recognition.onerror = (event) => {
    setStatus(`Microphone issue: ${event.error}. Try typing instead.`);
  };

  recognition.onend = () => {
    isListening = false;
    micButton.textContent = "🎙 Speak";
    avatar.classList.remove("listening");
  };

  micButton.addEventListener("click", () => {
    if (isListening) {
      recognition.stop();
      return;
    }

    try {
      recognition.start();
    } catch {
      setStatus("Microphone is busy. Please try again.");
    }
  });
} else {
  micButton.disabled = true;
  micButton.textContent = "Voice input unsupported";
  setStatus("Type a message, or try a browser with speech recognition support.");
}
