require('dotenv').config();
const axios = require('axios');
const { log } = require('../config/logger');

function degToCompass(num) {
    const val = Math.floor((num / 22.5) + 0.5);
    const arr = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return arr[(val % 16)];
}

const weatherConditions = {
    // Thunderstorm
    200: "Thunderstorm with light rain",
    201: "Thunderstorm with rain",
    202: "Thunderstorm with heavy rain",
    210: "Light thunderstorm",
    211: "Thunderstorm",
    212: "Heavy thunderstorm",
    221: "Ragged thunderstorm",
    230: "Thunderstorm with light drizzle",
    231: "Thunderstorm with drizzle",
    232: "Thunderstorm with heavy drizzle",

    // Drizzle
    300: "Light intensity drizzle",
    301: "Drizzle",
    302: "Heavy intensity drizzle",
    310: "Light intensity drizzle rain",
    311: "Drizzle rain",
    312: "Heavy intensity drizzle rain",
    313: "Shower rain and drizzle",
    314: "Heavy shower rain and drizzle",
    321: "Shower drizzle",

    // Rain
    500: "Light rain",
    501: "Moderate rain",
    502: "Heavy intensity rain",
    503: "Very heavy rain",
    504: "Extreme rain",
    511: "Freezing rain",
    520: "Light intensity shower rain",
    521: "Shower rain",
    522: "Heavy intensity shower rain",
    531: "Ragged shower rain",

    // Snow
    600: "Light snow",
    601: "Snow",
    602: "Heavy snow",
    611: "Sleet",
    612: "Light shower sleet",
    613: "Shower sleet",
    615: "Light rain and snow",
    616: "Rain and snow",
    620: "Light shower snow",
    621: "Shower snow",
    622: "Heavy shower snow",

    // Atmosphere
    701: "Mist",
    711: "Smoke",
    721: "Haze",
    731: "Sand or dust whirls",
    741: "Fog",
    751: "Sand",
    761: "Dust",
    762: "Volcanic ash",
    771: "Squalls",
    781: "Tornado",

    // Clear
    800: "Clear sky",

    // Clouds
    801: "Few clouds",
    802: "Scattered clouds",
    803: "Broken clouds",
    804: "Overcast clouds",
};

function getWeatherDescription(code, fallbackMain) {
    if (code && weatherConditions[code]) {
        return weatherConditions[code];
    }
    return fallbackMain || 'Clear';
}

function getWeatherIcon(main, iconCode, weatherCode) {
    const m = (main || '').toLowerCase();
    if (weatherCode >= 200 && weatherCode <= 232) return 'zap';
    if (weatherCode >= 300 && weatherCode <= 531) return 'cloud-rain';
    if (weatherCode >= 600 && weatherCode <= 622) return 'snowflake';
    if (weatherCode >= 701 && weatherCode <= 781) return 'wind';
    if (weatherCode === 800) return 'sun';
    if (m.includes('rain') || m.includes('drizzle')) return 'cloud-rain';
    if (m.includes('thunder') || m.includes('storm')) return 'zap';
    if (m.includes('cloud')) return (iconCode && iconCode.includes('d')) ? 'cloud-sun' : 'cloud';
    if (m.includes('clear')) return 'sun';
    return 'cloud-sun';
}

