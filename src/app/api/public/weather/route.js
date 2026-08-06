import { WeatherService } from '@/services/weather.service';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat'));
    const lng = parseFloat(searchParams.get('lng'));

    if (!lat || !lng) {
      return NextResponse.json({ success: true, data: { isRaining: false } });
    }

    const weather = await WeatherService.checkRain(lat, lng);
    
    return NextResponse.json({
      success: true,
      data: {
        isRaining: weather.isRaining || false,
        isSevere: weather.isSevere || false,
        condition: weather.condition || 'Clear',
        description: weather.description || '',
      },
    });
  } catch (error) {
    return NextResponse.json({ success: true, data: { isRaining: false } });
  }
}