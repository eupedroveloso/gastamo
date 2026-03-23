import { CARD_ASPECT_RATIO, CARD_THUMBNAIL_BORDER_RADIUS } from "@/lib/card-visual";
import { CreditCardAltIcon } from "./icons";

type Props = {
  imageUrl?: string | null;
  name: string;
  width?: number;
};

/** Miniatura na proporção horizontal de cartão (Design System / ISO ID-1). */
export function PaymentCardThumbnail({ imageUrl, name, width = 112 }: Props) {
  const h = Math.round(width / CARD_ASPECT_RATIO);
  return (
    <div
      title={name}
      style={{
        width,
        height: h,
        borderRadius: CARD_THUMBNAIL_BORDER_RADIUS,
        overflow: "hidden",
        background: "#F0FAF5",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid #E8E8E8",
      }}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <CreditCardAltIcon size={Math.min(20, Math.floor(width / 5))} color="#0F8F4E" />
      )}
    </div>
  );
}
