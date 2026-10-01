import { NextRequest, NextResponse } from "next/server";
import { searchCustomers, createCustomer, findCustomerByDocument } from "@/lib/db/customer-repo";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawQuery = searchParams.get("query") || "";
    let cleanQuery = rawQuery.trim();
    if (cleanQuery.startsWith("GASTRO:DNI:")) cleanQuery = cleanQuery.replace("GASTRO:DNI:", "").trim();
    else if (cleanQuery.startsWith("GASTRO:CARD:")) cleanQuery = cleanQuery.replace("GASTRO:CARD:", "").trim();
    else if (cleanQuery.startsWith("GASTRO:")) cleanQuery = cleanQuery.replace("GASTRO:", "").trim();
    const limit = parseInt(searchParams.get("limit") || "15", 10);

    const customers = searchCustomers(cleanQuery, limit);
    return NextResponse.json({ success: true, customers });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al buscar clientes";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { document_number, name, phone, email } = body;

    if (!document_number || !name) {
      return NextResponse.json(
        { success: false, error: "El DNI/Número Fiscal y el Nombre son obligatorios." },
        { status: 400 }
      );
    }

    const existing = findCustomerByDocument(document_number);
    if (existing) {
      return NextResponse.json(
        { success: true, customer: existing, message: "El cliente ya se encontraba registrado." },
        { status: 200 }
      );
    }

    const newCustomer = createCustomer({
      document_number,
      name,
      phone,
      email,
    });

    return NextResponse.json({ success: true, customer: newCustomer, message: "Cliente registrado con éxito." }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al registrar cliente";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
