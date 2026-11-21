/*
 * Quote card paint: flat colour, mesh, gradient and dot swatches.
 */

export interface MeshBlob {
  x: number;
  y: number;
  r: number;
  color: string;
}

export type Paint =
  | { kind: "solid"; color: string }
  | { kind: "mesh"; base: string; blobs: MeshBlob[] };

export const solid = (color: string): Paint => ({ kind: "solid", color });
export const mesh = (base: string, blobs: MeshBlob[]): Paint => ({ kind: "mesh", base, blobs });
/** a gradient's circular control */
export const grad = (...colors: string[]) =>
  `linear-gradient(135deg, ${colors.join(", ")})`;
/** a paper control with an ink dot in its middle */
export const dot = (accent: string, base: string) =>
  `radial-gradient(circle, ${accent} 0 21%, ${base} 22%)`;
