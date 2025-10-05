// API Configuration - Using WeatherAPI.com
const WEATHER_API_KEY = '53d672bff7214c10b78191710250510'; // Your WeatherAPI.com key
// DeepSeek API configuration - you'll need to sign up for their API
const DEEPSEEK_API_KEY = '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';

class ClimateCopilot {
    constructor() {
        this.chatContainer = document.getElementById('chat');
        this.locationInfo = document.getElementById('locationInfo');
        this.getSuggestionsBtn = document.getElementById('getSuggestions');
        this.userInput = document.getElementById('userInput');
        this.sendButton = document.getElementById('sendButton');
        this.apiCallCount = 0;
        this.lastApiCallTime = 0;
        this.rateLimitDelay = 1000;
        this.currentWeatherData = null;
        this.chatHistory = [];
        
        this.initializeEventListeners();
    }


    initializeEventListeners() {
        this.getSuggestionsBtn.addEventListener('click', () => {
            this.getLocationAndSuggestions();
        });

        this.sendButton.addEventListener('click', () => {
            this.handleUserMessage();
        });

        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleUserMessage();
            }
        });
    }

    async getLocationAndSuggestions() {
        this.getSuggestionsBtn.disabled = true;
        this.getSuggestionsBtn.textContent = 'Detecting Location...';

        try {
            const position = await this.getCurrentPosition();
            await this.processLocationData(position);
        } catch (error) {
            this.handleError(error);
        }
    }

    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by your browser'));
                return;
            }

            navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 10000,
                enableHighAccuracy: true
            });
        });
    }

    async processLocationData(position) {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        this.getSuggestionsBtn.textContent = 'Getting Weather Data...';
        
        this.addMessage('user', `I'm at latitude ${lat.toFixed(4)}, longitude ${lon.toFixed(4)}`);

        try {
            await this.checkRateLimit();
            const weatherData = await this.getWeatherDataWithRetry(lat, lon);
            this.currentWeatherData = weatherData;
            
            this.displayWeatherData(weatherData);
            
            this.getSuggestionsBtn.textContent = 'Generating Suggestions...';
            await this.generateComprehensiveSuggestions(weatherData);
            
        } catch (error) {
            this.handleError(error);
        } finally {
            this.resetButton();
        }
    }

    async checkRateLimit() {
        const now = Date.now();
        if (now - this.lastApiCallTime < this.rateLimitDelay) {
            const waitTime = this.rateLimitDelay - (now - this.lastApiCallTime);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        this.lastApiCallTime = Date.now();
    }

    async getWeatherDataWithRetry(lat, lon, retries = 3) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                await this.checkRateLimit();
                return await this.getWeatherData(lat, lon);
            } catch (error) {
                console.log(`Weather API attempt ${attempt} failed:`, error);
                if (attempt === retries) {
                    throw error;
                }
                const backoffTime = Math.min(1000 * Math.pow(2, attempt), 10000);
                this.addMessage('ai', `Weather service temporarily unavailable. Retrying in ${backoffTime/1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, backoffTime));
            }
        }
    }

    async getWeatherData(lat, lon) {
        const controller = new AbortController();
        const signal = controller.signal;

        // Abort the request if it takes too long
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            const response = await fetch(`https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${lat},${lon}&aqi=no`, { signal });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`WeatherAPI error: ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.current || !data.location) {
                throw new Error('WeatherAPI response missing expected fields.');
            }

            return {
                temp: Math.round(data.current.temp_c),
                feels_like: Math.round(data.current.feelslike_c),
                humidity: data.current.humidity,
                description: data.current.condition.text,
                city: data.location.name,
                country: data.location.country
            };

        } catch (error) {
            console.error('[WeatherAPI] Fetch error:', error);
            if (error.name === 'AbortError') {
                throw new Error('Weather request timed out. Please check your internet connection.');
            } else if (error.message.includes('Failed to fetch')) {
                throw new Error('Network error. Please check your internet connection.');
            } else {
                throw error;
            }
        }
    }

    displayWeatherData(weather) {
        const weatherHTML = `
            <div class="weather-data">
                <strong>Current Weather in ${weather.city}, ${weather.country}:</strong><br>
                Temperature: ${weather.temp}°C (Feels like: ${weather.feels_like}°C)<br>
                Humidity: ${weather.humidity}%<br>
                Conditions: ${weather.description}
            </div>
        `;
        
        this.addMessage('user', weatherHTML);
    }

    async generateComprehensiveSuggestions(weatherData) {
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Show all comprehensive suggestions
            this.showHealthAdvisories(weatherData);
            this.showEnergyTips(weatherData);
            this.showActivityPlan(weatherData);
            this.showGardeningTips(weatherData);
            this.showUrbanPlanningTips(weatherData);
            this.showEmergencyTips(weatherData);
            
            // Add chat prompt
            this.addMessage('ai', `
                <strong> Continue the Conversation</strong><br><br>
                Now you can ask me specific questions about:<br>
                • Health and safety in this weather<br>
                • Energy saving tips<br>
                • Gardening advice<br>
                • Urban planning ideas<br>
                • Or anything else climate-related!<br><br>
                <em>Type your question below and press Send.</em>
            `);
            
        } catch (error) {
            this.handleAIServiceError(error, weatherData);
        }
    }

    // Health & Safety Advisories
    generateHealthAdvisories(weatherData) {
        const temp = weatherData.feels_like;
        const humidity = weatherData.humidity;
        let advisories = [];

        if (temp >= 35) {
            advisories.push(
                " <strong>Extreme Heat Warning</strong>: Avoid outdoor activities during peak hours (11 AM - 4 PM)",
                " <strong>Hydration Alert</strong>: Drink 2-3 liters of water daily",
                " <strong>Cooling Centers</strong>: Identify nearby air-conditioned public spaces",
                " <strong>Check on Vulnerable</strong>: Elderly and children are at high risk"
            );
        } else if (temp >= 30) {
            advisories.push(
                " <strong>Heat Caution</strong>: Limit strenuous outdoor activities",
                " <strong>Sun Protection</strong>: Use SPF 30+ sunscreen",
                " <strong>Protective Clothing</strong>: Wear light-colored, loose-fitting clothes",
                " <strong>Timing</strong>: Schedule outdoor work for early morning or evening"
            );
        } else if (temp <= 0) {
            advisories.push(
                " <strong>Cold Weather Alert</strong>: Dress in layers to retain body heat",
                " <strong>Home Preparation</strong>: Check heating systems and insulation",
                " <strong>Vehicle Ready</strong>: Keep emergency kit in car",
                " <strong>Frostbite Risk</strong>: Protect extremities in extreme cold"
            );
        }

        if (humidity > 80) {
            advisories.push(" <strong>High Humidity</strong>: Use dehumidifiers and ensure proper ventilation");
        }

        return advisories;
    }

    // Energy Saving Tips
    generateEnergyTips(weatherData) {
        const temp = weatherData.temp;
        let energyTips = [];

        if (temp >= 28) {
            energyTips.push(
                "Cooling Efficiency: Set AC to 24-26°C for optimal energy use",
                "Window Management: Close blinds during day, open at night",
                "Appliance Timing: Run heat-generating appliances at night",
                "Ventilation: Use ceiling fans to feel 4°C cooler"
            );
        } else if (temp <= 15) {
            energyTips.push(
                "Heating Smart: Set thermostat to 18-20°C when home",
                "Draft Proofing: Seal windows and doors to prevent heat loss",
                "Solar Gain: Open curtains on south-facing windows during day",
                "Layering: Wear warm clothing to reduce heating needs"
            );
        }

        return energyTips;
    }

    // Daily Activity Planner
    generateActivityPlan(weatherData) {
        const temp = weatherData.feels_like;
        const conditions = weatherData.description.toLowerCase();
        let activities = [];

        if (temp >= 30 && !conditions.includes('rain')) {
            activities.push(
                "Swimming: Visit local pool or water park",
                "Indoor Activities: Museums, libraries, shopping malls",
                "Evening Outdoors: Park visits after 6 PM",
                "Cool Treats: Indoor ice cream or frozen yogurt"
            );
        } else if (temp >= 20 && temp < 30) {
            activities.push(
                "Cycling: Perfect weather for bike rides",
                "Picnics: Outdoor dining in shaded parks",
                "Nature Walks: Explore local trails and gardens",
                "City Exploration: Walking tours and outdoor markets"
            );
        } else if (conditions.includes('rain')) {
            activities.push(
                "Cultural Events: Theater, concerts, indoor exhibits",
                "Cooking: Try new recipes at home",
                "Games: Board games or video games with family",
                "Reading: Visit local library or bookstore"
            );
        }

        return activities;
    }

    // Gardening & Planting Advice
    generateGardeningTips(weatherData) {
        const temp = weatherData.temp;
        let gardeningTips = [];

        if (temp >= 25) {
            gardeningTips.push(
                "Heat-Tolerant Plants: Consider succulents, lavender, rosemary",
                "Watering Schedule: Water early morning to reduce evaporation",
                "Tree Planting: Focus on shade-providing native trees",
                "Vegetable Garden: Plant heat-loving crops like tomatoes, peppers"
            );
        } else if (temp >= 15) {
            gardeningTips.push(
                "Ideal Planting: Perfect for most vegetables and flowers",
                "Moderate Watering: Water when soil is dry 2-3cm deep",
                "Lawn Care: Ideal temperature for grass growth",
                "Pollinator Plants: Add flowering plants for bees and butterflies"
            );
        }

        return gardeningTips;
    }

    // Urban Planning Recommendations
    generateUrbanPlanningTips(weatherData) {
        const temp = weatherData.feels_like;
        let planningTips = [];

        planningTips.push(
            "Zoning: Create mixed-use developments to reduce travel heat",
            "Pedestrian Infrastructure: Build shaded walkways and green corridors",
            "Public Transit: Expand shaded bus stops and stations",
            "Water Management: Implement rain gardens and permeable surfaces"
        );

        if (temp >= 30) {
            planningTips.push(
                "Building Materials: Mandate cool roofs and reflective surfaces",
                "Road Design: Use light-colored pavement materials",
                "Street Trees: Plant drought-resistant native species",
                "Energy Planning: District cooling systems for high-density areas"
            );
        }

        return planningTips;
    }

    // Emergency Preparedness
    generateEmergencyTips(weatherData) {
        const temp = weatherData.feels_like;
        let emergencyTips = [];

        if (temp >= 35) {
            emergencyTips.push(
                "Heat Stroke Signs: Know symptoms - confusion, rapid pulse, nausea",
                "Emergency Contacts: Keep local emergency numbers handy",
                "Cooling Kit: Prepare cold packs, wet towels, fan",
                "Alert Systems: Sign up for local weather alerts"
            );
        } else if (temp <= -10) {
            emergencyTips.push(
                "Hypothermia Signs: Shivering, confusion, slurred speech",
                "Warm Shelter: Identify warming centers in your area",
                "Power Backup: Prepare for potential power outages",
                "Winter Kit: Blankets, food, water in vehicle"
            );
        }

        return emergencyTips;
    }

    // Display all the comprehensive suggestions
    showHealthAdvisories(weather) {
        const advisories = this.generateHealthAdvisories(weather);
        if (advisories.length > 0) {
            this.addMessage('ai', `
                <strong>Health & Safety Advisories:</strong><br><br>
                ${advisories.map(advice => `• ${advice}`).join('<br>')}
            `);
        }
    }

    showEnergyTips(weather) {
        const tips = this.generateEnergyTips(weather);
        if (tips.length > 0) {
            this.addMessage('ai', `
                <strong>Energy Saving Tips:</strong><br><br>
                ${tips.map(tip => `• ${tip}`).join('<br>')}
            `);
        }
    }

    showActivityPlan(weather) {
        const activities = this.generateActivityPlan(weather);
        if (activities.length > 0) {
            this.addMessage('ai', `
                <strong>Recommended Activities:</strong><br><br>
                ${activities.map(activity => `• ${activity}`).join('<br>')}
            `);
        }
    }

    showGardeningTips(weather) {
        const tips = this.generateGardeningTips(weather);
        if (tips.length > 0) {
            this.addMessage('ai', `
                <strong>Gardening Advice:</strong><br><br>
                ${tips.map(tip => `• ${tip}`).join('<br>')}
            `);
        }
    }

    showUrbanPlanningTips(weather) {
        const tips = this.generateUrbanPlanningTips(weather);
        if (tips.length > 0) {
            this.addMessage('ai', `
                <strong>Urban Planning Recommendations:</strong><br><br>
                ${tips.map(tip => `• ${tip}`).join('<br>')}
            `);
        }
    }

    showEmergencyTips(weather) {
        const tips = this.generateEmergencyTips(weather);
        if (tips.length > 0) {
            this.addMessage('ai', `
                <strong>Emergency Preparedness:</strong><br><br>
                ${tips.map(tip => `• ${tip}`).join('<br>')}
            `);
        }
    }

    // Chat functionality
    async handleUserMessage() {
            const message = this.userInput.value.trim();
            if (!message) return;

            // Prevent sending if weather data is not loaded
            if (!this.currentWeatherData) {
                this.addMessage('ai', 'Please click "Get Local Climate Analysis" first to load weather data before chatting.');
                return;
            }

            this.addMessage('user', message);
            this.userInput.value = '';
            this.sendButton.disabled = true;

            try {
                await new Promise(resolve => setTimeout(resolve, 1000));
                const response = await this.generateAIResponse(message);
                this.addMessage('ai', response);
            } catch (error) {
                this.addMessage('ai', 'Sorry, I encountered an error. Please try again.');
            } finally {
                this.sendButton.disabled = false;
            }
    }

    async generateAIResponse(userMessage) {
            // Simulate AI response based on user message and current weather
            const lowerMessage = userMessage.toLowerCase();
            let response = '';

            if (lowerMessage.includes('eat') || lowerMessage.includes('food') || lowerMessage.includes('diet')) {
                response = this.generateFoodAdvice(this.currentWeatherData);
            } else if (lowerMessage.includes('health') || lowerMessage.includes('safe')) {
                const tips = this.generateHealthAdvisories(this.currentWeatherData);
                response = `<strong>Health & Safety Advice:</strong><br><br>${tips.map(tip => `• ${tip}`).join('<br>')}`;
            } else if (lowerMessage.includes('energy') || lowerMessage.includes('save') || lowerMessage.includes('power')) {
                const tips = this.generateEnergyTips(this.currentWeatherData);
                response = `<strong>Energy Saving Tips:</strong><br><br>${tips.map(tip => `• ${tip}`).join('<br>')}`;
            } else if (lowerMessage.includes('garden') || lowerMessage.includes('plant')) {
                const tips = this.generateGardeningTips(this.currentWeatherData);
                response = `<strong>Gardening Advice:</strong><br><br>${tips.map(tip => `• ${tip}`).join('<br>')}`;
            } else if (lowerMessage.includes('activity') || lowerMessage.includes('do') || lowerMessage.includes('fun')) {
                const tips = this.generateActivityPlan(this.currentWeatherData);
                response = `<strong>Activity Suggestions:</strong><br><br>${tips.map(tip => `• ${tip}`).join('<br>')}`;
            } else if (lowerMessage.includes('urban') || lowerMessage.includes('city') || lowerMessage.includes('planning')) {
                const tips = this.generateUrbanPlanningTips(this.currentWeatherData);
                response = `<strong>Urban Planning Ideas:</strong><br><br>${tips.map(tip => `• ${tip}`).join('<br>')}`;
            } else if (lowerMessage.includes('emergency') || lowerMessage.includes('prepared')) {
                const tips = this.generateEmergencyTips(this.currentWeatherData);
                response = `<strong>Emergency Preparedness:</strong><br><br>${tips.map(tip => `• ${tip}`).join('<br>')}`;
            } else {
                response = `I understand you're asking about "${userMessage}". Based on your current weather (${this.currentWeatherData.feels_like}°C feeling temperature), I'd recommend focusing on climate-appropriate solutions. Could you be more specific about what aspect you'd like help with?`;
            }

            return response;
    }

    // Climate-based food and hydration advice
    generateFoodAdvice(weatherData) {
        const temp = weatherData.feels_like;
        const humidity = weatherData.humidity;
        let advice = [];

        if (temp >= 35) {
            advice.push(
                "Eat light meals: Focus on salads, fruits, and vegetables.",
                "Hydrate often: Watermelon, cucumber, and citrus fruits are great for hydration.",
                "Drink plenty of water: Aim for 2-3 liters daily.",
                "Avoid heavy, oily foods: They can make you feel sluggish in the heat."
            );
        } else if (temp >= 30) {
            advice.push(
                "Choose fresh foods: Leafy greens, berries, and yogurt are good options.",
                "Stay hydrated: Drink water, coconut water, or homemade lemonade.",
                "Cool snacks: Enjoy cold soups, smoothies, and popsicles."
            );
        } else if (temp <= 0) {
            advice.push(
                "Eat warm meals: Soups, stews, and whole grains help maintain body heat.",
                "Root vegetables: Potatoes, carrots, and beets are nutritious and warming.",
                "Warm drinks: Herbal teas and hot cocoa are comforting in cold weather."
            );
        } else {
            advice.push(
                "Balanced diet: Include a mix of fruits, vegetables, lean proteins, and whole grains.",
                "Hydration: Drink water regularly, regardless of temperature.",
                "Seasonal produce: Choose locally available fruits and vegetables for best nutrition."
            );
        }

        if (humidity > 80) {
            advice.push("High humidity: Avoid salty foods and caffeine, which can dehydrate you. Opt for juicy fruits and light meals.");
        }

        return `<strong>Food & Hydration Tips:</strong><br><br>${advice.map(a => `• ${a}`).join('<br>')}`;
    }

    handleAIServiceError(error, weatherData) {
        console.error('AI service error:', error);
        this.addMessage('ai', 'Service temporarily unavailable. Please try again later.');
    }

    addMessage(sender, content) {
        if (this.chatContainer.querySelector('.welcome-message')) {
            this.chatContainer.innerHTML = '';
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const senderName = sender === 'user' ? 'You' : 'Climate Copilot';
        const icon = sender === 'user' ? '👤' : '🤖';
        
        messageDiv.innerHTML = `
            <div class="message-header">${icon} ${senderName}</div>
            <div class="message-content">${content}</div>
        `;
        
        this.chatContainer.appendChild(messageDiv);
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
        
        // Add to chat history
        this.chatHistory.push({ sender, content, timestamp: new Date() });
    }

    handleError(error) {
        console.error('Error:', error);
        
        let errorMessage = 'An unexpected error occurred. ';
        let recoverySuggestion = '';
        
        if (error.code === error.PERMISSION_DENIED) {
            errorMessage = 'Location access was denied. ';
            recoverySuggestion = 'Please enable location permissions in your browser settings and try again.';
        } else if (error.code === error.TIMEOUT) {
            errorMessage = 'Location request timed out. ';
            recoverySuggestion = 'Please check your internet connection and try again.';
        } else if (error.message.includes('Geolocation is not supported')) {
            errorMessage = 'Your browser does not support geolocation. ';
            recoverySuggestion = 'Please try a modern browser like Chrome, Firefox, or Safari.';
        } else if (error.message.includes('API key')) {
            errorMessage = error.message + ' ';
            recoverySuggestion = 'Please check your WeatherAPI.com API key.';
        } else if (error.message.includes('rate limit')) {
            errorMessage = error.message + ' ';
            recoverySuggestion = 'The service will be available again shortly. Thank you for your patience.';
        } else if (error.message.includes('Network error') || error.message.includes('internet connection')) {
            errorMessage = 'Network connection issue detected. ';
            recoverySuggestion = 'Please check your internet connection and try again.';
        } else {
            recoverySuggestion = 'Please refresh the page and try again. If the problem persists, try again later.';
        }
        
        this.addMessage('ai', `❌ ${errorMessage}${recoverySuggestion}`);
        this.resetButton();
    }

    resetButton() {
        this.getSuggestionsBtn.disabled = false;
        this.getSuggestionsBtn.textContent = 'Get Local Climate Tips';
    }
}

// Global error handler for uncaught errors
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

// Handle offline/online status
window.addEventListener('online', () => {
    console.log('Application is back online');
});

window.addEventListener('offline', () => {
    console.log('Application is offline');
});

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ClimateCopilot();
});
