import { WeatherService } from '@/services/weather.service';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat'));
    const lng = parseFloat(searchParams.get('lng'));

    if (!lat || !lng) {
      return NextResponse.json({ success: true, data: { isRaining: false } });
    }

    // Check if surge pricing is enabled in admin settings
    const surgeSetting = await prisma.systemSetting.findFirst({
      where: { category: 'DELIVERY', key: 'surgeEnabled' },
    });

    let surgeEnabled = true;
    try {
      surgeEnabled = surgeSetting ? JSON.parse(surgeSetting.value) : true;
    } catch {
      surgeEnabled = surgeSetting?.value === 'true' || surgeSetting?.value === true || surgeSetting?.value === '1';
    }

    // If surge is disabled, return no rain
    if (!surgeEnabled) {
      return NextResponse.json({
        success: true,
        data: {
          isRaining: false,
          isSevere: false,
          condition: 'Clear',
          description: '',
        },
      });
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