// VoiceTutorRecorder.jsx
import React, { useRef, useState } from "react";

const API_BASE = "https://ai-tutor-backend-hfu2.onrender.com"; // your Node.js backend

function VoiceTutorRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [answer, setAnswer] = useState("");
  const [audioUrl, setAudioUrl] = useState("");

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // 🎙️ Start recording from mic
  const startRecording = async () => {
    try {
      setTranscript("");
      setAnswer("");
      setAudioUrl("");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm", // works well in Chrome
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });

        // Convert Blob → File so multer sees "file" with a name
        const file = new File([blob], "recording.webm", { type: "audio/webm" });

        // Upload to backend
        await uploadToServer(file);
      };

      mediaRecorder.start();
      setIsRecording(true);
      console.log("🎙️ Recording started");
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Check browser permissions.");
    }
  };

  // ⏹️ Stop recording
  const stopRecording = () => {
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
      console.log("⏹️ Recording stopped");
    }
  };

  // 📤 Upload recorded file to Node.js /uploadFile
  const uploadToServer = async (file) => {
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file); // must match multer.single("file")
      formData.append("mode", "general"); // or "math" / "english" / "dsa"

      const res = await fetch(`${API_BASE}/uploadFile`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      console.log("Server response:", data);

      setTranscript(data.transcript || "");
      setAnswer(data.claudeAnswer || "");

      if (data.audioUrl) {
        const fullUrl = `${API_BASE}${data.audioUrl}`;
        setAudioUrl(fullUrl);

        // auto play AI voice
        const audio = new Audio(fullUrl);
        audio.play();
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Error uploading/processing audio");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 600 }}>
      <h2>🎓 AI Voice Tutor</h2>
      <p>Press "Start", ask your question, then press "Stop".</p>

      <div style={{ marginBottom: 12 }}>
        {!isRecording ? (
          <button onClick={startRecording} disabled={loading}>
            🎙️ Start Recording
          </button>
        ) : (
          <button onClick={stopRecording}>⏹️ Stop & Send</button>
        )}
      </div>

      {loading && <p>⏳ Processing your question…</p>}

      {transcript && (
        <div style={{ marginTop: 16 }}>
          <h4>🗣️ You said:</h4>
          <p>{transcript}</p>
        </div>
      )}

      {answer && (
        <div style={{ marginTop: 16 }}>
          <h4>🤖 Tutor Answer:</h4>
          <p>{answer}</p>
        </div>
      )}

      {audioUrl && (
        <div style={{ marginTop: 16 }}>
          <h4>🔊 Listen Again:</h4>
          <audio controls src={audioUrl} />
        </div>
      )}
    </div>
  );
}

export default VoiceTutorRecorder;
