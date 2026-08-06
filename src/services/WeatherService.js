const WeatherFetch = require('../api/WeatherFetch');

const WeatherController = {
    getWeatherData: async (req, res) => {
        try {
            const city = req.params.city || req.query.city;
            const lat = parseFloat(req.query.lat) || 32.2190;
            const lon = parseFloat(req.query.lon) || 76.3234;
            const data = await WeatherFetch.getComprehensiveWeather(lat, lon, city);
            res.json({ success: true, data });
        } catch (error) {
            console.error('Weather service error:', error.message);
            res.status(500).json({ success: false, message: error.message });
        }
    },
};

module.exports = WeatherController;