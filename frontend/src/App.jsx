import { use, useEffect, useRef, useState } from "react";
import testAudio from "../src/assets/test_audio.mp3";
import { useMicVAD } from "@ricky0123/vad-react";
import "./App.css";
import AudioVisualizer from "./components/AudioVisualizer";
import SpeechControl from "./components/SpeechControl";
import ErrorBox from "./components/ErrorBox";
import SpeakerModelBox from "./components/SpeakerModelBox";
import CeremonyTable from "./components/CeremonyTable.jsx";

export default function MoC() {
  const vadRef = useRef(null);
  const websocketRef = useRef(null);
  const [webSocket, setWebSocket] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [notification, setNotification] = useState(" ");
  const [showWaveform, setShowWaveform] = useState(false);
  const [showCeremonyTable, setShowCeremonyTable] = useState(false);
  const [ceremonyData, setCeremonyData] = useState(null);
  const [showSpeechControl, setShowSpeechControl] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState(null);
  const [currentSpeakerDetails, setCurrentSpeakerDetails] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);
  const [showErrorBox, setShowErrorBox] = useState(true);
  const [ceremonyStarted, setCeremonyStarted] = useState(false);

  useEffect(() => {
    const websocket = new WebSocket(`${import.meta.env.VITE_BACKEND_URL}`);

    websocketRef.current = websocket;
    setWebSocket(websocket);

    websocketRef.current.onopen = () => {
      console.log("Connection established with websocket successfully");
    };

    websocketRef.current.onerror = (error) => {
      console.error("Some error occured while connecting to websocket:", error);
    };

    websocketRef.current.onclose = (event) => {
      console.warn("❌ WebSocket closed", event);
    };

    websocketRef.current.onmessage = (event) => {
      const response_data = JSON.parse(event.data);
      console.log("Data from backend", response_data);
      const type = response_data.type;
      switch (type) {
        case "current_state":
          const current_state_message = response_data.message;
          if (current_state_message) {
            setNotification(current_state_message);
            if (response_data.phase === "listen") {
              // enable the speech control button
              setShowSpeechControl(true);
              break;
            } else if (response_data.phase == "remarks") {
              setShowSpeechControl(false);
              setLiveTranscription(null);
              setCurrentSpeakerDetails(null);
              break;
            }
          }
          break;
        case "audio_url":
          const audio_url = response_data.audio_url;
          if (!audio_url) break;
          // set audioUrl to manage state
          setAudioUrl(audio_url);
          setShowWaveform(true);
          break;

        case "ceremony_data":
          if (!response_data) break;
          setCeremonyData(response_data);
          setShowCeremonyTable(true);
          break;

        case "speaker_details":
          if (!response_data) break;
          setCurrentSpeakerDetails(response_data);
          break;

        case "transcription":
          if (!response_data || !response_data.transcription) break;
          const transcription = response_data.transcription;
          setLiveTranscription(transcription);
          break;

        // handle errors
        case "error":
          if (!response_data) break;
          setErrorDetails(response_data);
          setShowErrorBox(true);
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

  const initiateCeremony = () => {
    const data = {
      phase: "initiate",
    };
    if (
      websocketRef.current &&
      websocketRef.current.readyState === WebSocket.OPEN
    ) {
      websocketRef.current?.send(JSON.stringify(data));
      setCeremonyStarted(true);
    }
  };
  return (
    <div className="flex flex-col items-center gap-y-2 py-3">
      <div className="flex p-4 justify-around w-full">
        <div className="title-box flex flex-col gap-y-2">
          <p className="font-medium text-xl">Master of Ceremony</p>
          {!ceremonyStarted ? (
            <button
              disabled={webSocket?.readyState !== 1}
              onClick={initiateCeremony}
              className={`px-3 py-2 bg-blue-300 rounded-lg hover:bg-blue-400 ${
                webSocket?.readyState === 1
                  ? "cursor-pointer"
                  : "cursor-not-allowed"
              }`}
            >
              Start ceremony
            </button>
          ) : null}
        </div>
        <div className="websocket-status-box w-max h-max p-4 border border-black/20 flex flex-col">
          <p className="text-lg">
            <strong>WebSocket connection details</strong>
          </p>
          <p>
            <strong>Socket status: </strong>
            {webSocket?.readyState === 1 ? "initialized" : "uninitialized"}
          </p>
          <p>
            <strong>Microphone recording: </strong>
            {vadRef.current?.listening === true ? "yes" : "no"}
          </p>
          <p>
            <strong>Websocket URL: </strong>
            {websocketRef.current?.url ? websocketRef.current.url : "undefined"}
          </p>
        </div>
      </div>

      {/* <button
        onClick={() => {
          vadRef.current.start();
        }}
        className="px-3 py-2 bg-blue-300 hover:bg-pink-500 rounded-md cursor-pointer"
      >
        Open your microphone
      </button> */}

      {/* show the speech control button */}
      {showSpeechControl ? (
        <SpeechControl
          vadRef={vadRef.current}
          websocketRef={websocketRef.current}
          setNotification={setNotification}
          setShowSpeechControl={setShowSpeechControl}
        />
      ) : null}

      <p className="font-medium text-xl">{notification}</p>
      {showWaveform && audioUrl ? (
        <AudioVisualizer
          setShowWaveform={setShowWaveform}
          websocketRef={websocketRef.current}
          audioUrl={audioUrl}
        />
      ) : null}

      {currentSpeakerDetails || liveTranscription ? (
        <SpeakerModelBox
          speaker_details={currentSpeakerDetails}
          live_transcription={liveTranscription}
        />
      ) : null}

      {showErrorBox ? (
        <ErrorBox
          error_details={errorDetails}
          setShowErrorBox={setShowErrorBox}
        />
      ) : null}

      {showCeremonyTable ? (
        <CeremonyTable ceremony_data={ceremonyData} />
      ) : null}
    </div>
  );
}
