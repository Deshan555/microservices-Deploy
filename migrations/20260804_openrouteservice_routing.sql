-- Persist OpenRouteService optimization, time-distance matrix, and directions metadata.

SET @route_distance_exists = (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'roadrouting'
      AND column_name = 'RouteDistanceMeters'
);
SET @route_distance_sql = IF(
    @route_distance_exists = 0,
    'ALTER TABLE roadrouting ADD COLUMN RouteDistanceMeters DECIMAL(14,2) NULL AFTER RouteGeoJSON',
    'SELECT 1'
);
PREPARE route_distance_statement FROM @route_distance_sql;
EXECUTE route_distance_statement;
DEALLOCATE PREPARE route_distance_statement;

SET @route_duration_exists = (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'roadrouting'
      AND column_name = 'RouteDurationSeconds'
);
SET @route_duration_sql = IF(
    @route_duration_exists = 0,
    'ALTER TABLE roadrouting ADD COLUMN RouteDurationSeconds DECIMAL(14,2) NULL AFTER RouteDistanceMeters',
    'SELECT 1'
);
PREPARE route_duration_statement FROM @route_duration_sql;
EXECUTE route_duration_statement;
DEALLOCATE PREPARE route_duration_statement;

SET @route_optimization_exists = (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'roadrouting'
      AND column_name = 'RouteOptimization'
);
SET @route_optimization_sql = IF(
    @route_optimization_exists = 0,
    'ALTER TABLE roadrouting ADD COLUMN RouteOptimization JSON NULL AFTER RouteDurationSeconds',
    'SELECT 1'
);
PREPARE route_optimization_statement FROM @route_optimization_sql;
EXECUTE route_optimization_statement;
DEALLOCATE PREPARE route_optimization_statement;

SET @route_geometry_source_exists = (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'roadrouting'
      AND column_name = 'RouteGeometrySource'
);
SET @route_geometry_source_sql = IF(
    @route_geometry_source_exists = 0,
    'ALTER TABLE roadrouting ADD COLUMN RouteGeometrySource VARCHAR(32) NOT NULL DEFAULT ''SEEDED'' AFTER RouteOptimization',
    'SELECT 1'
);
PREPARE route_geometry_source_statement FROM @route_geometry_source_sql;
EXECUTE route_geometry_source_statement;
DEALLOCATE PREPARE route_geometry_source_statement;
