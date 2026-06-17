'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ────────────────────────────────────────────────────────────────
// 한국 청년 지원 정책 DB (실제 공공데이터 기반 54개)
// eligibility.income_percentile: 중위소득 % 이하 (999 = 제한없음)
// eligibility.employment_status: [] = 제한없음
// eligibility.regions: [] = 전국
// ────────────────────────────────────────────────────────────────
const policies = [

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  금융·자산 (5개)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'p001',
    name: '청년내일저축계좌',
    category: '금융·자산',
    summary: '저소득 근로 청년의 자산 형성 지원. 월 10만원 저축 시 정부가 월 30만원 매칭 지원 (3년 만기 최대 1,440만원)',
    support_amount: '최대 1,440만원(3년)',
    eligibility: {
      age_min: 19, age_max: 34,
      regions: [],
      income_percentile: 50,
      employment_status: ['취업중']
    },
    deadline: '2025-12-31',
    apply_period: '매년 7~8월 신청',
    url: 'https://www.bokjiro.go.kr/ssis-tbu/twatga/introductionLivingSupport/WelfareSvcDetailView.do?svcId=WLF00004256',
    contact: '보건복지상담센터 129',
    tags: ['자산형성', '저축', '복지부', '매칭지원'],
    calc_type: 'savings',
    calc_params: { monthly_self: 100000, monthly_govt: 300000, period_months: 36 }
  },
  {
    id: 'p002',
    name: '청년도약계좌',
    category: '금융·자산',
    summary: '청년의 중장기 자산 형성 지원. 월 최대 70만원 납입 시 정부 기여금 + 비과세 혜택 제공 (5년 만기 최대 5,000만원)',
    support_amount: '최대 5,000만원(5년)',
    eligibility: {
      age_min: 19, age_max: 34,
      regions: [],
      income_percentile: 60,
      employment_status: ['취업중']
    },
    deadline: '상시(매월 가입)',
    apply_period: '매월 2주간 가입 신청',
    url: 'https://www.kinfa.or.kr/product/youngHopeAccount.do',
    contact: '서민금융진흥원 1397',
    tags: ['자산형성', '비과세', '금융위', '적금'],
    calc_type: 'savings',
    calc_params: { monthly_self: 700000, monthly_govt: 24000, period_months: 60 }
  },
  {
    id: 'p003',
    name: '청년주택드림청약통장',
    category: '금융·자산',
    summary: '주택 청약과 자산 형성을 동시에 지원. 연 최대 4.5% 우대금리 + 이자소득 비과세 + 원금 40% 소득공제',
    support_amount: '우대금리·비과세·소득공제',
    eligibility: {
      age_min: 19, age_max: 34,
      regions: [],
      income_percentile: 60,
      employment_status: []
    },
    deadline: '상시',
    apply_period: '시중은행 방문 또는 앱 가입',
    url: 'https://nhuf.molit.go.kr/FP/FP05/FP0503/FP05030402.jsp',
    contact: '주택도시기금 1566-9009',
    tags: ['청약', '주택', '국토부', '비과세'],
    calc_type: 'savings',
    calc_params: { monthly_self: 200000, interest_rate: 4.5, period_months: 24 }
  },
  {
    id: 'p004',
    name: '청년우대형 청약통장',
    category: '금융·자산',
    summary: '일반 주택청약종합저축에 우대 금리(최대 3.3%)와 이자 비과세를 추가 제공하는 청년 전용 상품',
    support_amount: '우대금리 최대 3.3% + 비과세',
    eligibility: {
      age_min: 19, age_max: 34,
      regions: [],
      income_percentile: 36,
      employment_status: ['취업중', '미취업']
    },
    deadline: '상시',
    apply_period: '시중 우리·KB·농협 등 협약 은행',
    url: 'https://nhuf.molit.go.kr',
    contact: '주택도시기금 1566-9009',
    tags: ['청약', '우대금리', '국토부', '비과세'],
    calc_type: 'savings',
    calc_params: { monthly_self: 200000, interest_rate: 3.3, period_months: 24 }
  },
  {
    id: 'p005',
    name: '청년희망적금',
    category: '금융·자산',
    summary: '만기 시 저축장려금(1년차 2%, 2년차 4%) + 비과세 혜택을 제공하는 청년 전용 적금 (2022년 출시, 유사 상품 지속 운영)',
    support_amount: '저축장려금 최대 36만원 + 비과세',
    eligibility: {
      age_min: 19, age_max: 34,
      regions: [],
      income_percentile: 60,
      employment_status: ['취업중']
    },
    deadline: '2024-02-29',
    apply_period: '종료(유사 청년도약계좌 이용 권장)',
    url: 'https://www.kinfa.or.kr',
    contact: '서민금융진흥원 1397',
    tags: ['저축', '비과세', '금융위', '장려금'],
    calc_type: 'savings',
    calc_params: { monthly_self: 500000, monthly_govt: 25000, period_months: 24 }
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  취업·일자리 (12개)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'p006',
    name: '국민취업지원제도 1유형',
    category: '취업·일자리',
    summary: '취업 취약계층에게 구직촉진수당(월 50만원 × 6개월) + 취업지원 서비스 제공',
    support_amount: '구직촉진수당 월 50만원 × 6개월(총 300만원)',
    eligibility: {
      age_min: 15, age_max: 69,
      regions: [],
      income_percentile: 60,
      employment_status: ['미취업']
    },
    deadline: '상시',
    apply_period: '고용센터 방문 또는 워크넷 온라인 신청',
    url: 'https://www.kua.go.kr',
    contact: '고용노동부 고용센터 1350',
    tags: ['구직수당', '고용부', '취업취약계층', '수당'],
    calc_type: null
  },
  {
    id: 'p007',
    name: '국민취업지원제도 2유형',
    category: '취업·일자리',
    summary: '특정 취업 취약계층(청년·경력단절·중장년 등)에게 취업지원 서비스 + 취업활동비용(최대 195.4만원) 지원',
    support_amount: '취업활동비용 최대 195.4만원',
    eligibility: {
      age_min: 18, age_max: 34,
      regions: [],
      income_percentile: 100,
      employment_status: ['미취업']
    },
    deadline: '상시',
    apply_period: '고용센터 방문 또는 워크넷 온라인 신청',
    url: 'https://www.kua.go.kr',
    contact: '고용노동부 고용센터 1350',
    tags: ['취업지원', '고용부', '청년', '활동비'],
    calc_type: null
  },
  {
    id: 'p008',
    name: '청년일자리도약장려금',
    category: '취업·일자리',
    summary: '취업 애로 청년을 정규직으로 채용한 중소기업에 1년간 월 60만원 지원. 청년은 정규직 일자리 확보',
    support_amount: '기업에 월 60만원(청년 측 정규직 고용 보장)',
    eligibility: {
      age_min: 15, age_max: 34,
      regions: [],
      income_percentile: 999,
      employment_status: ['미취업']
    },
    deadline: '상시(예산 소진 시 마감)',
    apply_period: '고용24(고용보험 시스템) 기업 신청',
    url: 'https://www.work24.go.kr',
    contact: '고용노동부 고용센터 1350',
    tags: ['정규직', '고용부', '중소기업', '장려금'],
    calc_type: null
  },
  {
    id: 'p009',
    name: '청년내일채움공제(2년형)',
    category: '취업·일자리',
    summary: '중소기업 취업 청년이 2년간 월 12.5만원 저축 시 기업+정부가 400만원 매칭 → 만기 1,200만원 수령',
    support_amount: '만기 수령금 1,200만원(2년)',
    eligibility: {
      age_min: 15, age_max: 34,
      regions: [],
      income_percentile: 999,
      employment_status: ['취업중']
    },
    deadline: '취업 후 6개월 이내 신청',
    apply_period: '고용24 온라인 신청',
    url: 'https://www.work24.go.kr',
    contact: '고용노동부 고용센터 1350',
    tags: ['자산형성', '중소기업', '공제', '고용부'],
    calc_type: 'compound',
    calc_params: { monthly_self: 125000, monthly_govt: 83333, period_months: 24, total_govt: 1000000 }
  },
  {
    id: 'p010',
    name: '청년내일채움공제(3년형)',
    category: '취업·일자리',
    summary: '중소기업 취업 청년이 3년간 월 16.5만원 저축 시 기업+정부 매칭 → 만기 3,000만원 수령',
    support_amount: '만기 수령금 3,000만원(3년)',
    eligibility: {
      age_min: 15, age_max: 34,
      regions: [],
      income_percentile: 999,
      employment_status: ['취업중']
    },
    deadline: '취업 후 6개월 이내 신청',
    apply_period: '고용24 온라인 신청',
    url: 'https://www.work24.go.kr',
    contact: '고용노동부 고용센터 1350',
    tags: ['자산형성', '중소기업', '공제', '고용부'],
    calc_type: 'compound',
    calc_params: { monthly_self: 165000, monthly_govt: 116667, period_months: 36, total_govt: 1800000 }
  },
  {
    id: 'p011',
    name: 'K-디지털트레이닝',
    category: '취업·일자리',
    summary: 'AI·빅데이터·클라우드 등 신기술 분야 훈련. 최대 800시간 훈련비 전액 지원 + 훈련수당 월 최대 316,000원',
    support_amount: '훈련비 전액 + 훈련수당 월 최대 31.6만원',
    eligibility: {
      age_min: 15, age_max: 49,
      regions: [],
      income_percentile: 999,
      employment_status: ['미취업', '취업중', '재학중']
    },
    deadline: '상시(과정별 상이)',
    apply_period: 'HRD-Net(직업훈련포털) 신청',
    url: 'https://www.hrd.go.kr',
    contact: '고용노동부 고객상담센터 1350',
    tags: ['디지털', 'AI', '훈련', '고용부', 'IT'],
    calc_type: null
  },
  {
    id: 'p012',
    name: '국민내일배움카드',
    category: '취업·일자리',
    summary: '직업훈련 수강료 지원 카드. 5년간 300~500만원 한도 내 훈련비의 45~100% 지원',
    support_amount: '5년간 300~500만원 한도(훈련비 45~100%)',
    eligibility: {
      age_min: 15, age_max: 75,
      regions: [],
      income_percentile: 999,
      employment_status: ['미취업', '취업중', '재학중']
    },
    deadline: '상시',
    apply_period: 'HRD-Net 또는 고용센터 신청',
    url: 'https://www.hrd.go.kr',
    contact: '고용노동부 고객상담센터 1350',
    tags: ['직업훈련', '자기개발', '고용부', '바우처'],
    calc_type: null
  },
  {
    id: 'p013',
    name: '청년구직활동지원금',
    category: '취업·일자리',
    summary: '미취업 청년의 구직활동 촉진을 위해 월 50만원 × 최대 6개월 지원 (국민취업지원제도로 통합 운영)',
    support_amount: '월 50만원 × 최대 6개월(300만원)',
    eligibility: {
      age_min: 18, age_max: 34,
      regions: [],
      income_percentile: 120,
      employment_status: ['미취업']
    },
    deadline: '상시',
    apply_period: '워크넷 또는 고용센터 신청',
    url: 'https://www.work.go.kr',
    contact: '고용노동부 고용센터 1350',
    tags: ['구직', '수당', '고용부', '청년'],
    calc_type: null
  },
  {
    id: 'p014',
    name: '청년 디지털 일자리',
    category: '취업·일자리',
    summary: 'IT 직무 관련 중소·중견기업 취업 청년에게 정부가 기업을 통해 인건비 일부 지원 (월 최대 180만원 × 최대 6개월)',
    support_amount: '기업 인건비 지원을 통한 채용 (월 최대 180만원)',
    eligibility: {
      age_min: 15, age_max: 34,
      regions: [],
      income_percentile: 999,
      employment_status: ['미취업']
    },
    deadline: '상시(예산 소진 시 마감)',
    apply_period: '고용24 기업 신청',
    url: 'https://www.work24.go.kr',
    contact: '고용노동부 고용센터 1350',
    tags: ['IT', '디지털', '일자리', '고용부'],
    calc_type: null
  },
  {
    id: 'p015',
    name: '청년 일경험 지원사업',
    category: '취업·일자리',
    summary: '직업 경험이 부족한 청년에게 인턴십·프로젝트·훈련형 등 다양한 일경험 기회 제공. 참여수당 및 수료 후 취업 연계',
    support_amount: '참여수당 월 최대 80만원 + 취업 연계',
    eligibility: {
      age_min: 15, age_max: 34,
      regions: [],
      income_percentile: 999,
      employment_status: ['미취업']
    },
    deadline: '상시(분기별 모집)',
    apply_period: '워크넷 청년 일경험 페이지',
    url: 'https://www.work.go.kr/youth/youthExp/main.do',
    contact: '고용노동부 고용센터 1350',
    tags: ['인턴', '일경험', '고용부', '청년'],
    calc_type: null
  },
  {
    id: 'p016',
    name: '청년취업아카데미',
    category: '취업·일자리',
    summary: '대학(원)생 및 졸업 예정자 대상. 기업 맞춤형 교육 훈련 과정 운영 + 수료 후 해당 기업 우선 채용 연계',
    support_amount: '교육비 전액 무료 + 채용 연계',
    eligibility: {
      age_min: 18, age_max: 34,
      regions: [],
      income_percentile: 999,
      employment_status: ['재학중', '미취업']
    },
    deadline: '상시(과정별 상이)',
    apply_period: 'HRD-Net 신청',
    url: 'https://www.hrd.go.kr',
    contact: '한국산업인력공단 1644-8000',
    tags: ['교육', '취업연계', '고용부', '아카데미'],
    calc_type: null
  },
  {
    id: 'p017',
    name: '고용촉진장려금',
    category: '취업·일자리',
    summary: '취업 취약계층 청년을 고용한 사업주에게 인건비 지원. 청년은 안정적 고용 기회 확보',
    support_amount: '기업에 월 최대 60만원(청년 고용 보장)',
    eligibility: {
      age_min: 15, age_max: 34,
      regions: [],
      income_percentile: 999,
      employment_status: ['미취업']
    },
    deadline: '상시',
    apply_period: '고용24(기업 신청)',
    url: 'https://www.work24.go.kr',
    contact: '고용노동부 고용센터 1350',
    tags: ['고용촉진', '장려금', '고용부', '중소기업'],
    calc_type: null
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  주거 (5개)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'p018',
    name: '행복주택(청년형)',
    category: '주거',
    summary: '대학생·청년·신혼부부를 위한 공공임대주택. 주변 시세의 60~80% 수준 임대료로 최대 6년 거주 가능',
    support_amount: '시세 60~80% 임대료',
    eligibility: {
      age_min: 19, age_max: 39,
      regions: [],
      income_percentile: 100,
      employment_status: []
    },
    deadline: '상시(단지별 공고)',
    apply_period: '마이홈포털 또는 LH·SH 청약센터',
    url: 'https://www.myhome.go.kr',
    contact: 'LH콜센터 1600-1004',
    tags: ['임대주택', '국토부', 'LH', '청년'],
    calc_type: null
  },
  {
    id: 'p019',
    name: '청년 전세임대주택',
    category: '주거',
    summary: 'LH가 기존 민간 전세주택을 확보해 청년에게 저렴하게 재임대. 전세보증금 최대 수도권 1.2억원 지원',
    support_amount: '전세보증금 지원(수도권 최대 1.2억원) + 저렴한 임대료',
    eligibility: {
      age_min: 19, age_max: 39,
      regions: [],
      income_percentile: 100,
      employment_status: []
    },
    deadline: '상시(물량별 공고)',
    apply_period: 'LH청약센터 온라인',
    url: 'https://apply.lh.or.kr',
    contact: 'LH콜센터 1600-1004',
    tags: ['전세', '임대', '국토부', 'LH'],
    calc_type: null
  },
  {
    id: 'p020',
    name: '청년 매입임대주택',
    category: '주거',
    summary: 'LH가 기존 다가구 등을 매입해 청년에게 시세의 30~50% 수준으로 임대. 최장 6년 거주',
    support_amount: '시세의 30~50% 임대료',
    eligibility: {
      age_min: 19, age_max: 39,
      regions: [],
      income_percentile: 100,
      employment_status: []
    },
    deadline: '상시(단지별 공고)',
    apply_period: 'LH청약센터 온라인',
    url: 'https://apply.lh.or.kr',
    contact: 'LH콜센터 1600-1004',
    tags: ['매입임대', '국토부', 'LH', '청년'],
    calc_type: null
  },
  {
    id: 'p021',
    name: '청년월세 특별지원',
    category: '주거',
    summary: '독립 거주 청년에게 월 최대 20만원 × 12개월(총 240만원) 월세 지원. 부모와 별도 거주 필수',
    support_amount: '월 최대 20만원 × 12개월(총 240만원)',
    eligibility: {
      age_min: 19, age_max: 34,
      regions: [],
      income_percentile: 60,
      employment_status: []
    },
    deadline: '2025-12-31',
    apply_period: '복지로 또는 주민센터 신청',
    url: 'https://www.bokjiro.go.kr',
    contact: '국토교통부 마이홈 1600-0777',
    tags: ['월세', '주거비', '국토부', '현금지원'],
    calc_type: null
  },
  {
    id: 'p022',
    name: '청년 주거급여 분리지급',
    category: '주거',
    summary: '주거급여 수급 가구의 청년이 부모와 별도 거주 시 주거급여를 별도로 지급. 실제 월세 부담 경감',
    support_amount: '실제 임차료 기준 주거급여 지급(지역별 상이)',
    eligibility: {
      age_min: 19, age_max: 30,
      regions: [],
      income_percentile: 46,
      employment_status: []
    },
    deadline: '상시',
    apply_period: '주민센터 방문 신청',
    url: 'https://www.myhome.go.kr/hws/portal/cont/selectContRView.do?contId=CONT_000000000000379',
    contact: '국토교통부 주거급여 콜센터 1600-0777',
    tags: ['주거급여', '수급자', '국토부', '분리지급'],
    calc_type: null
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  창업 (5개)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'p023',
    name: '청년창업사관학교',
    category: '창업',
    summary: '초기 창업 청년에게 창업 교육(1년) + 최대 1억원 사업화 자금 + 입주 공간 지원',
    support_amount: '사업화 자금 최대 1억원 + 공간 지원',
    eligibility: {
      age_min: 19, age_max: 39,
      regions: [],
      income_percentile: 999,
      employment_status: ['미취업', '취업중']
    },
    deadline: '매년 1~2월 모집',
    apply_period: '중소벤처기업진흥공단 K-startup 신청',
    url: 'https://www.k-startup.go.kr',
    contact: '중소벤처기업부 창업진흥원 1357',
    tags: ['창업', '사업화', '중기부', '공간'],
    calc_type: null
  },
  {
    id: 'p024',
    name: '초기창업패키지',
    category: '창업',
    summary: '창업 3년 이내 기업에 최대 1억원 사업화 자금 + 창업 교육·멘토링·네트워킹 지원',
    support_amount: '사업화 자금 최대 1억원',
    eligibility: {
      age_min: 19, age_max: 49,
      regions: [],
      income_percentile: 999,
      employment_status: ['취업중', '미취업']
    },
    deadline: '매년 2~3월 모집',
    apply_period: 'K-startup 온라인 신청',
    url: 'https://www.k-startup.go.kr',
    contact: '창업진흥원 1357',
    tags: ['창업', '사업화', '중기부', '패키지'],
    calc_type: null
  },
  {
    id: 'p025',
    name: '청년창업지원(중진공)',
    category: '창업',
    summary: '중소벤처기업진흥공단의 청년 전용 창업 융자. 최대 1억원 저금리 대출 (창업 후 7년 이내)',
    support_amount: '최대 1억원 저금리 융자',
    eligibility: {
      age_min: 19, age_max: 39,
      regions: [],
      income_percentile: 999,
      employment_status: ['취업중']
    },
    deadline: '상시(예산 소진 시 마감)',
    apply_period: '중진공 지역본부 방문 또는 온라인',
    url: 'https://www.sbc.or.kr',
    contact: '중소벤처기업진흥공단 1357',
    tags: ['창업융자', '저금리', '중기부', '대출'],
    calc_type: null
  },
  {
    id: 'p026',
    name: '예비창업패키지',
    category: '창업',
    summary: '창업 준비 중인 예비 창업자에게 최대 1억원 사업화 자금 + 창업 교육 지원',
    support_amount: '사업화 자금 최대 1억원',
    eligibility: {
      age_min: 19, age_max: 59,
      regions: [],
      income_percentile: 999,
      employment_status: ['미취업', '취업중']
    },
    deadline: '매년 2~3월 모집',
    apply_period: 'K-startup 온라인',
    url: 'https://www.k-startup.go.kr',
    contact: '창업진흥원 1357',
    tags: ['예비창업', '사업화', '중기부'],
    calc_type: null
  },
  {
    id: 'p027',
    name: '스마트제조혁신추진단',
    category: '창업',
    summary: '제조업 창업 청년에게 스마트공장 구축 컨설팅 + 설비 지원. 제조 혁신 생태계 입문 경로',
    support_amount: '스마트공장 구축 지원(기업당 최대 1억원)',
    eligibility: {
      age_min: 19, age_max: 44,
      regions: [],
      income_percentile: 999,
      employment_status: ['취업중']
    },
    deadline: '상시(분기별 공고)',
    apply_period: '스마트제조혁신추진단 공식 신청',
    url: 'https://www.smart-factory.kr',
    contact: '스마트제조혁신추진단 02-6009-3200',
    tags: ['제조', '스마트공장', '중기부', '창업'],
    calc_type: null
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  교육·훈련 (4개)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'p028',
    name: '국가근로장학금',
    category: '교육·훈련',
    summary: '저소득 대학생에게 교내·교외 근로 기회를 제공하여 시간당 9,860원(2024년) 지급. 학업과 병행 가능',
    support_amount: '시간당 9,860원 (학기당 최대 120~150만원)',
    eligibility: {
      age_min: 18, age_max: 34,
      regions: [],
      income_percentile: 90,
      employment_status: ['재학중']
    },
    deadline: '학기별 신청(1학기 2월, 2학기 8월)',
    apply_period: '한국장학재단 홈페이지',
    url: 'https://www.kosaf.go.kr',
    contact: '한국장학재단 1599-2000',
    tags: ['장학금', '대학생', '교육부', '근로'],
    calc_type: null
  },
  {
    id: 'p029',
    name: '청년특별장학금',
    category: '교육·훈련',
    summary: '경제적 어려움을 겪는 대학생에게 등록금 + 생활비를 추가 지원하는 긴급 장학금',
    support_amount: '등록금 + 생활비 최대 200만원',
    eligibility: {
      age_min: 18, age_max: 34,
      regions: [],
      income_percentile: 60,
      employment_status: ['재학중']
    },
    deadline: '상시(예산 소진 시 마감)',
    apply_period: '한국장학재단 홈페이지',
    url: 'https://www.kosaf.go.kr',
    contact: '한국장학재단 1599-2000',
    tags: ['장학금', '긴급', '교육부', '대학생'],
    calc_type: null
  },
  {
    id: 'p030',
    name: '평생교육바우처',
    category: '교육·훈련',
    summary: '성인 학습자에게 연 35만원 교육비 바우처 지원. 어학·직업훈련·취미 등 다양한 평생교육 과정 수강',
    support_amount: '연 35만원 바우처',
    eligibility: {
      age_min: 19, age_max: 75,
      regions: [],
      income_percentile: 65,
      employment_status: []
    },
    deadline: '상시(연초 신청)',
    apply_period: '국가평생교육진흥원 바우처 포털',
    url: 'https://ticket.nile.or.kr',
    contact: '국가평생교육진흥원 02-3780-9975',
    tags: ['평생교육', '바우처', '교육부', '어학'],
    calc_type: null
  },
  {
    id: 'p031',
    name: '내일이룸학교',
    category: '교육·훈련',
    summary: '학교 밖 청소년(9~24세)에게 직업교육 + 자격증 취득 지원 + 훈련수당 월 최대 31.6만원',
    support_amount: '훈련비 전액 + 훈련수당 월 최대 31.6만원',
    eligibility: {
      age_min: 15, age_max: 24,
      regions: [],
      income_percentile: 999,
      employment_status: ['미취업']
    },
    deadline: '상시(과정별 모집)',
    apply_period: 'HRD-Net 또는 꿈드림센터',
    url: 'https://www.hrd.go.kr',
    contact: '고용노동부 1350 / 꿈드림 1388',
    tags: ['학교밖청소년', '직업교육', '여가부', '훈련'],
    calc_type: null
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  복지·건강 (4개)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'p032',
    name: '청년마음건강 바우처',
    category: '복지·건강',
    summary: '심리적 어려움을 겪는 청년에게 전문 심리상담 서비스 바우처 제공. 1회당 5만원, 총 8~12회 이용 가능',
    support_amount: '상담 바우처 최대 60만원(12회)',
    eligibility: {
      age_min: 19, age_max: 34,
      regions: [],
      income_percentile: 120,
      employment_status: []
    },
    deadline: '상시',
    apply_period: '복지로 또는 주민센터 신청',
    url: 'https://www.bokjiro.go.kr',
    contact: '정신건강위기상담전화 1577-0199',
    tags: ['심리상담', '정신건강', '복지부', '바우처'],
    calc_type: null
  },
  {
    id: 'p033',
    name: '청년도전지원사업',
    category: '복지·건강',
    summary: 'NEET(미취업·미진학) 청년에게 자기개발 프로그램 + 참여수당 월 최대 25만원 × 5개월 지원',
    support_amount: '참여수당 월 최대 25만원 × 5개월(125만원)',
    eligibility: {
      age_min: 18, age_max: 34,
      regions: [],
      income_percentile: 999,
      employment_status: ['미취업']
    },
    deadline: '상시(지자체별 상이)',
    apply_period: '주민센터 또는 고용센터 신청',
    url: 'https://www.work.go.kr',
    contact: '고용노동부 1350',
    tags: ['NEET', '자기개발', '고용부', '수당'],
    calc_type: null
  },
  {
    id: 'p034',
    name: '청년내일꿈지원',
    category: '복지·건강',
    summary: '위기 청년(가정해체·경제적 어려움 등)에게 맞춤형 통합 서비스 연계. 생활지원금 월 최대 65만원',
    support_amount: '생활지원금 월 최대 65만원 + 서비스 연계',
    eligibility: {
      age_min: 13, age_max: 39,
      regions: [],
      income_percentile: 60,
      employment_status: []
    },
    deadline: '상시',
    apply_period: '청년지원기관 또는 주민센터',
    url: 'https://www.mogef.go.kr',
    contact: '여성가족부 1365',
    tags: ['위기청년', '통합지원', '여가부', '생활지원'],
    calc_type: null
  },
  {
    id: 'p035',
    name: '자립준비청년(보호종료아동) 지원',
    category: '복지·건강',
    summary: '아동복지시설·위탁가정에서 퇴소한 청년(만 18세~)에게 자립수당 월 40만원 + 주거·교육·취업 패키지 지원',
    support_amount: '자립수당 월 40만원 + 주거·취업 패키지',
    eligibility: {
      age_min: 18, age_max: 24,
      regions: [],
      income_percentile: 999,
      employment_status: []
    },
    deadline: '상시',
    apply_period: '주민센터 또는 아동자립지원센터',
    url: 'https://www.bokjiro.go.kr',
    contact: '아동권리보장원 02-6929-9800',
    tags: ['자립준비', '보호종료', '복지부', '수당'],
    calc_type: null
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  지자체 — 서울 (3개)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'p036',
    name: '서울 청년수당',
    category: '복지·건강',
    summary: '서울 거주 미취업 청년에게 월 50만원 × 최대 6개월 활동 지원금 지급. 자유로운 용처 사용 가능',
    support_amount: '월 50만원 × 최대 6개월(300만원)',
    eligibility: {
      age_min: 19, age_max: 34,
      regions: ['서울'],
      income_percentile: 150,
      employment_status: ['미취업']
    },
    deadline: '매년 3~4월 모집',
    apply_period: '서울청년포털(youth.seoul.go.kr)',
    url: 'https://youth.seoul.go.kr',
    contact: '서울시 다산콜센터 120',
    tags: ['서울', '활동지원금', '미취업', '청년수당'],
    calc_type: null
  },
  {
    id: 'p037',
    name: '서울 청년 월세 지원',
    category: '주거',
    summary: '서울 거주 독립 청년에게 월 최대 20만원 × 10개월 월세 지원. 국비와 별도로 서울시 추가 지원',
    support_amount: '월 최대 20만원 × 10개월(200만원)',
    eligibility: {
      age_min: 19, age_max: 39,
      regions: ['서울'],
      income_percentile: 150,
      employment_status: []
    },
    deadline: '매년 4~5월 모집',
    apply_period: '서울청년포털 또는 몽땅정보만능키',
    url: 'https://youth.seoul.go.kr',
    contact: '서울시 다산콜센터 120',
    tags: ['서울', '월세', '주거비', '지자체'],
    calc_type: null
  },
  {
    id: 'p038',
    name: '서울청년취업사관학교(새싹)',
    category: '취업·일자리',
    summary: '서울 거주 청년에게 AI·SW·디자인·게임 등 기술 교육 무료 제공. 교육비 전액 + 수료 후 취업 연계',
    support_amount: '교육비 전액 무료(시가 수백만원)',
    eligibility: {
      age_min: 19, age_max: 39,
      regions: ['서울'],
      income_percentile: 999,
      employment_status: ['미취업', '취업중', '재학중']
    },
    deadline: '분기별 모집',
    apply_period: '새싹 홈페이지(sesac.seoul.kr)',
    url: 'https://sesac.seoul.kr',
    contact: '서울시 다산콜센터 120',
    tags: ['서울', 'AI', 'SW교육', '취업연계', '새싹'],
    calc_type: null
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  지자체 — 경기 (2개)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'p039',
    name: '경기 청년 기회지원금',
    category: '복지·건강',
    summary: '경기도 거주 청년에게 분기별 25만원 × 4회(총 100만원) 지원. 자기개발·구직활동·생활비 등 자유 사용',
    support_amount: '분기별 25만원 × 4회(총 100만원)',
    eligibility: {
      age_min: 19, age_max: 34,
      regions: ['경기'],
      income_percentile: 120,
      employment_status: []
    },
    deadline: '매년 상반기 모집',
    apply_period: '경기도 청년포털(youth.gg.go.kr)',
    url: 'https://youth.gg.go.kr',
    contact: '경기도 청년정책과 031-8008-3460',
    tags: ['경기', '지원금', '지자체', '청년'],
    calc_type: null
  },
  {
    id: 'p040',
    name: '경기 청년 이음 일자리',
    category: '취업·일자리',
    summary: '경기도 소재 중소기업 취업 청년에게 기업 매칭 + 장기근속 인센티브(2년 이상 근무 시 추가 지원금)',
    support_amount: '장기근속 인센티브 최대 200만원',
    eligibility: {
      age_min: 18, age_max: 34,
      regions: ['경기'],
      income_percentile: 999,
      employment_status: ['미취업']
    },
    deadline: '상시',
    apply_period: '경기도 일자리재단 신청',
    url: 'https://www.jobaba.net',
    contact: '경기도 일자리재단 031-270-9600',
    tags: ['경기', '일자리', '중소기업', '지자체'],
    calc_type: null
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  지자체 — 부산 (1개)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'p041',
    name: '부산 청년 특화지원',
    category: '복지·건강',
    summary: '부산 거주 미취업 청년에게 취업 준비비·자격증 응시료 지원 + 청년 전용 커뮤니티 공간 제공',
    support_amount: '자격증 응시료 최대 50만원 + 공간 지원',
    eligibility: {
      age_min: 19, age_max: 34,
      regions: ['부산'],
      income_percentile: 150,
      employment_status: ['미취업']
    },
    deadline: '매년 상반기 모집',
    apply_period: '부산청년플랫폼(busan.go.kr/youth)',
    url: 'https://www.busan.go.kr/youth',
    contact: '부산시 청년정책팀 051-888-3490',
    tags: ['부산', '취업준비', '자격증', '지자체'],
    calc_type: null
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  지자체 — 인천 (1개)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'p042',
    name: '인천 청년드림 지원사업',
    category: '복지·건강',
    summary: '인천 거주 청년에게 취업·창업·문화·주거 4개 분야 맞춤 지원. 분야별 최대 100만원 바우처 제공',
    support_amount: '분야별 최대 100만원 바우처',
    eligibility: {
      age_min: 19, age_max: 39,
      regions: ['인천'],
      income_percentile: 150,
      employment_status: []
    },
    deadline: '분기별 모집',
    apply_period: '인천청년포털',
    url: 'https://www.incheon.go.kr',
    contact: '인천시 청년정책과 032-440-3270',
    tags: ['인천', '바우처', '청년드림', '지자체'],
    calc_type: null
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  지자체 — 대구·광주·대전·울산·세종 (각1)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'p043',
    name: '대구 청년 행복지원금',
    category: '복지·건강',
    summary: '대구 거주 청년에게 지역 내 소비 촉진 + 생활비 지원 목적의 지역화폐 형태 지원금 월 10만원 × 6개월',
    support_amount: '지역화폐 월 10만원 × 6개월(60만원)',
    eligibility: {
      age_min: 19, age_max: 34,
      regions: ['대구'],
      income_percentile: 120,
      employment_status: []
    },
    deadline: '매년 상반기',
    apply_period: '대구광역시 청년정책 포털',
    url: 'https://www.daegu.go.kr',
    contact: '대구시 청년정책과 053-803-2960',
    tags: ['대구', '지역화폐', '생활지원', '지자체'],
    calc_type: null
  },
  {
    id: 'p044',
    name: '광주 청년 두드림 사업',
    category: '취업·일자리',
    summary: '광주 거주 미취업 청년에게 지역 강소기업 취업 연계 + 정착지원금 월 20만원 × 6개월',
    support_amount: '정착지원금 월 20만원 × 6개월(120만원)',
    eligibility: {
      age_min: 18, age_max: 34,
      regions: ['광주'],
      income_percentile: 999,
      employment_status: ['미취업']
    },
    deadline: '분기별 모집',
    apply_period: '광주청년드림 포털(youth.gwangju.go.kr)',
    url: 'https://youth.gwangju.go.kr',
    contact: '광주시 청년정책관 062-613-3450',
    tags: ['광주', '취업연계', '정착지원', '지자체'],
    calc_type: null
  },
  {
    id: 'p045',
    name: '대전 청년 드림카드',
    category: '금융·자산',
    summary: '대전 거주 청년에게 문화·교육·교통비 등에 사용 가능한 드림카드(지역화폐) 분기별 20만원 지원',
    support_amount: '분기별 20만원(연 최대 80만원)',
    eligibility: {
      age_min: 19, age_max: 39,
      regions: ['대전'],
      income_percentile: 150,
      employment_status: []
    },
    deadline: '분기별',
    apply_period: '대전광역시 청년포털',
    url: 'https://www.daejeon.go.kr',
    contact: '대전시 청년정책과 042-270-3150',
    tags: ['대전', '드림카드', '지역화폐', '지자체'],
    calc_type: null
  },
  {
    id: 'p046',
    name: '울산 청년 희망일자리',
    category: '취업·일자리',
    summary: '울산 소재 제조·조선·화학 등 주력 산업 중소기업 취업 청년에게 정착지원금 + 기술교육비 지원',
    support_amount: '정착지원금 최대 200만원 + 교육비 50만원',
    eligibility: {
      age_min: 18, age_max: 34,
      regions: ['울산'],
      income_percentile: 999,
      employment_status: ['미취업']
    },
    deadline: '상시',
    apply_period: '울산청년포털(ulsan.go.kr)',
    url: 'https://www.ulsan.go.kr',
    contact: '울산시 청년정책팀 052-229-3410',
    tags: ['울산', '제조업', '정착지원', '지자체'],
    calc_type: null
  },
  {
    id: 'p047',
    name: '세종 청년 정주 장려금',
    category: '복지·건강',
    summary: '세종시로 이주·정착하는 청년에게 초기 정착지원금 최대 100만원 + 청년 커뮤니티 공간·프로그램 지원',
    support_amount: '정착지원금 최대 100만원',
    eligibility: {
      age_min: 19, age_max: 39,
      regions: ['세종'],
      income_percentile: 999,
      employment_status: []
    },
    deadline: '상시',
    apply_period: '세종특별자치시 청년정책 홈페이지',
    url: 'https://www.sejong.go.kr',
    contact: '세종시 청년정책팀 044-300-3450',
    tags: ['세종', '정착지원', '이주', '지자체'],
    calc_type: null
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  지자체 — 강원·충북·충남·전북·전남·경북·경남·제주
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'p048',
    name: '강원 청년 농촌 정착지원',
    category: '복지·건강',
    summary: '강원도 농촌 지역에 정착하는 청년 농업인에게 정착지원금 월 100만원 × 최대 3년 + 주거 지원',
    support_amount: '월 100만원 × 최대 36개월(3,600만원)',
    eligibility: {
      age_min: 18, age_max: 40,
      regions: ['강원'],
      income_percentile: 999,
      employment_status: ['취업중', '미취업']
    },
    deadline: '연 1~2회 모집',
    apply_period: '강원도 농업기술원 또는 시군 농업기술센터',
    url: 'https://www.gwd.go.kr',
    contact: '강원도 농정국 033-249-3180',
    tags: ['강원', '농촌', '귀농', '정착지원'],
    calc_type: null
  },
  {
    id: 'p049',
    name: '충북 청년 내일드림 장학금',
    category: '교육·훈련',
    summary: '충청북도 소재 대학(원)생 및 충북 출신 타지 대학생에게 연 최대 200만원 장학금 지원',
    support_amount: '연 최대 200만원',
    eligibility: {
      age_min: 18, age_max: 34,
      regions: ['충북'],
      income_percentile: 80,
      employment_status: ['재학중']
    },
    deadline: '매년 3월·9월 신청',
    apply_period: '충청북도 장학재단 홈페이지',
    url: 'https://www.cbsf.or.kr',
    contact: '충북장학재단 043-220-5600',
    tags: ['충북', '장학금', '대학생', '지자체'],
    calc_type: null
  },
  {
    id: 'p050',
    name: '충남 청년 문화 바우처',
    category: '복지·건강',
    summary: '충청남도 거주 청년에게 문화·여가 활동비 바우처 연 20만원 지원. 공연·전시·스포츠 등 이용',
    support_amount: '연 20만원 문화 바우처',
    eligibility: {
      age_min: 19, age_max: 34,
      regions: ['충남'],
      income_percentile: 150,
      employment_status: []
    },
    deadline: '상시',
    apply_period: '충남청년포털(youth.chungnam.net)',
    url: 'https://youth.chungnam.net',
    contact: '충남도 청년정책팀 041-635-3450',
    tags: ['충남', '문화바우처', '여가', '지자체'],
    calc_type: null
  },
  {
    id: 'p051',
    name: '전북 청년 일자리 장려금',
    category: '취업·일자리',
    summary: '전라북도 소재 중소기업에 취업한 전북 거주 청년에게 장려금 월 20만원 × 12개월(총 240만원) 지원',
    support_amount: '월 20만원 × 12개월(240만원)',
    eligibility: {
      age_min: 18, age_max: 39,
      regions: ['전북'],
      income_percentile: 999,
      employment_status: ['취업중']
    },
    deadline: '상시',
    apply_period: '전라북도 일자리종합지원센터',
    url: 'https://www.jeonbuk.go.kr',
    contact: '전북 일자리종합지원센터 063-280-2900',
    tags: ['전북', '장려금', '중소기업', '지자체'],
    calc_type: null
  },
  {
    id: 'p052',
    name: '전남 청년 스타트업 지원',
    category: '창업',
    summary: '전라남도 소재 또는 전남 거주 청년 창업자에게 최대 3,000만원 창업 자금 + 멘토링·공간 지원',
    support_amount: '최대 3,000만원 + 공간·멘토링',
    eligibility: {
      age_min: 19, age_max: 39,
      regions: ['전남'],
      income_percentile: 999,
      employment_status: ['미취업', '취업중']
    },
    deadline: '연 1~2회 모집',
    apply_period: '전남창조경제혁신센터 신청',
    url: 'https://www.jeonnam.go.kr',
    contact: '전남창조경제혁신센터 061-285-0300',
    tags: ['전남', '창업', '스타트업', '지자체'],
    calc_type: null
  },
  {
    id: 'p053',
    name: '경북 청년 해외 취업 지원',
    category: '취업·일자리',
    summary: '경상북도 거주 청년의 해외 취업 활성화. 어학 연수비 최대 300만원 + 해외 취업 알선 서비스',
    support_amount: '어학 연수비 최대 300만원 + 취업 알선',
    eligibility: {
      age_min: 19, age_max: 34,
      regions: ['경북'],
      income_percentile: 999,
      employment_status: ['미취업']
    },
    deadline: '분기별 모집',
    apply_period: '경북 일자리재단 신청',
    url: 'https://www.gyeongbuk.go.kr',
    contact: '경북 일자리재단 054-479-0200',
    tags: ['경북', '해외취업', '어학', '지자체'],
    calc_type: null
  },
  {
    id: 'p054',
    name: '경남 청년 뉴딜 일자리',
    category: '취업·일자리',
    summary: '경상남도 거주 청년에게 도내 공공·사회적경제 부문 청년 일자리 제공. 월 200만원 × 최대 10개월',
    support_amount: '월 200만원 × 최대 10개월(2,000만원)',
    eligibility: {
      age_min: 18, age_max: 39,
      regions: ['경남'],
      income_percentile: 999,
      employment_status: ['미취업']
    },
    deadline: '상시(분기별 공고)',
    apply_period: '경남일자리재단 홈페이지',
    url: 'https://www.gyeongnam.go.kr',
    contact: '경남일자리재단 055-212-1000',
    tags: ['경남', '뉴딜', '공공일자리', '지자체'],
    calc_type: null
  },
  {
    id: 'p055',
    name: '제주 청년 취·창업 지원',
    category: '창업',
    summary: '제주 거주 청년에게 취업 준비비(자격증·어학) 50만원 + 소규모 창업자금 최대 1,000만원 지원',
    support_amount: '취업준비비 50만원 또는 창업자금 최대 1,000만원',
    eligibility: {
      age_min: 18, age_max: 39,
      regions: ['제주'],
      income_percentile: 999,
      employment_status: ['미취업']
    },
    deadline: '분기별 모집',
    apply_period: '제주청년센터(jejuyouth.kr)',
    url: 'https://www.jeju.go.kr',
    contact: '제주청년센터 064-720-0100',
    tags: ['제주', '취업', '창업', '지자체'],
    calc_type: null
  }
];

