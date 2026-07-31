require('dotenv').config();

const {
    db,
    withTransaction,
} = require('../src/config/database');
const { hashPassword } = require('../src/utils/bcrypt');

const DEFAULT_PASSWORD = process.env.DEMO_USER_PASSWORD || 'Leaves@123';

const roles = [
    ['ROLE.SUPER_ADMIN', 'Platform and tenant administrator'],
    ['ROLE.ADMIN', 'Factory administrator'],
    ['ROLE.MANAGER', 'Operations manager'],
    ['ROLE.EMPLOYEE', 'Factory employee'],
    ['ROLE.COLLECTOR', 'Tea collection officer'],
    ['ROLE.DRIVER', 'Collection vehicle driver'],
];

const employees = [
    {
        id: 1001,
        name: 'Leaves Super Admin',
        email: 'superadmin@leaves.local',
        mobile: '0770001001',
        role: 'ROLE.SUPER_ADMIN',
    },
    {
        id: 1002,
        name: 'Factory Administrator',
        email: 'admin@leaves.local',
        mobile: '0770001002',
        role: 'ROLE.ADMIN',
    },
    {
        id: 1003,
        name: 'Operations Manager',
        email: 'manager@leaves.local',
        mobile: '0770001003',
        role: 'ROLE.MANAGER',
    },
    {
        id: 1004,
        name: 'Factory Employee',
        email: 'employee@leaves.local',
        mobile: '0770001004',
        role: 'ROLE.EMPLOYEE',
    },
    {
        id: 1005,
        name: 'Tea Collector',
        email: 'collector@leaves.local',
        mobile: '0770001005',
        role: 'ROLE.COLLECTOR',
    },
];

function closeDatabase() {
    return new Promise((resolve) => db.end(resolve));
}

async function ensureRole(query, name, description) {
    const existing = await query(
        'SELECT RoleID FROM userroles WHERE RoleName = ? LIMIT 1',
        [name],
    );
    if (existing.length) return Number(existing[0].RoleID);

    const result = await query(
        `INSERT INTO userroles
            (RoleName, CreationDate, Description)
         VALUES (?, CURRENT_DATE(), ?)`,
        [name, description],
    );
    return Number(result.insertId);
}

