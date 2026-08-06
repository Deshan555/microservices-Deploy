require('dotenv').config();
const axios = require('axios');

function degToCompass(num) {
    const val = Math.floor((num / 22.5) + 0.5);
    const arr = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return arr[(val % 16)];
}

function getWeatherIcon(main, iconCode) {
    const m = (main || '').toLowerCase();
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

    const location = w.name ? `${w.name}, ${w.sys?.country ?? ''}` : 'Kangra Valley, HP';
    const temperature = Math.round(w.main.temp);
    const condition = w.weather[0]?.main || 'Clear';
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

    if (condition.toLowerCase().includes('rain') || rainChance > 50) {
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
        return {
            time: timeStr,
            temp: Math.round(item.main.temp),
            condition: item.weather[0]?.main || 'Clear',
            icon: getWeatherIcon(item.weather[0]?.main, item.weather[0]?.icon),
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
        const mainCond = items[Math.floor(items.length / 2)]?.weather[0]?.main || 'Clear';
        const dayRain = items.some((i) => (i.weather[0]?.main || '').toLowerCase().includes('rain'));
        return {
            day: dayName,
            icon: getWeatherIcon(mainCond),
            tempMax: max,
            tempMin: min,
            condition: mainCond,
            suitability: dayRain ? 'Moderate' : 'Good',
        };
    });

    return {
        location,
        temperature,
        condition,
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