// ────────────────────────────────────────────────────────────────
// 헬퍼: 지역명 정규화 (입력값 → 표준 시도명)
// ────────────────────────────────────────────────────────────────
function normalizeRegion(input) {
  if (!input) return '';
  const map = {
    '서울특별시': '서울', '서울시': '서울', '서울': '서울',
    '부산광역시': '부산', '부산시': '부산', '부산': '부산',
    '대구광역시': '대구', '대구시': '대구', '대구': '대구',
    '인천광역시': '인천', '인천시': '인천', '인천': '인천',
    '광주광역시': '광주', '광주시': '광주', '광주': '광주',
    '대전광역시': '대전', '대전시': '대전', '대전': '대전',
    '울산광역시': '울산', '울산시': '울산', '울산': '울산',
    '세종특별자치시': '세종', '세종시': '세종', '세종': '세종',
    '경기도': '경기', '경기': '경기',
    '강원도': '강원', '강원특별자치도': '강원', '강원': '강원',
    '충청북도': '충북', '충북': '충북',
    '충청남도': '충남', '충남': '충남',
    '전라북도': '전북', '전북특별자치도': '전북', '전북': '전북',
    '전라남도': '전남', '전남': '전남',
    '경상북도': '경북', '경북': '경북',
    '경상남도': '경남', '경남': '경남',
    '제주특별자치도': '제주', '제주도': '제주', '제주': '제주'
  };
  const trimmed = input.trim();
  return map[trimmed] || trimmed;
}

