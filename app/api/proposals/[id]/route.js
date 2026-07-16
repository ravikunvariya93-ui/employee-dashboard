import sql from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PATCH(request, { params }) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid proposal ID' }, { status: 400 });
    }

    const body = await request.json();
    const { status, approved_by, remarks } = body;

    if (!status || !['Approved', 'Rejected'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Valid status (Approved/Rejected) is required' }, { status: 400 });
    }

    const result = await sql.query(`
      UPDATE proposals
      SET status = $1, approved_by = $2, remarks = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [status, approved_by || 'Higher Authority', remarks || '', id]);

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: 'Proposal not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result[0] });
  } catch (error) {
    console.error('Proposal PATCH error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
