require('dotenv').config();
const axios = require('axios');

const getWeatherData = async (city) => {
    try {
        const response = await axios.get(`http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.OPEN_WEATHER_API_KEY}&units=metric`);
        return response.data;
    } catch (error) {
        console.error('Error getting weather data:', error);
        return error;
    }
}

module.exports = {
    getWeatherData
}