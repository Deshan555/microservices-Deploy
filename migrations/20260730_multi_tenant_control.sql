-- Multi-tenant control plane for Leaves.
-- The control tables live in DB_NAME. Each tenant points to an isolated
-- database with the same application schema.

CREATE TABLE IF NOT EXISTS tenants (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    slug VARCHAR(80) NOT NULL,
    name VARCHAR(180) NOT NULL,
    database_name VARCHAR(64) NOT NULL,
    status ENUM('PROVISIONING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED')
        NOT NULL DEFAULT 'PROVISIONING',
    settings JSON NOT NULL,
    branding JSON NOT NULL,
    created_by BIGINT NULL,
    updated_by BIGINT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_tenants_slug (slug),
    UNIQUE KEY uq_tenants_database (database_name),
    KEY idx_tenants_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tenant_memberships (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    tenant_id BIGINT UNSIGNED NOT NULL,
    principal_type ENUM('EMPLOYEE', 'CUSTOMER') NOT NULL,
    principal_id VARCHAR(80) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role_name VARCHAR(120) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_tenant_membership_principal
        (tenant_id, principal_type, principal_id),
    KEY idx_tenant_membership_email
        (email, principal_type, is_active),
    CONSTRAINT fk_tenant_membership_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants (id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE jwttokensemployee
    MODIFY Token TEXT NOT NULL,
    MODIFY RefreshToken TEXT NOT NULL;

ALTER TABLE jwttokenscustomer
    MODIFY Token TEXT NOT NULL,
    MODIFY RefreshToken TEXT NOT NULL;

INSERT INTO userroles (RoleName, CreationDate, Description)
SELECT
    'ROLE.SUPER_ADMIN',
    CURRENT_DATE(),
    'Platform administrator for tenant registration and suspension.'
WHERE NOT EXISTS (
    SELECT 1 FROM userroles WHERE RoleName = 'ROLE.SUPER_ADMIN'
);

INSERT INTO tenants
    (slug, name, database_name, status, settings, branding)
SELECT
    'teacooperative',
    'Tea Cooperative',
    DATABASE(),
    'ACTIVE',
    JSON_OBJECT('timezone', 'Asia/Colombo', 'currency', 'LKR'),
    JSON_OBJECT('primaryColor', '#16a85b')
WHERE NOT EXISTS (
    SELECT 1 FROM tenants WHERE database_name = DATABASE()
);

INSERT INTO tenant_memberships
    (tenant_id, principal_type, principal_id, email, role_name, is_active)
SELECT
    tenant.id,
    'EMPLOYEE',
    CAST(employee.EmployeeID AS CHAR),
    LOWER(employee.Email),
    COALESCE(role.RoleName, 'ROLE.EMPLOYEE'),
    1
FROM tenants tenant
INNER JOIN employees employee
    ON tenant.database_name = DATABASE()
LEFT JOIN userroles role ON role.RoleID = employee.RoleID
WHERE tenant.database_name = DATABASE()
ON DUPLICATE KEY UPDATE
    email = VALUES(email),
    role_name = VALUES(role_name),
    is_active = 1;

INSERT INTO tenant_memberships
    (tenant_id, principal_type, principal_id, email, role_name, is_active)
SELECT
    tenant.id,
    'CUSTOMER',
    CAST(customer.CustomerID AS CHAR),
    LOWER(customer.CustomerEmail),
    'ROLE.CUSTOMER',
    1
FROM tenants tenant
INNER JOIN customers customer
    ON tenant.database_name = DATABASE()
WHERE tenant.database_name = DATABASE()
ON DUPLICATE KEY UPDATE
    email = VALUES(email),
    role_name = VALUES(role_name),
    is_active = 1;
