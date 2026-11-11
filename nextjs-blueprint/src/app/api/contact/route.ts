import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(8, 'Phone number must be at least 8 digits'),
  subject: z.string().min(3, 'Subject is required'),
  message: z.string().min(5, 'Message must be at least 5 characters'),
  type: z.enum(['CONTACT_RFQ', 'DEALER_APPLICATION', 'DEFENSE_TENDER']).default('CONTACT_RFQ'),
  honeypot: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const result = contactSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, phone, subject, message, type, honeypot } = result.data;

    // Anti-spam honeypot
    if (honeypot && honeypot.trim().length > 0) {
      return NextResponse.json({ error: 'Bot submission detected' }, { status: 400 });
    }

    const submission = await prisma.formSubmission.create({
      data: {
        type,
        name,
        email,
        phone,
        subject,
        message,
        status: 'NEW',
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Your inquiry has been logged with the Daudsons Procurement Directorate.',
        refId: submission.id,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
