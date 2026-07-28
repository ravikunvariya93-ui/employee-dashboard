import sql from '@/lib/db';
import { NextResponse } from 'next/server';

// Returns count of employees retiring per year from the teachers table.
// Supports optional taluka filter (for TPEO role scoping).
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const taluka = searchParams.get('taluka') || '';
  const salary_school = searchParams.get('salary_school') || '';
  const years = [2026, 2027, 2028];

  try {
    let conditions = [];
    let params = [];
    if (taluka) {
      params.push(taluka.trim());
      conditions.push(`LOWER(taluka) = LOWER($${params.length})`);
    }
    if (salary_school) {
      params.push(salary_school.trim());
      conditions.push(`LOWER(salary_school) = LOWER($${params.length})`);
    }

    const filterClause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    // Build a query that counts employees retiring in each target year
    const caseClauses = years.map(yr =>
      `SUM(CASE WHEN retirement_date ~ '^\\d{2}-\\d{2}-\\d{4}$'
           AND EXTRACT(YEAR FROM TO_DATE(retirement_date, 'DD-MM-YYYY')) = ${yr}
           THEN 1 ELSE 0 END) AS "year_${yr}"`
    ).join(',\n    ');

    const queryStr = `
      SELECT
        ${caseClauses}
      FROM teachers
      WHERE retirement_date IS NOT NULL
        AND retirement_date != ''
        ${filterClause}
    `;

    const result = await sql.query(queryStr, params);
    const row = result[0] || {};

    const data = years.map(yr => ({
      year: yr,
      total_employees: parseInt(row[`year_${yr}`]) || 0,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Pension summary API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
