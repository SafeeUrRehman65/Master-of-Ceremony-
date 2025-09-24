const SpeakerModelBox = ({ speaker_details, live_transcription }) => {
  return (
    <div className="w-[80%] h-max min-h-[20vh] border border-black/20 flex flex-col p-3 rounded-lg p-2">
      <div>
        <p className="speaker-name font-bold">
          <strong>Speaker Name: </strong>
          {`${
            speaker_details?.speaker_name
              ? speaker_details.speaker_name
              : "None"
          } ${
            speaker_details?.current_speaker_id + 1
              ? speaker_details.current_speaker_id + 1
              : " "
          }/${
            speaker_details?.total_speakers
              ? speaker_details.total_speakers
              : " "
          }`}
        </p>
      </div>
      <div>
        <strong>Speaker Designation: </strong>
        <p className="speaker-designation font-medium">
          {speaker_details?.designation}
        </p>
      </div>

      <div className="live-transcription">
        <p className="w-full">
          <strong>Transcription: </strong>
          {live_transcription ? live_transcription : " "}
        </p>
      </div>
    </div>
  );
};

export default SpeakerModelBox;
