// 범용 샘플 리포트 데이터 (누구나 공감할 수 있는 일반화된 4인 절친 단톡방 예시)

window.SAMPLE_REPORT_DATA = {
  roomName: "절친 4인방 단톡방 (체험용 샘플)",
  totalMessages: 8420,
  dateRange: "최근 6개월간",
  tensionIndex: 0,
  peaceIndex: 100,
  tensionDesc: "비속어나 날 선 기싸움 없이 유머와 리액션으로 만담이 이어지는 상위 1% 청정 우정 단톡방입니다.",
  groupGrade: "S+",
  groupVibe: "악의적 기싸움 0%! 서로의 치부와 잔고까지 100% 오픈한 영혼의 소년만화식 우정 단톡방.",
  
  // 4인 캐릭터 프로필 (범용 절친 페르소나)
  members: [
    {
      id: "민우",
      name: "민우",
      cti: "ELFA",
      title: "토크 폭주기관차",
      avatar: "🔥",
      totalMsgs: 3120,
      msgRatio: 37.1,
      avgLen: 10.4,
      starters: 58,
      questions: 420,
      laughs: 1250,
      photos: 140,
      replySpeed: 1.5,
      owlRatio: 24,
      earlyRatio: 11,
      mentionCount: 96,
      activeHours: "오후 3시-6시",
      timePersona: "오후-저녁의 전사 ⚔️",
      topWords: [{ word: "대박", count: 84 }, { word: "개꿀", count: 65 }, { word: "레전드", count: 52 }, { word: "수업", count: 48 }, { word: "치킨", count: 39 }],
      radar: { initiative: 95, length: 82, emotion: 92, assertiveness: 80, humor: 90 },
      signatures: ["대박", "개꿀", "살려줘", "오호...", "호오오올리", "ㅋㅋㅋ"],
      quotes: [
        "애들아 오늘 진짜 레전드 사건 있었음 들어봐",
        "너네 없으면 나 누구랑 노냐 도망치지 마라",
        "오늘 수업 풀강 때리면 난 진짜 쓰러진다",
        "통장 잔고 3천원인데 치킨 먹을 사람 구함"
      ],
      trophy: "🏆 질문 과다상 & 텐션 폭격상",
      savage: "자신의 감정과 일상 썰을 톡방에 여과 없이 쏟아부어 친구들을 '감정 쓰레기통'으로 만들 위험이 있습니다. 말을 뱉기 전 3초만 쉬는 호흡이 필요합니다.",
      advice: "친구들의 답변을 다음 썰을 풀기 위한 징검다리로 쓰지 말고, 상대방의 말에 한 번 더 머물러주세요."
    },
    {
      id: "태호",
      name: "태호",
      cti: "ESTA",
      title: "불꽃의 직진 행동대장",
      avatar: "🥊",
      totalMsgs: 2150,
      msgRatio: 25.5,
      avgLen: 9.8,
      starters: 34,
      questions: 190,
      laughs: 310,
      photos: 85,
      replySpeed: 2.2,
      owlRatio: 12,
      earlyRatio: 38,
      mentionCount: 84,
      activeHours: "오전 10시-낮 12시",
      timePersona: "아침 기상 선발대 🌅",
      topWords: [{ word: "기상", count: 55 }, { word: "헬스", count: 47 }, { word: "정산", count: 42 }, { word: "나와", count: 38 }, { word: "결론", count: 29 }],
      radar: { initiative: 88, length: 45, emotion: 55, assertiveness: 98, humor: 85 },
      signatures: ["나와", "올거?", "간다", "기상", "결론만", "당당하게"],
      quotes: [
        "오늘 헬스장 올 사람? 올거? 올거?",
        "말 길게 하지 말고 7시까지 강남역 앞으로 나와",
        "PC방 안 나오면 집 찾아가서 문 두드린다",
        "노래방 비용 3333원씩 칼정산 부탁한다"
      ],
      trophy: "🏆 느낌표 남발상 & 모임 소집상",
      savage: "상대의 상황이나 일정을 고려하지 않고 밀어붙이는 경향이 있습니다. 친하지 않은 사람에겐 강압적이거나 무례하게 보일 수 있습니다.",
      advice: "강한 추진력에 '오늘 일정 괜찮아?'라는 쿠션어 한 문장만 더하면 완벽한 리더가 됩니다."
    },
    {
      id: "정훈",
      name: "정훈",
      cti: "ISTR",
      title: "데드팬 팩트폭격기",
      avatar: "🗿",
      totalMsgs: 1420,
      msgRatio: 16.9,
      avgLen: 7.2,
      starters: 10,
      questions: 95,
      laughs: 220,
      photos: 18,
      replySpeed: 6.4,
      owlRatio: 34,
      earlyRatio: 6,
      mentionCount: 72,
      activeHours: "오후 4시-7시",
      timePersona: "새벽의 망령 👻",
      topWords: [{ word: "조퇴", count: 35 }, { word: "과학적", count: 28 }, { word: "배당", count: 24 }, { word: "소고기", count: 19 }, { word: "불가능", count: 18 }],
      radar: { initiative: 25, length: 18, emotion: 30, assertiveness: 65, humor: 80 },
      signatures: ["ㅇㅇ", "ㅇㅋ", "머네", "안돼", "몰라", "조퇴함"],
      quotes: [
        "그게 과학적으로 불가능한 이유를 설명해줄게",
        "ㅇㅇ",
        "배당률 100배에 만원 간다. 되면 소고기 삼",
        "안돼"
      ],
      trophy: "🏆 단답 요정상 & 팩트 폭격상",
      savage: "극단적인 단답과 냉소는 친구들이니까 넘어가지, 사회나 연애에서는 '상대를 무시하거나 성의가 없다'는 심각한 오해를 부릅니다.",
      advice: "주어와 서술어가 갖춰진 온전한 문장으로 자신의 생각과 감정을 표현해보는 용기가 필요합니다."
    },
    {
      id: "상민",
      name: "상민",
      cti: "ILFR",
      title: "만독불침 지적 완충재",
      avatar: "🛡️",
      totalMsgs: 1730,
      msgRatio: 20.5,
      avgLen: 9.5,
      starters: 18,
      questions: 210,
      laughs: 680,
      photos: 75,
      replySpeed: 2.8,
      owlRatio: 39,
      earlyRatio: 9,
      mentionCount: 88,
      activeHours: "밤 10시-12시",
      timePersona: "새벽의 망령 👻",
      topWords: [{ word: "만독불침", count: 42 }, { word: "찍먹", count: 36 }, { word: "야무지네", count: 31 }, { word: "애플워치", count: 25 }, { word: "인생", count: 22 }],
      radar: { initiative: 55, length: 78, emotion: 82, assertiveness: 40, humor: 95 },
      signatures: ["아하", "미쳤네", "야무지네", "빠른 찍먹?", "인정", "보듬어줄게"],
      quotes: [
        "오늘 할 일을 미루면 내일 사라진다. 그게 인생이야",
        "난 그런 너까지 보듬을 수 있어. 난 만독불침이니까",
        "애플워치 교통카드는 감성값으로 쓰는 거다",
        "일단 빠른 찍먹 가보고 결정하자"
      ],
      trophy: "🏆 멘탈 조율상 & 자조 유머상",
      savage: "모든 것을 유머로 무마하려다 보니 정작 자신의 진지한 고통이나 취약함을 털어놓지 못하는 '진지함 회피증'이 있습니다.",
      advice: "광대의 가면을 벗고, 때로는 날것의 힘들다는 감정이나 단호한 거절의사를 직접적으로 표현해보세요."
    }
  ],

  // 1:1 페어 케미 랭킹
  pairRankings: [
    {
      rank: 1,
      pair: ["민우", "상민"],
      types: ["ELFA", "ILFR"],
      replies: 1120,
      streaks: 145,
      mentions: 198,
      score: 99,
      grade: "SSS",
      badge: "💖 영혼의 단짝",
      summary: "완벽한 50:50 대칭! 쏟아내기와 받아주기가 절묘하게 조화된 찰떡궁합.",
      details: "민우의 폭발적인 화제 제기를 상민이 재치 있는 유머와 '아하'로 완벽하게 받아냅니다. 서로 지치지 않고 티키타카가 무한대로 이어지는 가장 이상적인 조합입니다."
    },
    {
      rank: 2,
      pair: ["민우", "태호"],
      types: ["ELFA", "ESTA"],
      replies: 980,
      streaks: 110,
      mentions: 210,
      score: 88,
      grade: "S+",
      badge: "⚡ 톰과 제리",
      summary: "툭하면 '뒤져라', '불지른다' 싸우지만 급할 땐 제일 먼저 달려오는 애증의 라이벌.",
      details: "둘 다 직진 성향이 강해 마주치면 폭발합니다. 매번 사소한 걸로 배틀을 뜨지만 뒤끝이 0%라 10초 만에 화해하는 끈끈한 현실 절친 케미입니다."
    },
    {
      rank: 3,
      pair: ["태호", "상민"],
      types: ["ESTA", "ILFR"],
      replies: 720,
      streaks: 75,
      mentions: 115,
      score: 91,
      grade: "S",
      badge: "🤝 실행과 조율의 황금 파트너",
      summary: "태호의 저돌적인 실행력을 상민이 유연하게 조율함. 상호 존중 기반의 안정적 관계.",
      details: "밀어붙이는 기관차와 부드러운 철로의 만남. 모임의 현실적인 성사를 이끄는 든든한 중심축 조합입니다."
    },
    {
      rank: 4,
      pair: ["태호", "정훈"],
      types: ["ESTA", "ISTR"],
      replies: 560,
      streaks: 62,
      mentions: 95,
      score: 95,
      grade: "SS",
      badge: "🥊 무언의 행동 듀오",
      summary: "카톡에선 '나올거? / ㅇㅇ' 두 마디로 끝나지만 현실에선 가장 많은 시간을 보내는 실속파.",
      details: "텍스트는 극도로 짧지만 실제 운동, PC방, 밥약속을 가장 군말 없이 함께하는 오프라인 1등 듀오입니다."
    },
    {
      rank: 5,
      pair: ["민우", "정훈"],
      types: ["ELFA", "ISTR"],
      replies: 490,
      streaks: 48,
      mentions: 120,
      score: 72,
      grade: "B+",
      badge: "🧊 창과 방패 (텐션 극과 극)",
      summary: "민우의 징징대는 구애 vs 정훈의 시크한 먹금. 들이대는 댕댕이와 시크냥이의 반전 케미.",
      details: "극과 극의 텐션이 빚어내는 만담 콤비. 민우가 텐션을 올리면 정훈이 차갑게 식혀버리는 티키타카가 웃음을 유발합니다."
    },
    {
      rank: 6,
      pair: ["정훈", "상민"],
      types: ["ISTR", "ILFR"],
      replies: 460,
      streaks: 45,
      mentions: 60,
      score: 84,
      grade: "A",
      badge: "🌿 무자극 평화지대",
      summary: "언쟁도 자극도 없는 안전 구역. 용건 위주로 굵고 짧게 통하는 담백한 안정형.",
      details: "서로에게 무리한 감정 소모를 요구하지 않고 편안하게 흐르는 무공해 힐링 관계입니다."
    }
  ],

  // 범용 명장면 예시
  hallOfFame: [
    {
      title: "1. 초능력 억지 배틀 (만독불침 vs 부활 vs 반사)",
      date: "7월 8일",
      desc: "초등학생 수준의 절대 안 지기 티키타카",
      dialogue: [
        { sender: "민우", text: "상민아 도망쳐 너 죽으면 나 친구 없단 말이야" },
        { sender: "상민", text: "걱정마 난 맞아도 안 죽어. 만독불침이라 맞지도 않아" },
        { sender: "정훈", text: "난 맞으면 죽어. 근데 살아나" },
        { sender: "정훈", text: "난 반사해" }
      ]
    },
    {
      title: "2. 통장 잔고 70원과 아묻따 송금",
      date: "7월 14일",
      desc: "욕하면서 1초 만에 빌려주는 찐친 바이브",
      dialogue: [
        { sender: "태호", text: "아무나 만원만 빌려줄 사람 있냐?" },
        { sender: "민우", text: "내가 왜 줘야 하냐 잔고 70원이야 ㅋㅋㅋ" },
        { sender: "민우", text: "근데 빌려주는 건 가능하지 아묻따 카톡 송금 보냄" },
        { sender: "태호", text: "오? ㅋㅋㅋㅋ 굿" }
      ]
    },
    {
      title: "3. 지옥의 노래방 3333원 정산 사건",
      date: "6월 17일",
      desc: "소수점 정산에서 시작된 극단적 으름장",
      dialogue: [
        { sender: "태호", text: "노래방 비용 보내줘 정확히 3333.3333원" },
        { sender: "정훈", text: "내가 냈는데?" },
        { sender: "태호", text: "구라 치지마" },
        { sender: "태호", text: "체육관 불질러버리기 전에 빨리 사과해라" },
        { sender: "정훈", text: "미.. 미안" }
      ]
    },
    {
      title: "4. 산을 깎자는 친구와 화강암 지형 설명",
      date: "4월 7일",
      desc: "지하철 뚫자는 친구에게 지리 수업을 시작한 이과생",
      dialogue: [
        { sender: "민우", text: "우리 동네 왜 지하철 더 안 뚫어줘? 산을 깎아!!!!!!" },
        { sender: "정훈", text: "좋은 생각이지만 불가능한 이유를 설명해줄게" },
        { sender: "정훈", text: "1. 대한민국의 산은 대다수 화강암으로 이루어져 있다" },
        { sender: "민우", text: "화강암이 뭔데...?" }
      ]
    }
  ],

  // 활동 타임라인 & 키워드 샘플
  activity: {
    hourly: [120, 60, 30, 15, 5, 10, 80, 250, 480, 720, 850, 910, 990, 880, 920, 1050, 980, 940, 810, 650, 510, 390, 280, 190],
    weekday: { "월": 1420, "화": 1650, "수": 1580, "목": 1390, "금": 1820, "토": 780, "일": 850 },
    peakHour: "15시",
    peakWeekday: "금요일"
  },
  keywords: {
    roomKeywords: [
      { word: "치킨", count: 215 },
      { word: "레전드", count: 198 },
      { word: "수업", count: 185 },
      { word: "PC방", count: 160 },
      { word: "과제", count: 142 },
      { word: "대박", count: 135 },
      { word: "헬스", count: 128 },
      { word: "기상", count: 115 },
      { word: "살려줘", count: 104 },
      { word: "개꿀", count: 98 },
      { word: "노래방", count: 92 },
      { word: "정산", count: 87 }
    ]
  },
  isSample: true,
  sampleMode: "chemistry"
};

