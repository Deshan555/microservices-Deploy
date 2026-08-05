const axios = require('axios');
require('dotenv').config();

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
    const [photoReference, signatureReference] = await Promise.all([
        evidencePhoto
            ? uploadImage({
                key: `${prefix}/evidence`,
                image: evidencePhoto,
                allowedTypes: ['image/jpeg', 'image/jpg', 'image/png'],
            })
            : null,
        growerSignature
            ? uploadImage({
                key: `${prefix}/grower-signature`,
                image: growerSignature,
                allowedTypes: ['image/png'],
            })
            : null,
    ]);
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
