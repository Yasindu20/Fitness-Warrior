import { WeatherContext } from '../models/FitnessGoalModels';
import * as Location from 'expo-location';
import RecommendationsService from './RecommendationsService';

// OpenWeatherMap API key - replace with your own
const OPEN_WEATHER_API_KEY = '2a038aaecf8d7b3b707e530d8c746ed1';

class WeatherService {
  private currentWeather: WeatherContext | null = null;
  private lastFetchTime: number = 0;
  private cacheDuration: number = 30 * 60 * 1000; // 30 minutes in milliseconds
  
  /**
   * Get current weather at the user's location
   */
  async getCurrentWeather(): Promise<WeatherContext> {
    try {
      // Check if we have cached weather that's still valid
      const now = Date.now();
      if (this.currentWeather && (now - this.lastFetchTime < this.cacheDuration)) {
        return this.currentWeather;
      }
      
      // Get current location
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }
      
      const location = await Location.getCurrentPositionAsync({});
      
      // Fetch weather from OpenWeatherMap API
      const weather = await this.fetchWeatherData(location.coords.latitude, location.coords.longitude);
      
      // Update cache
      this.currentWeather = weather;
      this.lastFetchTime = now;
      
      // Update recommendations based on weather
      await RecommendationsService.updateRecommendationsWithWeather(weather);
      
      return weather;
    } catch (error) {
      console.error('Error getting weather:', error);
      
      // Return default weather if we can't get real data
      return this.getDefaultWeather();
    }
  }
  
  /**
   * Fetch weather data from OpenWeatherMap API
   */
  private async fetchWeatherData(latitude: number, longitude: number): Promise<WeatherContext> {
    try {
      // If you don't have an API key, return the default weather
      if (OPEN_WEATHER_API_KEY === '2a038aaecf8d7b3b707e530d8c746ed1') {
        return this.getDefaultWeather();
      }
      
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${OPEN_WEATHER_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error('Weather API error');
      }
      
      const data = await response.json();
      
      // Map OpenWeatherMap data to our WeatherContext
      const weather: WeatherContext = {
        condition: this.mapWeatherCondition(data.weather[0].main),
        temperature: Math.round(data.main.temp),
        humidity: data.main.humidity,
        windSpeed: data.wind.speed,
        isOutdoorFriendly: this.isWeatherOutdoorFriendly(
          data.weather[0].main, 
          data.main.temp, 
          data.wind.speed
        )
      };
      
      return weather;
    } catch (error) {
      console.error('Error fetching weather data:', error);
      return this.getDefaultWeather();
    }
  }
  
  /**
   * Map OpenWeatherMap condition to our simplified conditions
   */
  private mapWeatherCondition(condition: string): string {
    switch (condition.toLowerCase()) {
      case 'clear':
        return 'sunny';
      case 'clouds':
        return 'cloudy';
      case 'rain':
      case 'drizzle':
      case 'thunderstorm':
        return 'rainy';
      case 'snow':
        return 'snowy';
      default:
        return 'cloudy';
    }
  }
  
  /**
   * Determine if weather is good for outdoor activities
   */
  private isWeatherOutdoorFriendly(
    condition: string, 
    temperature: number, 
    windSpeed: number
  ): boolean {
    const unfriendlyConditions = ['rain', 'drizzle', 'thunderstorm', 'snow'];
    
    // Weather is not outdoor friendly if:
    // 1. It's raining/snowing, or
    // 2. It's very cold (<5°C), or
    // 3. It's very hot (>35°C), or
    // 4. It's very windy (>10 m/s or about 22 mph)
    return !unfriendlyConditions.includes(condition.toLowerCase()) && 
           temperature >= 5 && 
           temperature <= 35 && 
           windSpeed <= 10;
  }
  
  /**
   * Get default weather when API is unavailable
   */
  private getDefaultWeather(): WeatherContext {
    // Assume moderate, pleasant weather as default
    return {
      condition: 'sunny',
      temperature: 22,
      humidity: 60,
      windSpeed: 5,
      isOutdoorFriendly: true
    };
  }
}

export default new WeatherService();