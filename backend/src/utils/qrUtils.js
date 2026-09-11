const QRCode = require('qrcode');
const mongoose = require('mongoose');

const QR_PREFIX = 'LIBRARY';
const QR_VERSION = '1';
const QR_TYPE_BOOK = 'BOOK';
const QR_TYPE_BORROWER = 'BORROWER';

// Generate payload for Book
const generateBookPayload = (bookId) => {
  const id = String(bookId).trim();
  return `${QR_PREFIX}:${QR_TYPE_BOOK}:${QR_VERSION}:${id}`;
};

// Generate payload for Borrower
const generateBorrowerPayload = (borrowerId) => {
  const id = String(borrowerId).trim();
  return `${QR_PREFIX}:${QR_TYPE_BORROWER}:${QR_VERSION}:${id}`;
};

// Parse payload and validate
const parsePayload = (payload) => {
  if (!payload || typeof payload !== 'string' || payload.trim() === '') {
    throw new Error('QR payload is required');
  }

  const trimmed = payload.trim();
  const parts = trimmed.split(':');

  if (parts.length !== 4) {
    throw new Error('Invalid QR payload format');
  }

  const [prefix, type, version, id] = parts;

  if (prefix !== QR_PREFIX) {
    throw new Error('Invalid QR payload prefix');
  }

  if (type !== QR_TYPE_BOOK && type !== QR_TYPE_BORROWER) {
    throw new Error('Unsupported QR type');
  }

  if (version !== QR_VERSION) {
    throw new Error('Unsupported QR version');
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid QR identifier');
  }

  return {
    type: type.toLowerCase(), // 'book' or 'borrower'
    rawType: type,
    version,
    id
  };
};

// Generate QR image as Data URL (base64 PNG)
const generateQrImage = async (payload) => {
  try {
    const dataUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      margin: 1,
      width: 300
    });
    return dataUrl;
  } catch (err) {
    throw new Error('Failed to generate QR image');
  }
};

module.exports = {
  QR_PREFIX,
  QR_VERSION,
  QR_TYPE_BOOK,
  QR_TYPE_BORROWER,
  generateBookPayload,
  generateBorrowerPayload,
  parsePayload,
  generateQrImage
};
