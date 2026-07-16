import sql from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const search = searchParams.get('search') || '';
  const taluka = searchParams.get('taluka') || '';
  const salary_type = searchParams.get('salary_type') || '';
  const designation = searchParams.get('designation') || '';
  const pay_level = searchParams.get('pay_level') || '';
  const retirement_within = searchParams.get('retirement_within') || '';
  const sort = searchParams.get('sort') || 'id';
  const order = searchParams.get('order') || 'asc';
  const offset = (page - 1) * limit;

  const allowedSortColumns = [
    'id', 'name_english', 'taluka', 'school_name', 'salary_type',
    'pay_7th', 'pay_6th', 'dob', 'retirement_date'
  ];
  const safeSort = allowedSortColumns.includes(sort) ? sort : 'id';
  const safeOrder = order === 'desc' ? 'DESC' : 'ASC';

  try {
    // Build dynamic conditions
    let conditions = [];
    let params = [];
    let paramIdx = 1;

    if (search) {
      conditions.push(`(name_english ILIKE $${paramIdx} OR name_gujarati ILIKE $${paramIdx} OR pan_number ILIKE $${paramIdx} OR CAST(teacher_code AS TEXT) ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }
    if (taluka) {
      conditions.push(`taluka = $${paramIdx}`);
      params.push(taluka);
      paramIdx++;
    }
    if (salary_type) {
      conditions.push(`salary_type = $${paramIdx}`);
      params.push(salary_type);
      paramIdx++;
    }
    if (designation) {
      conditions.push(`designation = $${paramIdx}`);
      params.push(designation);
      paramIdx++;
    }
    if (pay_level) {
      conditions.push(`TRIM(pay_level) = $${paramIdx}`);
      params.push(pay_level.trim());
      paramIdx++;
    }
    if (retirement_within) {
      const years = parseInt(retirement_within);
      if ([1, 2, 3, 4, 5].includes(years)) {
        conditions.push(`(retirement_date ~ '^\\d{2}-\\d{2}-\\d{4}$' AND TO_DATE(retirement_date, 'DD-MM-YYYY') BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${years} years')`);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Use tagged template with raw query for dynamic conditions
    const queryStr = `
      SELECT * FROM teachers
      ${whereClause}
      ORDER BY ${safeSort} ${safeOrder}
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;
    const countStr = `SELECT COUNT(*) as count FROM teachers ${whereClause}`;

    const [rows, countResult] = await Promise.all([
      sql.query(queryStr, [...params, limit, offset]),
      sql.query(countStr, params),
    ]);

    const total = parseInt(countResult[0].count);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Employees GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
