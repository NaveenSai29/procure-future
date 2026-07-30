const OPENWEATHER_API = 'https://api.openweathermap.org/data/2.5/weather';

export class WeatherService {
  static async checkRain(lat, lng) {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      console.log('[Weather] No OPENWEATHER_API_KEY in .env — weather surge disabled');
      return { isRaining: false, condition: 'unknown', reason: 'no_api_key' };
    }

    try {
      const url = `${OPENWEATHER_API}?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;
      const res = await fetch(url, { next: { revalidate: 600 } });

      if (!res.ok) {
        console.log('[Weather] API error:', res.status);
        return { isRaining: false, condition: 'unknown', reason: 'api_error' };
      }

      const data = await res.json();

      const rainCodes = [
        200, 201, 202, 210, 211, 212, 221, 230, 231, 232,
        300, 301, 302, 310, 311, 312, 313, 314, 321,
        500, 501, 502, 503, 504, 511, 520, 521, 522, 531,
      ];

      const weatherId = data.weather?.[0]?.id;
      const isRaining = rainCodes.includes(weatherId);
      const condition = data.weather?.[0]?.main || 'Clear';
      const description = data.weather?.[0]?.description || '';
      const temp = data.main?.temp;
      const humidity = data.main?.humidity;
      const windSpeed = data.wind?.speed;
      const cityName = data.name;
      const isSevere = weatherId >= 502;

      return { isRaining, isSevere, condition, description, temp, humidity, windSpeed, cityName, weatherId };
    } catch (error) {
      console.log('[Weather] Fetch error:', error.message);
      return { isRaining: false, condition: 'unknown', reason: 'fetch_failed' };
    }
  }

  static async checkDeliveryRoute(warehouses) {
    if (!warehouses?.length) return { isRaining: false, isSevere: false, condition: 'Clear', description: '', locations: [] };

    const results = await Promise.all(
      warehouses.filter(w => w.latitude && w.longitude).map(w => this.checkRain(w.latitude, w.longitude))
    );

    const raining = results.find(r => r.isRaining);
    const severe = results.find(r => r.isSevere);

    return {
      isRaining: !!raining,
      isSevere: !!severe,
      condition: severe?.condition || raining?.condition || 'Clear',
      description: severe?.description || raining?.description || '',
      locations: results.filter(r => r.cityName).map(r => ({ city: r.cityName, condition: r.condition, isRaining: r.isRaining })),
    };
  }

  static async getWeatherSurge(lat, lng, rainSurgeMultiplier = 1.5) {
    const weather = await this.checkRain(lat, lng);
    if (!weather.isRaining) return { multiplier: 1.0, reason: null };
    if (weather.isSevere) return { multiplier: rainSurgeMultiplier * 1.3, reason: 'Heavy rain in delivery area' };
    return { multiplier: rainSurgeMultiplier, reason: 'Rain in delivery area' };
  }
}