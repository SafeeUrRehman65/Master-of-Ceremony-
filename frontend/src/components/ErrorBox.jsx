const ErrorBox = ({ error_details, setShowErrorBox }) => {
  if (!error_details) return null;

  return (
    <div className="relative z-10 w-[20rem] gap-y-4 flex flex-col p-3 h-max min-h-[20vh] rounded-lg">
      <div
        onClick={() => {
          setShowErrorBox(false);
        }}
        className="cursor-pointer p-2 bg-red-300 hover:bg-red-400 absolute top-0 right-0"
      >
        X
      </div>
      {error_details ? (
        <div>
          <p className="text-xl font-semibold">{error_details.message}</p>
          <p>{error_details.error}</p>
        </div>
      ) : null}
    </div>
  );
};

export default ErrorBox;