async function seed() {
    const passwordHash = await hashPassword(DEFAULT_PASSWORD);

    const result = await withTransaction(async (query) => {
        await query(
            `INSERT INTO regions (RegionID, RegionName)
             VALUES (1, 'Central Highlands')
             ON DUPLICATE KEY UPDATE RegionName = VALUES(RegionName)`,
        );
        await query(
            `INSERT INTO factories
                (FactoryID, RegionID, FactoryName, FactorySize,
                 FactoryMobile, FactoryAddress, FactoryEmail)
             VALUES
                (1, 1, 'Leaves Tea Factory', 'MEDIUM', '0710000001',
                 'Nuwara Eliya, Sri Lanka', 'factory@leaves.local')
             ON DUPLICATE KEY UPDATE
                RegionID = VALUES(RegionID),
                FactoryName = VALUES(FactoryName),
                FactorySize = VALUES(FactorySize),
                FactoryMobile = VALUES(FactoryMobile),
                FactoryAddress = VALUES(FactoryAddress),
                FactoryEmail = VALUES(FactoryEmail)`,
        );

        const roleIds = {};
        for (const [name, description] of roles) {
            roleIds[name] = await ensureRole(query, name, description);
        }

        const tenantRows = await query(
            'SELECT id FROM tenants WHERE slug = ? LIMIT 1',
            ['teacooperative'],
        );
        let tenantId = Number(tenantRows[0]?.id);
        if (!tenantId) {
            const tenantResult = await query(
                `INSERT INTO tenants
                    (slug, name, database_name, status, settings, branding)
                 VALUES (?, ?, ?, 'ACTIVE', ?, ?)`,
                [
                    'teacooperative',
                    'Tea Cooperative',
                    process.env.DB_NAME,
                    JSON.stringify({
                        timezone: 'Asia/Colombo',
                        currency: 'LKR',
                    }),
                    JSON.stringify({ primaryColor: '#315f49' }),
                ],
            );
            tenantId = Number(tenantResult.insertId);
        } else {
            await query(
                `UPDATE tenants
                 SET name = 'Tea Cooperative',
                     database_name = ?,
                     status = 'ACTIVE'
                 WHERE id = ?`,
                [process.env.DB_NAME, tenantId],
            );
        }

        for (const employee of employees) {
            const existing = await query(
                'SELECT EmployeeID FROM employees WHERE LOWER(Email) = LOWER(?) LIMIT 1',
                [employee.email],
            );
            const employeeId = Number(existing[0]?.EmployeeID || employee.id);

            if (existing.length) {
                await query(
                    `UPDATE employees
                     SET EmployeeName = ?,
                         JoiningDate = CURRENT_DATE(),
                         Mobile = ?,
                         Password = ?,
                         RoleID = ?,
                         FactoryID = 1
                     WHERE EmployeeID = ?`,
                    [
                        employee.name,
                        employee.mobile,
                        passwordHash,
                        roleIds[employee.role],
                        employeeId,
                    ],
                );
            } else {
                await query(
                    `INSERT INTO employees
                        (EmployeeID, EmployeeName, JoiningDate, Email, Mobile,
                         Password, RoleID, FactoryID)
                     VALUES (?, ?, CURRENT_DATE(), ?, ?, ?, ?, 1)`,
                    [
                        employeeId,
                        employee.name,
                        employee.email,
                        employee.mobile,
                        passwordHash,
                        roleIds[employee.role],
                    ],
                );
            }

            await query(
                `INSERT INTO tenant_memberships
                    (tenant_id, principal_type, principal_id, email,
                     role_name, is_active)
                 VALUES (?, 'EMPLOYEE', ?, ?, ?, 1)
                 ON DUPLICATE KEY UPDATE
                    email = VALUES(email),
                    role_name = VALUES(role_name),
                    is_active = 1`,
                [
                    tenantId,
                    String(employeeId),
                    employee.email,
                    employee.role,
                ],
            );
        }

        const customer = {
            id: 2001,
            name: 'Demo Tea Grower',
            email: 'customer@leaves.local',
            mobile: '0770002001',
        };
        const existingCustomer = await query(
            'SELECT CustomerID FROM customers WHERE LOWER(CustomerEmail) = LOWER(?) LIMIT 1',
            [customer.email],
        );
        const customerId = Number(
            existingCustomer[0]?.CustomerID || customer.id,
        );

        if (existingCustomer.length) {
            await query(
                `UPDATE customers
                 SET CustomerName = ?,
                     CustomerMobile = ?,
                     CustomerAddress = ?,
                     CustomerType = ?,
                     RegistrationDate = CURRENT_DATE(),
                     Password = ?,
                     FactoryID = 1,
                     IdentitiCardNumber = ?
                 WHERE CustomerID = ?`,
                [
                    customer.name,
                    customer.mobile,
                    'Nuwara Eliya, Sri Lanka',
                    'SMALL_SCALE',
                    passwordHash,
                    'DEMO-CUSTOMER-2001',
                    customerId,
                ],
            );
        } else {
            await query(
                `INSERT INTO customers
                    (CustomerID, CustomerName, CustomerMobile,
                     CustomerAddress, CustomerEmail, CustomerType,
                     RegistrationDate, Password, FactoryID,
                     IdentitiCardNumber)
                 VALUES (?, ?, ?, ?, ?, ?, CURRENT_DATE(), ?, 1, ?)`,
                [
                    customerId,
                    customer.name,
                    customer.mobile,
                    'Nuwara Eliya, Sri Lanka',
                    customer.email,
                    'SMALL_SCALE',
                    passwordHash,
                    'DEMO-CUSTOMER-2001',
                ],
            );
        }

        await query(
            `INSERT INTO tenant_memberships
                (tenant_id, principal_type, principal_id, email,
                 role_name, is_active)
             VALUES (?, 'CUSTOMER', ?, ?, 'ROLE.CUSTOMER', 1)
             ON DUPLICATE KEY UPDATE
                email = VALUES(email),
                role_name = VALUES(role_name),
                is_active = 1`,
            [tenantId, String(customerId), customer.email],
        );

        return {
            employeeCount: employees.length,
            customerCount: 1,
            tenantId,
        };
    });

    console.log('Demo users seeded successfully.');
    console.log(`Tenant ID: ${result.tenantId}`);
    console.log(`Employees: ${result.employeeCount}`);
    console.log(`Customers: ${result.customerCount}`);
    console.log(`Shared password: ${DEFAULT_PASSWORD}`);
}

seed()
    .catch((error) => {
        console.error(`Demo user seed failed: ${error.message}`);
        process.exitCode = 1;
    })
    .finally(closeDatabase);