// ────────────────────────────────────────────────────────────────
// 헬퍼: 자격 조건 필터링
// ────────────────────────────────────────────────────────────────
function filterPolicies({ age, region, income, employment }) {
  const normRegion = normalizeRegion(region);
  return policies.filter(p => {
    const e = p.eligibility;
    // 나이 필터
    if (age !== undefined && age !== null) {
      if (age < e.age_min || age > e.age_max) return false;
    }
    // 지역 필터
    if (normRegion && e.regions.length > 0) {
      if (!e.regions.includes(normRegion)) return false;
    }
    // 소득 필터 (income = 중위소득 %)
    if (income !== undefined && income !== null && e.income_percentile !== 999) {
      if (income > e.income_percentile) return false;
    }
    // 취업상태 필터
    if (employment && e.employment_status.length > 0) {
      if (!e.employment_status.includes(employment)) return false;
    }
    return true;
  });
}

// ────────────────────────────────────────────────────────────────
// 헬퍼: 매칭 스코어 계산
// ────────────────────────────────────────────────────────────────
function calcScore(policy, { age, region, income, employment }) {
  let score = 10; // base
  const e = policy.eligibility;
  const normRegion = normalizeRegion(region);

  // 나이 정밀 매칭 (나이 범위 내 중앙에 가까울수록 +)
  if (age !== undefined && age !== null) {
    score += 3;
    const mid = (e.age_min + e.age_max) / 2;
    const range = (e.age_max - e.age_min) || 1;
    const distRatio = Math.abs(age - mid) / range;
    if (distRatio < 0.3) score += 1;
  }

  // 지역 특화 보너스
  if (normRegion && e.regions.length > 0 && e.regions.includes(normRegion)) {
    score += 4; // 지역 특화 정책이고 내 지역과 일치
  } else if (e.regions.length === 0) {
    score += 1; // 전국 정책
  }

  // 소득 조건 보너스 (소득이 낮을수록 조건 충족 높음)
  if (income !== undefined && income !== null) {
    if (e.income_percentile === 999) {
      score += 1; // 소득 제한 없음
    } else if (income <= e.income_percentile) {
      score += 2;
      if (income <= e.income_percentile * 0.8) score += 1; // 여유 있는 충족
    }
  }

  // 취업상태 조건 보너스
  if (employment && e.employment_status.length > 0 && e.employment_status.includes(employment)) {
    score += 2;
  } else if (e.employment_status.length === 0) {
    score += 1; // 제한 없음
  }

  // 카테고리 다양성 보너스 (금융·자산 정책은 가산점)
  if (policy.category === '금융·자산') score += 1;

  // 계산기 지원 보너스 (구체적 혜택 계산 가능)
  if (policy.calc_type) score += 1;

  return score;
}

