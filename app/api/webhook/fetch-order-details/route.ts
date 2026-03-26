// app/api/webhook/fetch-order-details/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const record = body.record; // Supabase Webhook은 'record' 필드에 데이터를 담아 보냅니다.
    const orderId = record?.order_number;

    if (!orderId || orderId === '-') {
      return NextResponse.json({ message: 'No Order ID' }, { status: 200 });
    }

    // 1. 사방넷 풀필먼트 API 호출
    const sabangRes = await fetch('https://api.sbfulfillment.co.kr/v2/orders/detail', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'X-API-KEY': process.env.SABANGNET_FULFILLMENT_KEY! 
      },
      body: JSON.stringify({ order_no: orderId })
    });

    const orderData = await sabangRes.json();
    // 실제 사방넷 응답 구조에 맞게 데이터 추출 (예: orderData.data.receive_name)
    const info = orderData.data || orderData; 

    // 2. DB 업데이트 (수집된 문의 건에 고객 정보 채우기)
    const { error } = await supabase
      .from('inquiries')
      .update({
        receiver_name: info.receive_name,
        receiver_tel: info.receive_hp || info.receive_tel,
        shipping_address: info.receive_addr,
        delivery_msg: info.dlv_msg
      })
      .eq('id', record.id);

    if (error) throw error;

    return NextResponse.json({ status: 'success' });
  } catch (err: any) {
    console.error('Webhook Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}