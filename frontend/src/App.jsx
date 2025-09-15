import { useEffect, useRef, useState } from "react";
import { useMicVAD } from "@ricky0123/vad-react";
import "./App.css";

export default function App() {
  const vadRef = useRef(null);
  const websocketRef = useRef(null);
  useEffect(() => {
    const websocket = new WebSocket("http://localhost:8080/ws");
    websocketRef.current = websocket;

    websocketRef.current.onopen = () => {
      console.log("Connection established with websocket successfully");
    };

    websocket.onmessage = (event) => {
      const response_data = JSON.parse(event.data);
      const phase = response_data.phase;
      switch (phase) {
        case "chunk":
          break;
      }
    };
  });
  const vad = useMicVAD({
    startOnLoad: false,
    onSpeechStart: () => {},
    onFrameProcessed: ({ isSpeech, notSpeech }, frame) => {
      if (vad.userSpeaking) {
        // convert to pcm 16 audio chunks
        const pcm16chunk = float32ToPCM16(frame);
        console.log("Pcm 16 chunk: ", pcm16chunk);
        if (pcm16chunk) {
          try {
            websocketRef.current.send(pcm16chunk);
          } catch (error) {
            console.error(
              "Some error occured while sending audio via websocket: ",
              error
            );
          }
        }
        websocketRef.current.send(frame);
      }
    },
  });
  vadRef.current = vad;

  // Convert float32 array to PCM 16-bit little-endian
  const float32ToPCM16 = (float32Array) => {
    const pcm16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      // Clamp to [-1, 1] and convert to 16-bit signed integer
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      pcm16[i] = sample * 0x7fff;
    }
    return pcm16.buffer; // Return as ArrayBuffer for WebSocket
  };

  return (
    <div className="flex flex-col items-center gap-y-2 py-3">
      <div className="title-box">
        <p className="font-medium text-xl">Master of Ceremony</p>
      </div>
      <button
        onClick={vadRef.current.start()}
        className="px-3 py-2 bg-blue-300 hover:bg-pink-500 rounded-md cursor-pointer"
      >
        Click here to start the ceremony
      </button>
    </div>
  );
}
