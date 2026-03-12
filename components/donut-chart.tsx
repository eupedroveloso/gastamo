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

export function DonutChart({
  segments,
  size = 183,
  strokeWidth = 30,
  centerLabel,
  centerSublabel,
}: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const total = segments.reduce((acc, s) => acc + s.value, 0);

  let cumulativePercent = 0;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((segment, i) => {
          const percent = total > 0 ? segment.value / total : 0;
          const dashLength = circumference * percent;
          const dashOffset = circumference * (1 - cumulativePercent) + circumference * 0.25;
          cumulativePercent += percent;

          return (
            <circle
              key={i}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 0.3s, stroke-dashoffset 0.3s" }}
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
            <span
              style={{
                fontWeight: 700,
                fontSize: 18,
                color: "#0A0A0A",
                lineHeight: 1.3,
              }}
            >
              {centerLabel}
            </span>
          )}
          {centerSublabel && (
            <span
              style={{
                fontWeight: 400,
                fontSize: 11,
                letterSpacing: "0.02em",
                color: "#A3A3A3",
                lineHeight: 1.5,
              }}
            >
              {centerSublabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
