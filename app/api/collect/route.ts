import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import iconv from 'iconv-lite';
import { XMLParser } from 'fast-xml-parser';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    // 1. 도메인 세팅 (https:// 중복 방지 및 안전 처리)
    let rawDomain = process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL;
    
    // 환경변수가 비어있을 경우를 대비한 하드코딩 (★ 본인의 실제 Vercel 도메인으로 꼭 바꿔주세요!)
    if (!rawDomain) {
      rawDomain = 'nuldamcx.vercel.app'; // 예: my-app.vercel.app (https:// 제외하고 입력)
    }

    // 도메인에 http가 안 붙어있으면 붙여줌
    const domain = rawDomain.startsWith('http') ? rawDomain : `https://${rawDomain}`;

    const xmlUrl = `${domain}/api/sabangnet-req`;
    
    // 2. [핵심 수정] URL 인코딩 (400 에러 방지)
    // https:// 기호 등을 사방넷 서버가 오해하지 않도록 안전하게 문자로 변환합니다.
    const encodedXmlUrl = encodeURIComponent(xmlUrl);
    
    // 사방넷 API 엔드포인트
    const sabangnetApiUrl = `https://sbadmin15.sabangnet.co.kr/RTL_API/xml_cs_info.html?xml_url=${encodedXmlUrl}`;

    console.log(`[디버그] 사방넷 요청 최종 URL: ${sabangnetApiUrl}`);

    // 3. 사방넷에 데이터 요청
    const response = await fetch(sabangnetApiUrl, { method: 'GET' });
    
    if (!response.ok) {
      throw new Error(`사방넷 API 서버 응답 오류: ${response.status}`);
    }

    // 4. EUC-KR 디코딩
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const decodedXml = iconv.decode(buffer, 'euc-kr');

    // 5. XML 파싱
    const parser = new XMLParser({
      ignoreAttributes: true,
      isArray: (name) => name === 'DATA'
    });
    
    const jsonObj = parser.parse(decodedXml);
    const dataList = jsonObj?.SABANG_CS_LIST?.DATA;

    if (!dataList || dataList.length === 0) {
      return NextResponse.json({ status: 'success', message: '새로운 문의사항이 없습니다.', count: 0 });
    }

    // 6. Supabase 저장
    let newCount = 0;

    for (const item of dataList) {
      const getVal = (val: any) => val ? String(val).trim() : '';
      
      const num = getVal(item.NUM);
      if (!num) continue;

      const { data: existing } = await supabase
        .from('inquiries')
        .select('id')
        .eq('sabangnet_num', num)
        .single();

      if (existing) continue;

      const { error } = await supabase.from('inquiries').insert({
        sabangnet_num: num,
        site_name: getVal(item.MALL_ID),
        seller_id: getVal(item.MALL_USER_ID),
        order_number: getVal(item.ORDER_ID),
        inquiry_type: getVal(item.CS_GUBUN),
        product_name: getVal(item.PRODUCT_NM),
        content: getVal(item.CNTS),
        answer: getVal(item.RPLY_CNTS),
        customer_name: getVal(item.INS_NM),
        status: '대기',
        created_at: getVal(item.INS_DM),
        collected_at: getVal(item.REG_DM)
      });

      if (error) {
        console.error('Supabase Insert 에러:', error);
      } else {
        newCount++;
      }
    }

    return NextResponse.json({ 
      status: 'success', 
      message: `수집 완료! 신규 업데이트: ${newCount}건`, 
      count: newCount 
    });

  } catch (error: any) {
    console.error('API 수집 중 에러 발생:', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}