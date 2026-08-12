import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST - Exotel status callback webhook
export async function POST(request) {
  try {
    const body = await request.json();

    const { CallSid, Status, RecordingUrl, Duration, CustomField } = body;

    console.log(`📞 Call webhook: ${CallSid} → ${Status} (${Duration}s)`);

    // Update call record if we have one
    if (CustomField) {
      // CustomField contains orderId
      try {
        await prisma.auditLog.create({
          data: {
            action: 'MASKED_CALL_STATUS',
            entity: 'Order',
            entityId: CustomField,
            newValue: {
              callSid: CallSid,
              status: Status,
              recordingUrl: RecordingUrl,
              duration: Duration,
            },
          },
        });
      } catch {}
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Call webhook error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}