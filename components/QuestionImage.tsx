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
    <Image
      src={image.src}
      width={image.width}
      height={image.height}
      alt={alt}
      sizes="(max-width: 768px) 100vw, 768px"
      className="h-auto max-w-full rounded-lg"
    />
  );
}