// ────────────────────────────────────────────────────────────────
// 채팅: 자연어에서 조건 추출
// ────────────────────────────────────────────────────────────────
function extractConditions(message) {
  const conditions = {};

  // 나이 추출 (숫자 + 살/세)
  const ageMatch = message.match(/(\d{1,2})\s*(?:살|세)/);
  if (ageMatch) {
    conditions.age = parseInt(ageMatch[1], 10);
  } else {
    // 단순 숫자만 있어도 추출
    const numMatch = message.match(/\b(1[5-9]|[2-3][0-9]|4[0-5])\b/);
    if (numMatch) conditions.age = parseInt(numMatch[1], 10);
  }

  // 지역 추출
  const regionKeywords = [
    '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
    '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'
  ];
  for (const r of regionKeywords) {
    if (message.includes(r)) {
      conditions.region = r;
      break;
    }
  }

  // 취업상태 추출
  if (message.match(/미취업|구직|백수|취업준비|취준|취업 안|실업/)) {
    conditions.employment = '미취업';
  } else if (message.match(/취업중|재직|직장|회사|다니|일하/)) {
    conditions.employment = '취업중';
  } else if (message.match(/재학중|대학교|대학원|학생|학교 다/)) {
    conditions.employment = '재학중';
  }

  // 소득 분위 추출
  if (message.match(/기초수급|기초생활/)) {
    conditions.income = 30;
  } else if (message.match(/저소득|차상위/)) {
    conditions.income = 50;
  } else if (message.match(/중위소득\s*(\d+)%?/)) {
    const m = message.match(/중위소득\s*(\d+)/);
    if (m) conditions.income = parseInt(m[1], 10);
  }

  // 키워드 기반 카테고리 힌트
  if (message.match(/월세|전세|주거|집값|임대/)) {
    conditions.category_hint = '주거';
  } else if (message.match(/창업|사업|스타트업/)) {
    conditions.category_hint = '창업';
  } else if (message.match(/취업|일자리|직장|채용/)) {
    conditions.category_hint = '취업·일자리';
  } else if (message.match(/저축|적금|청약|자산/)) {
    conditions.category_hint = '금융·자산';
  } else if (message.match(/심리|상담|건강|마음/)) {
    conditions.category_hint = '복지·건강';
  } else if (message.match(/장학|교육|훈련|배움/)) {
    conditions.category_hint = '교육·훈련';
  }

  return conditions;
}

