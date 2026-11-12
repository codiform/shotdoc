import { PNG } from 'pngjs';

function describeColour(data: Buffer<ArrayBufferLike>) {
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  const colour = `#${hex(data[0] as number)}${hex(data[1] as number)}${hex(data[2] as number)}`;
  const alpha = data[3] as number;
  return alpha === 255 ? colour : `${colour} with alpha ${alpha}`;
}

/**
 * Returns a description of the colour when every pixel of the PNG is the same (red, green, blue
 * and alpha all equal), such as `#ffffff`, and undefined when the image has more than one colour.
 */
export function blankColour(png: Buffer): string | undefined {
  const { data } = PNG.sync.read(png);

  if (data.length < 4) return undefined;

  const first = data.readUInt32LE(0);
  for (let i = 4; i < data.length; i += 4) {
    if (data.readUInt32LE(i) !== first) return undefined;
  }
  return describeColour(data);
}
