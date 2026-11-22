/**
 * QR code of a shop link, for print (e.g. on a shirt): PNG 4096 px and vector SVG,
 * error correction H (30 % of the code can be damaged or covered), 4-module quiet zone.
 */
import QRCode from "qrcode";
import sharp from "sharp";
import { tenantOrigin } from "../tenant/hosts.ts";

export const QR_PNG_SIZE = 4096;
const QUIET_ZONE = 4;

/** https://<slug>.<root> */
export function shopUrl(slug: string): string {
  return tenantOrigin(slug);
}

/** Black on white PNG, exactly `size` px wide, greyscale, 300 dpi metadata. */
export async function qrPng(text: string, size = QR_PNG_SIZE): Promise<Buffer> {
  const raw = await QRCode.toBuffer(text, {
    type: "png",
    errorCorrectionLevel: "H",
    margin: QUIET_ZONE,
    width: size,
    color: { dark: "#000000ff", light: "#ffffffff" },
  });
  return sharp(raw).resize(size, size, { kernel: "nearest" }).greyscale().png({ compressionLevel: 9, palette: true, colours: 2 }).withMetadata({ density: 300 }).toBuffer();
}

/** Vector SVG (scales to any print size without loss). */
export async function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { type: "svg", errorCorrectionLevel: "H", margin: QUIET_ZONE, color: { dark: "#000000ff", light: "#ffffffff" } });
}
