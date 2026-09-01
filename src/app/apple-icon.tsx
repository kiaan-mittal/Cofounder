import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
        <svg width="156" height="156" viewBox="0 0 32 32">
          <polygon points="2,5 17,16 2,27" fill="#14110F" />
          <polygon points="30,5 15,16 30,27" fill="#8A2015" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
