const EARTH_RADIUS_METERS = 6371000;

function toRadians(value) {
    return (Number(value) * Math.PI) / 180;
}

function haversineDistanceMeters(latitudeA, longitudeA, latitudeB, longitudeB) {
    const lat1 = toRadians(latitudeA);
    const lat2 = toRadians(latitudeB);
    const deltaLatitude = toRadians(Number(latitudeB) - Number(latitudeA));
    const deltaLongitude = toRadians(Number(longitudeB) - Number(longitudeA));
    const a = Math.sin(deltaLatitude / 2) ** 2
        + Math.cos(lat1)
        * Math.cos(lat2)
        * Math.sin(deltaLongitude / 2) ** 2;
    return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function weightRiskFlags({
    actualWeight,
    grossWeight,
    historicalAverage,
    historicalCount,
    historicalStdDev,
    waterWeight,
}) {
    const flags = [];
    const actual = Number(actualWeight);
    const gross = Number(grossWeight);
    const water = Number(waterWeight);
    if (!Number.isFinite(gross) || gross <= 0) flags.push('INVALID_GROSS_WEIGHT');
    if (!Number.isFinite(water) || water < 0) flags.push('INVALID_WATER_WEIGHT');
    if (!Number.isFinite(actual) || actual <= 0) flags.push('INVALID_NET_WEIGHT');
    if (
        Number.isFinite(gross)
        && Number.isFinite(water)
        && Number.isFinite(actual)
        && Math.abs(gross - water - actual) > 0.15
    ) {
        flags.push('WEIGHT_CALCULATION_MISMATCH');
    }

    const average = Number(historicalAverage);
    const standardDeviation = Number(historicalStdDev);
    if (Number(historicalCount) >= 5 && Number.isFinite(average) && average > 0) {
        const upperLimit = standardDeviation > 0
            ? average + (3 * standardDeviation)
            : average * 2;
        const lowerLimit = standardDeviation > 0
            ? Math.max(0, average - (3 * standardDeviation))
            : average * 0.35;
        if (actual > upperLimit) flags.push('WEIGHT_ABOVE_FIELD_BASELINE');
        if (actual < lowerLimit) flags.push('WEIGHT_BELOW_FIELD_BASELINE');
    }
    return flags;
}

function uniqueFlags(flags) {
    return [...new Set(flags.filter(Boolean))];
}

module.exports = {
    haversineDistanceMeters,
    uniqueFlags,
    weightRiskFlags,
};
