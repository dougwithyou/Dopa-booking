export function Footer({ studioName, tagline }: { studioName: string; tagline: string }) {
  return (
    <footer className="flex flex-col items-center justify-between gap-3 bg-ink px-[6vw] py-11 text-center font-body text-[11px] tracking-[0.06em] text-[#a89c8c] sm:flex-row sm:text-left">
      <span className="font-display text-[15px] font-black uppercase tracking-[0.04em] text-parchment">
        {studioName}
      </span>
      <span>{tagline}</span>
    </footer>
  );
}
