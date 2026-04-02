import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";

export default async function Icon() {
  const logoPath = path.join(process.cwd(), "public", "nsd_light_logo.png");
  const logoBuffer = await readFile(logoPath);
  const logoSrc = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          background: "transparent",
        }}
      >
        <img
          src={logoSrc}
          alt="Never Stop Dreaming"
          width={64}
          height={64}
          style={{
            width: "64px",
            height: "64px",
            objectFit: "contain",
            transform: "translate(2px, 0px) scale(2.42)",
            transformOrigin: "center",
          }}
        />
      </div>
    ),
    size
  );
}
