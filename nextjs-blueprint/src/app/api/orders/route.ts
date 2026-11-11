import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const orderItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().int().positive(),
  qty: z.number().int().positive(),
});

const orderSchema = z.object({
  customerName: z.string().min(2, 'Name is required'),
  customerEmail: z.string().email().optional().or(z.literal('')),
  customerPhone: z.string().min(8, 'Phone is required'),
  city: z.string().min(2, 'City is required'),
  address: z.string().min(5, 'Delivery address is required'),
  items: z.array(orderItemSchema).min(1, 'Order must contain at least 1 item'),
  honeypot: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const result = orderSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { customerName, customerEmail, customerPhone, city, address, items, honeypot } = result.data;

    if (honeypot && honeypot.trim().length > 0) {
      return NextResponse.json({ error: 'Bot submission detected' }, { status: 400 });
    }

    // STRICT STATUTORY GUARDRAIL: Prohibit checkout of firearms/defense weapons online
    for (const item of items) {
      const shopItem = await prisma.shopItem.findUnique({
        where: { id: item.id },
      });

      if (!shopItem) {
        return NextResponse.json(
          {
            error: `Item '${item.name || item.id}' is not an authorized non-restricted merchandise item. Firearm sales require in-person license verification.`,
          },
          { status: 400 }
        );
      }

      if (item.qty > shopItem.stockQty) {
        return NextResponse.json(
          {
            error: `Requested quantity for '${shopItem.name}' exceeds available warehouse inventory (${shopItem.stockQty}).`,
          },
          { status: 400 }
        );
      }
    }

    const subtotal = items.reduce((acc, it) => acc + it.price * it.qty, 0);
    const shippingFee = 450;
    const total = subtotal + shippingFee;

    const orderId = `DSA-ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;

    const order = await prisma.$transaction(async (tx) => {
      // 1. Create order
      const newOrder = await tx.order.create({
        data: {
          id: orderId,
          customerName,
          customerEmail: customerEmail || null,
          customerPhone,
          city,
          address,
          subtotalPKR: subtotal,
          shippingFeePKR: shippingFee,
          totalPKR: total,
          status: 'NEW',
          items: {
            create: items.map((it) => ({
              shopItemId: it.id,
              itemName: it.name,
              unitPricePKR: it.price,
              quantity: it.qty,
              subtotalPKR: it.price * it.qty,
            })),
          },
        },
      });

      // 2. Decrement stock
      for (const it of items) {
        await tx.shopItem.update({
          where: { id: it.id },
          data: { stockQty: { decrement: it.qty } },
        });
      }

      return newOrder;
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Order created successfully and queued for warehouse dispatch.',
        orderId: order.id,
        totalPKR: total,
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
