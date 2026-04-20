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
        preload="auto"
        className="opacity-[0.45] w-full h-full object-cover"
      />
    </div>
  );
}
