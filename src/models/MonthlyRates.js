const { query } = require('../config/database');
const logger = require('../config/logger');

const MonthlyRatesModel = {
    getMonthlyRates: async () => {
        try {
            const results = await query(`SELECT * FROM tea_factory_rates`);
            return results;
        } catch (error) {
            logger.error(error);
            throw error;
        }
    },
    addMonthlyRate: async (month, year, rate_per_kg) => {
        try {
            const results = await query(`INSERT INTO tea_factory_rates (month, year, rate_per_kg) VALUES (?, ?, ?)`, [month, year, rate_per_kg]);
            return results;
        } catch (error) {
            logger.error(error);
            throw error;
        }
    },
    updateMonthlyRate: async (id, month, year, rate_per_kg) => {
        try {
            const results = await query(`UPDATE tea_factory_rates SET month = ?, year = ?, rate_per_kg = ? WHERE id = ?`, [month, year, rate_per_kg, id]);
            return results;
        } catch (error) {
            logger.error(error);
            throw error;
        }
    },
    deleteMonthlyRate: async (id) => {
        try {
            const results = await query(`DELETE FROM tea_factory_rates WHERE id = ?`, [id]);
            return results;
        } catch (error) {
            logger.error(error);
            throw error;
        }
    },
    getMonthlyRatesByMonthAndYear: async (month, year) => {
        try {
            const results = await query(`SELECT * FROM tea_factory_rates WHERE month = ? AND year = ?`, [month, year]);
            return results;
        } catch (error) {
            logger.error(error);
            throw error;
        }
    }
}

module.exports = MonthlyRatesModel;