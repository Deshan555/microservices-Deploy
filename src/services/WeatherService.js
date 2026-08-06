const WeatherFetch = require('../api/WeatherFetch');

const WeatherController = {
    getWeatherData: async (req, res) => {
        const city = req.params.city || req.query.city;
        const lat = parseFloat(req.query.lat) || 32.2190;
        const lon = parseFloat(req.query.lon) || 76.3234;
        const response = await WeatherFetch.getComprehensiveWeather(lat, lon, city);
        res.json(response);
    },
};

module.exports = WeatherController;