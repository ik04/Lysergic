export const Loader = () => {
  return (
    <div className="flex w-full h-full justify-center items-center py-8">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-4 border-dashed rounded-full animate-spin border-accent" />
        <div className="absolute inset-1 border-4 border-dotted rounded-full animate-slow-spin border-accent2 opacity-60" />
      </div>
    </div>
  );
};
