/**
 * AnimatedBackground — Full-viewport fixed background layer
 *
 * Renders the animated gradient + soft floating blobs using pure CSS.
 * No JS animation loop — fully GPU-accelerated via CSS transforms and filters.
 */

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* Subtle dot pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Blob 1 — Deep Indigo (top-left) */}
      <div
        className="absolute -top-32 -left-32 w-[500px] h-[500px] opacity-50"
        style={{
          background:
            "radial-gradient(circle, #4338CA 0%, rgba(67, 56, 202, 0) 70%)",
          filter: "blur(120px)",
          animation: "blob-morph 18s ease-in-out infinite",
        }}
      />

      {/* Blob 2 — Rich Purple (center-right) */}
      <div
        className="absolute top-1/4 -right-24 w-[600px] h-[600px] opacity-40"
        style={{
          background:
            "radial-gradient(circle, #7C3AED 0%, rgba(124, 58, 237, 0) 70%)",
          filter: "blur(140px)",
          animation: "blob-morph 22s ease-in-out infinite reverse",
        }}
      />

      {/* Blob 3 — Coral Pink (bottom-left) */}
      <div
        className="absolute bottom-[-10%] left-1/4 w-[450px] h-[450px] opacity-35"
        style={{
          background:
            "radial-gradient(circle, #F43F5E 0%, rgba(244, 63, 94, 0) 70%)",
          filter: "blur(130px)",
          animation: "blob-morph 20s ease-in-out infinite 4s",
        }}
      />

      {/* Blob 4 — Teal accent glow (subtle, bottom-right) */}
      <div
        className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] opacity-20"
        style={{
          background:
            "radial-gradient(circle, #0D9488 0%, rgba(13, 148, 136, 0) 70%)",
          filter: "blur(110px)",
          animation: "blob-morph 25s ease-in-out infinite 2s",
        }}
      />
    </div>
  );
}
