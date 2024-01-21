const { query } = require('../config/database');

// RoleModel is an object that contains functions
const RoleModel = {
    getAllRoles: async () => {
        try {
            return await query('SELECT * FROM userroles');
        } catch (error) {
            throw error;
        }
    },
    addRole: async (RoleName, CreationDate, Description) => {
        try {
            return await query('INSERT INTO userroles (RoleName, CreationDate, Description) VALUES (?, ?, ?)',
                [RoleName, CreationDate, Description]);
        } catch (error) {
            throw error;
        }
    },
    getRoleByID: async (RoleID) => {
        try {
            return await query('SELECT * FROM userroles WHERE RoleID = ?', [RoleID]);
        } catch (error) {
            throw error;
        }
    },
    updateRole: async (RoleID, RoleName, Description) => {
        try {
            return await query('UPDATE userroles SET RoleName = ?, Description = ? WHERE RoleID = ?', [RoleName, Description, RoleID]);
        } catch (error) {
            throw error;
        }
    },
    deleteRole: async (RoleID) => {
        try {
            return await query('DELETE FROM userroles WHERE RoleID = ?', [RoleID]);
        } catch (error) {
            throw error;
        }
    }
}

module.exports = RoleModel;