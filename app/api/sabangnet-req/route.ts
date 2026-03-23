import { NextResponse } from 'next/server';
import iconv from 'iconv-lite';

// 날짜를 YYYYMMDD 포맷으로, 한국 시간(KST) 기준으로 구하는 함수
function getKSTDateString(offsetDays = 0) {
  const now = new Date();
  // Vercel은 기본이 UTC이므로 9시간을 더해 한국 시간으로 맞춥니다.
  const kstTime = now.getTime() + (9 * 60 * 60 * 1000);
  const targetDate = new Date(kstTime + (offsetDays * 24 * 60 * 60 * 1000));
  
  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');
  
  return `${yyyy}${mm}${dd}`;
}

export async function GET() {
  const SABANGNET_ID = process.env.SABANGNET_ID || '';
  const SABANGNET_API_KEY = process.env.SABANGNET_API_KEY || '';

  if (!SABANGNET_ID || !SABANGNET_API_KEY) {
    return new NextResponse("Missing Environment Variables", { status: 500 });
  }

  // 오늘 날짜와 7일 전 날짜 계산 (수집 기간)
  const sendDate = getKSTDateString(0); // 오늘
  const csStDate = getKSTDateString(-7); // 7일 전

  // 사방넷이 요구하는 형태의 XML 문자열
  const xmlString = `<?xml version="1.0" encoding="EUC-KR"?>
<SABANG_CS_LIST>
    <HEADER>
        <SEND_COMPAYNY_ID>${SABANGNET_ID}</SEND_COMPAYNY_ID>
        <SEND_AUTH_KEY>${SABANGNET_API_KEY}</SEND_AUTH_KEY>
        <SEND_DATE>${sendDate}</SEND_DATE>
    </HEADER>
    <DATA>
        <CS_ST_DATE>${csStDate}</CS_ST_DATE>
        <CS_ED_DATE>${sendDate}</CS_ED_DATE>
    </DATA>
</SABANG_CS_LIST>`;

  // 1. EUC-KR 인코딩 (Node.js Buffer 반환)
  const encodedBuffer = iconv.encode(xmlString, 'euc-kr');
  
  // 2. [수정됨] TypeScript 에러 방지를 위해 Web API 표준인 Uint8Array로 변환
  const body = new Uint8Array(encodedBuffer);

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/xml; charset=euc-kr',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}