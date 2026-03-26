'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// MUI Core (Grid 제거)
import {
  Box, Container, Typography, IconButton, Button,
  Card, CardContent, TextField, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, Fade, Tabs, Tab
} from '@mui/material';

// MUI Icons
import {
  ArrowBack as ArrowBackIcon,
  PhoneInTalk as PhoneIcon,
  HeadsetMic as HeadsetIcon,
  Save as SaveIcon,
  CalendarMonth as CalendarMonthIcon,
  InsertChartOutlined as ChartIcon
} from '@mui/icons-material';

// ==========================================
// 🌟 1. 기본 설정 및 헬퍼 함수
// ==========================================
const CHANNELS = ['네이버', '쿠팡', '톡스토어', '이베이', '11번가', '롯데온', '지그재그', 'toss', '기타'];

const CHANNEL_MAP: Record<string, string> = {
  '스마트 스토어': '네이버',
  '스마트스토어': '네이버',
  'ESM지마켓': '이베이',
  'ESM옥션': '이베이',
  '카카오톡스토어': '톡스토어',
  '카카오 지그재그': '지그재그',
};

const getStandardChannelName = (rawName: string) => CHANNEL_MAP[rawName] || rawName;

interface DailyStat {
  name: string;
  count: number | string;
  issue: string;
}

interface MonthlyStat {
  name: string;
  count: number;
}

