// Fall-toned gradient placeholders, ported 1:1 from the original design's
// .ph-1..ph-13 background definitions. Used whenever a gallery/hero slot
// doesn't have a real photo yet (e.g. a landing page an admin hasn't
// finished uploading images for) so the page still reads as fully designed.
const GRADIENTS = [
  'radial-gradient(120% 90% at 30% 20%, #6b4a2e 0%, #2c1c14 60%), linear-gradient(160deg,#4a2f1d,#1c130d)',
  'linear-gradient(150deg,#8a5a34 0%, #3a2417 70%)',
  'radial-gradient(100% 100% at 70% 30%, #a06a3c 0%, #3d2617 65%)',
  'linear-gradient(200deg,#5b3d24 0%, #201410 75%)',
  'radial-gradient(120% 90% at 20% 80%, #b8873b 0%, #2c1c14 65%)',
  'linear-gradient(135deg,#734c2a 0%, #241811 70%)',
  'radial-gradient(100% 100% at 50% 50%, #8f5a35 0%, #2a1b12 70%)',
  'linear-gradient(170deg,#a8763f 0%, #33200f 70%)',
  'radial-gradient(110% 90% at 80% 20%, #7a4e2c 0%, #241610 65%)',
  'linear-gradient(160deg,#c99a4e 0%, #3a2414 75%)',
  'radial-gradient(100% 100% at 25% 75%, #96602f 0%, #1f140e 65%)',
  'linear-gradient(140deg,#6a4527 0%, #17100b 70%)',
  'radial-gradient(120% 90% at 60% 30%, #b8873b 0%, #26180f 65%)',
];

export function placeholderGradient(seed: number): string {
  const idx = ((seed % GRADIENTS.length) + GRADIENTS.length) % GRADIENTS.length;
  return GRADIENTS[idx];
}

export function PhotoPlaceholder({ seed, label }: { seed: number; label?: string }) {
  return (
    <div className="relative h-full w-full" style={{ backgroundImage: placeholderGradient(seed) }}>
      {label && (
        <span className="absolute inset-0 flex items-center justify-center px-3 text-center font-body text-[10px] uppercase tracking-[0.18em] text-white/55">
          {label}
        </span>
      )}
    </div>
  );
}
