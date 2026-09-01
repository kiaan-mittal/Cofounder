import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** A filled bowtie. Thin knot strokes vanish at 16px; this does not. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FBFAF8",
        }}
      >
        <svg width="28" height="28" viewBox="0 0 32 32">
          <polygon points="2,5 17,16 2,27" fill="#14110F" />
          <polygon points="30,5 15,16 30,27" fill="#8A2015" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
