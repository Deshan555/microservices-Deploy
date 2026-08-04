const { query } = require('../config/database');
const Logger = require('../config/logger');
const logger = require("../config/logger");

// RoadRoutingModel is an object that contains functions
const RoadRoutingModel = {
    getAllRoadRouting: async () => {
        try {
            return await query(`
                SELECT
                    r.*,
                    (
                        SELECT v.VehicleID
                        FROM vehiclemappings AS v
                        WHERE v.RouteID = r.RoutingID
                        LIMIT 1
                    ) AS VehicleID,
                    (
                        SELECT v.VehicleNumber
                        FROM vehiclemappings AS v
                        WHERE v.RouteID = r.RoutingID
                        LIMIT 1
                    ) AS VehicleNumber,
                    (
                        SELECT COUNT(*)
                        FROM fieldinfo AS f
                        WHERE f.RouteID = r.RoutingID
                    ) AS TotalStops
                FROM roadrouting AS r
            `);
        } catch (error) {
            logger.error('Error getting roadRouting:', error);
        }
    },
    addRoadRouting: async (RoutingID, SourceFactoryID, Destination, RoundTrip, StartLongitude, StartLatitude, EndLongitude, EndLatitude, TotalStops, Duration, CollectorID, RouteGeoJSON, RouteDistanceMeters, RouteDurationSeconds, RouteOptimization) => {
        return query('INSERT INTO roadrouting (RoutingID, SourceFactoryID, Destination, RoundTrip, StartLongitude, StartLatitude, EndLongitude, EndLatitude, TotalStops, Duration, CollectorID, RouteGeoJSON, RouteDistanceMeters, RouteDurationSeconds, RouteOptimization, RouteGeometrySource) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [RoutingID, SourceFactoryID, Destination, RoundTrip, StartLongitude, StartLatitude, EndLongitude, EndLatitude, TotalStops, Duration, CollectorID, JSON.stringify(RouteGeoJSON), RouteDistanceMeters, RouteDurationSeconds, JSON.stringify(RouteOptimization), 'OPENROUTESERVICE']);
    },
    updateRoadRouting: async (RoutingID, SourceFactoryID, Destination, RoundTrip, StartLongitude, StartLatitude, EndLongitude, EndLatitude, Duration, CollectorID, RouteGeoJSON, RouteDistanceMeters, RouteDurationSeconds, RouteOptimization) => {
        return query('UPDATE roadrouting SET SourceFactoryID = ?, Destination = ?, RoundTrip = ?, StartLongitude = ?, StartLatitude = ?, EndLongitude = ?, EndLatitude = ?, Duration = ?, CollectorID = ?, RouteGeoJSON = ?, RouteDistanceMeters = ?, RouteDurationSeconds = ?, RouteOptimization = ?, RouteGeometrySource = ? WHERE RoutingID = ?', [SourceFactoryID, Destination, RoundTrip, StartLongitude, StartLatitude, EndLongitude, EndLatitude, Duration, CollectorID, JSON.stringify(RouteGeoJSON), RouteDistanceMeters, RouteDurationSeconds, JSON.stringify(RouteOptimization), 'OPENROUTESERVICE', RoutingID]);
    },
    findCollectorAssignment: async (CollectorID, ExcludedRoutingID = null) => {
        return query(
            `SELECT RoutingID, Destination
             FROM roadrouting
             WHERE CollectorID = ?
               AND (? IS NULL OR RoutingID <> ?)
             LIMIT 1`,
            [CollectorID, ExcludedRoutingID, ExcludedRoutingID],
        );
    },
    updateStopCount: async (RoutingID, TotalStops) => {
        try {
            return await query('UPDATE roadrouting SET TotalStops = ? WHERE RoutingID = ?', [TotalStops, RoutingID]);
        } catch (error) {
            logger.error('Error updating roadRouting:', error);
        }
    },
    getTotalStopCountByRoutingID: async (RoutingID) => {
        try {
            return await query('SELECT COUNT(*) AS TotalStops FROM fieldinfo WHERE RouteID = ?', [RoutingID]);
        } catch (error) {
            logger.error('Error getting roadRouting by ID:', error);
        }
    },
    getRoadRoutingByID: async (RoutingID) => {
        try {
            return await query(`
                SELECT
                    r.*,
                    (
                        SELECT v.VehicleID
                        FROM vehiclemappings AS v
                        WHERE v.RouteID = r.RoutingID
                        LIMIT 1
                    ) AS VehicleID,
                    (
                        SELECT v.VehicleNumber
                        FROM vehiclemappings AS v
                        WHERE v.RouteID = r.RoutingID
                        LIMIT 1
                    ) AS VehicleNumber,
                    (
                        SELECT COUNT(*)
                        FROM fieldinfo AS f
                        WHERE f.RouteID = r.RoutingID
                    ) AS TotalStops
                FROM roadrouting AS r
                WHERE r.RoutingID = ?
            `, [RoutingID]);
        } catch (error) {
            logger.error('Error getting roadRouting by ID:', error);
        }
    },
    getRoadRoutingByCollectorID : async (CollectorID) => {
        try {
            return await query('SELECT * FROM roadrouting WHERE CollectorID = ?', [CollectorID]);
        } catch (error) {
            logger.error('Error getting roadRouting by ID:', error);
        }
    },
    getRouteFields: async (RoutingID = null) => {
        return query(
            `SELECT FieldID, FieldName, RouteID, Attitude, Longitude,
                    FieldAddress, OwnerID
             FROM fieldinfo
             WHERE RouteID IS NOT NULL
               AND (? IS NULL OR RouteID = ?)
             ORDER BY RouteID, FieldID`,
            [RoutingID, RoutingID],
        );
    },
    getFieldsByIDs: async (FieldIDs) => {
        if (!FieldIDs.length) return [];
        const placeholders = FieldIDs.map(() => '?').join(', ');
        return query(
            `SELECT FieldID, FieldName, RouteID, Attitude, Longitude,
                    FieldAddress, OwnerID, FactoryID
             FROM fieldinfo
             WHERE FieldID IN (${placeholders})
             ORDER BY FieldID`,
            FieldIDs,
        );
    },
    assignFields: async (RoutingID, FieldIDs) => {
        await query(
            `UPDATE fieldinfo
             SET RouteID = NULL
             WHERE RouteID = ?
               ${FieldIDs.length ? `AND FieldID NOT IN (${FieldIDs.map(() => '?').join(', ')})` : ''}`,
            [RoutingID, ...FieldIDs],
        );
        if (!FieldIDs.length) return;
        const placeholders = FieldIDs.map(() => '?').join(', ');
        await query(
            `UPDATE fieldinfo SET RouteID = ? WHERE FieldID IN (${placeholders})`,
            [RoutingID, ...FieldIDs],
        );
    },
    deleteRoadRouting: async (RoutingID) => {
        try {
            return await query('DELETE FROM roadrouting WHERE RoutingID = ?', [RoutingID]);
        } catch (error) {
            logger.error('Error deleting roadRouting:', error);
        }
    },
    routingWithOutMappings: async () => {
        try {
            return await query(`
                SELECT
                    r.RoutingID,
                    r.SourceFactoryID,
                    r.Destination,
                    r.RoundTrip,
                    r.StartLongitude,
                    r.StartLatitude,
                    r.EndLongitude,
                    r.EndLatitude,
                    r.RouteGeoJSON,
                    (
                        SELECT COUNT(*)
                        FROM fieldinfo AS f
                        WHERE f.RouteID = r.RoutingID
                    ) AS TotalStops,
                    r.Duration
                FROM roadrouting AS r
                LEFT JOIN vehiclemappings AS v ON r.RoutingID = v.RouteID
                WHERE v.RouteID IS NULL
            `);
        } catch (error) {
            logger.error('Error getting Routes with no vehicle mappings:', error);
        }
    },

      
};

module.exports = RoadRoutingModel;
