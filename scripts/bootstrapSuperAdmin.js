const crypto = require('crypto');

require('dotenv').config();

const TenantModel = require('../src/models/Tenant');
const {
    db,
    query,
    withTenantContext,
} = require('../src/config/database');
const { hashPassword } = require('../src/utils/bcrypt');

const SUPER_ADMIN_ROLE = 'ROLE.SUPER_ADMIN';

function booleanEnvironment(name) {
    return String(process.env[name] || '').trim().toLowerCase() === 'true';
}

function temporaryPassword() {
    return `${crypto.randomBytes(18).toString('base64url')}Aa1!`;
}

function closeDatabase() {
    return new Promise((resolve) => db.end(resolve));
}

async function nextEmployeeId() {
    const rows = await query(
        'SELECT COALESCE(MAX(EmployeeID), 0) + 1 AS nextEmployeeId FROM employees',
    );
    const employeeId = Number(rows[0]?.nextEmployeeId);
    if (
        !Number.isSafeInteger(employeeId)
        || employeeId < 1
        || employeeId > 2147483647
    ) {
        throw new Error('Could not allocate a valid employee ID.');
    }
    return employeeId;
}

async function bootstrap() {
    const tenantSlug = String(
        process.env.SUPER_ADMIN_TENANT_SLUG
            || process.env.DEFAULT_TENANT_SLUG
            || '',
    ).trim().toLowerCase();
    const email = String(
        process.env.SUPER_ADMIN_EMAIL || 'superadmin@leaves.local',
    ).trim().toLowerCase();
    const name = String(
        process.env.SUPER_ADMIN_NAME || 'Leaves Super Admin',
    ).trim();
    const mobile = String(
        process.env.SUPER_ADMIN_MOBILE || '0000000000',
    ).trim();
    const resetPassword =
        process.argv.includes('--reset-password')
        || booleanEnvironment('SUPER_ADMIN_RESET_PASSWORD');

    if (!tenantSlug) {
        throw new Error(
            'Set DEFAULT_TENANT_SLUG or SUPER_ADMIN_TENANT_SLUG first.',
        );
    }
    if (!email.includes('@')) {
        throw new Error('SUPER_ADMIN_EMAIL must be a valid email address.');
    }
    if (!/^\d{10}$/.test(mobile)) {
        throw new Error('SUPER_ADMIN_MOBILE must contain exactly 10 digits.');
    }

    const tenant = await TenantModel.getBySlug(tenantSlug);
    if (!tenant) {
        throw new Error(`Active tenant "${tenantSlug}" was not found.`);
    }

    const result = await withTenantContext(tenant, async () => {
        const roles = await query(
            'SELECT RoleID FROM userroles WHERE RoleName = ? LIMIT 1',
            [SUPER_ADMIN_ROLE],
        );
        if (!roles.length) {
            throw new Error(
                `${SUPER_ADMIN_ROLE} is missing. Run npm run migrate:tenants.`,
            );
        }
        const roleId = roles[0].RoleID;
        const employees = await query(
            'SELECT EmployeeID FROM employees WHERE LOWER(Email) = LOWER(?) LIMIT 1',
            [email],
        );
        const password = String(
            process.env.SUPER_ADMIN_PASSWORD || temporaryPassword(),
        );
        let employeeId;
        let action;
        let revealPassword = false;

        if (employees.length) {
            employeeId = employees[0].EmployeeID;
            if (resetPassword) {
                await query(
                    'UPDATE employees SET RoleID = ?, Password = ? WHERE EmployeeID = ?',
                    [roleId, await hashPassword(password), employeeId],
                );
                action = 'promoted and password reset';
                revealPassword = true;
            } else {
                await query(
                    'UPDATE employees SET RoleID = ? WHERE EmployeeID = ?',
                    [roleId, employeeId],
                );
                action = 'promoted; existing password preserved';
            }
        } else {
            const factories = await query(
                'SELECT FactoryID FROM factories ORDER BY FactoryID LIMIT 1',
            );
            if (!factories.length) {
                throw new Error(
                    'At least one factory is required before creating the super admin.',
                );
            }
            employeeId = await nextEmployeeId();
            await query(
                `INSERT INTO employees
                    (EmployeeID, EmployeeName, JoiningDate, Email, Mobile,
                     Password, RoleID, FactoryID)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    employeeId,
                    name,
                    new Date().toISOString().slice(0, 10),
                    email,
                    mobile,
                    await hashPassword(password),
                    roleId,
                    factories[0].FactoryID,
                ],
            );
            action = 'created';
            revealPassword = true;
        }

        return {
            action,
            employeeId,
            password: revealPassword ? password : null,
        };
    });

    await TenantModel.upsertMembership({
        tenantId: tenant.id,
        principalType: 'EMPLOYEE',
        principalId: result.employeeId,
        email,
        roleName: SUPER_ADMIN_ROLE,
    });

    console.log(`Super admin ${result.action}.`);
    console.log(`Tenant: ${tenant.slug}`);
    console.log(`Email: ${email}`);
    if (result.password) {
        console.log(`Temporary password: ${result.password}`);
        console.log('Change this password immediately after the first login.');
    }
}

bootstrap()
    .catch((error) => {
        console.error(`Super-admin bootstrap failed: ${error.message}`);
        process.exitCode = 1;
    })
    .finally(closeDatabase);
