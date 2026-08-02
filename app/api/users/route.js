import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const sql = neon(process.env.DATABASE_URL);
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const roleFilter = searchParams.get('role') || '';
  const statusFilter = searchParams.get('status') || '';
  const talukaFilter = searchParams.get('taluka') || '';

  try {
    // 1. Ensure table exists
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        taluka TEXT,
        salary_school TEXT,
        password TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        phone TEXT,
        email TEXT,
        address TEXT,
        office_name_gujarati TEXT,
        office_stamp TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        last_login TIMESTAMP
      );
    `;
    // Ensure new columns exist on older tables (migration)
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS office_name_gujarati TEXT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS office_stamp TEXT`;

    // 2. Ensure TPEO accounts exist for all 10 Talukas in Bhavnagar District
    const ALL_TALUKAS = [
      'BHAVNAGAR', 'GARIYADHAR', 'GHOGHA', 'JESAR', 'MAHUVA',
      'PALITANA', 'SHIHOR', 'TALAJA', 'UMRALA', 'VALLBHIPUR'
    ];

    try {
      const existingTpeos = await sql`SELECT taluka FROM users WHERE role = 'TPEO' AND taluka IS NOT NULL`;
      const existingTpeoTalukas = new Set(existingTpeos.map(u => u.taluka.toUpperCase()));

      for (const t of ALL_TALUKAS) {
        if (!existingTpeoTalukas.has(t)) {
          const username = `tpeo_${t.toLowerCase()}`;
          const formattedName = `TPEO ${t.charAt(0) + t.slice(1).toLowerCase()} Office`;
          await sql`
            INSERT INTO users (username, name, role, taluka, password, status, phone, email)
            VALUES (
              ${username},
              ${formattedName},
              'TPEO',
              ${t},
              'tpeo123',
              'active',
              ${`+91 98765 000${Math.floor(10 + Math.random() * 89)}`},
              ${`tpeo-${t.toLowerCase()}@gujarat.gov.in`}
            )
            ON CONFLICT (username) DO NOTHING;
          `;
        }
      }
    } catch (tpeoSyncErr) {
      console.warn('TPEO sync error:', tpeoSyncErr.message);
    }

    // 3. Auto-populate user accounts for ALL distinct salary schools in teachers table if not already present
    try {
      const distinctSchools = await sql`
        SELECT salary_school, MAX(taluka) as taluka
        FROM teachers
        WHERE salary_school IS NOT NULL AND salary_school != '' AND salary_school != '-'
        GROUP BY salary_school
        ORDER BY salary_school ASC;
      `;

      if (distinctSchools.length > 0) {
        const existingUsers = await sql`SELECT salary_school FROM users WHERE role = 'Salary School' AND salary_school IS NOT NULL`;
        const existingSchoolSet = new Set(existingUsers.map(u => u.salary_school));

        const missingSchools = distinctSchools.filter(s => !existingSchoolSet.has(s.salary_school));

        if (missingSchools.length > 0) {
          console.log(`Auto-populating ${missingSchools.length} missing Salary School accounts into users table...`);
          
          for (const schoolObj of missingSchools) {
            const schoolName = schoolObj.salary_school;
            const schoolTaluka = schoolObj.taluka || null;
            // Generate clean username from school name (e.g., "AYAVEJ-1 K.V SCHOOL" -> "school_ayavej_1_kv_school")
            const cleanSlug = schoolName
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '_')
              .replace(/^_+|_+$/g, '');
            const username = `school_${cleanSlug.slice(0, 45)}`;

            try {
              await sql`
                INSERT INTO users (username, name, role, taluka, salary_school, password, status, email)
                VALUES (
                  ${username},
                  ${schoolName},
                  'Salary School',
                  ${schoolTaluka},
                  ${schoolName},
                  'school123',
                  'active',
                  ${`${cleanSlug.slice(0, 25)}@gujarat.gov.in`}
                )
                ON CONFLICT (username) DO NOTHING;
              `;
            } catch (insErr) {
              // Ignore duplicate usernames if slug overlaps
            }
          }
        }
      }
    } catch (schoolSyncErr) {
      console.warn('Salary schools sync warning:', schoolSyncErr.message);
    }

    // 4. Fetch summary stats
    const allUsersForStats = await sql`SELECT role, status FROM users`;
    const stats = {
      total: allUsersForStats.length,
      active: allUsersForStats.filter(u => u.status === 'active').length,
      suspended: allUsersForStats.filter(u => u.status === 'suspended').length,
      dpeo: allUsersForStats.filter(u => u.role === 'DPEO').length,
      tpeo: allUsersForStats.filter(u => u.role === 'TPEO').length,
      salarySchool: allUsersForStats.filter(u => u.role === 'Salary School').length,
      dppf: allUsersForStats.filter(u => u.role === 'DPPF').length,
    };

    // 5. Fetch filtered list
    let allUsers = await sql`SELECT id, username, name, role, taluka, salary_school, status, phone, email, address, office_name_gujarati, office_stamp, created_at, last_login FROM users ORDER BY id DESC`;

    if (q) {
      const term = q.toLowerCase();
      allUsers = allUsers.filter(u =>
        (u.name && u.name.toLowerCase().includes(term)) ||
        (u.username && u.username.toLowerCase().includes(term)) ||
        (u.email && u.email.toLowerCase().includes(term)) ||
        (u.phone && u.phone.toLowerCase().includes(term)) ||
        (u.salary_school && u.salary_school.toLowerCase().includes(term))
      );
    }

    if (roleFilter) {
      allUsers = allUsers.filter(u => u.role === roleFilter);
    }

    if (statusFilter) {
      allUsers = allUsers.filter(u => u.status === statusFilter);
    }

    if (talukaFilter) {
      allUsers = allUsers.filter(u => u.taluka === talukaFilter);
    }

    return NextResponse.json({
      success: true,
      users: allUsers,
      stats,
    });
  } catch (error) {
    console.error('API /users GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const sql = neon(process.env.DATABASE_URL);

  try {
    const body = await request.json();
    const { username, name, role, taluka, salary_school, password, phone, email, address, office_name_gujarati, office_stamp, status } = body;

    if (!username || !name || !role || !password) {
      return NextResponse.json(
        { success: false, error: 'Username, Name, Role, and Password are required fields.' },
        { status: 400 }
      );
    }

    // Check existing username
    const existing = await sql`SELECT id FROM users WHERE username = ${username.trim()}`;
    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: `Username "${username}" already exists in the system.` },
        { status: 400 }
      );
    }

    const inserted = await sql`
      INSERT INTO users (username, name, role, taluka, salary_school, password, status, phone, email, address, office_name_gujarati, office_stamp)
      VALUES (
        ${username.trim()},
        ${name.trim()},
        ${role},
        ${taluka || null},
        ${salary_school || null},
        ${password},
        ${status || 'active'},
        ${phone || null},
        ${email || null},
        ${address || null},
        ${office_name_gujarati || null},
        ${office_stamp || null}
      )
      RETURNING id, username, name, role, taluka, salary_school, status, phone, email, address, office_name_gujarati, office_stamp, created_at;
    `;

    return NextResponse.json({
      success: true,
      message: 'User account created successfully.',
      user: inserted[0],
    });
  } catch (error) {
    console.error('API /users POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
