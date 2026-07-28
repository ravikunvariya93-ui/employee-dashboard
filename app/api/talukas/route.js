import sql from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const rows = await sql.query(`
      SELECT DISTINCT taluka 
      FROM teachers 
      WHERE taluka IS NOT NULL AND taluka != '' AND taluka != '-'
      ORDER BY taluka ASC
    `);
    const list = rows.map(r => r.taluka);
    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    console.error('Talukas GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
