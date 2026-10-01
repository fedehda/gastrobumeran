import { NextRequest, NextResponse } from "next/server";
import { searchCustomers, createCustomer, findCustomerByDocument, linkFudoCustomerId } from "@/lib/db/customer-repo";
import { FudoApiClient } from "@/lib/fudo/client";

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
    const { document_number, name, phone, email, birth_date } = body;

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
    });

    // Sincronización proactiva bidireccional con Fudo POS
    let fudoSynced = false;
    let fudoCustomerId: string | null = newCustomer.fudo_customer_id || null;

    try {
      const fudoClient = new FudoApiClient();
      if (!fudoCustomerId) {
        const fudoCust = await fudoClient.createCustomer({
          name: newCustomer.name,
          documentNumber: newCustomer.document_number,
          phone: newCustomer.phone,
          email: newCustomer.email,
        });

        if (fudoCust && fudoCust.id) {
          linkFudoCustomerId(newCustomer.id, fudoCust.id);
          fudoCustomerId = fudoCust.id;
          newCustomer.fudo_customer_id = fudoCust.id;
          fudoSynced = true;
        }
      }
    } catch (fudoErr) {
      console.warn("Aviso: No se pudo dar de alta al cliente en Fudo POS (el registro local se completó):", fudoErr);
    }

    return NextResponse.json(
      {
        success: true,
        customer: newCustomer,
        fudo_synced: fudoSynced,
        fudo_customer_id: fudoCustomerId,
        message: fudoSynced
          ? `Comensal registrado y sincronizado en Fudo POS (ID: ${fudoCustomerId}).`
          : "Comensal registrado con éxito en GastroBumeran.",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al registrar cliente";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
