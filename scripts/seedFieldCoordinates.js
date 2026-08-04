require('dotenv').config();

const { db, withTransaction } = require('../src/config/database');

const FIELD_COORDINATES = new Map([
    [5001, { latitude: 6.9568, longitude: 80.7891 }],
    [5002, { latitude: 6.9951, longitude: 80.8158 }],
    [5003, { latitude: 6.9949, longitude: 80.8564 }],
    [5004, { latitude: 6.9019, longitude: 80.9072 }],
    [5005, { latitude: 6.7658, longitude: 80.9597 }],
    [5006, { latitude: 6.9371, longitude: 80.6847 }],
    [5007, { latitude: 6.9619, longitude: 80.7968 }],
    [5008, { latitude: 6.9484, longitude: 80.8015 }],
]);

function isCoordinate(value, minimum, maximum) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum;
}

function closeDatabase() {
    return new Promise((resolve) => db.end(resolve));
}

async function backfillFieldCoordinates() {
    const result = await withTransaction(async (query) => {
        const fieldIds = [...FIELD_COORDINATES.keys()];
        const rows = await query(
            `SELECT FieldID, FieldName, Attitude, Longitude
             FROM fieldinfo
             WHERE FieldID IN (${fieldIds.map(() => '?').join(', ')})
             ORDER BY FieldID`,
            fieldIds,
        );

        const updated = [];
        const unchanged = [];
        for (const row of rows) {
            const fieldId = Number(row.FieldID);
            const coordinates = FIELD_COORDINATES.get(fieldId);
            const hasValidCoordinates =
                isCoordinate(row.Attitude, -90, 90) &&
                isCoordinate(row.Longitude, -180, 180);

            if (hasValidCoordinates) {
                unchanged.push(fieldId);
                continue;
            }

            await query(
                `UPDATE fieldinfo
                 SET Attitude = ?, Longitude = ?
                 WHERE FieldID = ?`,
                [coordinates.latitude, coordinates.longitude, fieldId],
            );
            updated.push(fieldId);
        }

        return {
            found: rows.length,
            missing: fieldIds.filter(
                (fieldId) => !rows.some((row) => Number(row.FieldID) === fieldId),
            ),
            unchanged,
            updated,
        };
    });

    console.log('Field coordinate backfill completed.');
    console.log(`Fields found: ${result.found}`);
    console.log(`Fields updated: ${result.updated.join(', ') || 'none'}`);
    console.log(`Already valid: ${result.unchanged.join(', ') || 'none'}`);
    console.log(`Missing field IDs: ${result.missing.join(', ') || 'none'}`);
}

backfillFieldCoordinates()
    .catch((error) => {
        console.error(`Field coordinate backfill failed: ${error.message}`);
        process.exitCode = 1;
    })
    .finally(closeDatabase);
