import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const sql = neon(process.env.DATABASE_URL);

  try {
    const { role, username, password, taluka, salary_school } = await request.json();

    if (!role || !password) {
      return NextResponse.json({ success: false, error: 'Role and Password are required.' }, { status: 400 });
    }

    if (role === 'Employee') {
      const code = username;
      if (!code) {
        return NextResponse.json({ success: false, error: 'Teacher Code is required.' }, { status: 400 });
      }
      const cleanCode = code.trim();
      const codeInt = parseInt(cleanCode, 10);
      if (isNaN(codeInt)) {
        return NextResponse.json({ success: false, error: 'Teacher Code must be a valid number.' }, { status: 400 });
      }

      const teachers = await sql`SELECT * FROM teachers WHERE teacher_code = ${codeInt}`;
      if (teachers.length > 0) {
        const teacher = teachers[0];
        // Compare password with DOB (dob)
        if (teacher.dob && teacher.dob.trim() === password.trim()) {
          return NextResponse.json({
            success: true,
            user: {
              id: teacher.id,
              username: teacher.teacher_code.toString(),
              name: teacher.name_english,
              role: 'Employee',
              teacher_id: teacher.id,
              teacher_code: teacher.teacher_code
            }
          });
        }
      }
      return NextResponse.json({ success: false, error: 'Invalid Teacher Code or Date of Birth.' }, { status: 401 });
    }


    // First, check database `users` table
    try {
      let dbUsers = [];
      if (username) {
        dbUsers = await sql`SELECT * FROM users WHERE username = ${username} AND status = 'active'`;
      } else {
        // Match by role and location if username not explicitly passed
        if (role === 'TPEO' && taluka) {
          dbUsers = await sql`SELECT * FROM users WHERE role = 'TPEO' AND taluka = ${taluka} AND status = 'active'`;
        } else if (role === 'Salary School' && salary_school) {
          dbUsers = await sql`SELECT * FROM users WHERE role = 'Salary School' AND salary_school = ${salary_school} AND status = 'active'`;
        } else {
          dbUsers = await sql`SELECT * FROM users WHERE role = ${role} AND status = 'active'`;
        }
      }

      if (dbUsers.length > 0) {
        const user = dbUsers[0];
        if (user.password === password) {
          // Record last login
          await sql`UPDATE users SET last_login = NOW() WHERE id = ${user.id}`;
          return NextResponse.json({
            success: true,
            user: {
              id: user.id,
              username: user.username,
              name: user.name,
              role: user.role,
              taluka: user.taluka,
              salary_school: user.salary_school,
            }
          });
        }
      }
    } catch (dbErr) {
      console.warn('DB auth query warning:', dbErr.message);
    }

    // Fallback checks for legacy / demo accounts
    const expectedPassMap = {
      'Salary School': 'school123',
      'TPEO': 'tpeo123',
      'DPEO': 'dpeo123',
      'DPPF': 'dppf123',
    };

    if (expectedPassMap[role] && password === expectedPassMap[role]) {
      let displayName = role;
      if (role === 'TPEO') displayName = `TPEO - ${taluka || 'SHIHOR'}`;
      else if (role === 'Salary School') displayName = `Salary School - ${salary_school || 'PAY CENTER'}`;

      return NextResponse.json({
        success: true,
        user: {
          username: role.toLowerCase().replace(' ', '_'),
          name: displayName,
          role,
          taluka: role === 'TPEO' ? taluka : null,
          salary_school: role === 'Salary School' ? salary_school : null,
        }
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid credentials or account is suspended.' }, { status: 401 });

  } catch (error) {
    console.error('API /login error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