// ============================================================================
// [MODE 02 전용] 💕 썸·연인 1:1 애정도 판독 샘플 데이터 (오직 2명만 존재하는 1:1 카톡방)
// ============================================================================
window.SAMPLE_ROMANCE_DATA = {
  isSample: true,
  sampleMode: "romance",
  roomName: "서연 ♥ 지훈 1:1 카톡방 (썸·연인 샘플)",
  totalMessages: 4820,
  dateRange: "최근 45일간 (1:1 대화)",
  tensionIndex: 2,
  peaceIndex: 98,
  tensionDesc: "다정한 배려어와 공감 리액션이 98%를 차지하는 무결점 로맨틱 대화방입니다.",
  groupGrade: "LOVE S+",
  groupVibe: "밤 11시 이후 대화 밀도가 폭발하는 쌍방 폴인럽 구간! 서로의 말투와 웃음 길이까지 92% 동기화된 달달한 1:1 대화방.",

  // 1:1 로맨스 모드이므로 오직 두 사람(서연, 지훈)만 존재
  members: [
    {
      id: "서연",
      name: "서연",
      cti: "ELFR",
      title: "다정 직진 표현러",
      avatar: "🌷",
      totalMsgs: 2510,
      msgRatio: 52.1,
      avgLen: 16.8,
      starters: 64,
      questions: 380,
      laughs: 940,
      photos: 112,
      replySpeed: 3,
      owlRatio: 44,
      earlyRatio: 14,
      mentionCount: 148,
      affectionHits: 142,
      taskHits: 18,
      tokenAgreementHits: 4,
      activeHours: "밤 10시-새벽 1시",
      timePersona: "심야 감성 사랑꾼 🌙",
      topWords: [
        { word: "보고싶어", count: 68 },
        { word: "집에갔어?", count: 54 },
        { word: "귀여워", count: 49 },
        { word: "우리", count: 45 },
        { word: "주말에", count: 38 }
      ],
      radar: { initiative: 92, length: 85, emotion: 96, assertiveness: 74, humor: 88 },
      signatures: ["웅웅!!", "보구싶다", "오늘 뭐했어?", "헤헤", "얼른 자요", "내일 봐♥"],
      quotes: [
        "지훈씨 오늘 하루도 진짜 고생 많았어요!! 얼른 집 가서 쉬어 ㅠㅠ",
        "아까 보내준 사진 너무 귀여워서 계속 보는 중 ㅋㅋㅋ",
        "이번 주말에 날씨 좋던데 우리 한강 산책 갈래요?",
        "전화할래요? 목소리 듣고 싶다 ㅎㅎ"
      ],
      trophy: "💘 선톡 직진상 & 다정 질문상",
      savage: "호감이 생기면 숨기지 못하고 질문과 리액션을 쏟아내는 투명한 직진파입니다.",
      advice: "이미 상대방도 충분히 같은 속도로 달려오고 있으니 확신을 가져도 좋습니다."
    },
    {
      id: "지훈",
      name: "지훈",
      cti: "ILFR",
      title: "스윗 경청 사랑꾼",
      avatar: "☕",
      totalMsgs: 2310,
      msgRatio: 47.9,
      avgLen: 15.9,
      starters: 52,
      questions: 345,
      laughs: 880,
      photos: 98,
      replySpeed: 4,
      owlRatio: 41,
      earlyRatio: 16,
      mentionCount: 162,
      affectionHits: 128,
      taskHits: 22,
      tokenAgreementHits: 5,
      activeHours: "밤 11시-새벽 2시",
      timePersona: "다정한 심야 메이트 ✨",
      topWords: [
        { word: "조심히", count: 62 },
        { word: "맛있는거", count: 51 },
        { word: "좋아요", count: 48 },
        { word: "서연이", count: 44 },
        { word: "데리러", count: 36 }
      ],
      radar: { initiative: 84, length: 82, emotion: 91, assertiveness: 68, humor: 85 },
      signatures: ["밥은 먹었어?", "내가 데리러 갈게", "집 도착!", "고마워 ㅎㅎ", "잘자요", "내일 보자"],
      quotes: [
        "서연이 좋아하는 디저트 가게 찾았는데 주말에 같이 가자 ㅎㅎ",
        "비 오는데 우산 챙겼어? 끝나고 내가 앞으로 데리러 갈게!",
        "서연이랑 카톡하고 있으면 시간 가는 줄 모르겠어 ㅋㅋㅋ",
        "집 잘 들어갔어? 오늘 봐서 진짜 좋았다 잘자!"
      ],
      trophy: "💝 스윗 에스코트상 & 장문 정성상",
      savage: "상대의 사소한 말까지 기억해 챙겨주는 세심한 배려파로, 행동으로 호감을 증명합니다.",
      advice: "배려와 질문에 더해 가끔은 직구로 감정을 먼저 표현하면 관계가 한 단계 더 깊어집니다."
    }
  ],

  pairRankings: [
    {
      rank: 1,
      pair: ["서연", "지훈"],
      types: ["ELFR", "ILFR"],
      replies: 4120,
      streaks: 390,
      mentions: 280,
      score: 96,
      grade: "최고 궁합 S+",
      badge: "💞 서로 푹 빠진 쌍방 호감",
      summary: "선톡 비율 55:45, 평균 답장 3-4분! 두 사람의 감정선이 완벽하게 맞물린 로맨틱 시너지.",
      details: "서연의 밝은 선톡과 지훈의 다정한 장문 리액션이 끊김 없이 이어지며, 밤 시간대(22시-02시) 대화 비중이 42.5%에 달합니다."
    }
  ],

  // 1:1 썸·연인 전용 하이라이트 대화록
  romanceHighlights: [
    {
      stage: "설렘 포인트 01 • 기다렸다는 듯이 바로 오는 칼답과 다정한 안부",
      time: "평일 오후 6:12 (평균 답장 간격 45초)",
      academicNote: "상대방 연락에 망설임 없이 바로 답장하고 자연스럽게 저녁 약속을 잡는 핵심 호감 신호",
      messages: [
        { sender: "서연", side: "left", text: "지훈씨 오늘 회의 잘 끝났어요?? 밖이 갑자기 추워졌네 ㅠㅠ" },
        { sender: "지훈", side: "right", text: "방금 딱 끝났어!! 서연이 생각나서 카톡 켜려던 참이었는데 ㅎㅎ 옷 따뜻하게 입었어?" },
        { sender: "서연", side: "left", text: "웅웅!! 저도 이제 퇴근해요 ㅋㅋㅋ 저녁은 먹었어요?" },
        { sender: "지훈", side: "right", text: "아직! 서연이 안 먹었으면 내가 그쪽으로 갈까? 같이 따뜻한 국물 먹자" }
      ]
    },
    {
      stage: "설렘 포인트 02 • 밤늦게까지 이어지는 대화와 닮아가는 말투",
      time: "금요일 밤 11:48 (밤늦은 감성 대화 구간)",
      academicNote: "웃음 길이(ㅋㅋㅋ·ㅎㅎ)와 말투가 서로 똑같이 닮아가며 다음 만남을 기약하는 확실한 그린라이트",
      messages: [
        { sender: "지훈", side: "right", text: "집 잘 들어갔어? 오늘 헤어지기 진짜 아쉽더라 ㅎㅎ" },
        { sender: "서연", side: "left", text: "저두요 ㅠㅠ 집에 오자마자 또 보고싶은 거 있죠 ㅎㅎㅎ" },
        { sender: "지훈", side: "right", text: "ㅋㅋㅋ 나도 똑같은 생각 중이었는데. 내일 모레 일요일에 우리 일찍 만날래?" },
        { sender: "서연", side: "left", text: "완전 좋아요!! 얼른 일요일 됐으면 좋겠다 잘자요♥" }
      ]
    }
  ],

  activity: {
    hourly: [180, 95, 20, 5, 0, 0, 15, 85, 190, 210, 180, 240, 310, 220, 195, 210, 240, 290, 380, 420, 490, 580, 640, 425],
    weekday: { "월": 610, "화": 640, "수": 680, "목": 710, "금": 820, "토": 690, "일": 670 },
    peakHour: "22시",
    peakWeekday: "금요일"
  },
  keywords: {
    roomKeywords: [
      { word: "보고싶어", count: 130 },
      { word: "주말에", count: 98 },
      { word: "조심히", count: 86 },
      { word: "귀여워", count: 79 },
      { word: "데리러", count: 64 },
      { word: "맛있는거", count: 58 }
    ]
  }
};

