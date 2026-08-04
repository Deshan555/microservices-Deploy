const fs = require('fs');
const path = require('path');
const mysql = require('mysql');
const dotenv = require('dotenv');

const backendRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(backendRoot, '.env') });

const allowedMigrations = new Set([
    '20260730_asset_management.sql',
    '20260730_dynamic_inventory.sql',
    '20260730_multi_tenant_control.sql',
    '20260731_factory_coordinates.sql',
    '20260802_environmental_zone_polygons.sql',
    '20260804_verified_tea_collection.sql',
]);

const migrationName = process.argv[2];

if (!allowedMigrations.has(migrationName)) {
    console.error(
        `Migration must be one of: ${Array.from(allowedMigrations).join(', ')}`,
    );
    process.exit(1);
}

const requiredEnvironment = [
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'DB_PORT',
];
const missingEnvironment = requiredEnvironment.filter(
    (name) => !process.env[name],
);

if (missingEnvironment.length > 0) {
    console.error(
        `Missing database environment variables: ${missingEnvironment.join(', ')}`,
    );
    process.exit(1);
}

const migrationPath = path.join(backendRoot, 'migrations', migrationName);
const migrationSql = fs.readFileSync(migrationPath, 'utf8');

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT),
    multipleStatements: true,
});

connection.query(migrationSql, (error) => {
    if (error) {
        console.error(
            `Migration ${migrationName} failed at the first invalid statement.`,
        );
        console.error(
            [error.code, error.sqlState, error.sqlMessage]
                .filter(Boolean)
                .join(' | '),
        );
        connection.end();
        process.exitCode = 1;
        return;
    }

    console.log(
        `Migration ${migrationName} applied successfully to ${process.env.DB_NAME}.`,
    );
    connection.end();
});
