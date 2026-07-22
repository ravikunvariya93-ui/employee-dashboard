import sql from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PATCH(request, { params }) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid proposal ID' }, { status: 400 });
    }

    const body = await request.json();
    const {
      status,
      current_handler,
      history,
      approved_by,
      remarks,
      worksheet_no,
      worksheet_date
    } = body;

    // Build dynamic UPDATE query
    let setClauses = [];
    let queryParams = [];
    let idx = 1;

    if (status !== undefined) {
      setClauses.push(`status = $${idx}`);
      queryParams.push(status);
      idx++;
    }
    if (current_handler !== undefined) {
      setClauses.push(`current_handler = $${idx}`);
      queryParams.push(current_handler);
      idx++;
    }
    if (history !== undefined) {
      setClauses.push(`history = $${idx}`);
      queryParams.push(history);
      idx++;
    }
    if (approved_by !== undefined) {
      setClauses.push(`approved_by = $${idx}`);
      queryParams.push(approved_by);
      idx++;
    }
    if (remarks !== undefined) {
      setClauses.push(`remarks = $${idx}`);
      queryParams.push(remarks);
      idx++;
    }
    if (worksheet_no !== undefined) {
      setClauses.push(`worksheet_no = $${idx}`);
      queryParams.push(worksheet_no);
      idx++;
    }
    if (worksheet_date !== undefined) {
      setClauses.push(`worksheet_date = $${idx}`);
      queryParams.push(worksheet_date);
      idx++;
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }

    setClauses.push(`updated_at = NOW()`);

    const queryStr = `
      UPDATE proposals
      SET ${setClauses.join(', ')}
      WHERE id = $${idx}
      RETURNING *
    `;
    queryParams.push(id);

    const result = await sql.query(queryStr, queryParams);

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: 'Proposal not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result[0] });
  } catch (error) {
    console.error('Proposal PATCH error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid proposal ID' }, { status: 400 });
    }

    const result = await sql.query(`DELETE FROM proposals WHERE id = $1 RETURNING *`, [id]);
    if (result.length === 0) {
      return NextResponse.json({ success: false, error: 'Proposal not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deleted: result[0] });
  } catch (error) {
    console.error('Proposal DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
