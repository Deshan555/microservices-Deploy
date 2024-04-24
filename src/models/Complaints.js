const { query } = require('../config/database');
const logger = require("../config/logger");

// // EmployeeModel is an object that contains functions
// const EmployeeModel = {
//     getAllEmployees: async () => {
//         try {
//             return await query('SELECT * FROM employees');
//         } catch (error) {
//             logger.error('Error getting Employees:', error);
//         }
//     },
//     addEmployee: async (EmployeeID, EmployeeName, JoiningDate, Email, Mobile, Role, FactoryID, Password) => {
//         try {
//             return await query('INSERT INTO employees (' +
//                 'EmployeeID, EmployeeName, JoiningDate, Email, Mobile, RoleID, FactoryID, Password) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
//                 [EmployeeID, EmployeeName, JoiningDate, Email, Mobile, Role, FactoryID, Password]);
//         } catch (error) {
//             logger.error('Error adding Employee:', error);
//         }
//     },
//     getEmployeeByEmail: async (Email) => {
//         try {
//             return await query('SELECT * FROM employees WHERE Email = ?', [Email]);
//         } catch (error) {
//             logger.error('Error getting Employee by Email:', error);
//         }
//     },
//     getEmployeeByID: async (EmployeeID) => {
//         try {
//             return await query('SELECT * FROM employees WHERE EmployeeID = ?', [EmployeeID]);
//         } catch (error) {
//             logger.error('Error getting Employee by ID:', error);
//         }
//     },
//     updateEmployee: async (EmployeeID, EmployeeName, Email, Mobile, Role, FactoryID) => {
//         console.log(FactoryID);
//         try {
//             return await query('UPDATE employees SET EmployeeName = ?, Email = ?, Mobile = ?, RoleID = ?, FactoryID = ? WHERE EmployeeID = ?', [EmployeeName, Mobile, Email, Role, FactoryID, EmployeeID]);
//         } catch (error) {
//             logger.error('Error updating Employee:', error);
//         }
//     },
//     deleteEmployee: async (EmployeeID) => {
//         try {
//             return await query('DELETE FROM employees WHERE EmployeeID = ?', [EmployeeID]);
//         } catch (error) {
//             logger.error('Error deleting Employee:', error);
//         }
//     },
//     driversWithNoVehicleMappings: async () => {
//         try {
//             return await query('SELECT e.EmployeeID, e.EmployeeName, e.JoiningDate, e.Email, e.Mobile, e.Password, e.RoleID, e.FactoryID FROM teacooperative.employees AS e LEFT JOIN teacooperative.vehiclemappings AS v ON e.EmployeeID = v.DriverID WHERE e.RoleID = 11 AND v.DriverID IS NULL');
//         } catch (error) {
//             logger.error('Error getting Drivers with no vehicle mappings:', error);
//         }
//     },
//     colleectorsWithOutRoutingMappings : async () => {
//         try {
//             return await query('SELECT e.EmployeeID, e.EmployeeName, e.JoiningDate, e.Email, e.Mobile, e.Password, e.RoleID, e.FactoryID FROM teacooperative.employees AS e LEFT JOIN teacooperative.roadrouting AS r ON e.EmployeeID = r.CollectorID WHERE e.RoleID = 12 AND r.CollectorID IS NULL');
//         } catch (error) {
//             logger.error('Error getting Collectors with no routing mappings:', error);
//         }
//     }

// };

// module.exports = EmployeeModel;

// CREATE TABLE complaints
// (
//     ComplaintID INT PRIMARY KEY AUTO_INCREMENT,
//     ComplaintDate DATE NOT NULL,
//     ComplaintDescription VARCHAR(255) NOT NULL,
//     ComplaintStatus ENUM('PENDING', 'RESOLVED') NOT NULL,
//     ComplaintType ENUM('BUG', 'SUGGESTION', 'COMPLAINT', 'DATA_ISSUE', 'APP_ISSUE', 'OTHER') NOT NULL,
//     ComplainerName VARCHAR(255) NOT NULL
// );

const ComplaintsModel = {
    getAllComplaints: async () => {
        try {
            return await query('SELECT * FROM complaints');
        } catch (error) {
            logger.error('Error getting Complaints:', error);
        }
    },
    addComplaint: async (ComplaintDate, ComplaintDescription, ComplaintStatus, ComplaintType, ComplainerName) => {
        try {
            return await query('INSERT INTO complaints (' +
                'ComplaintDate, ComplaintDescription, ComplaintStatus, ComplaintType, ComplainerName) VALUES (?, ?, ?, ?, ?)',
                [ComplaintDate, ComplaintDescription, ComplaintStatus, ComplaintType, ComplainerName]);
        } catch (error) {
            logger.error('Error adding Complaint:', error);
        }
    },
    getComplaintByID: async (ComplaintID) => {
        try {
            return await query('SELECT * FROM complaints WHERE ComplaintID = ?', [ComplaintID]);
        } catch (error) {
            logger.error('Error getting Complaint by ID:', error);
        }
    },
    updateComplaint: async (ComplaintID, ComplaintStatus, ComplaintType) => {
        try {
            return await query('UPDATE complaints SET ComplaintStatus = ?, ComplaintType = ? WHERE ComplaintID = ?', [ComplaintStatus, ComplaintType, ComplaintID]);
        } catch (error) {
            logger.error('Error updating Complaint:', error);
        }
    },
    deleteComplaint: async (ComplaintID) => {
        try {
            return await query('DELETE FROM complaints WHERE ComplaintID = ?', [ComplaintID]);
        } catch (error) {
            logger.error('Error deleting Complaint:', error);
        }
    }
};

module.exports = ComplaintsModel;