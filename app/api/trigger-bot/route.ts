import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // 🚨 본인의 Railway 주소로 변경 (https:// 포함, 끝에 / 제외)
    const RAILWAY_BOT_URL = 'https://sabangnet-bot-production.up.railway.app';

    const response = await fetch(RAILWAY_BOT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Railway 봇 응답 에러:", errorText);
      throw new Error(`Railway 서버 에러: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({ status: 'success', data });

  } catch (error: any) {
    console.error('봇 호출 실패:', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}