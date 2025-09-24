const SpeakerModelBox = ({ speaker_details, live_transcription }) => {
  if (!speaker_details) return;

  return (
    <div className="w-[20rem] h-max min-h-[20vh] bg-black/90 backdrop-blur/md flex flex-col p-3 rounded-lg">
      <div>
        <p className="speaker-name text-2xl font-bold">
          {`${speaker_details?.current_speaker_id}/${speaker_details?.total_speakers}  ${speaker_details?.speaker_name}`}
        </p>
      </div>
      <div>
        <p className="speaker-designation font-medium">
          {speaker_details?.designation}
        </p>
      </div>

      {live_transcription ? (
        <div className="live-transcription">
          <p className="w-full">{live_transcription}</p>
        </div>
      ) : null}
    </div>
  );
};

export default SpeakerModelBox;
