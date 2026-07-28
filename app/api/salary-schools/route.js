import sql from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const rows = await sql.query(`
      SELECT DISTINCT salary_school 
      FROM teachers 
      WHERE salary_school IS NOT NULL AND salary_school != '' AND salary_school != '-'
      ORDER BY salary_school ASC
    `);
    const list = rows.map(r => r.salary_school);
    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    console.error('Salary schools GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
