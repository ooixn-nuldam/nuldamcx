// lib/siteMapper.ts
import { DISPLAY_CHANNELS } from './constants';

export function normalizeSiteName(rawName: string): string {
  if (!rawName) return '기타';

  
  const cleanName = String(rawName)
    .normalize('NFC') 
    .replace(/[\s\uFEFF\xA0]+/g, '')
    .toLowerCase();
  

  if (cleanName.includes('스마트스토어') || cleanName.includes('네이버') || cleanName.includes('smartstore')) {
    return '네이버';
  }

  if (cleanName.includes('토스') || cleanName.includes('toss')) {
    return 'toss';
  }

  if (cleanName.includes('쿠팡') || cleanName.includes('coupang')) {
    return '쿠팡';
  }

  if (
    cleanName.includes('esm') || 
    cleanName.includes('이베이') || 
    cleanName.includes('ebay') || 
    cleanName.includes('auction') || 
    cleanName.includes('gmarket') ||
    cleanName.includes('옥션') ||
    cleanName.includes('지마켓')
  ) {
    return '이베이';
  }

  
  if (cleanName.includes('톡스토어') || cleanName.includes('카카오톡스토어') || cleanName.includes('store-kakaotalk')) {
    return '톡스토어';
  }

  if (cleanName.includes('카카오스타일') || cleanName.includes('지그재그') || cleanName.includes('zigzag') || cleanName.includes('포스티')) {
    return '카카오 지그재그';
  }

  // --- [기타 수집 목록 매핑] ---

  if (cleanName.includes('11번가') || cleanName.includes('11st')) return '11번가';
  if (cleanName.includes('롯데온') || cleanName.includes('lotteon')) return '롯데온';
  if (cleanName.includes('올웨이즈') || cleanName.includes('alwayz')) return '올웨이즈';
  if (cleanName.includes('알리') || cleanName.includes('aliexpress')) return '알리';
  if (cleanName.includes('올리브영') || cleanName.includes('oliveyoung')) return '올리브영';
  if (cleanName.includes('에이블리') || cleanName.includes('ably')) return '에이블리';
  if (cleanName.includes('요고') || cleanName.includes('yogo')) return '요고';
  if (cleanName.includes('캐시딜')) return '캐시딜';
  if (cleanName.includes('팔도감')) return '팔도감';
  if (cleanName.includes('코케비즈')) return '코케비즈';
  if (cleanName.includes('아톡')) return '아톡비즈_문자상담';
  if (cleanName.includes('ncp')) return 'NCP';

  
  if (cleanName.includes('카카오') && cleanName.includes('b2b')) return '카카오채널 B2B';
  if (cleanName.includes('카카오') && cleanName.includes('b2c')) return '카카오채널 B2C';
  if (cleanName === '카카오채널') return '카카오채널 B2C'; 

  if (cleanName.includes('채널톡')) return '채널톡 B2C & B2B';


  const exactMatch = DISPLAY_CHANNELS.find(
    ch => ch.replace(/[\s\uFEFF\xA0]+/g, '').toLowerCase() === cleanName
  );
  if (exactMatch) return exactMatch;
  
  return '기타';
}