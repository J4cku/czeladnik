import Image from "next/image";
import type { QuestionImageData } from "../lib/data";

export function QuestionImage({
  image,
  alt = "Ilustracja do pytania",
}: {
  image?: QuestionImageData;
  alt?: string;
}) {
  if (!image) return null;

  return (
    <a href={image.src} target="_blank" rel="noreferrer" className="block w-fit max-w-full" aria-label="Powiększ rysunek w nowej karcie">
      <Image
        src={image.src}
        width={image.width}
        height={image.height}
        alt={alt}
        sizes="(max-width: 768px) 100vw, 768px"
        className="h-auto max-w-full rounded-lg"
      />
      <span className="ui mt-2 block text-xs text-ink-soft underline">Powiększ rysunek</span>
    </a>
  );
}
