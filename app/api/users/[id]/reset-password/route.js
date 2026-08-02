import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  const sql = neon(process.env.DATABASE_URL);
  const userId = params.id;

  try {
    const { newPassword } = await request.json();

    if (!newPassword || newPassword.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'New password cannot be empty' },
        { status: 400 }
      );
    }

    const existing = await sql`SELECT id, username FROM users WHERE id = ${userId}`;
    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    await sql`
      UPDATE users
      SET password = ${newPassword.trim()}
      WHERE id = ${userId}
    `;

    return NextResponse.json({
      success: true,
      message: `Password for user ${existing[0].username} has been reset successfully.`
    });
  } catch (error) {
    console.error('API reset-password error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
