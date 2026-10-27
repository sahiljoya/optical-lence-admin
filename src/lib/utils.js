import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Optical App Packaging Standards:
// 1 Carton (Cartaz) = 20 Dibbe (Boxes)
// 1 Dibba (Box) = 15 Lenses (Pieces)
// 1 Carton = 20 * 15 = 300 Pieces
export const PIECES_PER_DIBBA = 15;
export const DIBBE_PER_CARTON = 20;
export const PIECES_PER_CARTON = 300;

export function formatCartonBreakdown(totalPieces) {
  const pieces = Number(totalPieces) || 0;
  if (pieces === 0) return "0 pcs";

  const cartons = Math.floor(pieces / PIECES_PER_CARTON);
  const rem = pieces % PIECES_PER_CARTON;
  const dibbe = Math.floor(rem / PIECES_PER_DIBBA);
  const loose = rem % PIECES_PER_DIBBA;

  const parts = [];
  if (cartons > 0) parts.push(`${cartons} Ctn`);
  if (dibbe > 0) parts.push(`${dibbe} D`);
  if (loose > 0) parts.push(`${loose} P`);

  return parts.join(" ") || `${pieces} pcs`;
}

export function formatCartonFull(totalPieces) {
  const pieces = Number(totalPieces) || 0;
  if (pieces === 0) return "0 Pieces";

  const cartons = Math.floor(pieces / PIECES_PER_CARTON);
  const rem = pieces % PIECES_PER_CARTON;
  const dibbe = Math.floor(rem / PIECES_PER_DIBBA);
  const loose = rem % PIECES_PER_DIBBA;

  const parts = [];
  if (cartons > 0) parts.push(`${cartons} Carton${cartons > 1 ? "s" : ""}`);
  if (dibbe > 0) parts.push(`${dibbe} Dibba${dibbe > 1 ? "s" : ""}`);
  if (loose > 0) parts.push(`${loose} Loose Piece${loose > 1 ? "s" : ""}`);

  return parts.length > 0 ? `${pieces} Pcs (${parts.join(" + ")})` : `${pieces} Pieces`;
}

export function toPieces({ cartons = 0, dibbe = 0, loose = 0 }) {
  return (
    (Number(cartons) || 0) * PIECES_PER_CARTON +
    (Number(dibbe) || 0) * PIECES_PER_DIBBA +
    (Number(loose) || 0)
  );
}
