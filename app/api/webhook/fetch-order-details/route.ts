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
    const record = body.record;
    const orderId = record?.order_number;

    if (!orderId || orderId === '-') return NextResponse.json({ message: 'No Order ID' });

    console.log(`[사방넷 호출] 주문번호: ${orderId}`);

    // 💡 가이드 핵심: method 필드가 반드시 포함되어야 합니다.
    const sabangRes = await fetch('https://api.sbfulfillment.co.kr/v2/deliveries', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'X-API-KEY': process.env.SABANGNET_FULFILLMENT_KEY || '' 
      },
      body: JSON.stringify({ 
        method: "getDelivery", // 👈 이 부분이 누락되어 Unknown method 에러가 났던 것입니다.
        mall_order_id: orderId // 사방넷 검색 조건에 맞게 필드명 확인 (또는 order_no)
      })
    });

    const orderData = await sabangRes.json();
    console.log("사방넷 실제 응답:", JSON.stringify(orderData));

    // 응답 결과가 성공(true)이고 데이터가 있을 때만 업데이트
    if (orderData.status === "true" && orderData.data) {
      const info = orderData.data;

      const { error } = await supabase
        .from('inquiries')
        .update({
          receiver_name: info.receive_name,
          receiver_tel: info.receive_hp || info.receive_tel,
          shipping_address: `(${info.receive_zip}) ${info.receive_addr} ${info.receive_addr_detail || ''}`,
          delivery_msg: info.dlv_msg
        })
        .eq('id', record.id);

      if (error) throw error;
      console.log("✅ DB 업데이트 완료");
    } else {
      console.log("⚠️ 사방넷 데이터 없음:", orderData.error || "데이터 매칭 실패");
    }

    return NextResponse.json({ status: 'success' });
  } catch (err: any) {
    console.error('CRITICAL ERROR:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}