import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { branchId } = await params;
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear());

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    const holidays = await prisma.holiday.findMany({
      where: {
        branchId,
        date: { gte: startDate, lte: endDate }
      },
      orderBy: { date: 'asc' }
    });

    return NextResponse.json(holidays);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { branchId } = await params;
    const body = await request.json();

    const holiday = await prisma.holiday.create({
      data: {
        branchId,
        date: new Date(body.date),
        name: body.name,
        description: body.description || null
      }
    });

    return NextResponse.json(holiday, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Holiday already exists for this date' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { branchId } = await params;
    const { searchParams } = new URL(request.url);
    const holidayId = searchParams.get('id');

    if (!holidayId) {
      return NextResponse.json({ error: 'Holiday ID required' }, { status: 400 });
    }

    await prisma.holiday.delete({ where: { id: holidayId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}