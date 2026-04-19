export default function SiteBackground() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 pointer-events-none flex items-center justify-center overflow-hidden"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.jpg"
        alt=""
        className="opacity-30 max-w-[80%] max-h-[80%] object-contain"
      />
    </div>
  );
}
