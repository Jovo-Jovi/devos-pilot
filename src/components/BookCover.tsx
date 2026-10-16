export function BookCover({ src }: { src?: string }) {
  if (!src) return <span className="cover" aria-hidden="true" />;
  return (
    <span className="cover" aria-hidden="true">
      {/* The cover is a public bucket URL. §2b adds no optimizer host. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" loading="lazy" decoding="async" />
    </span>
  );
}
