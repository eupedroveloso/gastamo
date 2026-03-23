"use client";

import { useState, useCallback, useEffect } from "react";
import Cropper, { Area } from "react-easy-crop";
import { CARD_ASPECT_RATIO, CARD_IMAGE_BORDER_RADIUS } from "@/lib/card-visual";
import { PaymentCardThumbnail } from "./payment-card-thumbnail";

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (e) => reject(e));
    img.crossOrigin = "anonymous";
    img.src = url;
  });
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas não disponível");
  canvas.width = Math.max(1, Math.floor(pixelCrop.width));
  canvas.height = Math.max(1, Math.floor(pixelCrop.height));
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  const maxW = 720;
  if (canvas.width > maxW) {
    const sc = maxW / canvas.width;
    const c2 = document.createElement("canvas");
    c2.width = maxW;
    c2.height = Math.max(1, Math.round(canvas.height * sc));
    const x = c2.getContext("2d")!;
    x.drawImage(canvas, 0, 0, c2.width, c2.height);
    return c2.toDataURL("image/jpeg", 0.88);
  }
  return canvas.toDataURL("image/jpeg", 0.88);
}

type Props = {
  open: boolean;
  onClose: () => void;
  onComplete: (dataUrl: string) => void;
};

export function CardImageCropModal({ open, onClose, onComplete }: Props) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setImgSrc(null);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      setCroppedAreaPixels(null);
    }
  }, [open]);

  const onCropComplete = useCallback((_c: Area, areaPx: Area) => {
    setCroppedAreaPixels(areaPx);
  }, []);

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(f.type)) return;
    if (f.size > 8 * 1024 * 1024) return;
    const r = new FileReader();
    r.onload = () => setImgSrc(String(r.result));
    r.readAsDataURL(f);
    e.target.value = "";
  };

  const handleSave = async () => {
    if (!imgSrc || !croppedAreaPixels) return;
    setBusy(true);
    try {
      const out = await getCroppedImg(imgSrc, croppedAreaPixels);
      onComplete(out);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        role="presentation"
        onClick={() => !busy && onClose()}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          zIndex: 200,
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 201,
          background: "#FFFFFF",
          borderRadius: CARD_IMAGE_BORDER_RADIUS,
          padding: 24,
          width: "min(92vw, 420px)",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
          fontFamily: "var(--font-albert-sans), sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <PaymentCardThumbnail name="Cartão" width={44} />
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#0A0A0A" }}>Imagem do cartão</p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#737373", lineHeight: 1.4 }}>
              Formato horizontal (como um cartão). Ajuste zoom e posição antes de aplicar.
            </p>
          </div>
        </div>

        {!imgSrc ? (
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              padding: "32px 16px",
              border: "2px dashed #E5E5E5",
              borderRadius: 12,
              cursor: "pointer",
            }}
          >
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pickFile} style={{ display: "none" }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "#404040" }}>Escolher imagem</span>
            <span style={{ fontSize: 12, color: "#A3A3A3" }}>JPG, PNG ou WebP · máx. 8 MB</span>
          </label>
        ) : (
          <>
            <div
              style={{
                position: "relative",
                width: "100%",
                height: 220,
                borderRadius: 12,
                overflow: "hidden",
                background: "#0A0A0A",
              }}
            >
              <Cropper
                image={imgSrc}
                crop={crop}
                zoom={zoom}
                aspect={CARD_ASPECT_RATIO}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                showGrid={false}
              />
            </div>
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 12, color: "#525252" }}>Zoom</label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>
          </>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (imgSrc) setImgSrc(null);
              else onClose();
            }}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: "1px solid #E5E5E5",
              background: "#FFF",
              fontSize: 13,
              fontWeight: 600,
              cursor: busy ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {imgSrc ? "Outra foto" : "Cancelar"}
          </button>
          {imgSrc && (
            <button
              type="button"
              disabled={busy || !croppedAreaPixels}
              onClick={handleSave}
              style={{
                padding: "10px 18px",
                borderRadius: 12,
                border: "none",
                background: "#1A3A2E",
                color: "#FFF",
                fontSize: 13,
                fontWeight: 600,
                cursor: busy || !croppedAreaPixels ? "not-allowed" : "pointer",
                opacity: busy || !croppedAreaPixels ? 0.6 : 1,
                fontFamily: "inherit",
              }}
            >
              {busy ? "Aplicando…" : "Aplicar recorte"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
