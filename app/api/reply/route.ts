import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import iconv from 'iconv-lite';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    // 1. 프론트엔드에서 보낸 ID 목록을 받습니다.
    const body = await req.json();
    const { ids } = body;

    if (!ids || ids.length === 0) {
        return NextResponse.json({ status: 'error', message: '전달된 ID가 없습니다.' }, { status: 400 });
    }

    // 2. 🌟 상태가 '전송대기'가 아닌 '답변저장'인 항목들을 찾습니다.
    const { data: pendingItems } = await supabase
      .from('inquiries')
      .select('id')
      .in('id', ids)
      .eq('status', '답변저장');
    
    if (!pendingItems || pendingItems.length === 0) {
      return NextResponse.json({ status: 'success', message: '전송할 답변이 없습니다.', count: 0 });
    }

    // 3. 도메인 세팅
    const requestUrl = new URL(req.url);
    let domain = `${requestUrl.protocol}//${requestUrl.host}`;
    if (domain.includes('localhost')) domain = 'https://nuldamcx.vercel.app'; // 본인 도메인으로 필수 확인!

    // 4. XML 주소 연결 및 사방넷 찌르기
    const xmlUrl = `${domain}/api/sabangnet-reply-xml?ext=.xml`;
    const encodedXmlUrl = encodeURIComponent(xmlUrl);
    
    const sabangnetApiUrl = `https://sbadmin15.sabangnet.co.kr/RTL_API/xml_cs_ans.html?xml_url=${encodedXmlUrl}`;
    console.log(`[답변 전송] 사방넷 요청 URL: ${sabangnetApiUrl}`);

    const response = await fetch(sabangnetApiUrl, { method: 'GET' });
    if (!response.ok) throw new Error(`사방넷 API 서버 응답 오류: ${response.status}`);

    const arrayBuffer = await response.arrayBuffer();
    const resultText = iconv.decode(Buffer.from(arrayBuffer), 'euc-kr');
    
    console.log("[답변 전송] 사방넷 응답 결과:", resultText);

    // 🚨 5. 삭제된 부분: 여기서 상태를 '처리완료'로 바꾸면 안 됩니다!
    // 프론트엔드 기획대로 '답변저장' 상태를 유지해야, 나중에 2번(봇) 버튼이 이걸 잡아서 일할 수 있습니다.

    return NextResponse.json({ 
      status: 'success', 
      count: pendingItems.length 
    });

  } catch (error: any) {
    console.error('[답변 전송] 에러:', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}