// 자연어 응답 생성
function buildChatReply(conditions, matched) {
  const parts = [];
  if (conditions.age) parts.push(`${conditions.age}세`);
  if (conditions.region) parts.push(conditions.region);
  if (conditions.employment) parts.push(conditions.employment);
  const desc = parts.length > 0 ? parts.join(' ') + ' 청년' : '청년';

  let reply = `${desc}을 위한 추천 정책을 찾았어요! 🎯\n\n`;

  if (matched.length === 0) {
    reply += '입력하신 조건에 맞는 정책을 찾기 어려워요. 조건을 조금 완화해 보시거나, 나이/지역을 다시 확인해 주세요.';
    return reply;
  }

  matched.slice(0, 5).forEach((p, i) => {
    reply += `**${i + 1}. ${p.name}** (${p.category})\n`;
    reply += `💰 ${p.support_amount}\n`;
    reply += `📋 ${p.summary.substring(0, 60)}...\n`;
    reply += `🔗 신청: ${p.url}\n`;
    reply += `📞 문의: ${p.contact}\n\n`;
  });

  reply += `총 ${matched.length}개 정책이 조건에 맞아요. 더 자세한 조건 매칭은 위의 필터를 이용해 보세요!`;
  return reply;
}

// ────────────────────────────────────────────────────────────────
// API 엔드포인트
// ────────────────────────────────────────────────────────────────

