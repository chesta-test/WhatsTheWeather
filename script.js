// What's The Weather - JavaScript
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const weatherForm = document.getElementById('weather-form');
    const locationInput = document.getElementById('location-input');
    const weatherContainer = document.getElementById('weather-container');
    const forecastContainer = document.getElementById('forecast-container');
    const loader = document.getElementById('loader');
    const errorMessage = document.getElementById('error-message');
    const currentYearElement = document.getElementById('current-year');
    
    // Set current year in the footer
    currentYearElement.textContent = new Date().getFullYear();
    
    // Weather API details (using OpenWeatherMap as default, but can swap between APIs)
    const APIs = [
        {
            name: 'OpenWeatherMap',
            current: {
                url: 'https://api.openweathermap.org/data/2.5/weather',
                key: '85a79fbd0b14a59750e1b220b9109e9a', // Sample key - in production use environment variables
            },
            forecast: {
                url: 'https://api.openweathermap.org/data/2.5/forecast',
                key: '85a79fbd0b14a59750e1b220b9109e9a',
            },
            icon: 'https://openweathermap.org/img/wn/',
            parse: parseOpenWeatherData
        },
        {
            name: 'WeatherAPI',
            current: {
                url: 'https://api.weatherapi.com/v1/current.json',
                key: 'db97b2fbcb8e4332bae211830231105', // Sample key
            },
            forecast: {
                url: 'https://api.weatherapi.com/v1/forecast.json',
                key: 'db97b2fbcb8e4332bae211830231105',
                days: 5
            },
            parse: parseWeatherAPIData
        }
    ];
    
    // Get a random API
    const getRandomAPI = () => {
        const index = Math.floor(Math.random() * APIs.length);
        return APIs[index];
    };
    
    // Current API to use
    const currentAPI = getRandomAPI();
    
    // Initialize day/night mode based on time
    initializeDayNightMode();
    
    // Event listeners
    weatherForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const location = locationInput.value.trim();
        
        if (location) {
            await getWeatherData(location);
        }
    });
    
    // Automatically focus the input field when page loads
    locationInput.focus();
    
    // Get weather data
    async function getWeatherData(location) {
        // Show loader, hide previous results and errors
        showLoader();
        
        try {
            // Get current weather
            const currentWeatherUrl = buildCurrentWeatherUrl(location);
            const currentResponse = await fetch(currentWeatherUrl);
            
            if (!currentResponse.ok) {
                throw new Error('Location not found');
            }
            
            const currentData = await currentResponse.json();
            
            // Get forecast data
            const forecastUrl = buildForecastUrl(location);
            const forecastResponse = await fetch(forecastUrl);
            
            if (!forecastResponse.ok) {
                throw new Error('Forecast data not available');
            }
            
            const forecastData = await forecastResponse.json();
            
            // Parse and display the data
            const parsedData = currentAPI.parse(currentData, forecastData);
            displayWeatherData(parsedData);
            
            // Update day/night mode based on current time at location
            updateDayNightMode(parsedData.current.isDay);
            
        } catch (error) {
            console.error('Error fetching weather data:', error);
            showError();
        } finally {
            hideLoader();
        }
    }
    
    // Build URL for current weather
    function buildCurrentWeatherUrl(location) {
        const api = currentAPI.current;
        
        if (currentAPI.name === 'OpenWeatherMap') {
            return `${api.url}?q=${encodeURIComponent(location)}&appid=${api.key}&units=metric`;
        } else if (currentAPI.name === 'WeatherAPI') {
            return `${api.url}?key=${api.key}&q=${encodeURIComponent(location)}`;
        }
    }
    
    // Build URL for forecast
    function buildForecastUrl(location) {
        const api = currentAPI.forecast;
        
        if (currentAPI.name === 'OpenWeatherMap') {
            return `${api.url}?q=${encodeURIComponent(location)}&appid=${api.key}&units=metric`;
        } else if (currentAPI.name === 'WeatherAPI') {
            return `${api.url}?key=${api.key}&q=${encodeURIComponent(location)}&days=${api.days}`;
        }
    }
    
    // Parse OpenWeatherMap data
    function parseOpenWeatherData(current, forecast) {
        // Parse current weather
        const currentWeather = {
            location: current.name,
            country: current.sys.country,
            temperature: Math.round(current.main.temp),
            feelsLike: Math.round(current.main.feels_like),
            description: current.weather[0].description,
            icon: `${currentAPI.icon}${current.weather[0].icon}@2x.png`,
            humidity: current.main.humidity,
            windSpeed: Math.round(current.wind.speed * 3.6), // Convert to km/h
            pressure: current.main.pressure,
            sunrise: formatTime(current.sys.sunrise * 1000),
            sunset: formatTime(current.sys.sunset * 1000),
            date: formatDate(current.dt * 1000),
            isDay: current.dt > current.sys.sunrise && current.dt < current.sys.sunset
        };
        
        // Parse forecast data (next 5 days)
        const forecastList = forecast.list;
        const dailyForecasts = [];
        const processedDates = new Set();
        
        for (let i = 0; i < forecastList.length; i++) {
            const item = forecastList[i];
            const date = new Date(item.dt * 1000);
            const dateString = date.toISOString().split('T')[0];
            
            // Skip today and only include one entry per day
            if (!processedDates.has(dateString) && dateString !== new Date().toISOString().split('T')[0]) {
                processedDates.add(dateString);
                
                dailyForecasts.push({
                    day: formatDay(date),
                    temperature: Math.round(item.main.temp),
                    description: item.weather[0].description,
                    icon: `${currentAPI.icon}${item.weather[0].icon}@2x.png`
                });
                
                if (dailyForecasts.length >= 5) break;
            }
        }
        
        return {
            current: currentWeather,
            forecast: dailyForecasts
        };
    }
    
    // Parse WeatherAPI data
    function parseWeatherAPIData(current, forecast) {
        // Parse current weather
        const currentWeather = {
            location: current.location.name,
            country: current.location.country,
            temperature: Math.round(current.current.temp_c),
            feelsLike: Math.round(current.current.feelslike_c),
            description: current.current.condition.text,
            icon: current.current.condition.icon,
            humidity: current.current.humidity,
            windSpeed: Math.round(current.current.wind_kph),
            pressure: current.current.pressure_mb,
            sunrise: forecast.forecast.forecastday[0].astro.sunrise,
            sunset: forecast.forecast.forecastday[0].astro.sunset,
            date: formatDate(new Date(current.location.localtime).getTime()),
            isDay: current.current.is_day === 1
        };
        
        // Parse forecast data
        const dailyForecasts = forecast.forecast.forecastday.slice(1).map(item => {
            return {
                day: formatDay(new Date(item.date)),
                temperature: Math.round(item.day.avgtemp_c),
                description: item.day.condition.text,
                icon: item.day.condition.icon
            };
        });
        
        return {
            current: currentWeather,
            forecast: dailyForecasts
        };
    }
    
    // Display weather data
    function displayWeatherData(data) {
        const { current, forecast } = data;
        
        // Create HTML for current weather
        const currentWeatherHTML = `
            <div class="weather-header">
                <div class="location">
                    <h2>${current.location}, ${current.country}</h2>
                    <p>${current.description}</p>
                </div>
                <div class="current-date">
                    ${current.date}
                </div>
            </div>
            
            <div class="weather-main">
                <div class="temperature">${current.temperature}°C</div>
                <div>
                    <img src="${current.icon}" alt="${current.description}" class="weather-icon">
                    <p class="weather-description">${current.description}</p>
                </div>
            </div>
            
            <div class="weather-details">
                <div class="detail">
                    <h3>Feels Like</h3>
                    <p>${current.feelsLike}°C</p>
                </div>
                <div class="detail">
                    <h3>Humidity</h3>
                    <p>${current.humidity}%</p>
                </div>
                <div class="detail">
                    <h3>Wind</h3>
                    <p>${current.windSpeed} km/h</p>
                </div>
                <div class="detail">
                    <h3>Pressure</h3>
                    <p>${current.pressure} hPa</p>
                </div>
                <div class="detail">
                    <h3>Sunrise</h3>
                    <p>${current.sunrise}</p>
                </div>
                <div class="detail">
                    <h3>Sunset</h3>
                    <p>${current.sunset}</p>
                </div>
            </div>
        `;
        
        // Create HTML for forecast
        let forecastHTML = `<h3 class="forecast-title">5-Day Forecast</h3><div class="forecast-cards">`;
        
        forecast.forEach(day => {
            forecastHTML += `
                <div class="forecast-card">
                    <p class="forecast-day">${day.day}</p>
                    <img src="${day.icon}" alt="${day.description}" class="forecast-icon">
                    <p class="forecast-temp">${day.temperature}°C</p>
                    <p class="forecast-description">${day.description}</p>
                </div>
            `;
        });
        
        forecastHTML += '</div>';
        
        // Update the DOM
        weatherContainer.innerHTML = currentWeatherHTML;
        forecastContainer.innerHTML = forecastHTML;
        
        // Show the containers
        weatherContainer.style.display = 'block';
        forecastContainer.style.display = 'block';
    }
    
    // Helper functions
    function formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
    
    function formatDay(date) {
        return date.toLocaleDateString('en-US', { weekday: 'short' });
    }
    
    function formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true 
        });
    }
    
    function showLoader() {
        loader.style.display = 'flex';
        weatherContainer.style.display = 'none';
        forecastContainer.style.display = 'none';
        errorMessage.style.display = 'none';
    }
    
    function hideLoader() {
        loader.style.display = 'none';
    }
    
    function showError() {
        errorMessage.style.display = 'block';
        weatherContainer.style.display = 'none';
        forecastContainer.style.display = 'none';
    }
    
    // Initialize day/night mode based on local time
    function initializeDayNightMode() {
        const currentHour = new Date().getHours();
        const isDay = currentHour >= 6 && currentHour < 18;
        
        updateDayNightMode(isDay);
    }
    
    // Update day/night mode
    function updateDayNightMode(isDay) {
        if (isDay) {
            document.body.classList.remove('night-mode');
        } else {
            document.body.classList.add('night-mode');
        }
    }
});