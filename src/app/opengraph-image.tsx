import { ImageResponse } from "next/og";

export const alt = "Decision Arena — a decision ChatGPT can join, not own";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#FBFAF8",
          padding: "64px 72px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="56" height="56" viewBox="0 0 32 32">
            <polygon points="2,5 17,16 2,27" fill="#14110F" />
            <polygon points="30,5 15,16 30,27" fill="#8A2015" />
          </svg>
          <div
            style={{
              fontSize: 22,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#6B645C",
            }}
          >
            Decision Arena
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            maxWidth: 980,
          }}
        >
          <div
            style={{
              fontSize: 64,
              lineHeight: 1.05,
              fontWeight: 600,
              color: "#14110F",
            }}
          >
            A decision ChatGPT can join, not own.
          </div>
          <div style={{ fontSize: 28, color: "#6B645C", lineHeight: 1.35 }}>
            Five seats write on the table. Agents cannot press commit.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
