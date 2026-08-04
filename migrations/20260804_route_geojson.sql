-- Store a valid GeoJSON LineString for every collection route.
-- Existing paths are seeded through their assigned tea-field coordinates.

SET @route_geojson_column_exists = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'roadrouting'
      AND column_name = 'RouteGeoJSON'
);
SET @add_route_geojson_sql = IF(
    @route_geojson_column_exists = 0,
    'ALTER TABLE roadrouting ADD COLUMN RouteGeoJSON JSON NULL AFTER CollectorID',
    'SELECT 1'
);
PREPARE add_route_geojson_statement FROM @add_route_geojson_sql;
EXECUTE add_route_geojson_statement;
DEALLOCATE PREPARE add_route_geojson_statement;

CREATE TEMPORARY TABLE route_geojson_points (
    RoutingID INT NOT NULL,
    PointOrder INT NOT NULL,
    Longitude DECIMAL(11,7) NOT NULL,
    Latitude DECIMAL(10,7) NOT NULL,
    PRIMARY KEY (RoutingID, PointOrder)
);

INSERT INTO route_geojson_points (RoutingID, PointOrder, Longitude, Latitude)
SELECT RoutingID, 0, StartLongitude, StartLatitude
FROM roadrouting;

INSERT INTO route_geojson_points (RoutingID, PointOrder, Longitude, Latitude)
SELECT
    field.RouteID,
    ROW_NUMBER() OVER (PARTITION BY field.RouteID ORDER BY field.FieldID),
    field.Longitude,
    field.Attitude
FROM fieldinfo AS field
WHERE field.RouteID IS NOT NULL
  AND field.Longitude IS NOT NULL
  AND field.Attitude IS NOT NULL;

INSERT INTO route_geojson_points (RoutingID, PointOrder, Longitude, Latitude)
SELECT RoutingID, 2147483647, EndLongitude, EndLatitude
FROM roadrouting;

UPDATE roadrouting AS route
JOIN (
    SELECT
        points.RoutingID,
        CAST(
            CONCAT(
                '[',
                GROUP_CONCAT(
                    JSON_ARRAY(points.Longitude, points.Latitude)
                    ORDER BY points.PointOrder SEPARATOR ','
                ),
                ']'
            ) AS JSON
        ) AS Coordinates
    FROM route_geojson_points AS points
    GROUP BY points.RoutingID
) AS geometry_data ON geometry_data.RoutingID = route.RoutingID
SET route.RouteGeoJSON = JSON_OBJECT(
    'type', 'Feature',
    'properties', JSON_OBJECT(
        'featureType', 'route-path',
        'routeId', route.RoutingID,
        'destination', route.Destination
    ),
    'geometry', JSON_OBJECT(
        'type', 'LineString',
        'coordinates', geometry_data.Coordinates
    )
)
WHERE route.RouteGeoJSON IS NULL;

DROP TEMPORARY TABLE route_geojson_points;

SET @route_geojson_is_nullable = (
    SELECT is_nullable
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'roadrouting'
      AND column_name = 'RouteGeoJSON'
);
SET @require_route_geojson_sql = IF(
    @route_geojson_is_nullable = 'YES',
    'ALTER TABLE roadrouting MODIFY COLUMN RouteGeoJSON JSON NOT NULL',
    'SELECT 1'
);
PREPARE require_route_geojson_statement FROM @require_route_geojson_sql;
EXECUTE require_route_geojson_statement;
DEALLOCATE PREPARE require_route_geojson_statement;

SET @route_geojson_check_exists = (
    SELECT COUNT(*)
    FROM information_schema.table_constraints
    WHERE constraint_schema = DATABASE()
      AND table_name = 'roadrouting'
      AND constraint_name = 'chk_route_geojson_linestring'
);
SET @route_geojson_check_sql = IF(
    @route_geojson_check_exists = 0,
    'ALTER TABLE roadrouting ADD CONSTRAINT chk_route_geojson_linestring CHECK (JSON_UNQUOTE(JSON_EXTRACT(RouteGeoJSON, ''$.type'')) = ''Feature'' AND JSON_UNQUOTE(JSON_EXTRACT(RouteGeoJSON, ''$.geometry.type'')) = ''LineString'' AND JSON_LENGTH(JSON_EXTRACT(RouteGeoJSON, ''$.geometry.coordinates'')) >= 2)',
    'SELECT 1'
);
PREPARE route_geojson_check_statement FROM @route_geojson_check_sql;
EXECUTE route_geojson_check_statement;
DEALLOCATE PREPARE route_geojson_check_statement;
