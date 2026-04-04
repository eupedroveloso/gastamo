"use client";

interface DonutSegment {
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerSublabel?: string;
}

const CORNER_RADIUS = 2;
const GAP_DEG = 1.5; // graus de gap entre segmentos

/**
 * Desenha um arco "gordo" (anel) de startAngle a endAngle com cantos arredondados
 * de raio `cr`. Usa preenchimento fill, sem stroke.
 */
function fatArcPath(
  cx: number,
  cy: number,
  R: number,
  sw: number,
  startAngle: number,
  endAngle: number,
  cr: number,
): string {
  const outerR = R + sw / 2;
  const innerR = R - sw / 2;
  const dOuter = cr / outerR;
  const dInner = cr / innerR;

  const a1o = startAngle + dOuter;
  const a2o = endAngle - dOuter;
  const a1i = startAngle + dInner;
  const a2i = endAngle - dInner;

  const px = (a: number, r: number) => cx + r * Math.cos(a);
  const py = (a: number, r: number) => cy + r * Math.sin(a);

  // Segmento pequeno demais para os cantos: desenha sem arredondamento
  if (a2o <= a1o) {
    return [
      `M ${px(startAngle, outerR)} ${py(startAngle, outerR)}`,
      `A ${outerR} ${outerR} 0 0 1 ${px(endAngle, outerR)} ${py(endAngle, outerR)}`,
      `L ${px(endAngle, innerR)} ${py(endAngle, innerR)}`,
      `A ${innerR} ${innerR} 0 0 0 ${px(startAngle, innerR)} ${py(startAngle, innerR)}`,
      "Z",
    ].join(" ");
  }

  const largeArc = a2o - a1o > Math.PI ? 1 : 0;

  return [
    `M ${px(a1o, outerR)} ${py(a1o, outerR)}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${px(a2o, outerR)} ${py(a2o, outerR)}`,
    `A ${cr} ${cr} 0 0 1 ${px(a2i, innerR)} ${py(a2i, innerR)}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${px(a1i, innerR)} ${py(a1i, innerR)}`,
    `A ${cr} ${cr} 0 0 1 ${px(a1o, outerR)} ${py(a1o, outerR)}`,
    "Z",
  ].join(" ");
}

export function DonutChart({
  segments,
  size = 183,
  strokeWidth = 30,
  centerLabel,
  centerSublabel,
}: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const total = segments.reduce((acc, s) => acc + s.value, 0);

  const GAP_RAD = (GAP_DEG * Math.PI) / 180;

  let cumulativeAngle = -Math.PI / 2; // começa no topo (12h)

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((segment, i) => {
          const fraction = total > 0 ? segment.value / total : 0;
          const angleSpan = fraction * 2 * Math.PI - GAP_RAD;
          const startAngle = cumulativeAngle + GAP_RAD / 2;
          const endAngle = startAngle + Math.max(0, angleSpan);
          cumulativeAngle += fraction * 2 * Math.PI;

          return (
            <path
              key={i}
              d={fatArcPath(center, center, radius, strokeWidth, startAngle, endAngle, CORNER_RADIUS)}
              fill={segment.color}
            />
          );
        })}
      </svg>

      {(centerLabel || centerSublabel) && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          {centerLabel && (
            <span style={{ fontWeight: 700, fontSize: 18, color: "#0A0A0A", lineHeight: 1.3 }}>
              {centerLabel}
            </span>
          )}
          {centerSublabel && (
            <span style={{ fontWeight: 400, fontSize: 11, letterSpacing: "0.02em", color: "#A3A3A3", lineHeight: 1.5 }}>
              {centerSublabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
