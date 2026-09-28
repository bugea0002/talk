// 범용 샘플 리포트 데이터 (누구나 공감할 수 있는 일반화된 4인 절친 단톡방 예시)

window.SAMPLE_REPORT_DATA = {
  roomName: "절친 4인방 단톡방 (체험용 샘플)",
  totalMessages: 8420,
  dateRange: "최근 6개월간",
  tensionIndex: 0,
  peaceIndex: 100,
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
      activeHours: "오후 3시~6시",
      timePersona: "오후~저녁의 전사 ⚔️",
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
      activeHours: "오전 10시, 낮 12시",
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
      activeHours: "오후 4시~7시",
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
      activeHours: "밤 10시~12시",
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
      badge: "💖 영혼의 단짝 (Soulmates)",
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
      badge: "⚡ 톰과 제리 (Spicy Rivalry)",
      summary: "툭하면 '뒤져라', '불지른다' 싸우지만 급할 땐 제일 먼저 달려오는 애증의 라이벌.",
      details: "둘 다 직진성(Assertive)이 강해 마주치면 폭발합니다. 매번 사소한 걸로 배틀을 뜨지만 뒤끝이 0%라 10초 만에 화해하는 끈끈한 현실 불알친구 케미입니다."
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
  }
};
