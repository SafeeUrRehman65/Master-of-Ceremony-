export const handleAudioError = () => {
  const error = audioRef.current.error;
  if (error) {
    switch (error.code) {
      case MediaError.MEDIA_ERR_ABORTED:
        console.error("User aborted playback");
        break;
      case MediaError.MEDIA_ERR_NETWORK:
        console.error("Network error - failed to load audio");
        break;
      case MediaError.MEDIA_ERR_DECODE:
        console.error("Corrupted or unsupported audio format");
        break;
      case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
        console.error("Audio source not supported");
        break;
      default:
        console.error("Unknown audio error:", error);
    }
  }
};
