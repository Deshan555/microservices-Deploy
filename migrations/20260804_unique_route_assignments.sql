-- Enforce one route per collector and one vehicle per route.
-- Existing duplicate links are released, never deleted, and recorded for audit.

CREATE TABLE IF NOT EXISTS assignment_constraint_remediation (
    RemediationID BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    EntityType ENUM('ROUTE_COLLECTOR', 'VEHICLE_ROUTE') NOT NULL,
    EntityID INT NOT NULL,
    ReleasedAssignmentID INT NOT NULL,
    KeptEntityID INT NOT NULL,
    Reason VARCHAR(255) NOT NULL,
    RemediatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (RemediationID),
    UNIQUE KEY uq_assignment_remediation (EntityType, EntityID, ReleasedAssignmentID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Keep the route with the collector's latest collection activity. Ties prefer
-- the lowest route ID to make the migration deterministic.
CREATE TEMPORARY TABLE collector_route_keep (
    CollectorID INT NOT NULL,
    RoutingID INT NOT NULL,
    PRIMARY KEY (CollectorID)
);

INSERT INTO collector_route_keep (CollectorID, RoutingID)
SELECT ranked.CollectorID, ranked.RoutingID
FROM (
    SELECT
        route.CollectorID,
        route.RoutingID,
        ROW_NUMBER() OVER (
            PARTITION BY route.CollectorID
            ORDER BY MAX(collection.CollectionDate) DESC, route.RoutingID ASC
        ) AS AssignmentRank
    FROM roadrouting AS route
    LEFT JOIN dailyteacollection AS collection
        ON collection.RouteID = route.RoutingID
    WHERE route.CollectorID IS NOT NULL
    GROUP BY route.CollectorID, route.RoutingID
) AS ranked
WHERE ranked.AssignmentRank = 1;

INSERT IGNORE INTO assignment_constraint_remediation (
    EntityType, EntityID, ReleasedAssignmentID, KeptEntityID, Reason
)
SELECT
    'ROUTE_COLLECTOR', route.RoutingID, route.CollectorID, keepRoute.RoutingID,
    'Released duplicate collector assignment before adding unique constraint'
FROM roadrouting AS route
JOIN collector_route_keep AS keepRoute
    ON keepRoute.CollectorID = route.CollectorID
WHERE route.RoutingID <> keepRoute.RoutingID;

UPDATE roadrouting AS route
JOIN collector_route_keep AS keepRoute
    ON keepRoute.CollectorID = route.CollectorID
SET route.CollectorID = NULL
WHERE route.RoutingID <> keepRoute.RoutingID;

DROP TEMPORARY TABLE collector_route_keep;

-- Keep one vehicle per route. The lowest vehicle ID wins where historical
-- vehicle-use evidence does not distinguish the records.
CREATE TEMPORARY TABLE route_vehicle_keep (
    RouteID INT NOT NULL,
    VehicleID INT NOT NULL,
    PRIMARY KEY (RouteID)
);

INSERT INTO route_vehicle_keep (RouteID, VehicleID)
SELECT RouteID, MIN(VehicleID)
FROM vehiclemappings
WHERE RouteID IS NOT NULL
GROUP BY RouteID;

INSERT IGNORE INTO assignment_constraint_remediation (
    EntityType, EntityID, ReleasedAssignmentID, KeptEntityID, Reason
)
SELECT
    'VEHICLE_ROUTE', vehicle.VehicleID, vehicle.RouteID, keepVehicle.VehicleID,
    'Released duplicate vehicle assignment before adding unique constraint'
FROM vehiclemappings AS vehicle
JOIN route_vehicle_keep AS keepVehicle
    ON keepVehicle.RouteID = vehicle.RouteID
WHERE vehicle.VehicleID <> keepVehicle.VehicleID;

UPDATE vehiclemappings AS vehicle
JOIN route_vehicle_keep AS keepVehicle
    ON keepVehicle.RouteID = vehicle.RouteID
SET vehicle.RouteID = NULL
WHERE vehicle.VehicleID <> keepVehicle.VehicleID;

DROP TEMPORARY TABLE route_vehicle_keep;

SET @route_collector_constraint_exists = (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'roadrouting'
      AND index_name = 'uq_roadrouting_collector'
);
SET @route_collector_constraint_sql = IF(
    @route_collector_constraint_exists = 0,
    'ALTER TABLE roadrouting ADD CONSTRAINT uq_roadrouting_collector UNIQUE (CollectorID)',
    'SELECT 1'
);
PREPARE route_collector_constraint_statement FROM @route_collector_constraint_sql;
EXECUTE route_collector_constraint_statement;
DEALLOCATE PREPARE route_collector_constraint_statement;

SET @vehicle_route_constraint_exists = (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'vehiclemappings'
      AND index_name = 'uq_vehiclemappings_route'
);
SET @vehicle_route_constraint_sql = IF(
    @vehicle_route_constraint_exists = 0,
    'ALTER TABLE vehiclemappings ADD CONSTRAINT uq_vehiclemappings_route UNIQUE (RouteID)',
    'SELECT 1'
);
PREPARE vehicle_route_constraint_statement FROM @vehicle_route_constraint_sql;
EXECUTE vehicle_route_constraint_statement;
DEALLOCATE PREPARE vehicle_route_constraint_statement;
