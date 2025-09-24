import { useRef } from "react";

const SpeechControl = ({
  vadRef,
  websocketRef,
  setNotification,
  setShowSpeechControl,
}) => {
  if (!vadRef || !websocketRef) return null;

  const speechControlRef = useRef(null);

  const toggleVad = () => {
    let data;
    if (!vadRef.listening) {
      vadRef.start();
      console.log("Started listening to speaker!");
      setNotification("Started listening to speaker!");
      data = {
        speaking: true,
      };
    } else {
      vadRef.pause();
      data = {
        speaking: false,
      };
      setShowSpeechControl(false);
      setNotification("Stopped listening to speaker!");
    }
    websocketRef?.send(JSON.stringify(data));
  };

  return (
    <button
      ref={speechControlRef}
      onClick={toggleVad}
      className={`speech-control-button py-2 px-3 rounded-lg cursor-pointer
       ${
         vadRef.listening
           ? "bg-red-300 hover:bg-red-400"
           : "bg-blue-300 hover:bg-blue-400"
       } `}
    >
      {vadRef.listening ? "Stop Speech" : "Start Speech"}
    </button>
  );
};

export default SpeechControl;
