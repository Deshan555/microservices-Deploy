-- Polygon coverage for environmental zones.
-- Stored as JSON text containing ordered [latitude, longitude] pairs.

ALTER TABLE environmentalzone
    ADD COLUMN BoundaryPolygon LONGTEXT NULL AFTER BaseLocation;

UPDATE environmentalzone
SET BoundaryPolygon = '[[6.8500,80.7000],[6.8500,80.8800],[7.0300,80.9100],[7.0800,80.7400],[6.9500,80.6600]]'
WHERE ZoneID = 3001
  AND (BoundaryPolygon IS NULL OR BoundaryPolygon = '');

UPDATE environmentalzone
SET BoundaryPolygon = '[[6.6700,80.8800],[6.6800,81.1500],[6.9200,81.1800],[7.0300,80.9900],[6.8800,80.8500]]'
WHERE ZoneID = 3002
  AND (BoundaryPolygon IS NULL OR BoundaryPolygon = '');

UPDATE environmentalzone
SET BoundaryPolygon = '[[6.7700,80.4500],[6.7700,80.6800],[7.0300,80.7300],[7.1300,80.5200],[6.9800,80.4200]]'
WHERE ZoneID = 3003
  AND (BoundaryPolygon IS NULL OR BoundaryPolygon = '');
