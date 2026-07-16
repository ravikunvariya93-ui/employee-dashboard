import sql from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    await sql`DROP TABLE IF EXISTS teachers`;
    return NextResponse.json({ success: true, message: 'Table dropped successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
