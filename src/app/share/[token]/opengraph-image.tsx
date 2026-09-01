import { ImageResponse } from "next/og";

import { readDecisionShare } from "@/server/shares";

export const alt = "Decision Arena record";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function ShareOpenGraphImage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const brief = token?.startsWith("shr_")
    ? await readDecisionShare(token)
    : null;
  const question =
    brief?.question ?? "A decision ChatGPT can join, not own.";
  const company = brief?.company ?? "Decision Arena";
  const verdict = brief
    ? brief.deadlock
      ? "Deadlock"
      : brief.leaningLabel
    : "Agents propose. Founders commit.";
  const sizeForQuestion = question.length > 90 ? 42 : question.length > 54 ? 50 : 58;

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
          padding: "56px 64px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <svg width="48" height="48" viewBox="0 0 32 32">
              <polygon points="2,5 17,16 2,27" fill="#14110F" />
              <polygon points="30,5 15,16 30,27" fill="#8A2015" />
            </svg>
            <div
              style={{
                fontSize: 20,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#6B645C",
              }}
            >
              {company}
            </div>
          </div>
          <div
            style={{
              fontSize: 18,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: brief?.deadlock ? "#8A2015" : "#6B645C",
            }}
          >
            Public record
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            maxWidth: 1040,
          }}
        >
          <div
            style={{
              fontSize: sizeForQuestion,
              lineHeight: 1.08,
              fontWeight: 600,
              color: "#14110F",
            }}
          >
            {question}
          </div>
          <div style={{ fontSize: 26, color: "#6B645C", lineHeight: 1.3 }}>
            {verdict}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 20,
            color: "#8A2015",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {brief?.commitRefused
            ? "confirm_commit was refused"
            : "Agents propose. Founders commit."}
        </div>
      </div>
    ),
    { ...size },
  );
}
