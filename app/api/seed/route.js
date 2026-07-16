import sql from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Create table if not exists
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

    // Try multiple locations
    const possiblePaths = [
      path.join(process.cwd(), '..', 'TEACHER_REPORT__report.xls'),
      path.join(process.cwd(), 'TEACHER_REPORT__report.xls'),
      'C:/edubvn/TEACHER_REPORT__report.xls',
    ];

    let xlsPath = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        xlsPath = p;
        break;
      }
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

    // Helper to decode HTML entities
    function decodeEntities(str) {
      if (!str || typeof str !== 'string') return str;
      return str
        .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec)))
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
    }

    // Helper to convert Excel serial dates
    function excelDateToString(val) {
      if (!val) return null;
      if (typeof val === 'string') return val.trim();
      if (typeof val === 'number') {
        const date = xlsx.SSF.parse_date_code(val);
        if (date) {
          return `${String(date.d).padStart(2, '0')}-${String(date.m).padStart(2, '0')}-${date.y}`;
        }
      }
      return String(val);
    }

    // Helper for safe bigint
    function safeBigInt(val) {
      if (!val || val === 0) return null;
      const n = typeof val === 'number' ? Math.round(val) : parseInt(val);
      if (isNaN(n)) return null;
      return n;
    }

    // Helper for safe numeric
    function safeNumeric(val) {
      if (!val) return null;
      const n = parseFloat(val);
      if (isNaN(n)) return null;
      return n;
    }

    // Batch insert in chunks of 100
    const BATCH_SIZE = 100;
    let inserted = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const values = batch.map((r) => ({
        serial_no: r['ક્રમ'] || null,
        taluka: r['તાલુકો'] || null,
        salary_school: r['પગાર શાળા'] || null,
        school_name: r['શાળા નું નામ'] || null,
        dise_code: safeBigInt(r['શાળા ડાયસ કોડ']),
        school_type: r['શાળા ટાઇપ'] || null,
        name_english: r['શિક્ષક નું નામ (અંગ્રેજી)'] || null,
        name_gujarati: r['શિક્ષક નું નામ (ગુજરાતી)'] || null,
        teacher_code: safeBigInt(r['શિક્ષકનો કોડ']),
        address: r['સરનામુ'] || null,
        designation: decodeEntities(r['હોદ્દો']),
        roster_number: r['રોસ્ટર નંબર'] ? String(r['રોસ્ટર નંબર']) : null,
        salary_type: r['પગાર નો પ્રકાર'] || null,
        grade_pay: r['ગ્રેડ પે'] ? String(r['ગ્રેડ પે']) : null,
        pay_type: r['ટાઇપ'] || null,
        pf_number: r['પ્રો.ફંડ નંબર'] ? String(Math.round(r['પ્રો.ફંડ નંબર'])) : null,
        house_advance: r['મકાન પેશગી'] ? String(r['મકાન પેશગી']) : null,
        pan_number: r['પાન નંબર'] || null,
        dob: excelDateToString(r['જન્મ તારીખ']),
        joined_district: excelDateToString(r['ખાતા માં દાખલ']),
        district_transfer: excelDateToString(r['જિલ્લા ફેરબદલ']),
        joined_school: excelDateToString(r['શાળા માં દાખલ']),
        full_salary_date: excelDateToString(r['ફુલ પગાર']),
        higher_pay_scale: r['ઉચ્ચતર પગાર ધોરણ'] || null,
        hps_date_1: excelDateToString(r['મળ્યા તારીખ-1']),
        hps_date_2: excelDateToString(r['મળ્યા તારીખ-2']),
        hps_date_3: excelDateToString(r['મળ્યા તારીખ-3']),
        pay_6th: safeNumeric(r['૬-પે બેઝિક']),
        pay_7th: safeNumeric(r['૭-પે બેઝિક']),
        origin: r['વતન'] || null,
        recruitment_type: r['ભરતી'] || null,
        recruitment_date: excelDateToString(r['ભરતી તારીખ']),
        pay_level: r['નિમ્ન / ઉચ્ચતર'] ? r['નિમ્ન / ઉચ્ચતર'].trim() : null,
        retirement_date: excelDateToString(r['નિવૃતિ તારીખ']),
        remarks: r['રીમાર્કસ'] || null,
      }));

      for (const v of values) {
        await sql`
          INSERT INTO teachers (
            serial_no, taluka, salary_school, school_name, dise_code, school_type,
            name_english, name_gujarati, teacher_code, address, designation,
            roster_number, salary_type, grade_pay, pay_type, pf_number,
            house_advance, pan_number, dob, joined_district, district_transfer,
            joined_school, full_salary_date, higher_pay_scale, hps_date_1, hps_date_2,
            hps_date_3, pay_6th, pay_7th, origin, recruitment_type, recruitment_date,
            pay_level, retirement_date, remarks
          ) VALUES (
            ${v.serial_no}, ${v.taluka}, ${v.salary_school}, ${v.school_name}, ${v.dise_code},
            ${v.school_type}, ${v.name_english}, ${v.name_gujarati}, ${v.teacher_code},
            ${v.address}, ${v.designation}, ${v.roster_number}, ${v.salary_type},
            ${v.grade_pay}, ${v.pay_type}, ${v.pf_number}, ${v.house_advance},
            ${v.pan_number}, ${v.dob}, ${v.joined_district}, ${v.district_transfer},
            ${v.joined_school}, ${v.full_salary_date}, ${v.higher_pay_scale},
            ${v.hps_date_1}, ${v.hps_date_2}, ${v.hps_date_3}, ${v.pay_6th},
            ${v.pay_7th}, ${v.origin}, ${v.recruitment_type}, ${v.recruitment_date},
            ${v.pay_level}, ${v.retirement_date}, ${v.remarks}
          )
        `;
        inserted++;
      }
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
