const axios = require('axios');

const DEFAULT_BASE_URL = 'https://api.openrouteservice.org';

function coordinate(longitude, latitude, label) {
    const lon = Number(longitude);
    const lat = Number(latitude);
    if (!Number.isFinite(lon) || lon < -180 || lon > 180 ||
        !Number.isFinite(lat) || lat < -90 || lat > 90) {
        throw new Error(`${label} has invalid coordinates.`);
    }
    return [Number(lon.toFixed(7)), Number(lat.toFixed(7))];
}

function isRoundTrip(value) {
    return value === true || value === 1 ||
        ['yes', 'true', '1'].includes(String(value || '').toLowerCase());
}

function configuration() {
    const baseURL = (process.env.OPENROUTESERVICE_BASE_URL || DEFAULT_BASE_URL)
        .replace(/\/$/, '');
    const apiKey = process.env.OPENROUTESERVICE_API_KEY;
    if (!apiKey && baseURL === DEFAULT_BASE_URL) {
        const error = new Error(
            'OpenRouteService is not configured. Set OPENROUTESERVICE_API_KEY before optimizing routes.',
        );
        error.status = 503;
        throw error;
    }
    return {
        apiKey,
        baseURL,
        profile: process.env.OPENROUTESERVICE_PROFILE || 'driving-car',
    };
}

function client(config) {
    return axios.create({
        baseURL: config.baseURL,
        timeout: Number(process.env.OPENROUTESERVICE_TIMEOUT_MS || 45000),
        headers: {
            Accept: 'application/json, application/geo+json',
            'Content-Type': 'application/json',
            ...(config.apiKey ? { Authorization: config.apiKey } : {}),
        },
    });
}

function serviceError(error) {
    if (error.status) return error;
    const details = error.response?.data?.error?.message ||
        error.response?.data?.message || error.message;
    const wrapped = new Error(`OpenRouteService could not optimize this route: ${details}`);
    wrapped.status = error.response?.status === 429 ? 429 : 502;
    return wrapped;
}

async function optimizeCollectionRoute({ factory, fields, roundTrip }) {
    if (!fields?.length) {
        const error = new Error('Select at least one field to optimize this route.');
        error.status = 400;
        throw error;
    }
    const maximumFields = Number(process.env.OPENROUTESERVICE_MAX_FIELDS || 24);
    if (fields.length > maximumFields) {
        const error = new Error(
            `Select no more than ${maximumFields} fields per optimized route.`,
        );
        error.status = 400;
        throw error;
    }
    const config = configuration();
    const api = client(config);
    const factoryCoordinate = coordinate(
        factory.FactoryLongitude,
        factory.FactoryLatitude,
        'Factory',
    );
    const fieldCoordinates = fields.map((field) => ({
        fieldId: Number(field.FieldID),
        coordinate: coordinate(field.Longitude, field.Attitude, `Field ${field.FieldID}`),
    }));
    const locations = [factoryCoordinate, ...fieldCoordinates.map((item) => item.coordinate)];

    try {
        const matrixResponse = await api.post(`/v2/matrix/${config.profile}`, {
            locations,
            metrics: ['distance', 'duration'],
            units: 'm',
        });
        if (!Array.isArray(matrixResponse.data?.distances) ||
            !Array.isArray(matrixResponse.data?.durations)) {
            throw new Error('Time-distance matrix could not be calculated for every stop.');
        }

        const vehicle = {
            id: 1,
            profile: config.profile,
            start: factoryCoordinate,
            ...(isRoundTrip(roundTrip) ? { end: factoryCoordinate } : {}),
        };
        const optimizationResponse = await api.post('/optimization', {
            jobs: fieldCoordinates.map((item) => ({
                id: item.fieldId,
                location: item.coordinate,
                service: Number(process.env.OPENROUTESERVICE_FIELD_SERVICE_SECONDS || 300),
            })),
            vehicles: [vehicle],
        });
        const optimizedRoute = optimizationResponse.data?.routes?.[0];
        const optimizedFieldIds = (optimizedRoute?.steps || [])
            .filter((step) => step.type === 'job' && step.job != null)
            .map((step) => Number(step.job));
        if (optimizedFieldIds.length !== fields.length) {
            throw new Error('Optimization did not return every selected field.');
        }
        const fieldById = new Map(fieldCoordinates.map((item) => [item.fieldId, item]));
        const orderedCoordinates = [
            factoryCoordinate,
            ...optimizedFieldIds.map((fieldId) => fieldById.get(fieldId).coordinate),
            ...(isRoundTrip(roundTrip) ? [factoryCoordinate] : []),
        ];
        const directionsResponse = await api.post(
            `/v2/directions/${config.profile}/geojson`,
            {
                coordinates: orderedCoordinates,
                instructions: false,
                preference: 'fastest',
            },
        );
        const feature = directionsResponse.data?.features?.[0];
        if (feature?.geometry?.type !== 'LineString') {
            throw new Error('Directions did not return a road LineString.');
        }
        const summary = feature.properties?.summary || {};
        return {
            geometry: {
                type: 'Feature',
                properties: {
                    ...feature.properties,
                    featureType: 'route-path',
                    provider: 'openrouteservice',
                    profile: config.profile,
                    optimizedFieldIds,
                },
                geometry: feature.geometry,
            },
            optimizedFieldIds,
            distanceMeters: Number(summary.distance ?? optimizedRoute?.distance ?? 0),
            durationSeconds: Number(summary.duration ?? optimizedRoute?.duration ?? 0),
            optimization: {
                provider: 'openrouteservice',
                profile: config.profile,
                optimizedAt: new Date().toISOString(),
                fieldOrder: optimizedFieldIds,
                matrix: {
                    locations: [
                        { type: 'factory', id: Number(factory.FactoryID) },
                        ...fieldCoordinates.map((item) => ({ type: 'field', id: item.fieldId })),
                    ],
                    distances: matrixResponse.data?.distances,
                    durations: matrixResponse.data?.durations,
                },
                optimizer: {
                    cost: optimizedRoute?.cost,
                    distance: optimizedRoute?.distance,
                    duration: optimizedRoute?.duration,
                },
            },
        };
    } catch (error) {
        throw serviceError(error);
    }
}

module.exports = {
    coordinate,
    isRoundTrip,
    optimizeCollectionRoute,
};
