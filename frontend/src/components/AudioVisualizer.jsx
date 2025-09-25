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
    const ctx = canvas.getContext("2d");

    const audio = new Audio(audioUrl);
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;
    const audioContext = new (window.AudioContext || window.AudioContext)();
    audioContextRef.current = audioContext;
    const source = audioContext.createMediaElementSource(audio);
    sourceRef.current = source;
    const analyser = audioContext.createAnalyser();

    analyser.fftSize = 2048;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    source.connect(analyser);
    analyser.connect(audioContext.destination);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = 60;

      const bars = 100;
      const slice = (2 * Math.PI) / bars;

      for (let i = 0; i < bars; i++) {
        const value = dataArray[i];
        const barLength = value / 4;

        const angle = i * slice;
        const x1 = centerX + radius * Math.cos(angle);
        const y1 = centerY + radius * Math.sin(angle);
        const x2 = centerX + (radius + barLength) * Math.cos(angle);
        const y2 = centerY + (radius + barLength) * Math.sin(angle);

        // Gradient with no transparent background
        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, "rgba(53, 82, 197, 1)"); // start solid
        grad.addColorStop(1, "rgba(0, 200, 255, 1)"); // end solid

        ctx.strokeStyle = grad;
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // Glow effect
        // ctx.shadowBlur = 20;
        // ctx.shadowColor = "rgba(0,255,170,0.8)";

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
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

    if (audioRef.current) {
      audioRef.current.onended = () => {
        console.log("Audio finished playing naturally");
        setShowWaveform(false);
        if (websocketRef && websocketRef.readyState === WebSocket.OPEN) {
          websocketRef.send(JSON.stringify({ audioFinished: true }));
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
        if (sourceRef.current) sourceRef.current.disconnect();
        if (audioContextRef.current) audioContextRef.current.close();
      } catch (err) {
        console.warn("error during audio cleanup:", err);
      }
    };
  }, [audioUrl, websocketRef]);

  return (
    <div className="relative w-[200px] h-[200px] flex items-center justify-center">
      {/* Canvas - transparent background */}
      <canvas
        ref={canvasRef}
        width={200}
        height={200}
        className="absolute top-0 left-0 w-full h-full rounded-full bg-transparent"
      />

      {/* Hollow circle in center */}
      <div className="w-[160px] h-[160px] bg-avatar bg-cover rounded-full border-[4px] border-white z-10 bg-black/70"></div>

      {/* Label below */}
      <div className="absolute bottom-[-40px] text-center font-semibold text-md">
        <p>Musa Speaking</p>
      </div>
    </div>
  );
};

export default AudioVisualizer;
