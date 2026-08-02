import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
  const sql = neon(process.env.DATABASE_URL);
  const userId = params.id;

  try {
    const body = await request.json();
    const { username, name, role, taluka, salary_school, password, status, phone, email, address, office_name_gujarati, office_stamp } = body;

    const existing = await sql`SELECT id, username FROM users WHERE id = ${userId}`;
    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: 'User account not found' }, { status: 404 });
    }

    // Check if new username collides with another user
    if (username && username.trim() !== existing[0].username) {
      const duplicateCheck = await sql`SELECT id FROM users WHERE username = ${username.trim()} AND id != ${userId}`;
      if (duplicateCheck.length > 0) {
        return NextResponse.json(
          { success: false, error: `Username "${username}" is already taken by another account.` },
          { status: 400 }
        );
      }
    }

    const updated = await sql`
      UPDATE users
      SET 
        username = COALESCE(${username ? username.trim() : null}, username),
        name = COALESCE(${name ? name.trim() : null}, name),
        role = COALESCE(${role}, role),
        taluka = ${taluka !== undefined ? (taluka ? taluka.trim() : null) : null},
        salary_school = ${salary_school !== undefined ? (salary_school ? salary_school.trim() : null) : null},
        password = CASE WHEN ${password && password.trim() ? true : false} THEN ${password ? password.trim() : ''} ELSE password END,
        status = COALESCE(${status}, status),
        phone = ${phone !== undefined ? (phone ? phone.trim() : null) : null},
        email = ${email !== undefined ? (email ? email.trim() : null) : null},
        address = ${address !== undefined ? (address ? address.trim() : null) : null},
        office_name_gujarati = ${office_name_gujarati !== undefined ? (office_name_gujarati ? office_name_gujarati.trim() : null) : null},
        office_stamp = ${office_stamp !== undefined ? (office_stamp ? office_stamp.trim() : null) : null}
      WHERE id = ${userId}
      RETURNING id, username, name, role, taluka, salary_school, status, phone, email, address, office_name_gujarati, office_stamp;
    `;

    return NextResponse.json({
      success: true,
      message: 'User account updated successfully',
      user: updated[0]
    });
  } catch (error) {
    console.error('API /users/[id] PUT error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const sql = neon(process.env.DATABASE_URL);
  const userId = params.id;

  try {
    const existing = await sql`SELECT id, username FROM users WHERE id = ${userId}`;
    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    await sql`DELETE FROM users WHERE id = ${userId}`;

    return NextResponse.json({
      success: true,
      message: `User ${existing[0].username} deleted successfully`
    });
  } catch (error) {
    console.error('API /users/[id] DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
