import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { NotificationService } from '@/services/notification.service';

// GET - List all templates
export async function GET(request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminProfile = await prisma.adminProfile.findFirst({
      where: { userId: user.id }
    });

    if (!adminProfile) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const templates = await NotificationService.getTemplates(type);

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Fetch templates error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// POST - Create new template
export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminProfile = await prisma.adminProfile.findFirst({
      where: { userId: user.id }
    });

    if (!adminProfile) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const template = await NotificationService.createTemplate(body);

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Create template error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create template' },
      { status: 500 }
    );
  }
}
