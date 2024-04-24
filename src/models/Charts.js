const { query } = require('../config/database');
const logger = require('../config/logger');

const ChartsModel = {
    getDashboardStats: async () => {
        try {
            const results = await query(`SELECT 'customers' AS table_name, COUNT(*) AS row_count FROM customers
            UNION ALL
            SELECT 'fieldinfo' AS table_name, COUNT(*) AS row_count FROM fieldinfo
            UNION ALL
            SELECT 'employees' AS table_name, COUNT(*) AS row_count FROM employees
            UNION ALL
            SELECT 'vehiclemappings' AS table_name, COUNT(*) AS row_count FROM vehiclemappings
            UNION ALL
            SELECT 'roadrouting' AS table_name, COUNT(*) AS row_count FROM roadrouting`);
            return results;
        } catch (error) {
            logger.error(error);
            throw error;
        }
    },
    getCollectionSumOfGivenDate: async (targetDate) => {
        try {
            const results = await query(`SELECT
        rr.RoutingID AS RouteID,
        COALESCE(SUM(dc.ActualTeaWeight), 0) AS TotalTeaWeight
    FROM
        roadrouting rr
    LEFT JOIN
        dailyteacollection dc ON rr.RoutingID = dc.RouteID AND dc.CollectionDate = ?
    GROUP BY
        rr.RoutingID`, [targetDate]);
            return results;
        } catch (error) {
            logger.error(error);
            throw error;
        }
    }
}


module.exports = ChartsModel;