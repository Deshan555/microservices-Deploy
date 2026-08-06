require('dotenv').config();
const axios = require('axios');

const getMockWeatherData = (locationName = 'Kangra Valley, Himachal Pradesh') => {
    return {
        location: locationName,
        temperature: 28,
        condition: 'Partly Cloudy',
        date: 'Monday, 02 Sep 2025',
        pluckingStatus: 'Good for plucking',
        hourlyForecast: [
            { time: 'Now', temp: 28, condition: 'Partly Cloudy', icon: 'cloud-sun' },
            { time: '10 AM', temp: 31, condition: 'Partly Cloudy', icon: 'cloud-sun' },
            { time: '01 PM', temp: 32, condition: 'Sunny', icon: 'sun' },
            { time: '04 PM', temp: 33, condition: 'Partly Cloudy', icon: 'cloud-sun' },
            { time: '07 PM', temp: 31, condition: 'Partly Cloudy', icon: 'cloud-sun' },
        ],
        dailyForecast: [
            { day: 'Tue, 03 Sep', icon: 'cloud-sun', tempMax: 31, tempMin: 24, condition: 'Partly Cloudy', suitability: 'Good' },
            { day: 'Wed, 04 Sep', icon: 'cloud-rain', tempMax: 29, tempMin: 23, condition: 'Light Rain', suitability: 'Moderate' },
            { day: 'Thu, 05 Sep', icon: 'cloud', tempMax: 28, tempMin: 22, condition: 'Cloudy', suitability: 'Moderate' },
            { day: 'Fri, 06 Sep', icon: 'cloud-sun', tempMax: 30, tempMin: 22, condition: 'Partly Cloudy', suitability: 'Good' },
            { day: 'Sat, 07 Sep', icon: 'sun', tempMax: 31, tempMin: 23, condition: 'Sunny', suitability: 'Good' },
            { day: 'Sun, 08 Sep', icon: 'cloud-drizzle', tempMax: 29, tempMin: 22, condition: 'Showers', suitability: 'Moderate' },
            { day: 'Mon, 09 Sep', icon: 'cloud-sun', tempMax: 30, tempMin: 23, condition: 'Partly Cloudy', suitability: 'Good' },
        ],
        details: {
            humidity: 68,
            windSpeed: 9,
            windDirection: 'NE',
            rainChance: 10,
            uvIndex: 5,
            uvCategory: 'Moderate',
            sunrise: '06:18 AM',
            sunset: '06:42 PM',
        },
        agricultureInsight: {
            summary: 'Ideal weather for plucking and field operations. Low rain chance and moderate UV levels support healthy leaf quality and faster processing.',
            suitability: 'High',
            score: 5,
        },
    };
};

const getComprehensiveWeather = async (lat = 32.2190, lon = 76.3234, city = '') => {
    const apiKey = process.env.OPEN_WEATHER_API_KEY || process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
        return getMockWeatherData();
    }

    try {
        const query = city
            ? `q=${encodeURIComponent(city)}`
            : `lat=${lat}&lon=${lon}`;

        const weatherRes = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?${query}&appid=${apiKey}&units=metric`
        );

        const data = weatherRes.data;
        const temp = Math.round(data.main?.temp ?? 28);
        const humidity = data.main?.humidity ?? 68;
        const windSpeed = Math.round((data.wind?.speed ?? 2.5) * 3.6); // m/s to km/h
        const condition = data.weather?.[0]?.main ?? 'Partly Cloudy';
        const location = data.name ? `${data.name}, ${data.sys?.country ?? ''}` : 'Kangra Valley, Himachal Pradesh';

        // Plucking status logic based on weather condition & humidity
        let pluckingStatus = 'Good for plucking';
        let suitability = 'High';
        if (condition.toLowerCase().includes('rain') || condition.toLowerCase().includes('storm')) {
            pluckingStatus = 'Rainy - Delay plucking';
            suitability = 'Low';
        } else if (humidity > 85) {
            pluckingStatus = 'High moisture';
            suitability = 'Moderate';
        }

        const mock = getMockWeatherData(location);
        return {
            ...mock,
            location,
            temperature: temp,
            condition,
            pluckingStatus,
            details: {
                ...mock.details,
                humidity,
                windSpeed,
            },
            agricultureInsight: {
                ...mock.agricultureInsight,
                suitability,
            },
        };
    } catch (error) {
        console.error('OpenWeatherMap API request failed, returning default fallback data:', error.message);
        return getMockWeatherData();
    }
};

module.exports = {
    getWeatherData: async (city) => getComprehensiveWeather(32.2190, 76.3234, city),
    getComprehensiveWeather,
};