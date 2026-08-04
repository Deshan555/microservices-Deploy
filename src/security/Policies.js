const policies = [
    {
        policyName: 'tenantMember',
        role: [
            'ROLE.SUPER_ADMIN',
            'ROLE.ADMIN',
            'ROLE.MANAGER',
            'ROLE.CUSTOMER',
            'ROLE.EMPLOYEE',
            'ROLE.DRIVER',
            'ROLE.COLLECTOR',
            'ADMIN',
            'MANAGER',
        ],
        action: 'TENANT_ACCESS',
        attributes: ['tenant.*']
    },
    {
        policyName: 'platformAdmin',
        role: ['ROLE.SUPER_ADMIN'],
        action: 'PLATFORM_ADMIN',
        attributes: ['tenants.*']
    },
    {
        policyName: 'fetchAllData',
        role: ['ROLE.SUPER_ADMIN', 'ROLE.ADMIN', 'ROLE.CUSTOMER', 'ADMIN'],
        action: 'READ',
        attributes: ['*']
    },
    {
        policyName: 'fetchData',
        role: ['ROLE.SUPER_ADMIN', 'ROLE.ADMIN', 'ROLE.CUSTOMER'],
        action: 'READ',
        attributes: ['*']
    },
    {
        policyName: 'addData',
        role: ['ROLE.SUPER_ADMIN', 'ROLE.ADMIN', 'ROLE.CUSTOMER'],
        action: 'CREATE',
        attributes: ['*']
    },
    {
        policyName: 'updateData',
        role: ['ROLE.SUPER_ADMIN', 'ROLE.ADMIN', 'ROLE.CUSTOMER'],
        action: 'UPDATE',
        attributes: ['*']
    },
    {
        policyName: 'deleteData',
        role: ['ROLE.SUPER_ADMIN', 'ROLE.ADMIN', 'ROLE.CUSTOMER'],
        action: 'DELETE',
        attributes: ['*']
    },
    {
        policyName: 'empProfile',
        role: ['ROLE.SUPER_ADMIN', 'ROLE.ADMIN', 'ROLE.CUSTOMER', 'ROLE.EMPLOYEE', 'ROLE.DRIVER', 'ROLE.COLLECTOR'],
        action: 'READ',
        attributes: ['*']
    },
    {
        policyName: 'mobileApp',
        role: ['ROLE.SUPER_ADMIN', 'ROLE.ADMIN', 'ROLE.COLLECTOR'],
        action: 'CREATE',
        attributes: ['*']
    },
    {
        policyName: 'webAdmin',
        role: ['ROLE.SUPER_ADMIN', 'ROLE.ADMIN', 'ROLE.COLLECTOR'],
        action: 'GLOBLE',
        attributes: ['*']
    },
    {
        policyName: 'all',
        role: ['ROLE.SUPER_ADMIN', 'ROLE.ADMIN', 'ROLE.CUSTOMER', 'ROLE.EMPLOYEE', 'ROLE.DRIVER', 'ROLE.COLLECTOR'],
        action: 'READ',
        attributes: ['*']
    },
    {
        policyName: 'inventoryRead',
        role: ['ROLE.SUPER_ADMIN', 'ROLE.ADMIN', 'ROLE.MANAGER', 'ROLE.EMPLOYEE', 'ROLE.COLLECTOR', 'ADMIN'],
        action: 'READ',
        attributes: ['inventory.*']
    },
    {
        policyName: 'inventoryOperate',
        role: ['ROLE.SUPER_ADMIN', 'ROLE.ADMIN', 'ROLE.MANAGER', 'ROLE.EMPLOYEE', 'ROLE.COLLECTOR', 'ADMIN'],
        action: 'CREATE_UPDATE',
        attributes: ['inventory.movements', 'inventory.batches', 'inventory.inspections', 'inventory.reservations']
    },
    {
        policyName: 'inventoryAdmin',
        role: ['ROLE.SUPER_ADMIN', 'ROLE.ADMIN', 'ROLE.MANAGER', 'ADMIN'],
        action: 'ADMIN',
        attributes: ['inventory.*']
    },
    {
        policyName: 'assetRead',
        role: ['ROLE.SUPER_ADMIN', 'ROLE.ADMIN', 'ROLE.MANAGER', 'ROLE.EMPLOYEE', 'ROLE.COLLECTOR', 'ADMIN'],
        action: 'READ',
        attributes: ['assets.*']
    },
    {
        policyName: 'reportsRead',
        role: ['ROLE.SUPER_ADMIN', 'ROLE.ADMIN', 'ROLE.MANAGER', 'ROLE.EMPLOYEE', 'ROLE.COLLECTOR', 'ADMIN', 'MANAGER'],
        action: 'READ',
        attributes: ['reports.*']
    },
    {
        policyName: 'assetOperate',
        role: ['ROLE.SUPER_ADMIN', 'ROLE.ADMIN', 'ROLE.MANAGER', 'ROLE.EMPLOYEE', 'ROLE.COLLECTOR', 'ADMIN'],
        action: 'CREATE_UPDATE',
        attributes: ['assets.registry', 'assets.maintenance', 'assets.inspections']
    },
    {
        policyName: 'assetAdmin',
        role: ['ROLE.SUPER_ADMIN', 'ROLE.ADMIN', 'ROLE.MANAGER', 'ADMIN'],
        action: 'ADMIN',
        attributes: ['assets.*']
    },
];

function getPolicyByName(policyName) {
    return policies.find(policy => policy.policyName === policyName);
}

module.exports = {
    policies, getPolicyByName
};
