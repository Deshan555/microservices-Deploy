-- Geographic coordinates for tea factories.
-- Coordinates remain nullable at the database level so legacy factories can be
-- migrated safely; the factory API requires valid values on create and update.

ALTER TABLE factories
    ADD COLUMN FactoryLatitude DECIMAL(10,7) NULL AFTER FactoryAddress,
    ADD COLUMN FactoryLongitude DECIMAL(10,7) NULL AFTER FactoryLatitude;

UPDATE factories
SET
    FactoryLatitude = 6.9497000,
    FactoryLongitude = 80.7891000
WHERE FactoryID = 1
  AND (FactoryLatitude IS NULL OR FactoryLongitude IS NULL);

UPDATE factories
SET
    FactoryLatitude = 6.8294000,
    FactoryLongitude = 80.9857000
WHERE FactoryID = 2
  AND (FactoryLatitude IS NULL OR FactoryLongitude IS NULL);
