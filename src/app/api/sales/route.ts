import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/db";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("query")?.trim() || "";
    const limit = Math.min(100, parseInt(url.searchParams.get("limit") || "30", 10));
    const status = url.searchParams.get("status")?.trim();

    const db = getDatabase();

    let sql = `
      SELECT
        s.*,
        c.name as customer_name,
        c.document_number as customer_doc,
        c.phone as customer_phone,
        COALESCE(ph.points, 0) as points_earned
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN points_history ph ON ph.sale_id = s.id AND ph.points > 0
    `;

    const whereClauses: string[] = [];
    const params: unknown[] = [];

    if (status) {
      whereClauses.push("s.status = ?");
      params.push(status);
    }

    if (query) {
      whereClauses.push(`(
        s.id LIKE ? OR
        s.external_sale_id LIKE ? OR
        c.name LIKE ? OR
        c.document_number LIKE ? OR
        c.phone LIKE ?
      )`);
      const term = `%${query}%`;
      params.push(term, term, term, term, term);
    }

    if (whereClauses.length > 0) {
      sql += " WHERE " + whereClauses.join(" AND ");
    }

    sql += " ORDER BY s.sale_date DESC LIMIT ?";
    params.push(limit);

    const rows = db.prepare(sql).all(...params) as Array<{
      id: string;
      external_sale_id: string | null;
      customer_id: string | null;
      source: string;
      total_amount: number;
      sale_date: string;
      status: string;
      visit_added: number;
      customer_name: string | null;
      customer_doc: string | null;
      customer_phone: string | null;
      points_earned: number;
    }>;

    return NextResponse.json({
      success: true,
      sales: rows.map((r) => ({
        id: r.id,
        external_sale_id: r.external_sale_id,
        customer_id: r.customer_id,
        source: r.source,
        total_amount: r.total_amount,
        sale_date: r.sale_date,
        status: r.status,
        visit_added: Boolean(r.visit_added),
        customer_name: r.customer_name,
        customer_doc: r.customer_doc,
        customer_phone: r.customer_phone,
        points_earned: r.points_earned || 0,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al consultar ventas";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
