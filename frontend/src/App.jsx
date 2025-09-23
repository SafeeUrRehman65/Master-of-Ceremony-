import { useEffect, useRef, useState } from "react";
import { useMicVAD } from "@ricky0123/vad-react";
import { handleAudioError } from "./utils/utilities";
import "./App.css";

export default function MoC() {
  const vadRef = useRef(null);
  const websocketRef = useRef(null);
  const audioRef = useRef(null);
  const [notification, setNotification] = useState(" ");
  const speakerWaitingTimeoutRef = useRef(null);

  useEffect(() => {
    const websocket = new WebSocket("ws://localhost:8080/ws");

    websocketRef.current = websocket;

    websocketRef.current.onopen = () => {
      console.log("Connection established with websocket successfully");
    };

    // attach an onerror event listener to audio source
    if (audioRef.current) {
      audioRef.current.onerror = () => {};
    }
    websocket.onmessage = (event) => {
      const response_data = JSON.parse(event.data);
      console.log("Data from backend", response_data);
      const type = response_data.type;
      switch (type) {
        case "current_state":
          const current_state_message = response_data.message;
          if (current_state_message) {
            setNotification(current_state_message);
            if (response_data.phase === "listen") {
              let speakingCheckInterval = null;

              // check if user has started speaking

              const checkSpeaking = () => {
                console.log("User speaking", vadRef.current.userSpeaking);
                if (!vadRef.current.userSpeaking) {
                  setNotification("Kindly speak, audience is waiting...");
                  if (!speakerWaitingTimeoutRef.current) {
                    speakerWaitingTimeoutRef.current = setTimeout(() => {
                      setNotification(
                        "Speaker is unavailable, moving on to the next speaker"
                      );
                      // notify the server that the speaker is unavailable
                      const response_data = {
                        speakerAvailable: false,
                      };
                      if (
                        websocketRef.current &&
                        websocketRef.current.readyState === WebSocket.OPEN
                      ) {
                        websocketRef.current.send(
                          JSON.stringify(response_data)
                        );
                      }

                      // clear up interval and timeout
                      clearInterval(speakingCheckInterval);
                      speakingCheckInterval = null;

                      clearTimeout(speakerWaitingTimeoutRef.current);
                      speakerWaitingTimeoutRef.current = null;
                    }, 4000); // 4s waiting time
                  }
                } else {
                  if (speakerWaitingTimeoutRef.current) {
                    // clear timeout and cleanup
                    clearTimeout(speakerWaitingTimeoutRef.current);
                    speakerWaitingTimeoutRef.current = null;
                  }
                  if (notification !== current_state_message) {
                    setNotification(current_state_message);
                  }
                }
              };

              if (!speakingCheckInterval) {
                speakingCheckInterval = setInterval(checkSpeaking, 1000);
              }
            }
          }
          break;
        case "audio_url":
          const audio_url = response_data.audio_url;
          if (audioRef.current) {
            let audioFinished;

            audioRef.current.src = audio_url;
            audioRef.current.oncanplay = () => {
              audioRef.current
                .play()
                .then(() => console.log("Playing audio"))
                .catch((error) => console.error("Playback failed:", error));
            };

            audioRef.current.onended = () => {
              console.log("Audio finished playing naturally");
              // flag to send backend to notify audio playback ended
              audioFinished = true;
              if (
                websocketRef.current &&
                websocketRef.current.readyState === WebSocket.OPEN
              ) {
                websocketRef.current.send(
                  JSON.stringify({
                    audioFinished: audioFinished,
                  })
                );
                audioFinished = false;
              }
            };
            audioRef.current.onerror = handleAudioError;
          }
          break;
      }
    };

    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
        websocketRef.current = null;
      }

      if (audioRef.current) {
        audioRef.current.onerror = null;
      }
    };
  }, []);

  const vad = useMicVAD({
    startOnLoad: false,
    onSpeechStart: () => {
      console.log("Speech started");
    },
    onnxWASMBasePath:
      "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/",
    baseAssetPath:
      "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.27/dist/",
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
        onClick={() => {
          vadRef.current.start();
        }}
        className="px-3 py-2 bg-blue-300 hover:bg-pink-500 rounded-md cursor-pointer"
      >
        Open Mic
      </button>
      <p className="font-medium text-xl">{notification}</p>
      <audio className="hidden" ref={audioRef}></audio>
    </div>
  );
}