const getComprehensiveWeather = async (lat = 32.2190, lon = 76.3234, city = '') => {
    const apiKey = process.env.OPEN_WEATHER_API_KEY || process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
        throw new Error('OPEN_WEATHER_API_KEY is not configured in backend environment.');
    }

    const query = city
        ? `q=${encodeURIComponent(city)}`
        : `lat=${lat}&lon=${lon}`;

    const [weatherRes, forecastRes] = await Promise.all([
        axios.get(`https://api.openweathermap.org/data/2.5/weather?${query}&appid=${apiKey}&units=metric`),
        axios.get(`https://api.openweathermap.org/data/2.5/forecast?${query}&appid=${apiKey}&units=metric`),
    ]);

    const w = weatherRes.data;
    const fList = forecastRes.data.list || [];

    const weatherCode = w.weather[0]?.id || 800;
    const location = w.name ? `${w.name}, ${w.sys?.country ?? ''}` : 'Kangra Valley, HP';
    const temperature = Math.round(w.main.temp);
    const mainCondition = w.weather[0]?.main || 'Clear';
    const condition = getWeatherDescription(weatherCode, w.weather[0]?.description || mainCondition);
    const dateStr = new Date(w.dt * 1000).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: '2-digit',
        year: 'numeric',
    });

    const humidity = w.main.humidity;
    const windSpeed = Math.round((w.wind?.speed ?? 0) * 3.6); // m/s to km/h
    const windDirection = degToCompass(w.wind?.deg ?? 0);
    const rainChance = Math.round((fList[0]?.pop ?? 0) * 100);
    const uvIndex = Math.max(1, Math.round((1 - (w.clouds?.all ?? 0) / 100) * 8));

    const sunrise = new Date(w.sys.sunrise * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const sunset = new Date(w.sys.sunset * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    let pluckingStatus = 'Good for plucking';
    let suitability = 'High';
    let summary = 'Ideal weather for plucking and field operations. Favorable temperature and moisture support optimal green leaf yield.';

    if (weatherCode < 600 && weatherCode >= 200 || rainChance > 50) {
        pluckingStatus = 'Rainy - Delay plucking';
        suitability = 'Low';
        summary = 'Precipitation detected. Avoid plucking during active rainfall to preserve green leaf quality.';
    } else if (humidity > 80) {
        pluckingStatus = 'High moisture';
        suitability = 'Moderate';
        summary = 'Elevated moisture level. Ensure adequate aeration for harvested leaves during transport.';
    }

    const hourlyForecast = fList.slice(0, 6).map((item, idx) => {
        const timeStr = idx === 0
            ? 'Now'
            : new Date(item.dt * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const code = item.weather[0]?.id || 800;
        return {
            time: timeStr,
            temp: Math.round(item.main.temp),
            weatherCode: code,
            condition: getWeatherDescription(code, item.weather[0]?.main),
            icon: getWeatherIcon(item.weather[0]?.main, item.weather[0]?.icon, code),
        };
    });

    const dayMap = {};
    fList.forEach((item) => {
        const dayName = new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit' });
        if (!dayMap[dayName]) dayMap[dayName] = [];
        dayMap[dayName].push(item);
    });

    const dailyForecast = Object.keys(dayMap).slice(0, 7).map((dayName) => {
        const items = dayMap[dayName];
        const max = Math.round(Math.max(...items.map((i) => i.main.temp_max)));
        const min = Math.round(Math.min(...items.map((i) => i.main.temp_min)));
        const midItem = items[Math.floor(items.length / 2)];
        const code = midItem?.weather[0]?.id || 800;
        const mainCond = midItem?.weather[0]?.main || 'Clear';
        const dayRain = items.some((i) => (i.weather[0]?.id >= 200 && i.weather[0]?.id < 600));
        return {
            day: dayName,
            weatherCode: code,
            icon: getWeatherIcon(mainCond, midItem?.weather[0]?.icon, code),
            tempMax: max,
            tempMin: min,
            condition: getWeatherDescription(code, mainCond),
            suitability: dayRain ? 'Moderate' : 'Good',
        };
    });

    return {
        weatherCode,
        location,
        temperature,
        condition,
        mainCondition,
        date: dateStr,
        pluckingStatus,
        hourlyForecast,
        dailyForecast,
        details: {
            humidity,
            windSpeed,
            windDirection,
            rainChance,
            uvIndex,
            uvCategory: uvIndex > 6 ? 'High' : uvIndex > 3 ? 'Moderate' : 'Low',
            sunrise,
            sunset,
        },
        agricultureInsight: {
            summary,
            suitability,
            score: suitability === 'High' ? 5 : suitability === 'Moderate' ? 3 : 2,
        },
    };
};

module.exports = {
    getWeatherData: async (city) => getComprehensiveWeather(32.2190, 76.3234, city),
    getComprehensiveWeather,
};