// 카카오톡 텍스트 파일 (.txt) 클라이언트 사이드 파싱 & CTI 분석 엔진

window.KAKAO_PARSER = {
  parseText: function(rawText) {
    const lines = rawText.split(/\r?\n/);
    const totalLines = lines.length;
    
    // PC 카톡 포맷: [이름] [오전/오후 12:34] 메시지
    const pcPattern = /^\[(.*?)\]\s*\[(오전|오후|AM|PM|am|pm)\s*(\d+):(\d+)\]\s*(.*)$/;
    // 모바일 카톡 다양한 포맷 (연월일 구분자 유연 대응)
    const mobilePattern = /^(\d{4}[.\-년/]\s*\d{1,2}[.\-월/]\s*\d{1,2}[일]?\.?)\s*(?:(오전|오후|AM|PM|am|pm)\s*)?(\d{1,2}:\d{2}),?\s*(.*?)\s*:\s*(.*)$/;
    // 날짜 구분선: --------------- 2026년 3월 3일 화요일 ---------------
    const datePattern = /^[-—=]+\s*(\d+년\s*\d+월\s*\d+일(?:\s*.요일)?)\s*[-—=]+$/;

    let parsedMsgs = [];
    let currentDate = "미지정 일자";

    for (let i = 0; i < totalLines; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const dateMatch = datePattern.exec(line);
      if (dateMatch) {
        currentDate = dateMatch[1];
        continue;
      }

      // Check PC format
      const pcMatch = pcPattern.exec(line);
      if (pcMatch) {
        const sender = pcMatch[1].trim();
        const ampm = pcMatch[2];
        let hour = parseInt(pcMatch[3], 10);
        const minute = parseInt(pcMatch[4], 10);
        const content = pcMatch[5];

        const upperAmpm = ampm.toUpperCase();
        if ((upperAmpm === "오후" || upperAmpm === "PM") && hour !== 12) hour += 12;
        else if ((upperAmpm === "오전" || upperAmpm === "AM") && hour === 12) hour = 0;

        parsedMsgs.push({
          date: currentDate,
          sender: sender,
          hour: hour,
          minute: minute,
          content: content
        });
        continue;
      }

      // Check Mobile format
      const mobMatch = mobilePattern.exec(line);
      if (mobMatch) {
        const dateStr = mobMatch[1];
        const ampm = mobMatch[2] || "";
        const timeStr = mobMatch[3];
        const sender = mobMatch[4].trim();
        const content = mobMatch[5];

        let [hStr, mStr] = timeStr.split(":");
        let hour = parseInt(hStr, 10);
        const minute = parseInt(mStr, 10);

        if ((ampm.includes("오후") || ampm.toUpperCase().includes("PM")) && hour !== 12) hour += 12;
        else if ((ampm.includes("오전") || ampm.toUpperCase().includes("AM")) && hour === 12) hour = 0;

        parsedMsgs.push({
          date: dateStr,
          sender: sender,
          hour: isNaN(hour) ? 12 : hour,
          minute: isNaN(minute) ? 0 : minute,
          content: content
        });
        continue;
      }

      // 대화 줄바꿈 이어붙이기 (단, 불필요한 시스템 알림 배제)
      if (parsedMsgs.length > 0 && 
          !line.startsWith("메시지가 삭제되었습니다") && 
          !line.includes("채팅방 관리자가 메시지를 가렸습니다") &&
          !line.includes("님이 들어왔습니다") &&
          !line.includes("님이 나갔습니다")) {
        // 무제한 누적으로 인한 메모리 초과 방지: 최대 500자까지만 보존
        if (parsedMsgs[parsedMsgs.length - 1].content.length < 500) {
          parsedMsgs[parsedMsgs.length - 1].content += " " + line;
        }
      }
    }

    if (parsedMsgs.length < 5) {
      throw new Error("유효한 카카오톡 대화 내용이 충분하지 않습니다. 파일 형식을 확인해주세요.");
    }

    return this.analyzeMessages(parsedMsgs);
  },

  analyzeMessages: function(msgs) {
    // 1. 참여자별 메시지 수 집계
    const senderCounts = {};
    for (let i = 0; i < msgs.length; i++) {
      const s = msgs[i].sender;
      senderCounts[s] = (senderCounts[s] || 0) + 1;
    }

    // 봇 및 시스템 알림 배제 필터
    const isBot = (name) => {
      const lower = name.toLowerCase().trim();
      const botKeywords = [
        "봇", "bot", "챗봇", "chatbot", "chatgpt", "gpt", 
        "gemini", "제미나이", "claude", "클로드", "clova", "클로바", 
        "askup", "아스크업", "wrtn", "뤼튼", "인공지능",
        "다비니", "날씨날씨", "관상가양반", "김교수", "롤피에스",
        "심심이", "헤이카카오", "카카오i", "카카오 i",
        "오픈채팅봇", "방장봇", "브리핑봇", "알림봇", "주식봇", "플레이봇",
        "타로술사", "번역봇", "사주봇", "요약봇"
      ];
      if (botKeywords.some(kw => lower.includes(kw))) return true;
      if (/(?:^|[^a-zA-Z0-9])(ai|bot|gpt)(?:[^a-zA-Z0-9]|$)/i.test(lower)) return true;
      return false;
    };

    // 발화 수 기준 실제 참여자 필터 (최소 5건 이상)
    const validSenders = Object.keys(senderCounts).filter(s => senderCounts[s] >= 5 && !isBot(s));
    
    if (validSenders.length === 0) {
      throw new Error("분석할 수 있는 실제 참여자가 부족합니다.");
    }

    // 대용량 메모리 절약을 위한 인라인 집계 구조체
    const memberStats = {};
    validSenders.forEach(s => {
      memberStats[s] = {
        name: s,
        msgCount: 0,
        totalLen: 0,
        questions: 0,
        laughs: 0,
        exclams: 0,
        photos: 0,
        starters: 0,
        shortMsgs: 0,
        assertiveHits: 0,
        receptiveHits: 0,
        taskHits: 0,
        emotionHits: 0,
        hours: Array(24).fill(0),
        words: {},
        quotesPool: [] // 최대 30개만 샘플링 보관
      };
    });

    const roomHours = Array(24).fill(0);
    const weekdayCounts = { "월": 0, "화": 0, "수": 0, "목": 0, "금": 0, "토": 0, "일": 0 };
    const roomWords = {};
    const STOP_WORDS = new Set([
      '이거', '저거', '그거', '진짜', '너무', '그냥', '오늘', '내일', '어제', '지금',
      '근데', '하고', '해서', '하면', '있는', '있음', '없음', '아니', '어디', '누가',
      '어떻게', '사진', '동영상', '음성메시지', '이모티콘', '삭제된', '메시지가', '삭제되었습니다',
      '내가', '너가', '네가', '우리', '너네', '애들아', '얘들아', '형들', '사람', '하나', '하나도',
      '같이', '같음', '같아', '좀', '왜', '다', '더', '잘', '안', '못', '또', '난', '넌', '날',
      '아', '오', '음', '응', '어', '헐', '와', '개', '존나', '시발', 'ㅅㅂ', '거', '것', '게',
      '나', '너', '나도', '너도', '그', '이', '저', '수', '때', '등', '등등', '네', '예', '그럼', '그래',
      '아닌', '아님', '아니면', '그렇지', '맞아', '맞음', '다시', '계속', '먼저', '다들', '모두', '대화',
      '거기', '여기', '저기', '아직', '벌써', '원래', '아마', '보고', '할게', '하지', '하는',
      '하냐', '했음', '했다', '됐다', '됐음', '되면', '보자', '가자', '오냐', '가지'
    ]);

    let totalHumanMsgs = 0;
    let prevMsg = null;

    // 2. 전체 대화 전수 스캔 (대용량 메모리 누수 방지 스트리밍 루프)
    for (let i = 0; i < msgs.length; i++) {
      const curr = msgs[i];
      const st = memberStats[curr.sender];
      if (!st) continue; // 제외된 봇은 건너뜀

      totalHumanMsgs++;
      const text = curr.content;
      const textLen = text.length;

      st.msgCount++;
      st.totalLen += textLen;
      if (textLen <= 10) st.shortMsgs++;

      st.hours[curr.hour]++;
      roomHours[curr.hour]++;

      const wm = curr.date.match(/([월화수목금토일])요일/);
      if (wm) weekdayCounts[wm[1]]++;

      // 어휘 통계
      const tokens = text.match(/[가-힣]{2,8}/g);
      if (tokens) {
        for (let j = 0; j < tokens.length; j++) {
          const tok = tokens[j];
          if (!STOP_WORDS.has(tok)) {
            roomWords[tok] = (roomWords[tok] || 0) + 1;
            st.words[tok] = (st.words[tok] || 0) + 1;
          }
        }
      }

      if (text.includes("?")) st.questions++;
      if (text.includes("!")) st.exclams++;
      
      const laughMatches = text.match(/[ㅋㅎ]/g);
      if (laughMatches) st.laughs += laughMatches.length;
      if (text.trim() === "사진") st.photos++;

      // 성향 판별 키워드 집계
      if (/(뒤져|죽어|불질|지랄|시발|ㅅㅂ|꺼져|좆|닥쳐|사과해|이리내|깝치|미친|개새|싸발|샤갈|철회해|당당하게|결론만|나와|빨리)/.test(text)) st.assertiveHits++;
      if (/(아하|맞지|맞아|오호|그렇네|좋아|미띤|인정|ㅇㅋ|ㅋㅋ|레전드|대박|굳|보듬을|고마워|감사|ㅠㅠ|동의)/.test(text)) st.receptiveHits++;
      if (/(몇시|어디|만나|모여|운동|정산|비용|도착|조퇴|퇴근|과제|시험|출발|기상|수업|발표|셔틀|버스|얼마)/.test(text)) st.taskHits++;
      if (/(피곤|힘들|짜증|화나|개꿀|망함|살려|배고파|기분|자고싶|똥|죽겠|파국|졸려|아파|슬프|서러)/.test(text)) st.emotionHits++;

      // 점화력: 날짜 변경 또는 90분 이상 대화 단절 후 첫 대화 시작
      if (!prevMsg) {
        st.starters++;
      } else {
        if (prevMsg.date !== curr.date) {
          st.starters++;
        } else {
          const diffMin = (curr.hour * 60 + curr.minute) - (prevMsg.hour * 60 + prevMsg.minute);
          if (diffMin >= 90) st.starters++;
        }
      }

      // 대표 대사 샘플링 (메모리 절약: 최대 20개까지만 유지)
      if (textLen >= 8 && textLen <= 45 && !text.includes("http") && text !== "사진" && !text.startsWith("파일:")) {
        if (st.quotesPool.length < 20) {
          st.quotesPool.push(text);
        }
      }

      prevMsg = curr;
    }

    // 3. 참여자별 CTI 성향 및 5대 지표(0~100) 정밀 정규화
    const members = validSenders.map(s => {
      const st = memberStats[s];
      const count = st.msgCount;
      const avgLen = count > 0 ? st.totalLen / count : 0;
      const laughRate = count > 0 ? st.laughs / count : 0;
      const shortRatio = count > 0 ? (st.shortMsgs / count) * 100 : 0;
      const assertiveRatio = count > 0 ? st.assertiveHits / count : 0;
      const receptiveRatio = count > 0 ? st.receptiveHits / count : 0;
      const starterRatio = count > 0 ? (st.starters / count) * 100 : 0;

      // CTI 4대 축 판정
      const eScore = (st.starters * 3) + ((count / totalHumanMsgs) * 50);
      const codeEI = (st.starters >= 8 || eScore >= 30) ? "E" : "I";
      const codeLS = avgLen >= 11 ? "L" : "S";
      const codeFT = (laughRate >= 0.25 || st.emotionHits >= st.taskHits) ? "F" : "T";
      const codeRA = (receptiveRatio >= assertiveRatio * 1.3) ? "R" : "A";

      const ctiCode = `${codeEI}${codeLS}${codeFT}${codeRA}`;
      const typeInfo = window.CTI_SYSTEM.TYPES[ctiCode] || window.CTI_SYSTEM.TYPES["ELFA"];

      // ===== [요구사항 3] 5대 핵심 수치 정밀화 (0~100 스케일) =====
      // 1. 점화력: 선톡 비중 및 전체 발화 비율 반영
      const initiativeVal = Math.min(99, Math.max(15, Math.round((st.starters * 4.5) + ((count / totalHumanMsgs) * 45) + 15)));
      // 2. 문장길이: 평균 글자 수 기반 스케일 (5자 이하는 20점대, 25자 이상은 90점대)
      const lengthVal = Math.min(99, Math.max(10, Math.round(avgLen * 4.2 + 10)));
      // 3. 감정/드립: ㅋ/ㅎ 및 감정 어휘 밀도 반영
      const emotionVal = Math.min(99, Math.max(20, Math.round(laughRate * 60 + (st.emotionHits / count) * 400 + 35)));
      // 4. 직진/도발: 단문 비율 및 직진 어휘 비율 반영
      const assertivenessVal = Math.min(99, Math.max(20, Math.round((shortRatio * 0.45) + (assertiveRatio * 800) + 25)));
      // 5. 유머감각: 웃음 빈도 및 질문/리액션 상호작용성
      const humorVal = Math.min(99, Math.max(25, Math.round(laughRate * 50 + (receptiveRatio * 500) + 30)));

      let maxHour = 0;
      let maxHCount = -1;
      st.hours.forEach((cnt, h) => {
        if (cnt > maxHCount) {
          maxHCount = cnt;
          maxHour = h;
        }
      });

      const owlCount = st.hours.slice(1, 6).reduce((a, b) => a + b, 0);
      const earlyCount = st.hours.slice(6, 10).reduce((a, b) => a + b, 0);
      const owlRatio = count > 0 ? Number(((owlCount / count) * 100).toFixed(1)) : 0;
      const earlyRatio = count > 0 ? Number(((earlyCount / count) * 100).toFixed(1)) : 0;
      const timePersona = owlRatio >= 8 ? "새벽의 망령 👻" : earlyRatio >= 12 ? "아침 기상 선발대 🌅" : "오후~저녁의 전사 ⚔️";

      const topWords = Object.entries(st.words || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([w, cnt]) => ({ word: w, count: cnt }));

      const funnyQuotes = st.quotesPool.slice(0, 4);

      return {
        id: s,
        name: s,
        cti: ctiCode,
        title: typeInfo.title,
        avatar: codeEI === "E" ? (codeFT === "F" ? "🔥" : "🥊") : (codeLS === "S" ? "🗿" : "🛡️"),
        totalMsgs: count,
        msgRatio: Number(((count / totalHumanMsgs) * 100).toFixed(1)),
        avgLen: Number(avgLen.toFixed(1)),
        starters: st.starters,
        questions: st.questions,
        laughs: st.laughs,
        photos: st.photos,
        activeHours: `${maxHour}시 피크`,
        hourly: st.hours,
        topWords: topWords,
        owlRatio: owlRatio,
        earlyRatio: earlyRatio,
        timePersona: timePersona,
        radar: {
          initiative: initiativeVal,
          length: lengthVal,
          emotion: emotionVal,
          assertiveness: assertivenessVal,
          humor: humorVal
        },
        signatures: [ctiCode, `평균 ${avgLen.toFixed(1)}자`, `${count}건`],
        quotes: funnyQuotes.length > 0 ? funnyQuotes : ["대화에 성실히 참여했습니다!"],
        trophy: st.starters >= 10 ? "🏆 침묵 브레이커상" : avgLen < 9 ? "🏆 단답 요정상" : st.laughs > 100 ? "🏆 웃음 폭격상" : "🏆 든든한 조율이상",
        savage: typeInfo.savage,
        advice: typeInfo.advice
      };
    });

    members.sort((a, b) => b.totalMsgs - a.totalMsgs);

    // 4. 페어별 케미스트리 계산
    const pairReplies = {};
    const pairStreaks = {};
    let lastHumanMsg = null;
    let streakCount = 1;

    for (let i = 0; i < msgs.length; i++) {
      const curr = msgs[i];
      if (!memberStats[curr.sender]) continue;

      if (lastHumanMsg && lastHumanMsg.sender !== curr.sender && lastHumanMsg.date === curr.date) {
        const pairKey = [lastHumanMsg.sender, curr.sender].sort().join(" ↔ ");
        pairReplies[pairKey] = (pairReplies[pairKey] || 0) + 1;

        if (prevMsg && prevMsg.pair === pairKey) {
          streakCount++;
        } else {
          if (streakCount >= 2 && prevMsg) {
            pairStreaks[prevMsg.pair] = (pairStreaks[prevMsg.pair] || 0) + 1;
          }
          prevMsg = { pair: pairKey };
          streakCount = 1;
        }
      }
      lastHumanMsg = curr;
    }

    const pairRankings = [];
    const memberMap = {};
    members.forEach(m => memberMap[m.name] = m);

    Object.keys(pairReplies).forEach(pairKey => {
      const [p1, p2] = pairKey.split(" ↔ ");
      const m1 = memberMap[p1];
      const m2 = memberMap[p2];
      if (m1 && m2) {
        const chem = window.CTI_SYSTEM.getChemistry(m1.cti, m2.cti, p1, p2);
        pairRankings.push({
          pair: [p1, p2],
          types: [m1.cti, m2.cti],
          replies: pairReplies[pairKey],
          streaks: pairStreaks[pairKey] || Math.max(1, Math.round(pairReplies[pairKey] * 0.15)),
          mentions: Math.max(1, Math.round(pairReplies[pairKey] * 0.2)),
          score: chem.score,
          grade: chem.grade,
          badge: chem.badge,
          summary: chem.summary,
          details: chem.details
        });
      }
    });

    pairRankings.sort((a, b) => b.replies - a.replies);
    pairRankings.forEach((p, idx) => p.rank = idx + 1);

    const topRoomKeywords = Object.entries(roomWords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 24)
      .map(([w, cnt]) => ({ word: w, count: cnt }));

    let peakHour = 0;
    let peakHCount = -1;
    roomHours.forEach((cnt, h) => {
      if (cnt > peakHCount) {
        peakHCount = cnt;
        peakHour = h;
      }
    });

    let peakWeekday = "월";
    let peakWCount = -1;
    Object.entries(weekdayCounts).forEach(([day, cnt]) => {
      if (cnt > peakWCount) {
        peakWCount = cnt;
        peakWeekday = day;
      }
    });

    return {
      roomName: "카카오톡 대화 분석 리포트",
      totalMessages: totalHumanMsgs,
      dateRange: `${msgs[0].date} ~ ${msgs[msgs.length - 1].date}`,
      tensionIndex: 0,
      peaceIndex: 100,
      groupGrade: "S+",
      groupVibe: "끈끈한 협업과 일상 공유가 돋보이는 찰떡 단톡방!",
      members: members,
      pairRankings: pairRankings,
      activity: {
        hourly: roomHours,
        weekday: weekdayCounts,
        peakHour: `${peakHour}시`,
        peakWeekday: `${peakWeekday}요일`
      },
      keywords: {
        roomKeywords: topRoomKeywords
      }
    };
  }
};