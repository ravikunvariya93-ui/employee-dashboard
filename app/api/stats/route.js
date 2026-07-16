import sql from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const [
      totalResult,
      fixResult,
      fullResult,
      talukaResult,
      schoolResult,
      designationResult,
      payLevelResult,
      pay7thResult,
      recentResult,
    ] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM teachers`,
      sql`SELECT COUNT(*) as count FROM teachers WHERE salary_type = 'Fix'`,
      sql`SELECT COUNT(*) as count FROM teachers WHERE salary_type = 'Full'`,
      sql`SELECT taluka, COUNT(*) as count FROM teachers GROUP BY taluka ORDER BY count DESC`,
      sql`SELECT COUNT(DISTINCT school_name) as count FROM teachers`,
      sql`SELECT designation, COUNT(*) as count FROM teachers WHERE designation IS NOT NULL GROUP BY designation ORDER BY count DESC`,
      sql`SELECT TRIM(pay_level) as pay_level, COUNT(*) as count FROM teachers WHERE pay_level IS NOT NULL GROUP BY TRIM(pay_level) ORDER BY count DESC`,
      sql`
        SELECT
          CASE
            WHEN pay_7th < 20000 THEN 'Below 20K'
            WHEN pay_7th BETWEEN 20000 AND 30000 THEN '20K-30K'
            WHEN pay_7th BETWEEN 30001 AND 40000 THEN '30K-40K'
            WHEN pay_7th BETWEEN 40001 AND 50000 THEN '40K-50K'
            WHEN pay_7th BETWEEN 50001 AND 60000 THEN '50K-60K'
            WHEN pay_7th > 60000 THEN 'Above 60K'
            ELSE 'Not Set'
          END as range,
          COUNT(*) as count
        FROM teachers
        GROUP BY range
        ORDER BY MIN(pay_7th) ASC NULLS LAST
      `,
      sql`SELECT id, name_english, taluka, school_name, salary_type, pay_7th, joined_school FROM teachers ORDER BY id DESC LIMIT 5`,
    ]);

    return NextResponse.json({
      total: parseInt(totalResult[0].count),
      fixSalary: parseInt(fixResult[0].count),
      fullSalary: parseInt(fullResult[0].count),
      totalSchools: parseInt(schoolResult[0].count),
      byTaluka: talukaResult,
      byDesignation: designationResult,
      byPayLevel: payLevelResult,
      pay7thDistribution: pay7thResult,
      recentEmployees: recentResult,
    });
  } catch (error) {
    console.error('Stats error:', error);
    if (error.message.includes('relation "teachers" does not exist')) {
      return NextResponse.json({ error: 'Database is not seeded yet. Please click the Data Import page to seed the data.' });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