// ============================================================================
// [MODE 03 전용] 🚨 조별과제 빌런 탐지 샘플 데이터 (대학교 전공 팀플 5인 단톡방)
// ============================================================================
window.SAMPLE_VILLAIN_DATA = {
  isSample: true,
  sampleMode: "villain",
  roomName: "경영전략 캡스톤디자인 3조 (팀플 샘플)",
  totalMessages: 1240,
  dateRange: "학기 중 6주간 (중간발표 팀플)",
  tensionIndex: 38,
  peaceIndex: 62,
  tensionDesc: "마감 압박과 연락 두절로 인해 조장·실무진의 과업 독박 피로도가 누적된 주의 단계 단톡방입니다.",
  groupGrade: "AUDIT 주의",
  groupVibe: "조장 김민지와 실무러 이수빈이 전체 과업의 69.3%를 독박 캐리 중! 영혼 없는 '네네충'과 마감 직전 잠수 탄 무임승차 빌런이 공존하는 전형적인 대학 팀플 단톡방.",

  members: [
    {
      id: "김민지",
      name: "김민지 (조장)",
      cti: "ELTA",
      title: "독박 하드캐리 총대러",
      avatar: "🔥",
      totalMsgs: 520,
      msgRatio: 41.9,
      avgLen: 24.5,
      starters: 48,
      questions: 115,
      laughs: 45,
      photos: 38,
      replySpeed: 2,
      owlRatio: 28,
      earlyRatio: 18,
      mentionCount: 64,
      taskHits: 142,
      affectionHits: 12,
      tokenAgreementHits: 3,
      activeHours: "오후 2시-밤 11시",
      timePersona: "24시간 풀가동 총대러 🚨",
      topWords: [
        { word: "마감", count: 54 },
        { word: "취합", count: 48 },
        { word: "PPT", count: 42 },
        { word: "자료조사", count: 39 },
        { word: "공유부탁", count: 31 }
      ],
      radar: { initiative: 98, length: 92, emotion: 35, assertiveness: 88, humor: 30 },
      signatures: ["오늘 자정까지 취합할게요", "구글독스 링크 공유합니다", "확인 부탁드려요", "제가 수정본 올렸어요"],
      quotes: [
        "여러분 오늘 밤 11시까지 각자 맡은 파트 조사본 노션에 올려주세요!",
        "현우님 연락이 안 돼서 결론 파트도 일단 제가 초안 잡아뒀습니다 ㅠㅠ",
        "최종 발표 PPT 템플릿 수정이랑 애니메이션 적용까지 완료했습니다. 확인 부탁드려요!"
      ]
    },
    {
      id: "이수빈",
      name: "이수빈",
      cti: "ESTA",
      title: "자료조사·PPT 실무 에이스",
      avatar: "💻",
      totalMsgs: 340,
      msgRatio: 27.4,
      avgLen: 19.2,
      starters: 22,
      questions: 64,
      laughs: 38,
      photos: 29,
      replySpeed: 5,
      owlRatio: 22,
      earlyRatio: 15,
      mentionCount: 48,
      taskHits: 94,
      affectionHits: 10,
      tokenAgreementHits: 6,
      activeHours: "오후 3시-9시",
      timePersona: "칼마감 실무 에이스 🛠️",
      topWords: [
        { word: "장표", count: 38 },
        { word: "논문", count: 34 },
        { word: "통계청", count: 29 },
        { word: "업로드", count: 27 },
        { word: "피드백", count: 22 }
      ],
      radar: { initiative: 84, length: 80, emotion: 40, assertiveness: 82, humor: 35 },
      signatures: ["시장분석 장표 올렸습니다", "출처 표기 완료했어요", "민지님 고생 많으세요", "제가 도표 다시 그릴게요"],
      quotes: [
        "경쟁사 재무제표 3개년 비교 데이터 엑셀로 정리해서 드라이브에 올렸습니다!",
        "민지님 혼자 취합하기 힘드실 텐데 PPT 디자인 절반은 제가 맡아서 할게요.",
        "방금 교수님 피드백 반영해서 12-18페이지 수정 완료했습니다!"
      ]
    },
    {
      id: "정우진",
      name: "정우진",
      cti: "ILTR",
      title: "회의록·팩트체크 서포터",
      avatar: "📋",
      totalMsgs: 210,
      msgRatio: 16.9,
      avgLen: 16.4,
      starters: 11,
      questions: 32,
      laughs: 25,
      photos: 14,
      replySpeed: 9,
      owlRatio: 15,
      earlyRatio: 12,
      mentionCount: 28,
      taskHits: 58,
      affectionHits: 8,
      tokenAgreementHits: 9,
      activeHours: "오후 4시-8시",
      timePersona: "성실한 회의록 서기 📝",
      topWords: [
        { word: "회의록", count: 31 },
        { word: "대본", count: 25 },
        { word: "체크", count: 21 },
        { word: "일정", count: 19 },
        { word: "요약", count: 16 }
      ],
      radar: { initiative: 62, length: 72, emotion: 45, assertiveness: 55, humor: 40 },
      signatures: ["오늘 줌 회의록 정리본입니다", "발표 대본 초안 작성했어요", "오타 검수 완료했습니다"],
      quotes: [
        "오늘 줌 회의 내용 요약해서 공지사항에 등록해 두었습니다.",
        "제가 맡은 SWOT 분석 파트랑 발표 대본 스크립트 초안 공유합니다!"
      ]
    },
    {
      id: "박준영",
      name: "박준영",
      cti: "ISFR",
      title: "영혼 없는 네무새 빌런",
      avatar: "🦜",
      totalMsgs: 115,
      msgRatio: 9.3,
      avgLen: 5.2,
      starters: 2,
      questions: 3,
      laughs: 42,
      photos: 1,
      replySpeed: 29,
      owlRatio: 12,
      earlyRatio: 4,
      mentionCount: 19,
      taskHits: 4,
      affectionHits: 6,
      tokenAgreementHits: 82,
      activeHours: "오후 6시-10시",
      timePersona: "무논리 박수무당 🦜",
      topWords: [
        { word: "넵", count: 49 },
        { word: "좋습니다", count: 38 },
        { word: "다좋아요", count: 24 },
        { word: "고생하셨어요", count: 19 },
        { word: "확인", count: 14 }
      ],
      radar: { initiative: 15, length: 18, emotion: 60, assertiveness: 12, humor: 35 },
      signatures: ["넵 좋습니다!", "저도 다 좋아요 ㅎㅎ", "민지님 의견 따를게요", "우와 고생하셨어요!!"],
      quotes: [
        "넵!! 저는 다 좋습니다 ㅎㅎ",
        "우와 민지님이랑 수빈님 진짜 고생 많으셨어요 최고!!",
        "네네 저는 어떤 파트든 상관없어요 정해주시면 할게요!"
      ]
    },
    {
      id: "최현우",
      name: "최현우",
      cti: "ISTR",
      title: "마감 직전 잠수 탄 무임승차 빌런",
      avatar: "👻",
      totalMsgs: 55,
      msgRatio: 4.4,
      avgLen: 4.1,
      starters: 0,
      questions: 1,
      laughs: 8,
      photos: 0,
      replySpeed: 58,
      owlRatio: 65,
      earlyRatio: 2,
      mentionCount: 31,
      taskHits: 1,
      affectionHits: 1,
      tokenAgreementHits: 38,
      activeHours: "새벽 3시 출몰",
      timePersona: "연락두절 유령 빌런 👻",
      topWords: [
        { word: "죄송합니다", count: 18 },
        { word: "알바", count: 12 },
        { word: "노트북", count: 9 },
        { word: "확인했습니다", count: 8 },
        { word: "몸살", count: 6 }
      ],
      radar: { initiative: 4, length: 10, emotion: 15, assertiveness: 20, humor: 10 },
      signatures: ["아 제가 알바 중이라 지금 봤네요", "죄송합니다 노트북이 고장나서", "넵 확인했습니다"],
      quotes: [
        "아 죄송합니다 제가 알바 끝나고 핸드폰을 지금 봤네요;;",
        "갑자기 노트북이 먹통이 돼서 그런데 혹시 내일 오전까지 드려도 될까요?",
        "넵 확인했습니다 수고하셨습니다"
      ]
    }
  ],

  pairRankings: [
    {
      rank: 1,
      pair: ["김민지 (조장)", "이수빈"],
      types: ["ELTA", "ESTA"],
      replies: 410,
      streaks: 68,
      mentions: 92,
      score: 98,
      grade: "최고 콤비",
      badge: "🔥 팀플 구원투수 듀오",
      summary: "3조 학점을 멱살 잡고 끌어올린 눈물의 하드캐리 복식조.",
      details: "조장 김민지의 기획·취합과 이수빈의 데이터·PPT 제작이 맞물려 팀 과제의 약 70%를 두 사람이 완수했습니다."
    }
  ],

  // 조별과제 전용 증거 대화록
  villainEvidenceLogs: [
    {
      title: "증거 01 • 역할 분담 회의 중 '영혼 없는 네무새' & '읽씹 잠수' 현장",
      date: "중간발표 5일 전 오후 8:30",
      academicNote: "구체적인 의견은 하나도 안 내고 '넵 좋습니다'만 반복하거나 하루 뒤에 답장하며 일을 떠넘기는 장면",
      messages: [
        { sender: "김민지 (조장)", role: "LEADER", text: "여러분 이번 주 금요일까지 기업 재무분석이랑 SWOT 장표 초안 나와야 합니다. 각자 맡을 세부 주제 의견 주세요!" },
        { sender: "이수빈", role: "ACE", text: "저는 재무비율 3개년 추이랑 경쟁사 벤치마킹 도표 맡겠습니다. 내일 밤까지 1차본 올릴게요!" },
        { sender: "박준영", role: "NENE", text: "넵 좋습니다!! 저는 남는 거 아무거나 다 좋아요 ㅎㅎ" },
        { sender: "최현우", role: "VILLAIN", text: "(읽씹 • 14시간 뒤 아침 10시 답장) 아 제가 어제 잠들어서 지금 봤네요 넵 확인했습니다" }
      ]
    },
    {
      title: "증거 02 • 마감 당일 밤 '노트북 고장 & 알바 핑계'와 조장의 독박 수습",
      date: "최종 제출 당일 밤 11:15",
      academicNote: "마감 시간까지 연락이 두절되었다가 다른 조원이 결국 대신 다 하게 만드는 전형적인 무임승차 패턴",
      messages: [
        { sender: "김민지 (조장)", role: "LEADER", text: "현우님!! 밤 10시 마감인데 왜 아직 결론 파트 파일이 안 올라오나요? 전화도 안 받으시고 급합니다 ㅠㅠ" },
        { sender: "최현우", role: "VILLAIN", text: "죄송합니다 갑자기 알바 대타가 잡힌 데다가 집 와서 켜보니 노트북이 업데이트 무한로딩이라;;" },
        { sender: "이수빈", role: "ACE", text: "하... 지금 제출 40분 남았는데 그냥 민지님이랑 저랑 나눠서 결론 장표 바로 칠게요." },
        { sender: "박준영", role: "NENE", text: "헉 두 분 너무 고생 많으십니다 ㅠㅠ 화이팅!!" }
      ]
    }
  ],

  activity: {
    hourly: [45, 20, 10, 15, 0, 0, 5, 15, 35, 65, 85, 95, 110, 140, 165, 150, 130, 115, 145, 180, 210, 240, 195, 110],
    weekday: { "월": 240, "화": 210, "수": 280, "목": 320, "금": 110, "토": 40, "일": 40 },
    peakHour: "21시",
    peakWeekday: "목요일"
  },
  keywords: {
    roomKeywords: [
      { word: "마감", count: 84 },
      { word: "PPT", count: 76 },
      { word: "취합", count: 68 },
      { word: "넵좋습니다", count: 62 },
      { word: "자료조사", count: 54 },
      { word: "죄송합니다", count: 29 }
    ]
  }
};

