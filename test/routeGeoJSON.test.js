const test = require('node:test');
const assert = require('node:assert/strict');
const {
    buildRouteMapGeoJSON,
    distanceFromRouteMeters,
    normalizeRouteGeoJSON,
} = require('../src/utils/routeGeoJSON');

test('normalizes a valid route LineString feature', () => {
    const route = normalizeRouteGeoJSON({
        type: 'LineString',
        coordinates: [[80.7, 6.9], [80.8, 7.0]],
    });
    assert.equal(route.type, 'Feature');
    assert.equal(route.geometry.type, 'LineString');
    assert.equal(route.geometry.coordinates.length, 2);
});

test('rejects invalid route geometry and coordinates', () => {
    assert.throws(() => normalizeRouteGeoJSON({ type: 'Point', coordinates: [80, 7] }));
    assert.throws(() => normalizeRouteGeoJSON({ type: 'LineString', coordinates: [[181, 7], [80, 7]] }));
});

test('calculates field distance from the route path', () => {
    const route = { type: 'LineString', coordinates: [[80.7, 7], [80.8, 7]] };
    assert.ok(distanceFromRouteMeters(route, 80.75, 7) < 1);
    assert.ok(distanceFromRouteMeters(route, 80.75, 7.1) > 10000);
});

test('builds a FeatureCollection containing the path and assigned fields', () => {
    const result = buildRouteMapGeoJSON(
        {
            RoutingID: 4001,
            Destination: 'Test route',
            RouteGeoJSON: { type: 'LineString', coordinates: [[80.7, 7], [80.8, 7]] },
        },
        [{ FieldID: 5001, FieldName: 'Field A', Longitude: 80.75, Attitude: 7 }],
    );
    assert.equal(result.type, 'FeatureCollection');
    assert.equal(result.features[0].geometry.type, 'LineString');
    assert.equal(result.features[1].geometry.type, 'Point');
    assert.equal(result.features[1].properties.fieldId, 5001);
});
