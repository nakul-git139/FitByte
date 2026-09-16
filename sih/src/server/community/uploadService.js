const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOADS_DIR = path.join(__dirname, '../data/uploads');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const ALLOWED_MIME_MAP = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

class UploadService {
  /**
   * Saves a base64 or binary image payload to the local uploads directory
   *
   * @param {Object} params
   * @param {string} params.imageBase64 - Base64 encoded string (with or without data URI header)
   * @param {string} [params.mimeType] - Optional explicit MIME type
   * @returns {Promise<{ success: boolean, imageUrl: string, filename: string, sizeBytes: number }>}
   */
  static async saveImage({ imageBase64, mimeType }) {
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      const err = new Error('No image payload provided');
      err.statusCode = 400;
      throw err;
    }

    let detectedMime = mimeType || 'image/jpeg';
    let rawBase64 = imageBase64;

    // Check if data URI scheme is present (e.g. data:image/png;base64,xxxx)
    const dataUriMatch = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-+.]+);base64,(.+)$/);
    if (dataUriMatch) {
      detectedMime = dataUriMatch[1].toLowerCase();
      rawBase64 = dataUriMatch[2];
    }

    // Convert to binary buffer
    const buffer = Buffer.from(rawBase64.trim(), 'base64');

    // Validate file size
    if (buffer.length > MAX_FILE_SIZE) {
      const err = new Error(`Image size exceeds maximum limit of 5MB (Received ${(buffer.length / (1024 * 1024)).toFixed(2)}MB)`);
      err.statusCode = 413;
      throw err;
    }

    if (buffer.length < 16) {
      const err = new Error('Invalid or empty image data');
      err.statusCode = 400;
      throw err;
    }

    // Auto-detect format from binary magic bytes
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      detectedMime = 'image/png';
    } else if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      detectedMime = 'image/jpeg';
    } else if (buffer.length >= 12 && buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP') {
      detectedMime = 'image/webp';
    } else if (buffer.length >= 4 && buffer.slice(0, 3).toString('ascii') === 'GIF') {
      detectedMime = 'image/gif';
    }

    // Validate MIME type
    const extension = ALLOWED_MIME_MAP[detectedMime] || '.jpg';

    // Generate safe, collision-resistant filename
    const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    const filename = `post_${uniqueSuffix}${extension}`;
    const filePath = path.join(UPLOADS_DIR, filename);

    // Save to disk
    await fs.promises.writeFile(filePath, buffer);

    const imageUrl = `/api/community/uploads/${filename}`;

    return {
      success: true,
      imageUrl,
      filename,
      sizeBytes: buffer.length,
      mimeType: detectedMime,
    };
  }

  /**
   * Retrieves file details or stream for static serving
   */
  static getFilePath(filename) {
    // Sanitize filename to prevent directory traversal attacks
    const sanitized = path.basename(filename);
    const filePath = path.join(UPLOADS_DIR, sanitized);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return filePath;
  }

  /**
   * Delete uploaded image file if exists
   */
  static deleteImage(imageUrlOrFilename) {
    try {
      if (!imageUrlOrFilename) return false;
      const filename = path.basename(imageUrlOrFilename);
      const filePath = path.join(UPLOADS_DIR, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
    } catch (e) {
      console.warn('[UploadService] Error deleting image file:', e.message);
    }
    return false;
  }

  /**
   * Validates binary signature / magic bytes against declared MIME type
   */
  static verifyMagicBytes(buffer, mimeType) {
    if (!buffer || buffer.length < 4) return false;

    // JPEG: FF D8 FF
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (mimeType === 'image/png') {
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );
    }

    // GIF: 47 49 46 38
    if (mimeType === 'image/gif') {
      return (
        buffer[0] === 0x47 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x38
      );
    }

    // WEBP: RIFF....WEBP
    if (mimeType === 'image/webp') {
      const isRiff = buffer.slice(0, 4).toString('ascii') === 'RIFF';
      const isWebp = buffer.slice(8, 12).toString('ascii') === 'WEBP';
      return isRiff && isWebp;
    }

    return true;
  }
}

module.exports = UploadService;
