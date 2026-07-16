const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const weatherDisplay = document.getElementById('weatherDisplay');
const errorEl = document.getElementById('error');
const loadingEl = document.getElementById('loading');
const cityName = document.getElementById('cityName');
const dateTime = document.getElementById('dateTime');
const temperature = document.getElementById('temperature');
const weatherIcon = document.getElementById('weatherIcon');
const weatherDesc = document.getElementById('weatherDesc');
const feelsLike = document.getElementById('feelsLike');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('windSpeed');
const visibility = document.getElementById('visibility');
const pressure = document.getElementById('pressure');
const forecastEl = document.getElementById('forecast');

searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) getWeatherByCity(city);
});

cityInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const city = cityInput.value.trim();
        if (city) getWeatherByCity(city);
    }
});

locationBtn.addEventListener('click', getWeatherByGeo);

function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
    weatherDisplay.classList.add('hidden');
}

function hideError() {
    errorEl.classList.add('hidden');
}

function showLoading() {
    loadingEl.classList.remove('hidden');
    weatherDisplay.classList.add('hidden');
}

function hideLoading() {
    loadingEl.classList.add('hidden');
}

async function getWeatherByCity(city) {
    hideError();
    showLoading();
    try {
        const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=5&language=en&format=json`);
        const geoData = await geo.json();

        if (!geoData.results || geoData.results.length === 0) {
            showError('City not found. Please check the spelling and try again.');
            hideLoading();
            return;
        }

        const loc = geoData.results[0];
        const displayName = [loc.name, loc.admin1, loc.country].filter(Boolean).join(', ');
        await fetchWeather(loc.latitude, loc.longitude, displayName);
    } catch {
        showError('Failed to fetch location data. Please try again.');
        hideLoading();
    }
}

function getWeatherByGeo() {
    hideError();
    showLoading();

    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser.');
        hideLoading();
        return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
            const res = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&language=en&format=json`);
            const data = await res.json();
            let displayName = `${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`;
            if (data.results && data.results.length > 0) {
                const loc = data.results[0];
                displayName = [loc.name, loc.admin1, loc.country].filter(Boolean).join(', ');
            }
            await fetchWeather(pos.coords.latitude, pos.coords.longitude, displayName);
        } catch {
            await fetchWeather(pos.coords.latitude, pos.coords.longitude, 'Current Location');
        }
    }, () => {
        showError('Unable to retrieve your location. Please allow location access or search for a city.');
        hideLoading();
    });
}

async function fetchWeather(lat, lon, name) {
    try {
        const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
            `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,pressure_msl,visibility` +
            `&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=8`
        );
        const data = await res.json();

        if (!data.current) {
            showError('Could not retrieve weather data. Please try again.');
            hideLoading();
            return;
        }

        displayWeather(data, name);
    } catch {
        showError('Failed to fetch weather data. Please try again.');
        hideLoading();
    }
}

function displayWeather(data, name) {
    const current = data.current;
    const daily = data.daily;

    cityName.textContent = name;

    const now = new Date();
    dateTime.textContent = now.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    temperature.textContent = `${Math.round(current.temperature_2m)}°C`;

    const code = current.weather_code;
    const { description, icon } = getWeatherInfo(code);
    weatherDesc.textContent = description;
    weatherIcon.src = icon;
    weatherIcon.alt = description;

    feelsLike.textContent = `Feels like ${Math.round(current.apparent_temperature)}°C`;

    humidity.textContent = `${current.relative_humidity_2m}%`;
    windSpeed.textContent = `${current.wind_speed_10m} km/h`;

    const visKm = current.visibility ? (current.visibility / 1000).toFixed(1) : '--';
    visibility.textContent = `${visKm} km`;

    pressure.textContent = current.pressure_msl ? `${Math.round(current.pressure_msl)} hPa` : '--';

    displayForecast(daily);

    weatherDisplay.classList.remove('hidden');
    hideLoading();
}

function displayForecast(daily) {
    forecastEl.innerHTML = '';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < daily.time.length; i++) {
        const date = new Date(daily.time[i] + 'T12:00:00');
        const dayName = i === 0 ? 'Today' : dayNames[date.getDay()];
        const maxTemp = Math.round(daily.temperature_2m_max[i]);
        const minTemp = Math.round(daily.temperature_2m_min[i]);
        const code = daily.weather_code[i];
        const { icon } = getWeatherInfo(code);

        const div = document.createElement('div');
        div.className = 'forecast-day';
        div.innerHTML = `
            <p class="day-name">${dayName}</p>
            <img src="${icon}" alt="weather">
            <p class="forecast-temp">${maxTemp}° <span>${minTemp}°</span></p>
        `;
        forecastEl.appendChild(div);
    }
}

function getWeatherInfo(code) {
    if (code === 0) return { description: 'Clear sky', icon: 'https://openweathermap.org/img/wn/01d@2x.png' };
    if (code === 1) return { description: 'Mainly clear', icon: 'https://openweathermap.org/img/wn/01d@2x.png' };
    if (code === 2) return { description: 'Partly cloudy', icon: 'https://openweathermap.org/img/wn/02d@2x.png' };
    if (code === 3) return { description: 'Overcast', icon: 'https://openweathermap.org/img/wn/04d@2x.png' };
    if (code >= 45 && code <= 48) return { description: 'Foggy', icon: 'https://openweathermap.org/img/wn/50d@2x.png' };
    if (code >= 51 && code <= 55) return { description: 'Drizzle', icon: 'https://openweathermap.org/img/wn/09d@2x.png' };
    if (code >= 56 && code <= 57) return { description: 'Freezing drizzle', icon: 'https://openweathermap.org/img/wn/09d@2x.png' };
    if (code >= 61 && code <= 65) return { description: 'Rain', icon: 'https://openweathermap.org/img/wn/10d@2x.png' };
    if (code >= 66 && code <= 67) return { description: 'Freezing rain', icon: 'https://openweathermap.org/img/wn/10d@2x.png' };
    if (code >= 71 && code <= 75) return { description: 'Snow', icon: 'https://openweathermap.org/img/wn/13d@2x.png' };
    if (code === 77) return { description: 'Snow grains', icon: 'https://openweathermap.org/img/wn/13d@2x.png' };
    if (code >= 80 && code <= 82) return { description: 'Rain showers', icon: 'https://openweathermap.org/img/wn/09d@2x.png' };
    if (code >= 85 && code <= 86) return { description: 'Snow showers', icon: 'https://openweathermap.org/img/wn/13d@2x.png' };
    if (code >= 95) return { description: 'Thunderstorm', icon: 'https://openweathermap.org/img/wn/11d@2x.png' };
    return { description: 'Unknown', icon: 'https://openweathermap.org/img/wn/02d@2x.png' };
}

getWeatherByGeo();

