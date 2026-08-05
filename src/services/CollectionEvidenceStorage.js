const axios = require('axios');
require('dotenv').config();

const DEFAULT_UPLOAD_ATTEMPTS = 3;
const RETRYABLE_NETWORK_CODES = new Set([
    'ECONNABORTED',
    'ECONNRESET',
    'ENETUNREACH',
    'ETIMEDOUT',
]);

function sleep(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function uploadAttempts() {
    const configured = Number(process.env.SUPABASE_STORAGE_UPLOAD_ATTEMPTS);
    return Number.isInteger(configured) && configured > 0
        ? Math.min(configured, 5)
        : DEFAULT_UPLOAD_ATTEMPTS;
}

function storageErrorDetails(error) {
    const status = Number(error.response?.status) || null;
    const data = error.response?.data;
    const storageCode = data && typeof data === 'object'
        ? data.code || data.errorCode || data.error
        : null;
    const storageMessage = data && typeof data === 'object'
        ? data.message
        : typeof data === 'string'
            ? data
            : null;
    return {
        status,
        storageCode: storageCode ? String(storageCode) : null,
        storageMessage: storageMessage ? String(storageMessage).slice(0, 500) : null,
    };
}

function isRetryableUploadError(error) {
    const status = Number(error.response?.status);
    return status === 429
        || status === 544
        || (status >= 500 && status <= 599)
        || RETRYABLE_NETWORK_CODES.has(error.code);
}

function finalUploadError(error) {
    const { status, storageCode, storageMessage } = storageErrorDetails(error);
    const context = [status, storageCode].filter(Boolean).join(' ');
    const wrapped = new Error(
        `Supabase Storage upload failed${context ? ` (${context})` : ''}: ${storageMessage || error.message}`,
    );
    wrapped.code = storageCode || 'EVIDENCE_STORAGE_UPLOAD_FAILED';
    wrapped.statusCode = status;
    wrapped.cause = error;
    return wrapped;
}

function configuration() {
    const config = {
        supabaseUrl: String(process.env.SUPABASE_URL || '').replace(/\/$/, ''),
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        bucket: process.env.SUPABASE_STORAGE_BUCKET || 'collection-evidence',
    };
    const missing = Object.entries(config)
        .filter(([, value]) => !String(value || '').trim())
        .map(([key]) => key);
    if (missing.length) {
        const error = new Error(
            `Supabase evidence storage is not configured (${missing.join(', ')}).`,
        );
        error.code = 'EVIDENCE_STORAGE_NOT_CONFIGURED';
        throw error;
    }
    return {
        ...config,
        storageUrl: `${config.supabaseUrl}/storage/v1`,
    };
}

function headers(config, contentType = 'application/json') {
    return {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        'Content-Type': contentType,
    };
}

function encodeObjectPath(value) {
    return String(value)
        .split('/')
        .map((part) => encodeURIComponent(part))
        .join('/');
}

function decodeDataImage(value, allowedTypes) {
    const match = String(value || '').match(
        /^data:(image\/(?:jpeg|jpg|png));base64,([A-Za-z0-9+/=\r\n]+)$/i,
    );
    if (!match || !allowedTypes.includes(match[1].toLowerCase())) {
        throw new Error('Collection evidence contains an unsupported image.');
    }
    const contentType = match[1].toLowerCase().replace('image/jpg', 'image/jpeg');
    const body = Buffer.from(match[2], 'base64');
    if (!body.length) throw new Error('Collection evidence image is empty.');
    return { body, contentType, extension: contentType === 'image/png' ? 'png' : 'jpg' };
}

async function uploadImage({ key, image, allowedTypes }) {
    const config = configuration();
    const decoded = decodeDataImage(image, allowedTypes);
    const objectKey = `${key}.${decoded.extension}`;
    const url = [
        config.storageUrl,
        'object',
        encodeURIComponent(config.bucket),
        encodeObjectPath(objectKey),
    ].join('/');
    const attempts = uploadAttempts();
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            await axios.post(url, decoded.body, {
                headers: {
                    ...headers(config, decoded.contentType),
                    'Cache-Control': 'private, max-age=3600',
                    'x-upsert': 'true',
                },
                maxBodyLength: 6 * 1024 * 1024,
                timeout: 30_000,
            });
            return `supabase://${config.bucket}/${objectKey}`;
        } catch (error) {
            if (attempt >= attempts || !isRetryableUploadError(error)) {
                throw finalUploadError(error);
            }
            const { status, storageCode } = storageErrorDetails(error);
            console.warn(
                `Supabase Storage upload attempt ${attempt}/${attempts} failed`
                + `${status ? ` (${status}${storageCode ? ` ${storageCode}` : ''})` : ''}; retrying.`,
            );
            await sleep(500 * (2 ** (attempt - 1)));
        }
    }
}

async function uploadCollectionEvidence({
    tenantId,
    collectorId,
    submissionId,
    evidencePhoto,
    growerSignature,
}) {
    const prefix = [
        'tea-collections',
        `tenant-${Number(tenantId)}`,
        `collector-${Number(collectorId)}`,
        String(submissionId),
    ].join('/');
    // Upload sequentially to avoid consuming two Storage database connections for
    // one collection on smaller Supabase projects.
    const photoReference = evidencePhoto
        ? await uploadImage({
            key: `${prefix}/evidence`,
            image: evidencePhoto,
            allowedTypes: ['image/jpeg', 'image/jpg', 'image/png'],
        })
        : null;
    const signatureReference = growerSignature
        ? await uploadImage({
            key: `${prefix}/grower-signature`,
            image: growerSignature,
            allowedTypes: ['image/png'],
        })
        : null;
    return { photoReference, signatureReference };
}

function parseReference(reference) {
    const match = String(reference || '').match(
        /^(?:supabase|s3):\/\/([^/]+)\/(.+)$/,
    );
    if (!match) throw new Error('The evidence storage reference is invalid.');
    return { bucket: match[1], key: match[2] };
}

async function createEvidenceDownloadUrl(reference) {
    const config = configuration();
    const { bucket, key } = parseReference(reference);
    const endpoint = [
        config.storageUrl,
        'object',
        'sign',
        encodeURIComponent(bucket),
        encodeObjectPath(key),
    ].join('/');
    const response = await axios.post(
        endpoint,
        { expiresIn: 300 },
        { headers: headers(config), timeout: 15_000 },
    );
    const signedPath = response.data?.signedURL || response.data?.signedUrl;
    if (!signedPath) throw new Error('Supabase did not return a signed URL.');
    return signedPath.startsWith('http')
        ? signedPath
        : `${config.storageUrl}${signedPath.startsWith('/') ? '' : '/'}${signedPath}`;
}

module.exports = {
    createEvidenceDownloadUrl,
    uploadCollectionEvidence,
};
