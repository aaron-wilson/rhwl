import qrcode from "qrcode-generator";

/** Modules of quiet zone around the code, as the QR spec asks for. */
export const QUIET = 4;

/** The dark modules of a QR code for `value` as one SVG path, plus its size in modules. */
export function qrPath(value: string): { readonly size: number; readonly d: string } {
  const qr = qrcode(0, "M");
  qr.addData(value);
  qr.make();
  const size = qr.getModuleCount();
  const parts: string[] = [];
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (qr.isDark(row, col)) parts.push(`M${col} ${row}h1v1h-1z`);
    }
  }
  return { size, d: parts.join("") };
}
