import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import iconv from 'iconv-lite';
import { XMLParser } from 'fast-xml-parser';

// Supabase 초기화 (환경 변수 사용)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    // 1. Vercel 도메인 세팅
    // Vercel 환경 변수가 있으면 사용하고, 없다면 직접 입력해 주세요. (로컬호스트는 사방넷이 접근할 수 없습니다!)
    const domain = process.env.NEXT_PUBLIC_VERCEL_URL 
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` 
      : 'https://내프로젝트.vercel.app'; // 실제 배포될 도메인으로 변경 필수

    // 앞서 만든 XML 요청 API 주소
    const xmlUrl = `${domain}/api/sabangnet-req`;
    
    // 사방넷 API 엔드포인트 (sbadmin15 기준)
    const sabangnetApiUrl = `https://sbadmin15.sabangnet.co.kr/RTL_API/xml_cs_info.html?xml_url=${xmlUrl}`;

    console.log(`요청 URL: ${sabangnetApiUrl}`);

    // 2. 사방넷에 데이터 요청
    const response = await fetch(sabangnetApiUrl, { method: 'GET' });
    
    if (!response.ok) {
      throw new Error(`사방넷 API 서버 응답 오류: ${response.status}`);
    }

    // 3. EUC-KR 디코딩 (한글 깨짐 방지)
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const decodedXml = iconv.decode(buffer, 'euc-kr');

    // 4. XML 파싱 (fast-xml-parser 사용)
    const parser = new XMLParser({
      ignoreAttributes: true,
      // 데이터가 1건일 때도 무조건 배열로 반환하도록 설정하여 반복문 에러 방지
      isArray: (name) => name === 'DATA'
    });
    
    const jsonObj = parser.parse(decodedXml);
    const dataList = jsonObj?.SABANG_CS_LIST?.DATA;

    if (!dataList || dataList.length === 0) {
      return NextResponse.json({ status: 'success', message: '새로운 문의사항이 없습니다.', count: 0 });
    }

    // 5. Supabase 저장 로직
    let newCount = 0;

    for (const item of dataList) {
      // CDATA 값을 안전하게 문자열로 추출하는 헬퍼 함수
      const getVal = (val: any) => val ? String(val).trim() : '';
      
      const num = getVal(item.NUM);
      if (!num) continue; // 사방넷 고유번호가 없으면 무효 데이터로 간주

      // 1단계에서 만든 sabangnet_num 컬럼을 기준으로 중복 체크
      const { data: existing } = await supabase
        .from('inquiries')
        .select('id')
        .eq('sabangnet_num', num)
        .single();

      if (existing) continue; // 이미 있는 데이터면 건너뜀

      // 신규 데이터 Insert
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
        status: '대기', // 기본 상태 지정
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
      message: `수집 완료! 신규 업데이트 건수: ${newCount}건`, 
      count: newCount 
    });

  } catch (error: any) {
    console.error('API 수집 중 에러 발생:', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}