import sql from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const tab = searchParams.get('tab') || 'upcoming'; // 'upcoming' | 'recent'
  const search = searchParams.get('search') || '';
  const taluka = searchParams.get('taluka') || '';
  const status = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  const year = parseInt(searchParams.get('year') || '0');
  const yearsParam = searchParams.get('years') || '';

  try {
    let conditions = [];
    let params = [];
    let paramIdx = 1;

    // Date range condition — years or year takes priority over tab
    if (yearsParam) {
      const yrsArr = yearsParam.split(',').map(y => parseInt(y.trim())).filter(y => !isNaN(y) && y > 0);
      if (yrsArr.length > 0) {
        conditions.push(
          `(retirement_date ~ '^\\d{2}-\\d{2}-\\d{4}$' AND EXTRACT(YEAR FROM TO_DATE(retirement_date, 'DD-MM-YYYY')) IN (${yrsArr.join(',')}))`
        );
      }
    } else if (year) {
      conditions.push(
        `(retirement_date ~ '^\\d{2}-\\d{2}-\\d{4}$' AND EXTRACT(YEAR FROM TO_DATE(retirement_date, 'DD-MM-YYYY')) = $${paramIdx})`
      );
      params.push(year);
      paramIdx++;
    } else if (tab === 'upcoming') {
      // Retiring in next 2 years (from today onwards)
      conditions.push(
        `(retirement_date ~ '^\\d{2}-\\d{2}-\\d{4}$' AND TO_DATE(retirement_date, 'DD-MM-YYYY') BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '2 years')`
      );
    } else {
      // Retired in last 2 years (before today)
      conditions.push(
        `(retirement_date ~ '^\\d{2}-\\d{2}-\\d{4}$' AND TO_DATE(retirement_date, 'DD-MM-YYYY') BETWEEN CURRENT_DATE - INTERVAL '2 years' AND CURRENT_DATE - INTERVAL '1 day')`
      );
    }

    const salary_school = searchParams.get('salary_school') || '';

    if (search) {
      conditions.push(
        `(name_english ILIKE $${paramIdx} OR name_gujarati ILIKE $${paramIdx} OR CAST(teacher_code AS TEXT) ILIKE $${paramIdx})`
      );
      params.push(`%${search}%`);
      paramIdx++;
    }
    if (taluka) {
      conditions.push(`LOWER(taluka) = LOWER($${paramIdx})`);
      params.push(taluka.trim());
      paramIdx++;
    }
    if (salary_school) {
      conditions.push(`LOWER(salary_school) = LOWER($${paramIdx})`);
      params.push(salary_school.trim());
      paramIdx++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const queryStr = `
      SELECT
        id, teacher_code, name_english, name_gujarati,
        taluka, salary_school, school_name, designation, salary_type,
        pay_7th, pay_level, dob, retirement_date, joined_school,
        (SELECT status FROM proposals WHERE teacher_id = teachers.id LIMIT 1) as proposal_status
      FROM teachers
      ${whereClause}
      ORDER BY
        CASE WHEN retirement_date ~ '^\\d{2}-\\d{2}-\\d{4}$'
             THEN TO_DATE(retirement_date, 'DD-MM-YYYY')
             ELSE NULL END ${tab === 'upcoming' ? 'ASC' : 'DESC'}
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;

    const countStr = `SELECT COUNT(*) as count FROM teachers ${whereClause}`;

    // Stats summary
    const [rows, countResult, statsResult] = await Promise.all([
      sql.query(queryStr, [...params, limit, offset]),
      sql.query(countStr, params),
      sql.query(`
        SELECT
          SUM(CASE WHEN retirement_date ~ '^\\d{2}-\\d{2}-\\d{4}$'
              AND TO_DATE(retirement_date, 'DD-MM-YYYY') BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '2 years'
              THEN 1 ELSE 0 END) as upcoming_2yr,
          SUM(CASE WHEN retirement_date ~ '^\\d{2}-\\d{2}-\\d{4}$'
              AND TO_DATE(retirement_date, 'DD-MM-YYYY') BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '6 months'
              THEN 1 ELSE 0 END) as upcoming_6mo,
          SUM(CASE WHEN retirement_date ~ '^\\d{2}-\\d{2}-\\d{4}$'
              AND TO_DATE(retirement_date, 'DD-MM-YYYY') BETWEEN CURRENT_DATE - INTERVAL '2 years' AND CURRENT_DATE - INTERVAL '1 day'
              THEN 1 ELSE 0 END) as recent_2yr,
          SUM(CASE WHEN retirement_date ~ '^\\d{2}-\\d{2}-\\d{4}$'
              AND TO_DATE(retirement_date, 'DD-MM-YYYY') BETWEEN CURRENT_DATE - INTERVAL '1 year' AND CURRENT_DATE - INTERVAL '1 day'
              THEN 1 ELSE 0 END) as recent_1yr
        FROM teachers
      `, []),
    ]);

    const total = parseInt(countResult[0].count);
    const totalPages = Math.ceil(total / limit);
    const stats = statsResult[0];

    return NextResponse.json({
      data: rows,
      pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
      stats: {
        upcoming2yr: parseInt(stats.upcoming_2yr) || 0,
        upcoming6mo: parseInt(stats.upcoming_6mo) || 0,
        recent2yr: parseInt(stats.recent_2yr) || 0,
        recent1yr: parseInt(stats.recent_1yr) || 0,
      },
    });
  } catch (error) {
    console.error('Pension API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
