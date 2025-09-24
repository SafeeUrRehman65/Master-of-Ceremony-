import React, { useEffect, useRef } from "react";
import { handleAudioError } from "../utils/utilities";

const AudioVisualizer = ({ audioUrl, websocketRef, setShowWaveform }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);

  useEffect(() => {
    if (!audioUrl) return;
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext("2d");

    const audio = new Audio(audioUrl);
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;
    const audioContext = new (window.AudioContext || window.AudioContext)();
    audioContextRef.current = audioContext;
    const source = audioContext.createMediaElementSource(audio);
    sourceRef.current = source;
    const analyser = audioContext.createAnalyser();

    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    source.connect(analyser);
    analyser.connect(audioContext.destination); // Output the sound

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      canvasCtx.fillStyle = "black";
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = "lime";
      canvasCtx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };

    const start = async () => {
      try {
        await audioContext.resume();
        await audioRef.current.play();
        draw();
      } catch (err) {
        console.error("Audio play failed: ", err);
      }
    };

    start();

    // handle audio endings and error
    if (audioRef.current) {
      audioRef.current.onended = () => {
        console.log("Audio finished playing naturally");
        setShowWaveform(false);
        // flag to send backend to notify audio playback ended
        if (websocketRef && websocketRef.readyState === WebSocket.OPEN) {
          websocketRef.send(
            JSON.stringify({
              audioFinished: true,
            })
          );
        }
      };
    }

    return () => {
      cancelAnimationFrame(animationRef.current);
      if (audioContext.state !== "closed") {
        audioContext.close();
      }
      audio.pause();
      audioRef.current.src = "";
      audioRef.current.load();

      try {
        if (sourceRef.current) {
          sourceRef.current.disconnect();
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      } catch (err) {
        console.warn("error during audio cleanup:", err);
      }
    };
  }, [audioUrl, websocketRef]);

  return (
    <div>
      <div className="flex flex-col gap-y-4">
        <canvas
          ref={canvasRef}
          width={600}
          height={100}
          style={{ width: "100%", backgroundColor: "black" }}
        />
        <div className="">
          <p className="text-center font-semibold text-md">Musa Speaking</p>
        </div>
      </div>
    </div>
  );
};

export default AudioVisualizer;
