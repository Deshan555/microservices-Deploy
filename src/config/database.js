require('dotenv').config();
const { AsyncLocalStorage } = require('async_hooks');
const mysql = require('mysql');
const util = require('util');
const { assertDatabaseName } = require('../utils/tenantValidation');

function requiredEnvironment(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(
            `Missing required database environment variable ${name}.`,
        );
    }
    return value;
}

const basePoolOptions = {
    host: requiredEnvironment('DB_HOST'),
    user: requiredEnvironment('DB_USER'),
    password: requiredEnvironment('DB_PASSWORD'),
    port: Number(requiredEnvironment('DB_PORT')),
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    waitForConnections: true,
    queueLimit: 0,
    ssl:
        process.env.DB_SSL === 'true'
            ? { rejectUnauthorized: true }
            : undefined,
};
const controlDatabase = requiredEnvironment('DB_NAME');
const tenantContext = new AsyncLocalStorage();
const tenantPools = new Map();

function createPool(database) {
    return mysql.createPool({
        ...basePoolOptions,
        database: assertDatabaseName(database),
    });
}

const db = createPool(controlDatabase);

function getTenantPool(databaseName) {
    const safeName = assertDatabaseName(databaseName);
    if (safeName === controlDatabase) return db;

    if (!tenantPools.has(safeName)) {
        tenantPools.set(safeName, createPool(safeName));
    }
    return tenantPools.get(safeName);
}

function activePool() {
    const context = tenantContext.getStore();
    return context?.databaseName
        ? getTenantPool(context.databaseName)
        : db;
}

function promisifiedQuery(pool, sql, values) {
    const execute = util.promisify(pool.query).bind(pool);
    return values === undefined ? execute(sql) : execute(sql, values);
}

function query(sql, values) {
    return promisifiedQuery(activePool(), sql, values);
}

function controlQuery(sql, values) {
    return promisifiedQuery(db, sql, values);
}

function getConnection(pool = activePool()) {
    return util.promisify(pool.getConnection).bind(pool)();
}

async function withTransaction(work) {
    const connection = await getConnection();
    const transactionQuery = util.promisify(connection.query).bind(connection);
    const beginTransaction = util.promisify(
        connection.beginTransaction,
    ).bind(connection);
    const commit = util.promisify(connection.commit).bind(connection);
    const rollback = util.promisify(connection.rollback).bind(connection);

    try {
        await beginTransaction();
        const result = await work(transactionQuery, connection);
        await commit();
        return result;
    } catch (error) {
        try {
            await rollback();
        } catch (rollbackError) {
            console.error('Database rollback failed:', rollbackError);
        }
        throw error;
    } finally {
        connection.release();
    }
}

function withTenantContext(tenant, work) {
    if (!tenant?.id || !tenant?.database_name) {
        throw new Error('A resolved tenant is required.');
    }
    const context = Object.freeze({
        id: Number(tenant.id),
        slug: tenant.slug,
        name: tenant.name,
        databaseName: assertDatabaseName(tenant.database_name),
        status: tenant.status,
    });
    return tenantContext.run(context, work);
}

function getTenantContext() {
    return tenantContext.getStore() || null;
}

db.getConnection((error, connection) => {
    if (error) {
        console.error('Control database connection failed:', error);
        return;
    }
    console.log(`Connected to control database ${controlDatabase}`);
    connection.release();
});

module.exports = {
    controlDatabase,
    controlQuery,
    db,
    getTenantContext,
    query,
    withTenantContext,
    withTransaction,
};
