const EARTH_RADIUS_METERS = 6371000;

function parseGeoJSON(value) {
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch {
            throw new Error('RouteGeoJSON must contain valid JSON.');
        }
    }
    return value;
}

function lineGeometry(value) {
    const parsed = parseGeoJSON(value);
    if (parsed?.type === 'LineString') return parsed;
    if (parsed?.type === 'Feature' && parsed.geometry?.type === 'LineString') {
        return parsed.geometry;
    }
    if (parsed?.type === 'FeatureCollection') {
        return parsed.features?.find(
            (feature) => feature?.geometry?.type === 'LineString',
        )?.geometry;
    }
    return null;
}

function normalizeCoordinate(coordinate, index) {
    if (!Array.isArray(coordinate) || coordinate.length < 2) {
        throw new Error(`Route path point ${index + 1} must be [longitude, latitude].`);
    }
    const longitude = Number(coordinate[0]);
    const latitude = Number(coordinate[1]);
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        throw new Error(`Route path point ${index + 1} has an invalid longitude.`);
    }
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
        throw new Error(`Route path point ${index + 1} has an invalid latitude.`);
    }
    return [Number(longitude.toFixed(7)), Number(latitude.toFixed(7))];
}

function normalizeRouteGeoJSON(value, properties = {}) {
    const geometry = lineGeometry(value);
    if (!geometry || !Array.isArray(geometry.coordinates)) {
        throw new Error('RouteGeoJSON must be a GeoJSON LineString feature.');
    }
    const coordinates = geometry.coordinates.map(normalizeCoordinate);
    if (coordinates.length < 2) {
        throw new Error('RouteGeoJSON must contain at least two path points.');
    }
    const distinctCoordinates = new Set(
        coordinates.map((coordinate) => coordinate.join(',')),
    );
    if (distinctCoordinates.size < 2) {
        throw new Error('RouteGeoJSON must contain at least two different path points.');
    }
    return {
        type: 'Feature',
        properties: { ...properties },
        geometry: { type: 'LineString', coordinates },
    };
}

function radians(value) {
    return (value * Math.PI) / 180;
}

function pointToSegmentMeters(point, start, end) {
    const referenceLatitude = radians((point[1] + start[1] + end[1]) / 3);
    const project = ([longitude, latitude]) => ({
        x: radians(longitude) * EARTH_RADIUS_METERS * Math.cos(referenceLatitude),
        y: radians(latitude) * EARTH_RADIUS_METERS,
    });
    const p = project(point);
    const a = project(start);
    const b = project(end);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    const factor = lengthSquared === 0
        ? 0
        : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared));
    return Math.hypot(p.x - (a.x + factor * dx), p.y - (a.y + factor * dy));
}

function distanceFromRouteMeters(value, longitude, latitude) {
    const route = normalizeRouteGeoJSON(value);
    const point = normalizeCoordinate([longitude, latitude], 0);
    let minimum = Number.POSITIVE_INFINITY;
    for (let index = 1; index < route.geometry.coordinates.length; index += 1) {
        minimum = Math.min(
            minimum,
            pointToSegmentMeters(
                point,
                route.geometry.coordinates[index - 1],
                route.geometry.coordinates[index],
            ),
        );
    }
    return minimum;
}

function buildRouteMapGeoJSON(route, fields = []) {
    const path = normalizeRouteGeoJSON(route.RouteGeoJSON, {
        featureType: 'route-path',
        routeId: Number(route.RoutingID),
        destination: route.Destination,
    });
    const fieldFeatures = fields
        .filter((field) =>
            Number.isFinite(Number(field.Longitude)) &&
            Number.isFinite(Number(field.Attitude)),
        )
        .map((field) => ({
            type: 'Feature',
            properties: {
                featureType: 'tea-field',
                fieldId: Number(field.FieldID),
                fieldName: field.FieldName,
                routeId: Number(route.RoutingID),
            },
            geometry: {
                type: 'Point',
                coordinates: [Number(field.Longitude), Number(field.Attitude)],
            },
        }));
    return { type: 'FeatureCollection', features: [path, ...fieldFeatures] };
}

module.exports = {
    buildRouteMapGeoJSON,
    distanceFromRouteMeters,
    normalizeRouteGeoJSON,
};
