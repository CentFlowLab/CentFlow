declare module 'jpeg-js' {
  export type JpegDecodeOptions = {
    useTArray?: boolean;
    formatAsRGBA?: boolean;
    colorTransform?: boolean;
  };

  export type JpegImageData = {
    data: Uint8Array;
    width: number;
    height: number;
  };

  export function decode(
    jpegData: Uint8Array,
    options?: JpegDecodeOptions,
  ): JpegImageData;

  export function encode(
    imageData: JpegImageData,
    quality?: number,
  ): { data: Uint8Array; width: number; height: number };
}
