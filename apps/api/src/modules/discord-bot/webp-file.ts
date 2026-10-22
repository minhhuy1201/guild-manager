import type { OutgoingFile } from './discord-rest';

/** The only image format the bot sends, mirrored by the shared schemas. */
const IMAGE_CONTENT_TYPE = 'image/webp';

/** Prefix every incoming image carries, already enforced by the shared schemas. */
const DATA_URL_PREFIX = `data:${IMAGE_CONTENT_TYPE};base64,`;

/**
 * Turn one incoming webp data URL into the file Discord is handed.
 * @param image - A `data:image/webp;base64,…` string
 * @param filename - Name Discord shows under the message
 * @returns The file part
 */
export function webpFileFromDataUrl(
  image: string,
  filename: string,
): OutgoingFile {
  return {
    filename,
    bytes: new Uint8Array(
      Buffer.from(image.slice(DATA_URL_PREFIX.length), 'base64'),
    ),
    contentType: IMAGE_CONTENT_TYPE,
  };
}
