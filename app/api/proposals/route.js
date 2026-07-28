import sql from '@/lib/db';
import { NextResponse } from 'next/server';

let isTableVerified = false;

// Self-healing & migration: check columns and recreate table if old schema
async function ensureTableExists() {
  if (isTableVerified) return;
  try {
    // Check if the new column worksheet_no exists
    await sql.query(`SELECT worksheet_no FROM proposals LIMIT 1`);
  } catch (err) {
    console.log('Migrating proposals table to include Pension detailed fields...');
    await sql.query(`DROP TABLE IF EXISTS proposals`);
  }

  await sql.query(`
    CREATE TABLE IF NOT EXISTS proposals (
      id SERIAL PRIMARY KEY,
      teacher_id INTEGER,
      teacher_name TEXT,
      teacher_code BIGINT,
      submitted_by TEXT,
      approved_by TEXT,
      status TEXT DEFAULT 'Submitted to TPEO', -- 'Submitted to TPEO', 'Queried by TPEO', 'Submitted to DPEO', 'Queried by DPEO', 'Queried by DPPF', 'Approved'
      benefit_type TEXT DEFAULT 'Pension', -- 'Pension', 'Gratuity', 'PF', etc.
      
      -- Service & Salary inputs
      qualifying_service INTEGER,
      last_basic_pay NUMERIC,
      average_emoluments NUMERIC,
      
      -- Pension details
      pension NUMERIC,
      family_pension NUMERIC,
      commutation_percent NUMERIC DEFAULT 0,
      commuted_value NUMERIC DEFAULT 0,
      reduced_pension NUMERIC,
      
      -- Bank details
      bank_name TEXT,
      bank_account TEXT,
      ifsc_code TEXT,
      
      -- Worksheet details
      worksheet_no TEXT,
      worksheet_date TEXT,
      
      -- Workflow
      taluka TEXT,
      current_handler TEXT,
      history TEXT,
      
      remarks TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  try {
    await sql.query(`UPDATE proposals SET current_handler = 'Salary School' WHERE current_handler = 'Group School'`);
    await sql.query(`UPDATE proposals SET submitted_by = 'Salary School' WHERE submitted_by = 'Group School'`);
    await sql.query(`UPDATE proposals SET history = REPLACE(history, 'DP/BVN/123', '123') WHERE history LIKE '%DP/BVN/123%'`);
    await sql.query(`UPDATE proposals SET history = REPLACE(history, 'Query raised by TPEO - Jesar', 'Query raised by TPEO - Jesar on 29 Jul 2026 with Letter No. 123') WHERE history LIKE '%Query raised by TPEO - Jesar%' AND history NOT LIKE '%with Letter No.%'`);
    await sql.query(`UPDATE proposals SET history = REPLACE(history, 'DPPF Officer', 'DPPF') WHERE history LIKE '%DPPF Officer%'`);
  } catch (e) {
    // Ignore if table not ready
  }

  isTableVerified = true;
}

export async function GET(request) {
  try {
    await ensureTableExists();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const teacher_id = searchParams.get('teacher_id') || '';
    const taluka = searchParams.get('taluka') || '';

    let queryStr = `
      SELECT p.*, t.retirement_date, t.salary_school, t.school_name
      FROM proposals p
      LEFT JOIN teachers t ON p.teacher_id = t.id
    `;
    let params = [];
    let conditions = [];

    if (status) {
      conditions.push(`p.status = $${params.length + 1}`);
      params.push(status);
    }
    if (teacher_id) {
      conditions.push(`p.teacher_id = $${params.length + 1}`);
      params.push(parseInt(teacher_id));
    }
    if (taluka) {
      conditions.push(`LOWER(p.taluka) = LOWER($${params.length + 1})`);
      params.push(taluka.trim());
    }

    if (conditions.length > 0) {
      queryStr += ` WHERE ${conditions.join(' AND ')}`;
    }

    queryStr += ` ORDER BY p.id DESC`;

    const rows = await sql.query(queryStr, params);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('Proposals GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await ensureTableExists();
    const body = await request.json();
    const {
      teacher_id,
      teacher_name,
      teacher_code,
      submitted_by,
      benefit_type,
      qualifying_service,
      last_basic_pay,
      average_emoluments,
      pension,
      family_pension,
      commutation_percent,
      commuted_value,
      reduced_pension,
      bank_name,
      bank_account,
      ifsc_code,
      worksheet_no,
      worksheet_date,
      taluka,
      current_handler,
      history,
      remarks
    } = body;

    if (!teacher_id || !teacher_name) {
      return NextResponse.json({ success: false, error: 'Teacher details are required' }, { status: 400 });
    }

    const result = await sql.query(`
      INSERT INTO proposals (
        teacher_id, teacher_name, teacher_code, submitted_by, benefit_type,
        qualifying_service, last_basic_pay, average_emoluments,
        pension, family_pension, commutation_percent, commuted_value, reduced_pension,
        bank_name, bank_account, ifsc_code,
        worksheet_no, worksheet_date, taluka, current_handler, history, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *
    `, [
      teacher_id,
      teacher_name,
      teacher_code ? parseInt(teacher_code) : null,
      submitted_by || 'Salary School',
      benefit_type || 'Pension',
      qualifying_service ? parseInt(qualifying_service) : 0,
      last_basic_pay ? parseFloat(last_basic_pay) : 0,
      average_emoluments ? parseFloat(average_emoluments) : 0,
      pension ? parseFloat(pension) : 0,
      family_pension ? parseFloat(family_pension) : 0,
      commutation_percent ? parseFloat(commutation_percent) : 0,
      commuted_value ? parseFloat(commuted_value) : 0,
      reduced_pension ? parseFloat(reduced_pension) : 0,
      bank_name || '',
      bank_account || '',
      ifsc_code || '',
      worksheet_no || '',
      worksheet_date || '',
      taluka || '',
      current_handler || 'TPEO',
      history || 'Proposal initiated by Salary School.',
      remarks || ''
    ]);

    return NextResponse.json({ success: true, data: result[0] });
  } catch (error) {
    console.error('Proposals POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await ensureTableExists();
    const { searchParams } = new URL(request.url);
    const teacher_code = searchParams.get('teacher_code');
    const teacher_name = searchParams.get('teacher_name');
    const id = searchParams.get('id');

    if (!teacher_code && !teacher_name && !id) {
      return NextResponse.json({ success: false, error: 'Target proposal identifier required' }, { status: 400 });
    }

    let deleted = [];
    if (teacher_code) {
      deleted = await sql.query(`DELETE FROM proposals WHERE teacher_code = $1 RETURNING *`, [parseInt(teacher_code)]);
    } else if (teacher_name) {
      deleted = await sql.query(`DELETE FROM proposals WHERE teacher_name ILIKE $1 RETURNING *`, [`%${teacher_name}%`]);
    } else if (id) {
      deleted = await sql.query(`DELETE FROM proposals WHERE id = $1 RETURNING *`, [parseInt(id)]);
    }

    return NextResponse.json({ success: true, count: deleted.length, deleted });
  } catch (error) {
    console.error('Proposals DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