// GET /api/policies — 조건 필터링 + 스코어 정렬
app.get('/api/policies', (req, res) => {
  const age = req.query.age ? parseInt(req.query.age, 10) : undefined;
  const region = req.query.region || '';
  const income = req.query.income ? parseInt(req.query.income, 10) : undefined;
  const employment = req.query.employment || '';

  // 입력 유효성 검사
  if (age !== undefined && (isNaN(age) || age < 1 || age > 100)) {
    return res.status(400).json({ error: '유효하지 않은 나이입니다. (1~100)' });
  }
  if (income !== undefined && (isNaN(income) || income < 0 || income > 999)) {
    return res.status(400).json({ error: '유효하지 않은 소득 분위입니다. (0~999)' });
  }

  const params = { age, region, income, employment };
  let filtered = filterPolicies(params);

  // 스코어 계산 및 정렬
  filtered = filtered
    .map(p => ({ ...p, score: calcScore(p, params) }))
    .sort((a, b) => b.score - a.score);

  res.json({
    total: filtered.length,
    policies: filtered
  });
});

// GET /api/policies/all — 전체 목록 (스코어 없음)
app.get('/api/policies/all', (req, res) => {
  res.json({
    total: policies.length,
    policies: policies
  });
});

// GET /api/stats — 통계
app.get('/api/stats', (req, res) => {
  const categories = {};
  policies.forEach(p => {
    categories[p.category] = (categories[p.category] || 0) + 1;
  });

  const regions = {};
  policies.forEach(p => {
    if (p.eligibility.regions.length === 0) {
      regions['전국'] = (regions['전국'] || 0) + 1;
    } else {
      p.eligibility.regions.forEach(r => {
        regions[r] = (regions[r] || 0) + 1;
      });
    }
  });

  res.json({
    total: policies.length,
    categories,
    regions,
    last_updated: '2025-06-16'
  });
});

