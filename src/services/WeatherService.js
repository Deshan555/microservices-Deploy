const WeatherFetch = require('../api/WeatherFetch');

const WeatherController = {
    getWeatherData: async (req, res) => {
        const { city } = req.params;
        const response = await WeatherFetch.getWeatherData(city);
        res.json(response);
    }
}

module.exports = WeatherController;