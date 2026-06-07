import crypto from 'crypto';

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
 * Helper to recursively encrypt User IDs in outbound payloads.
 */
export const encryptUserIds = (data) => {
  if (!data) return data;
  if (typeof data === 'string') {
    // Check if it is a 24-character hex ID, if so, encrypt it
    if (data.length === 24 && /^[0-9a-fA-F]{24}$/.test(data)) {
      return encryptId(data);
    }
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(item => encryptUserIds(item));
  }
  if (typeof data === 'object') {
    // If it's a mongoose document, convert to object
    const obj = typeof data.toObject === 'function' ? data.toObject() : data;
    
    // Check if it's a User object or contains User references
    if (obj._id) {
      obj._id = encryptId(obj._id);
    }
    if (obj.id) {
      obj.id = encryptId(obj.id);
    }
    
    // Recursively process keys
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (key.endsWith('Id')) {
          obj[key] = encryptId(obj[key]);
        } else if (['createdBy', 'assignedTo', 'recipient', 'sender', 'members', 'collaborators'].includes(key)) {
          obj[key] = encryptUserIds(obj[key]);
        } else if (key === 'comments' || key === 'messages') {
          obj[key] = obj[key].map(c => {
            if (c.userId) c.userId = encryptUserIds(c.userId);
            if (c.senderId) c.senderId = encryptUserIds(c.senderId);
            return c;
          });
        }
      }
    }
    return obj;
  }
  return data;
};
