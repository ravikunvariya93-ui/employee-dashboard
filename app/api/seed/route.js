import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

export const maxDuration = 300; // 5 min max for Vercel

export async function GET() {
  const sql = neon(process.env.DATABASE_URL);

  try {
    // Create table if not exists
    console.log('Seed route: Creating table if not exists...');
    await sql`
      CREATE TABLE IF NOT EXISTS teachers (
        id SERIAL PRIMARY KEY,
        serial_no INTEGER,
        taluka TEXT,
        salary_school TEXT,
        school_name TEXT,
        dise_code BIGINT,
        school_type TEXT,
        name_english TEXT,
        name_gujarati TEXT,
        teacher_code BIGINT,
        address TEXT,
        designation TEXT,
        roster_number TEXT,
        salary_type TEXT,
        grade_pay TEXT,
        pay_type TEXT,
        pf_number TEXT,
        house_advance TEXT,
        pan_number TEXT,
        dob TEXT,
        joined_district TEXT,
        district_transfer TEXT,
        joined_school TEXT,
        full_salary_date TEXT,
        higher_pay_scale TEXT,
        hps_date_1 TEXT,
        hps_date_2 TEXT,
        hps_date_3 TEXT,
        pay_6th NUMERIC,
        pay_7th NUMERIC,
        origin TEXT,
        recruitment_type TEXT,
        recruitment_date TEXT,
        pay_level TEXT,
        retirement_date TEXT,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Check if already seeded
    console.log('Seed route: Table created/verified. Querying count...');
    const countResult = await sql`SELECT COUNT(*) as count FROM teachers`;
    const existing = parseInt(countResult[0].count);
    if (existing > 0) {
      return NextResponse.json({
        success: true,
        message: `Database already has ${existing} records. Skipping seed.`,
        count: existing,
        alreadySeeded: true,
      });
    }

    // Read the XLS file
    const xlsx = (await import('xlsx')).default;
    const path = (await import('path')).default;
    const fs = (await import('fs')).default;

    const possiblePaths = [
      path.join(process.cwd(), '..', 'TEACHER_REPORT__report.xls'),
      path.join(process.cwd(), 'TEACHER_REPORT__report.xls'),
      'C:/edubvn/TEACHER_REPORT__report.xls',
    ];

    let xlsPath = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) { xlsPath = p; break; }
    }

    if (!xlsPath) {
      return NextResponse.json(
        { success: false, error: 'XLS file not found. Tried: ' + possiblePaths.join(', ') },
        { status: 404 }
      );
    }

    const workbook = xlsx.readFile(xlsPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);

    // ── Helpers ──────────────────────────────────────────────
    function decodeEntities(str) {
      if (!str || typeof str !== 'string') return str;
      return str
        .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec)))
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    }

    function excelDateToString(val) {
      if (!val) return null;
      if (typeof val === 'string') return val.trim() || null;
      if (typeof val === 'number') {
        const date = xlsx.SSF.parse_date_code(val);
        if (date) return `${String(date.d).padStart(2,'0')}-${String(date.m).padStart(2,'0')}-${date.y}`;
      }
      return String(val) || null;
    }

    function safeBigInt(val) {
      if (!val || val === 0) return null;
      const n = typeof val === 'number' ? Math.round(val) : parseInt(val);
      return isNaN(n) ? null : n;
    }

    function safeNum(val) {
      if (!val && val !== 0) return null;
      const n = parseFloat(val);
      return isNaN(n) || n === 0 ? null : n;
    }

    function safeStr(val) {
      if (val === null || val === undefined) return null;
      const s = String(val).trim();
      return s === '' ? null : s;
    }

    // ── Map rows to clean objects ─────────────────────────────
    const records = rows.map((r) => ({
      serial_no:        r['ક્રમ'] || null,
      taluka:           safeStr(r['તાલુકો']),
      salary_school:    safeStr(r['પગાર શાળા']),
      school_name:      safeStr(r['શાળા નું નામ']),
      dise_code:        safeBigInt(r['શાળા ડાયસ કોડ']),
      school_type:      safeStr(r['શાળા ટાઇપ']),
      name_english:     safeStr(r['શિક્ષક નું નામ (અંગ્રેજી)']),
      name_gujarati:    safeStr(r['શિક્ષક નું નામ (ગુજરાતી)']),
      teacher_code:     safeBigInt(r['શિક્ષકનો કોડ']),
      address:          safeStr(r['સરનામુ']),
      designation:      decodeEntities(r['હોદ્દો']),
      roster_number:    r['રોસ્ટર નંબર'] != null ? String(r['રોસ્ટર નંબર']) : null,
      salary_type:      safeStr(r['પગાર નો પ્રકાર']),
      grade_pay:        r['ગ્રેડ પે'] != null ? String(r['ગ્રેડ પે']) : null,
      pay_type:         safeStr(r['ટાઇપ']),
      pf_number:        r['પ્રો.ફંડ નંબર'] != null ? String(Math.round(r['પ્રો.ફંડ નંબર'])) : null,
      house_advance:    r['મકાન પેશગી'] != null ? String(r['મકાન પેશગી']) : null,
      pan_number:       safeStr(r['પાન નંબર']),
      dob:              excelDateToString(r['જન્મ તારીખ']),
      joined_district:  excelDateToString(r['ખાતા માં દાખલ']),
      district_transfer:excelDateToString(r['જિલ્લા ફેરબદલ']),
      joined_school:    excelDateToString(r['શાળા માં દાખલ']),
      full_salary_date: excelDateToString(r['ફુલ પગાર']),
      higher_pay_scale: safeStr(r['ઉચ્ચતર પગાર ધોરણ']),
      hps_date_1:       excelDateToString(r['મળ્યા તારીખ-1']),
      hps_date_2:       excelDateToString(r['મળ્યા તારીખ-2']),
      hps_date_3:       excelDateToString(r['મળ્યા તારીખ-3']),
      pay_6th:          safeNum(r['૬-પે બેઝિક']),
      pay_7th:          safeNum(r['૭-પે બેઝિક']),
      origin:           safeStr(r['વતન']),
      recruitment_type: safeStr(r['ભરતી']),
      recruitment_date: excelDateToString(r['ભરતી તારીખ']),
      pay_level:        r['નિમ્ન / ઉચ્ચતર'] ? r['નિમ્ન / ઉચ્ચતર'].trim() : null,
      retirement_date:  excelDateToString(r['નિવૃતિ તારીખ']),
      remarks:          safeStr(r['રીમાર્કસ']),
    }));

    // ── Bulk INSERT in batches of 500 rows per statement ──────
    const BATCH = 500;
    let inserted = 0;

    for (let i = 0; i < records.length; i += BATCH) {
      const batch = records.slice(i, i + BATCH);

      // Build a single multi-row parameterized INSERT
      const cols = [
        'serial_no','taluka','salary_school','school_name','dise_code','school_type',
        'name_english','name_gujarati','teacher_code','address','designation',
        'roster_number','salary_type','grade_pay','pay_type','pf_number',
        'house_advance','pan_number','dob','joined_district','district_transfer',
        'joined_school','full_salary_date','higher_pay_scale','hps_date_1','hps_date_2',
        'hps_date_3','pay_6th','pay_7th','origin','recruitment_type','recruitment_date',
        'pay_level','retirement_date','remarks'
      ];

      const values = [];
      const placeholders = batch.map((rec, ri) => {
        const start = ri * cols.length + 1;
        cols.forEach((col) => values.push(rec[col]));
        return `(${cols.map((_, ci) => `$${start + ci}`).join(',')})`;
      });

      const query = `INSERT INTO teachers (${cols.join(',')}) VALUES ${placeholders.join(',')}`;
      await sql.query(query, values);
      inserted += batch.length;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${inserted} teacher records into the database.`,
      count: inserted,
    });

  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
