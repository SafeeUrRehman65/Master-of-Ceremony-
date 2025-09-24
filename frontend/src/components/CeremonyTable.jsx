export default function CeremonyTable({ ceremony_data }) {
  if (!ceremony_data) return null;
  return (
    <div className="p-4">
      <div className="flex flex-col grp-y-2">
        <p>
          <strong>Event Name</strong> :{" "}
          {ceremony_data?.event_name ?? "undefined"}
        </p>
        <p>
          <strong>Theme</strong> : {ceremony_data?.theme ?? "undefined"}
        </p>
        <p>
          <strong>Venue</strong> : {ceremony_data?.venue ?? "undefined"}
        </p>
        <p>
          <strong>Purpose</strong> : {ceremony_data?.purpose ?? "undefined"}
        </p>
        <p>
          <strong>Time</strong> : {ceremony_data?.time ?? "undefined"}
        </p>
      </div>
      <TableHeader />
      <div className="flex flex-col rounded-b-lg border border-black/20">
        {ceremony_data?.speakers_data?.map((record, index) => (
          <div
            key={index}
            className="grid grid-cols-4 border-b border-black/20"
          >
            <p className="p-2 border-r border-black/10">
              {record?.speaker_name}
            </p>
            <p className="p-2 border-r border-black/10">
              {record?.designation}
            </p>
            <p className="p-2 border-r border-black/10">
              {record?.inspiration ? record.inspiration : "None"}
            </p>
            <p className="p-2 border-r border-black/10">
              {record?.purpose_of_speech}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

const TableHeader = () => {
  return (
    <div className="grid grid-cols-4 border border-black/20 rounded-t-lg">
      <p className="p-2 border-r border-black/10">
        <strong>Name</strong>
      </p>
      <p className="p-2 border-r border-black/10">
        <strong>Designation</strong>
      </p>
      <p className="p-2 border-r border-black/10">
        <strong>Inspiration</strong>
      </p>
      <p className="p-2 border-r border-black/10">
        <strong>Speech purpose</strong>
      </p>
    </div>
  );
};
