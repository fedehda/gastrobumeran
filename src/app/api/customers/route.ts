import { NextRequest, NextResponse } from "next/server";
import { searchCustomers, createCustomer, findCustomerByDocument } from "@/lib/db/customer-repo";
import { posGateway } from "@/lib/pos";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawQuery = searchParams.get("query") || "";
    let cleanQuery = rawQuery.trim();
    if (cleanQuery.startsWith("GASTRO:DNI:")) cleanQuery = cleanQuery.replace("GASTRO:DNI:", "").trim();
    else if (cleanQuery.startsWith("GASTRO:CARD:")) cleanQuery = cleanQuery.replace("GASTRO:CARD:", "").trim();
    else if (cleanQuery.startsWith("GASTRO:")) cleanQuery = cleanQuery.replace("GASTRO:", "").trim();
    const limit = parseInt(searchParams.get("limit") || "15", 10);
    const rawFilter = searchParams.get("filter") || "";
    let filter: "active" | "unenrolled" | "all" = "all";
    if (rawFilter === "active") filter = "active";
    else if (rawFilter === "unenrolled") filter = "unenrolled";
    else if (!cleanQuery && !rawFilter) filter = "active";

    const customers = searchCustomers(cleanQuery, limit, filter);
    return NextResponse.json({ success: true, customers });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al buscar clientes";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { document_number, name, phone, email, birth_date, loyalty_enrolled } = body;

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
      birth_date,
      loyalty_enrolled: loyalty_enrolled !== undefined ? (loyalty_enrolled ? 1 : 0) : 1,
    });

    // Sincronización proactiva bidireccional con el sistema POS activo (vía POS Gateway)
    let fudoSynced = false;
    let fudoCustomerId: string | null = newCustomer.fudo_customer_id || null;

    try {
      if (!fudoCustomerId) {
        const pushResult = await posGateway.pushCustomer(newCustomer, "FUDO");
        if (pushResult.success && pushResult.externalId) {
          fudoCustomerId = pushResult.externalId;
          newCustomer.fudo_customer_id = pushResult.externalId;
          fudoSynced = true;
        }
      }
    } catch (posErr) {
      console.warn("Aviso: No se pudo dar de alta al cliente en el POS (el registro local se completó):", posErr);
    }

    return NextResponse.json(
      {
        success: true,
        customer: newCustomer,
        fudo_synced: fudoSynced,
        fudo_customer_id: fudoCustomerId,
        message: fudoSynced
          ? `Comensal registrado y sincronizado en el POS (ID: ${fudoCustomerId}).`
          : "Comensal registrado con éxito en GastroBumeran.",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al registrar cliente";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