// ==========================================
// 🌟 2. 메인 컴포넌트
// ==========================================
export default function StatusPage() {
  const [activeTab, setActiveTab] = useState(0); // 0: 일간, 1: 월간
  
  // 날짜 및 데이터 상태
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetMonth, setTargetMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  
  const [dailyStats, setDailyStats] = useState<DailyStat[]>(
    CHANNELS.map(name => ({ name, count: 0, issue: '' }))
  );
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStat[]>(
    CHANNELS.map(name => ({ name, count: 0 }))
  );
  
  const [callStats, setCallStats] = useState({ inflow: 0, response: 0 });
  const [loading, setLoading] = useState(false);

  // ==========================================
  // 📡 3. 데이터 페칭 (일간 / 월간)
  // ==========================================
  
  // 3-1. 일간 데이터 가져오기
  const fetchDailyStats = async (dateStr: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inquiries')
      .select('channel')
      .gte('inquiry_date', `${dateStr} 00:00:00`)
      .lte('inquiry_date', `${dateStr} 23:59:59`);

    if (error) {
      console.error('일간 데이터 로드 실패:', error);
    } else if (data) {
      const counts: Record<string, number> = {};
      data.forEach(row => {
        let ch = getStandardChannelName(row.channel);
        
        // 💡 [핵심 수정] CHANNELS 배열에 없는 채널명이면 '기타'로 합산!
        if (!CHANNELS.includes(ch)) {
          ch = '기타';
        }
        
        counts[ch] = (counts[ch] || 0) + 1;
      });

      setDailyStats(CHANNELS.map(name => ({
        name,
        count: counts[name] || 0,
        issue: ''
      })));
    }
    setLoading(false);
  };

  // 3-2. 월간 데이터 가져오기
  const fetchMonthlyStats = async (monthStr: string) => {
    setLoading(true);
    const startDate = `${monthStr}-01 00:00:00`;
    const endDate = `${monthStr}-31 23:59:59`;

    const { data, error } = await supabase
      .from('inquiries')
      .select('channel')
      .gte('inquiry_date', startDate)
      .lte('inquiry_date', endDate);

    if (error) {
      console.error('월간 데이터 로드 실패:', error);
    } else if (data) {
      const counts: Record<string, number> = {};
      data.forEach(row => {
        let ch = getStandardChannelName(row.channel);
        
        // 💡 [핵심 수정] CHANNELS 배열에 없는 채널명이면 '기타'로 합산!
        if (!CHANNELS.includes(ch)) {
          ch = '기타';
        }
        
        counts[ch] = (counts[ch] || 0) + 1;
      });

      setMonthlyStats(CHANNELS.map(name => ({
        name,
        count: counts[name] || 0
      })));
    }
    setLoading(false);
  };

  // 탭이나 날짜가 바뀔 때마다 데이터 갱신
  useEffect(() => {
    if (activeTab === 0) fetchDailyStats(targetDate);
    else fetchMonthlyStats(targetMonth);
  }, [activeTab, targetDate, targetMonth]);


  // ==========================================
  // ⚙️ 4. 액션 핸들러 (수기 작성 기능)
  // ==========================================
  const handleDailyStatChange = (index: number, field: 'count' | 'issue', value: string) => {
    const newStats = [...dailyStats];
    newStats[index] = { ...newStats[index], [field]: field === 'count' ? Number(value) || '' : value };
    setDailyStats(newStats);
  };

  const handleSaveStats = () => {
    // DB 별도 테이블(예: daily_reports)에 저장하는 로직을 추가할 수 있습니다.
    alert('수정된 현황 데이터가 임시 저장되었습니다!');
  };

  const totalDailyCount = dailyStats.reduce((acc, cur) => acc + (Number(cur.count) || 0), 0);
  const totalMonthlyCount = monthlyStats.reduce((acc, cur) => acc + cur.count, 0);
  const maxMonthlyCount = Math.max(...monthlyStats.map(s => s.count), 1); // 차트 비율용

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0f172a', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      
      {/* 🌟 헤더 영역 */}
      <Box component="header" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', bgcolor: 'rgba(15, 23, 42, 0.8)', position: 'sticky', top: 0, zIndex: 50 }}>
        <Container maxWidth="lg" sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Link href="/" passHref style={{ textDecoration: 'none' }}>
                <IconButton edge="start" sx={{ color: '#cbd5e1', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}>
                  <ArrowBackIcon />
                </IconButton>
              </Link>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.5px' }}>
                  📊 문의 수량 추이
                </Typography>
              </Box>
            </Box>
            
            <Tabs 
              value={activeTab} 
              onChange={(e, newValue) => setActiveTab(newValue)} 
              sx={{ 
                minHeight: '40px',
                '& .MuiTabs-indicator': { backgroundColor: '#3b82f6', height: '3px', borderRadius: '3px' },
                '& .MuiTab-root': { color: '#64748b', fontWeight: 600, fontSize: '1rem', minHeight: '40px', py: 0, textTransform: 'none' },
                '& .Mui-selected': { color: '#f8fafc !important' }
              }}
            >
              <Tab icon={<CalendarMonthIcon sx={{ fontSize: 18, mr: 0.5 }}/>} iconPosition="start" label="일간 현황 (수기작성)" />
              <Tab icon={<ChartIcon sx={{ fontSize: 18, mr: 0.5 }}/>} iconPosition="start" label="월간 통계" />
            </Tabs>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 8, flex: 1 }}>
        <Fade in={true} timeout={500}>
          <Box>
            
            {/* ======================================= */}
            {/* 탭 0: 일간 현황 (수기 작성 및 확인) */}
            {/* ======================================= */}
            {activeTab === 0 && (
              <Box>
                {/* 컨트롤 바 */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, p: 2, bgcolor: 'rgba(30, 41, 59, 0.4)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 600 }}>조회 및 작성일자 :</Typography>
                    <TextField
                      type="date"
                      size="small"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      sx={{ 
                        width: 160, bgcolor: 'rgba(15,23,42,0.6)', borderRadius: 1,
                        input: { color: '#3b82f6', fontSize: '1rem', fontWeight: 800 },
                        '& fieldset': { borderColor: 'rgba(59, 130, 246, 0.3)' },
                        '&:hover fieldset': { borderColor: '#3b82f6' },
                        colorScheme: 'dark'
                      }}
                    />
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveStats}
                    sx={{ bgcolor: '#3b82f6', color: '#fff', fontWeight: 700, px: 3, borderRadius: '8px', '&:hover': { bgcolor: '#2563eb' } }}
                  >
                    현황 저장하기
                  </Button>
                </Box>

                {/* KPI 카드 (Grid 대신 Flexbox 적용) */}
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, mb: 4 }}>
                  
                  {/* 총 유입호 */}
                  <Box sx={{ flex: 1 }}>
                    <Card elevation={0} sx={{ bgcolor: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', height: '100%' }}>
                      <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3 }}>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, color: '#94a3b8' }}>
                            📞 총 유입호 (수기 입력)
                          </Typography>
                          <TextField
                            variant="standard" value={callStats.inflow} type="number"
                            onChange={(e) => setCallStats({...callStats, inflow: Number(e.target.value)})}
                            InputProps={{ disableUnderline: true, style: { fontSize: '2rem', fontWeight: 800, color: '#f8fafc' } }}
                            sx={{ width: '100px' }}
                          />
                        </Box>
                        <Box sx={{ bgcolor: 'rgba(59, 130, 246, 0.15)', p: 1.5, borderRadius: '12px', color: '#3b82f6' }}>
                          <PhoneIcon sx={{ fontSize: 32 }} />
                        </Box>
                      </CardContent>
                    </Card>
                  </Box>

                  {/* 총 응대콜 */}
                  <Box sx={{ flex: 1 }}>
                    <Card elevation={0} sx={{ bgcolor: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', height: '100%' }}>
                      <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3 }}>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, color: '#94a3b8' }}>
                            🗣️ 총 응대콜 (수기 입력)
                          </Typography>
                          <TextField
                            variant="standard" value={callStats.response} type="number"
                            onChange={(e) => setCallStats({...callStats, response: Number(e.target.value)})}
                            InputProps={{ disableUnderline: true, style: { fontSize: '2rem', fontWeight: 800, color: '#10b981' } }}
                            sx={{ width: '100px' }}
                          />
                        </Box>
                        <Box sx={{ bgcolor: 'rgba(16, 185, 129, 0.15)', p: 1.5, borderRadius: '12px', color: '#10b981' }}>
                          <HeadsetIcon sx={{ fontSize: 32 }} />
                        </Box>
                      </CardContent>
                    </Card>
                  </Box>

                </Box>

                {/* DB 연동 + 수기작성 테이블 */}
                <TableContainer component={Paper} elevation={0} sx={{ bgcolor: 'transparent', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px' }}>
                  <Table sx={{ minWidth: 650 }}>
                    <TableHead sx={{ bgcolor: 'rgba(15, 23, 42, 0.9)' }}>
                      <TableRow>
                        <TableCell width="25%" sx={{ fontWeight: 600, color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>채널명</TableCell>
                        <TableCell width="25%" align="center" sx={{ fontWeight: 600, color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>DB 수집 건수 / 수기 입력</TableCell>
                        <TableCell width="50%" sx={{ fontWeight: 600, color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>이슈 사항 (특이사항)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody sx={{ bgcolor: 'rgba(30, 41, 59, 0.4)' }}>
                      {dailyStats.map((stat, index) => (
                        <TableRow key={stat.name} sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                          <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <Typography variant="body1" sx={{ fontWeight: 700, color: '#e2e8f0' }}>{stat.name}</Typography>
                          </TableCell>
                          
                          <TableCell align="center" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <TextField
                              variant="outlined" size="small" type="number"
                              value={stat.count} onChange={(e) => handleDailyStatChange(index, 'count', e.target.value)}
                              inputProps={{ style: { textAlign: 'center', fontWeight: 800, color: Number(stat.count) > 0 ? '#3b82f6' : '#cbd5e1' } }}
                              sx={{ 
                                width: '100px', 
                                '& .MuiOutlinedInput-root': { bgcolor: 'rgba(15,23,42,0.6)', borderRadius: '8px', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }, '&:hover fieldset': { borderColor: '#3b82f6' } }
                              }}
                            />
                          </TableCell>

                          <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <TextField
                              fullWidth variant="outlined" size="small" placeholder="이슈 내용 입력..."
                              value={stat.issue} onChange={(e) => handleDailyStatChange(index, 'issue', e.target.value)}
                              sx={{ 
                                '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: 'rgba(15,23,42,0.4)', color: '#cbd5e1', '& fieldset': { borderColor: 'transparent' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.1)' }, '&.Mui-focused fieldset': { borderColor: '#3b82f6' } },
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                      
                      {/* 총계 행 */}
                      <TableRow sx={{ bgcolor: 'rgba(15, 23, 42, 0.8)' }}>
                        <TableCell sx={{ fontWeight: 800, color: '#f8fafc', border: 'none' }}>🔥 총 처리 건수합계</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900, fontSize: '1.2rem', color: '#3b82f6', border: 'none' }}>{totalDailyCount}</TableCell>
                        <TableCell sx={{ border: 'none' }} />
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* ======================================= */}
            {/* 탭 1: 월간 통계 (DB 조회 전용) */}
            {/* ======================================= */}
            {activeTab === 1 && (
              <Box>
                {/* 월 선택 바 */}
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4, p: 3, bgcolor: 'rgba(30, 41, 59, 0.4)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Typography variant="h6" sx={{ color: '#e2e8f0', fontWeight: 700 }}>조회 월 :</Typography>
                    <TextField
                      type="month"
                      value={targetMonth}
                      onChange={(e) => setTargetMonth(e.target.value)}
                      sx={{ 
                        width: 200, bgcolor: 'rgba(15,23,42,0.8)', borderRadius: 2,
                        input: { color: '#10b981', fontSize: '1.2rem', fontWeight: 800, textAlign: 'center', py: 1.5 },
                        '& fieldset': { borderColor: 'rgba(16, 185, 129, 0.3)' },
                        '&:hover fieldset': { borderColor: '#10b981' },
                        colorScheme: 'dark'
                      }}
                    />
                  </Box>
                </Box>

                {/* 월간 합계 및 차트 영역 */}
                <Card elevation={0} sx={{ bgcolor: 'transparent', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px', overflow: 'hidden' }}>
                  <Box sx={{ p: 3, bgcolor: 'rgba(15, 23, 42, 0.9)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#f8fafc' }}>{targetMonth} 채널별 누적 문의 현황</Typography>
                    <Chip label={`이달 총 수집 건: ${totalMonthlyCount}건`} sx={{ bgcolor: 'rgba(16, 185, 129, 0.2)', color: '#10b981', fontWeight: 800, fontSize: '1rem', height: '32px' }} />
                  </Box>
                  <CardContent sx={{ bgcolor: 'rgba(30, 41, 59, 0.3)', p: 4 }}>
                    <Stack spacing={3}>
                      {monthlyStats.map((stat) => (
                        <Box key={stat.name} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography sx={{ width: '100px', fontWeight: 600, color: '#cbd5e1', textAlign: 'right' }}>
                            {stat.name}
                          </Typography>
                          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ flex: 1, bgcolor: 'rgba(15, 23, 42, 0.5)', borderRadius: '10px', height: '24px', position: 'relative', overflow: 'hidden' }}>
                              <Box 
                                sx={{ 
                                  position: 'absolute', top: 0, left: 0, height: '100%',
                                  bgcolor: stat.count > 0 ? '#3b82f6' : 'transparent',
                                  width: `${(stat.count / maxMonthlyCount) * 100}%`,
                                  transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                                  backgroundImage: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)',
                                  borderRadius: '10px'
                                }} 
                              />
                            </Box>
                            <Typography sx={{ width: '50px', fontWeight: 800, color: stat.count > 0 ? '#60a5fa' : '#64748b' }}>
                              {stat.count}건
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Box>
            )}

          </Box>
        </Fade>
      </Container>
    </Box>
  );
}