// POST /api/chat — 자연어 채팅
app.post('/api/chat', (req, res) => {
  const message = (req.body && req.body.message) ? String(req.body.message).trim() : '';

  if (!message) {
    return res.status(400).json({ error: '메시지를 입력해 주세요.' });
  }
  if (message.length > 500) {
    return res.status(400).json({ error: '메시지가 너무 깁니다. (최대 500자)' });
  }

  const conditions = extractConditions(message);

  // 조건 기반 필터링
  let matched = filterPolicies(conditions);

  // 카테고리 힌트가 있으면 해당 카테고리 우선 정렬
  if (conditions.category_hint) {
    matched = [
      ...matched.filter(p => p.category === conditions.category_hint),
      ...matched.filter(p => p.category !== conditions.category_hint)
    ];
  } else {
    // 기본 스코어 정렬
    matched = matched
      .map(p => ({ ...p, score: calcScore(p, conditions) }))
      .sort((a, b) => b.score - a.score);
  }

  const top = matched.slice(0, 5);
  const reply = buildChatReply(conditions, matched);

  res.json({
    reply,
    conditions_extracted: conditions,
    policies: top,
    total_matched: matched.length
  });
});

// GET /api/policies/:id — 단일 정책 상세
app.get('/api/policies/:id', (req, res) => {
  const policy = policies.find(p => p.id === req.params.id);
  if (!policy) {
    return res.status(404).json({ error: '정책을 찾을 수 없습니다.' });
  }
  res.json(policy);
});

// 404 핸들러
app.use('/api', (req, res) => {
  res.status(404).json({ error: '요청한 API 경로를 찾을 수 없습니다.' });
});

// 루트 → public/index.html 폴백
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  res.sendFile(indexPath, err => {
    if (err) {
      res.status(200).json({
        message: '한국 청년 정책 AI 매칭 서비스 API 서버',
        version: '1.0.0',
        endpoints: [
          'GET  /api/policies?age=26&region=서울&income=100&employment=미취업',
          'GET  /api/policies/all',
          'GET  /api/policies/:id',
          'POST /api/chat  { "message": "서울 26살 미취업인데 월세 지원 있나요?" }',
          'GET  /api/stats'
        ]
      });
    }
  });
});

// ────────────────────────────────────────────────────────────────
// 서버 기동
// ────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ 청년 정책 AI 서버 실행 중: http://localhost:${PORT}`);
  console.log(`📊 정책 DB: ${policies.length}개 정책 로드됨`);
  console.log(`🔗 API 엔드포인트: /api/policies | /api/chat | /api/stats`);
});

module.exports = app;
