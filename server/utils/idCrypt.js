import crypto from 'crypto';
import mongoose from 'mongoose';

const algorithm = 'aes-128-cbc';
const getKey = () => {
  return crypto.scryptSync(process.env.JWT_SECRET || 'your-secret-key-fallback', 'salt', 16);
};
const iv = Buffer.alloc(16, 0); // stable IV

/**
 * Encrypts a raw MongoDB ObjectId (or string) into an encrypted hex string.
 */
export const encryptId = (id) => {
  if (!id) return id;
  const idStr = id.toString();
  const cipher = crypto.createCipheriv(algorithm, getKey(), iv);
  let encrypted = cipher.update(idStr, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

/**
 * Decrypts an encrypted hex string back into the raw MongoDB ObjectId string.
 */
export const decryptId = (encId) => {
  if (!encId) return encId;
  const encIdStr = encId.toString();
  if (encIdStr.length === 24 && /^[0-9a-fA-F]{24}$/.test(encIdStr)) {
    return encIdStr;
  }
  try {
    const decipher = crypto.createDecipheriv(algorithm, getKey(), iv);
    let decrypted = decipher.update(encIdStr, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    try {
      const fallbackKey = crypto.scryptSync('your-secret-key-fallback', 'salt', 16);
      const decipher = crypto.createDecipheriv(algorithm, fallbackKey, iv);
      let decrypted = decipher.update(encIdStr, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (fallbackErr) {
      return encId;
    }
  }
};

export const decryptIdIfNeeded = (val) => {
  if (typeof val !== 'string') return val;
  const isHex32 = val.length === 32 && /^[0-9a-fA-F]{32}$/.test(val);
  const isHex64 = val.length === 64 && /^[0-9a-fA-F]{64}$/.test(val);
  if (isHex32 || isHex64) {
    const decrypted = decryptId(val);
    if (decrypted && decrypted.length === 24 && /^[0-9a-fA-F]{24}$/.test(decrypted)) {
      return decrypted;
    }
  }
  return val;
};

export const decryptRequestData = (obj) => {
  if (!obj) return obj;
  if (typeof obj === 'string') {
    return decryptIdIfNeeded(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(item => decryptRequestData(item));
  }
  if (typeof obj === 'object') {
    const newObj = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = decryptRequestData(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
};

/**
 * Middleware to decrypt incoming request parameters, body, and query values.
 */
export const decryptionMiddleware = (req, res, next) => {
  let paramsVal = {};
  Object.defineProperty(req, 'params', {
    configurable: true,
    enumerable: true,
    get() {
      return paramsVal;
    },
    set(val) {
      paramsVal = decryptRequestData(val);
    }
  });

  if (req.body) req.body = decryptRequestData(req.body);
  if (req.query) {
    const decryptedQuery = decryptRequestData(req.query);
    for (const key in decryptedQuery) {
      req.query[key] = decryptedQuery[key];
    }
  }
  next();
};

/**
 * Helper to recursively encrypt User IDs in outbound payloads without mutating input objects.
 */
export const encryptUserIds = (data) => {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle Mongoose ObjectId or similar ObjectId instances
  if (data instanceof mongoose.Types.ObjectId || (typeof data === 'object' && data.constructor && data.constructor.name === 'ObjectId')) {
    return encryptId(data.toString());
  }

  // Handle Strings
  if (typeof data === 'string') {
    if (data.length === 24 && /^[0-9a-fA-F]{24}$/.test(data)) {
      return encryptId(data);
    }
    return data;
  }

  // Handle Arrays
  if (Array.isArray(data)) {
    return data.map(item => encryptUserIds(item));
  }

  // Handle Dates
  if (data instanceof Date) {
    return new Date(data.getTime());
  }

  // Handle Buffer
  if (Buffer.isBuffer(data)) {
    return Buffer.from(data);
  }

  // Handle Mongoose Document
  if (typeof data.toObject === 'function') {
    data = data.toObject({ getters: false, virtuals: false });
  }

  // Handle generic Objects
  if (typeof data === 'object') {
    const clone = {};
    
    // Copy/Clone properties
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        let val = data[key];

        // Perform encryption on keys and values
        if (key === '_id' || key === 'id') {
          if (val) {
            clone[key] = encryptId(val.toString());
          } else {
            clone[key] = val;
          }
        } else if (key.endsWith('Id')) {
          if (val) {
            clone[key] = encryptId(val.toString());
          } else {
            clone[key] = val;
          }
        } else if (['createdBy', 'assignedTo', 'recipient', 'sender', 'members', 'collaborators', 'replyTo', 'mentions'].includes(key)) {
          clone[key] = encryptUserIds(val);
        } else if (key === 'comments' || key === 'messages') {
          if (Array.isArray(val)) {
            clone[key] = val.map(c => {
              if (c && typeof c === 'object') {
                const commentClone = typeof c.toObject === 'function' ? c.toObject({ getters: false, virtuals: false }) : { ...c };
                if (commentClone.userId) commentClone.userId = encryptUserIds(commentClone.userId);
                if (commentClone.senderId) commentClone.senderId = encryptUserIds(commentClone.senderId);
                if (commentClone._id) commentClone._id = encryptId(commentClone._id.toString());
                if (commentClone.id) commentClone.id = encryptId(commentClone.id.toString());
                return commentClone;
              }
              return c;
            });
          } else {
            clone[key] = val;
          }
        } else {
          clone[key] = encryptUserIds(val);
        }
      }
    }
    return clone;
  }

  return data;
};
