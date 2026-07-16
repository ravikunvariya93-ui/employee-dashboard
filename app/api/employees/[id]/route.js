import sql from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const rows = await sql`SELECT * FROM teachers WHERE id = ${parseInt(id)}`;
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Employee detail error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
