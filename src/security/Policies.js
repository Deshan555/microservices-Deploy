const policies = [
    {
        policyName: 'fetchAllData',
        role: ['ROLE.ADMIN', 'ROLE.CUSTOMER', 'ADMIN'],
        action: 'READ',
        attributes: ['*']
    },
    {
        policyName: 'fetchData',
        role: ['ROLE.ADMIN', 'ROLE.CUSTOMER'],
        action: 'READ',
        attributes: ['*']
    },
    {
        policyName: 'addData',
        role: ['ROLE.ADMIN', 'ROLE.CUSTOMER'],
        action: 'CREATE',
        attributes: ['*']
    },
    {
        policyName: 'updateData',
        role: ['ROLE.ADMIN', 'ROLE.CUSTOMER'],
        action: 'UPDATE',
        attributes: ['*']
    },
    {
        policyName: 'deleteData',
        role: ['ROLE.ADMIN', 'ROLE.CUSTOMER'],
        action: 'DELETE',
        attributes: ['*']
    },
    {
        policyName: 'empProfile',
        role: ['ROLE.ADMIN', 'ROLE.CUSTOMER', 'ROLE.EMPLOYEE', 'ROLE.DRIVER', 'ROLE.COLLECTOR'],
        action: 'READ',
        attributes: ['*']
    },
    {
        policyName: 'mobileApp',
        role: ['ROLE.ADMIN', 'ROLE.COLLECTOR'],
        action: 'CREATE',
        attributes: ['*']
    },
    {
        policyName: 'webAdmin',
        role: ['ROLE.ADMIN', 'ROLE.COLLECTOR'],
        action: 'GLOBLE',
        attributes: ['*']
    },
    {
        policyName: 'all',
        role: ['ROLE.ADMIN', 'ROLE.CUSTOMER', 'ROLE.EMPLOYEE', 'ROLE.DRIVER', 'ROLE.COLLECTOR'],
        action: 'READ',
        attributes: ['*']
    },
];

function getPolicyByName(policyName) {
    return policies.find(policy => policy.policyName === policyName);
}

module.exports = {
    policies, getPolicyByName
};