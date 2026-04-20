export default function SiteBackground() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 pointer-events-none flex items-center justify-center overflow-hidden"
    >
      <video
        src="/logo.mp4"
        poster="/logo.jpg"
        autoPlay
        loop
        muted
        playsInline
        className="opacity-[0.45] w-[90vmin] h-[90vmin] rounded-full object-cover"
      />
    </div>
  );
}
