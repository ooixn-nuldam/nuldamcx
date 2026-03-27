import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 화면에서 넘겨받을 데이터들 (주소 추가됨)
    const { channel, orderNumber, customerName, tel, address, product, content } = body;

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = '1-xT0UthGXZPCNN6ZtxZz-fYuUnnUblTEnmTz1dFC5jM';

    // 💡 핵심: 한국 시간(KST) 기준으로 오늘 날짜 탭 이름 만들기 (예: 0327)
    const now = new Date();
    const kst = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const mm = String(kst.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(kst.getUTCDate()).padStart(2, '0');
    const tabName = `${mm}${dd}`;

    // 올려주신 시트 구조에 맞게 데이터 배열 생성
    const rowData = [
      "",            // A열: No (수기 작성이나 수식을 위해 빈칸)
      channel,       // B열: 주문사이트
      orderNumber,   // C열: 주문번호
      customerName,  // D열: 성함
      tel,           // E열: 연락처
      address,       // F열: 주소
      "1",           // G열: 건수 (기본값 1)
      product,       // H열: 상품명
      "",            // I열: 문의내용 (드롭다운 선택을 위해 빈칸으로 둠)
      content,       // J열: 특이사항 (고객 문의 원본 내용 입력)
      "",            // K열: 비고
      ""             // L열: 담당자
    ];

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${tabName}!A:L`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowData],
      },
    });

    return NextResponse.json({ success: true, data: response.data });
  } catch (error: any) {
    console.error('시트 저장 에러:', error);
    if (error.message.includes('Unable to parse range')) {
       return NextResponse.json({ success: false, error: 'TODAY_TAB_MISSING' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}