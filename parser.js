// 카카오톡 텍스트 파일 (.txt) 클라이언트 사이드 100% 전수 파싱 & CTI 분석 엔진

window.KAKAO_PARSER = {
  // 날짜 문자열에서 요일(월~일)을 수학적으로 정확히 역산출하는 헬퍼
  getWeekdayFromDateStr: function(dateStr) {
    if (!dateStr) return null;
    // 1. 텍스트에 명시된 요일 확인 ('금요일', '(금)' 등)
    const wm = dateStr.match(/([월화수목금토일])\s*요일/) || dateStr.match(/\(([월화수목금토일])\)/);
    if (wm) return wm[1];

    // 2. 명시된 요일이 없을 경우 (아이폰 등), 날짜 숫자로 Date 객체 생성하여 계산
    const m = dateStr.match(/(\d{4})[년.\-\/]\s*(\d{1,2})[월.\-\/]\s*(\d{1,2})/);
    if (m) {
      const y = parseInt(m[1], 10);
      const mon = parseInt(m[2], 10) - 1;
      const d = parseInt(m[3], 10);
      const dt = new Date(y, mon, d);
      if (!isNaN(dt.getTime())) {
        const days = ["일", "월", "화", "수", "목", "금", "토"];
        return days[dt.getDay()];
      }
    }
    return null;
  },

  // 날짜 표준화 포맷터 (YYYY.MM.DD)
  normalizeDateStr: function(dateStr) {
    if (!dateStr) return "미지정 일자";
    const m = dateStr.match(/(\d{4})[년.\-\/]\s*(\d{1,2})[월.\-\/]\s*(\d{1,2})/);
    if (m) {
      const y = m[1];
      const mon = String(parseInt(m[2], 10)).padStart(2, '0');
      const d = String(parseInt(m[3], 10)).padStart(2, '0');
      return `${y}.${mon}.${d}`;
    }
    return dateStr.replace(/[-—=]/g, '').trim();
  },

  parseText: function(rawText) {
    const lines = rawText.split(/\r?\n/);
    const totalLines = lines.length;
    
    // 1. PC 카톡 포맷 (Windows / Mac)
    const pcPattern = /^\[(.*?)\]\s*\[(?:(오전|오후|AM|PM|am|pm)\s*)?(\d{1,2}):(\d{2})\]\s*(.*)$/;
    
    // 2. 모바일 카톡 포맷 (Android / iOS)
    const mobilePattern = /^(\d{4}[년.\-\/]\s*\d{1,2}[월.\-\/]\s*\d{1,2}(?:일|\.)?(?:\s*\(?[가-힣A-Za-z]+요일\)?|\s*\([가-힣]\))?[.\s]*)\s*(?:(오전|오후|AM|PM|am|pm)\s*)?(\d{1,2}:\d{2}(?::\d{2})?),?\s*(.*?)\s*:\s*(.*)$/;

    // 3. 날짜 구분선
    const datePattern = /^[-—=]+\s*(\d{4}[년.\-\/]\s*\d{1,2}[월.\-\/]\s*\d{1,2}(?:일|\.)?(?:\s*\(?[가-힣A-Za-z]+요일\)?|\s*\([가-힣]\))?[.\s]*)[-—=]+$/;

    let parsedMsgs = [];
    let currentDate = "미지정 일자";
    let currentWeekday = null;

    for (let i = 0; i < totalLines; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // 날짜 구분선 매칭
      const dateMatch = datePattern.exec(line);
      if (dateMatch) {
        currentDate = dateMatch[1].trim();
        currentWeekday = this.getWeekdayFromDateStr(currentDate);
        continue;
      }

      // PC 카톡 포맷 검사
      const pcMatch = pcPattern.exec(line);
      if (pcMatch) {
        const sender = pcMatch[1].trim();
        const ampm = pcMatch[2] ? pcMatch[2].toUpperCase() : "";
        let hour = parseInt(pcMatch[3], 10);
        const minute = parseInt(pcMatch[4], 10);
        const content = pcMatch[5];

        if ((ampm === "오후" || ampm === "PM") && hour !== 12) hour += 12;
        else if ((ampm === "오전" || ampm === "AM") && hour === 12) hour = 0;

        parsedMsgs.push({
          date: currentDate,
          weekday: currentWeekday,
          sender: sender,
          hour: isNaN(hour) ? 12 : hour,
          minute: isNaN(minute) ? 0 : minute,
          content: content
        });
        continue;
      }

      // 모바일 카톡 포맷 검사
      const mobMatch = mobilePattern.exec(line);
      if (mobMatch) {
        const rawDate = mobMatch[1].trim();
        const ampm = mobMatch[2] ? mobMatch[2].toUpperCase() : "";
        const timeStr = mobMatch[3];
        const sender = mobMatch[4].trim();
        const content = mobMatch[5];

        let [hStr, mStr] = timeStr.split(":");
        let hour = parseInt(hStr, 10);
        const minute = parseInt(mStr, 10);

        if ((ampm.includes("오후") || ampm.includes("PM")) && hour !== 12) hour += 12;
        else if ((ampm.includes("오전") || ampm.includes("AM")) && hour === 12) hour = 0;

        const weekday = this.getWeekdayFromDateStr(rawDate) || currentWeekday;

        parsedMsgs.push({
          date: rawDate,
          weekday: weekday,
          sender: sender,
          hour: isNaN(hour) ? 12 : hour,
          minute: isNaN(minute) ? 0 : minute,
          content: content
        });
        continue;
      }

      // 줄바꿈 본문 누적 (최대 800자)
      if (parsedMsgs.length > 0 && 
          !line.startsWith("메시지가 삭제되었습니다") && 
          !line.includes("채팅방 관리자가 메시지를 가렸습니다") &&
          !line.includes("님이 들어왔습니다") &&
          !line.includes("님이 나갔습니다") &&
          !line.includes("채팅을 시작합니다")) {
        const lastMsg = parsedMsgs[parsedMsgs.length - 1];
        if (lastMsg.content.length < 800) {
          lastMsg.content += " " + line;
        }
      }
    }

    if (parsedMsgs.length < 5) {
      throw new Error("유효한 카카오톡 대화 내용이 충분하지 않습니다. 파일 형식(.txt)을 확인해주세요.");
    }

    return this.analyzeMessages(parsedMsgs);
  },

  analyzeMessages: function(msgs) {
    const totalCount = msgs.length;

    // 1. 참여자별 발화 수 집계
    const senderCounts = {};
    for (let i = 0; i < totalCount; i++) {
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

    let validSenders = Object.keys(senderCounts).filter(s => senderCounts[s] >= 5 && !isBot(s));
    if (validSenders.length === 0) {
      validSenders = Object.keys(senderCounts).filter(s => senderCounts[s] >= 2 && !isBot(s));
    }
    if (validSenders.length === 0) {
      validSenders = Object.keys(senderCounts).filter(s => !isBot(s));
    }
    
    if (validSenders.length === 0) {
      throw new Error("분석할 수 있는 실제 참여자가 부족합니다.");
    }

    // [고도화 핵심 정규식] 친밀 장난 욕설 vs 진짜 기싸움/냉전 분리 판정
    const SWEAR_REGEX = /(?:시발|ㅅㅂ|존나|ㅈㄴ|미친|개새|지랄|ㅈㄹ|닥쳐|꺼져|뒤져|병신|ㅂㅅ|새끼|뒈져|염병|쌉|개빡)/i;
    const LAUGH_REGEX = /[ㅋㅎ]|(?:\^_\^|\^\^|웃|개웃|핵웃|도파민|미틴|개꿀|재밌|ㅠㅠ|ㅜㅜ)/;
    const CONFLICT_REGEX = /(?:말조심|선\s*넘|사과해|적당히\s*해|작작\s*해|기분\s*나쁘|어쩌라고|상식적으로|생각이\s*없|네가\s*뭔데|니가\s*뭔데|말\s*다했|됐고|알아서\s*해|참나|어이없|열받네|짜증나|그만해라|왜\s*따져|시비|싸우자는|선\s*긋|따지지\s*마|뭔\s*상관|상관마|왜\s*정색)/;

    // 참여자별 고속 집계 구조체
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
        banterHits: 0,       // 친밀 장난 욕설
        coldHits: 0,         // 진짜 정색/기싸움
        hours: Array(24).fill(0),
        words: {},
        validQuoteCount: 0,
        quotesPool: [],      // 저수지 샘플링 (전체 기간 균등 추출)
        recentQuotes: [],    // 최근 대사 버퍼 (최근 흐름 반영)
        replyDiffs: [],      // 직전 다른 사람 말에 답장하기까지 걸린 실제 시간(분)
        mentionCount: 0      // 다른 사람들에게 불린(멘션된) 실제 횟수
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
    let validDates = [];
    let playfulSwearCount = 0;
    let coldConflictCount = 0;

    // 페어 티키타카 및 실제 멘션 집계
    const pairReplies = {};
    const pairStreaks = {};
    const pairMentions = {};
    let lastPairMsg = null;
    let streakCount = 1;

    // 2. 전체 대화 100% 전수 스트리밍 스캔
    for (let i = 0; i < totalCount; i++) {
      const curr = msgs[i];
      const st = memberStats[curr.sender];
      if (!st) continue;

      totalHumanMsgs++;
      const text = curr.content;
      const textLen = text.length;

      st.msgCount++;
      st.totalLen += textLen;
      if (textLen <= 10) st.shortMsgs++;

      st.hours[curr.hour]++;
      roomHours[curr.hour]++;

      // 요일 누적
      if (curr.weekday && weekdayCounts[curr.weekday] !== undefined) {
        weekdayCounts[curr.weekday]++;
      }

      // 유효 날짜 수집
      if (curr.date && curr.date !== "미지정 일자" && (validDates.length === 0 || validDates[validDates.length - 1] !== curr.date)) {
        validDates.push(curr.date);
      }

      // 어휘 통계 전수 추출
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

      // 기호 및 웃음 분석
      if (text.includes("?")) st.questions++;
      if (text.includes("!")) st.exclams++;
      
      const laughMatches = text.match(/[ㅋㅎ]/g);
      if (laughMatches) st.laughs += laughMatches.length;
      if (text.trim() === "사진" || text.startsWith("사진")) st.photos++;

      // [기싸움 vs 장난 분리 알고리즘]
      const hasSwear = SWEAR_REGEX.test(text);
      const hasLaugh = LAUGH_REGEX.test(text);
      const hasConflict = CONFLICT_REGEX.test(text);

      if ((hasConflict || hasSwear) && !hasLaugh) {
        coldConflictCount++;
        st.coldHits++;
      } else if (hasSwear && hasLaugh) {
        playfulSwearCount++;
        st.banterHits++;
      }

      // 성향 판별 키워드 집계
      if (hasSwear || hasConflict) st.assertiveHits++;
      if (/(아하|맞지|맞아|오호|그렇네|좋아|미띤|인정|ㅇㅋ|ㅋㅋ|레전드|대박|굳|보듬을|고마워|감사|ㅠㅠ|동의)/.test(text)) st.receptiveHits++;
      if (/(몇시|어디|만나|모여|운동|정산|비용|도착|조퇴|퇴근|과제|시험|출발|기상|수업|발표|셔틀|버스|얼마)/.test(text)) st.taskHits++;
      if (/(피곤|힘들|짜증|화나|개꿀|망함|살려|배고파|기분|자고싶|똥|죽겠|파국|졸려|아파|슬프|서러)/.test(text)) st.emotionHits++;

      // 실제 참여자 이름 호명(멘션) 집계
      for (let sIdx = 0; sIdx < validSenders.length; sIdx++) {
        const otherName = validSenders[sIdx];
        if (otherName !== curr.sender && (text.includes(otherName) || text.includes(`@${otherName}`))) {
          const pKey = [curr.sender, otherName].sort().join(" ↔ ");
          pairMentions[pKey] = (pairMentions[pKey] || 0) + 1;
          if (memberStats[otherName]) {
            memberStats[otherName].mentionCount++;
          }
        }
      }

      // 점화력 & 답장 반응 속도 계산
      if (!prevMsg) {
        st.starters++;
      } else {
        if (prevMsg.date !== curr.date) {
          st.starters++;
        } else {
          const diffMin = (curr.hour * 60 + curr.minute) - (prevMsg.hour * 60 + prevMsg.minute);
          if (diffMin >= 90 || diffMin < 0) {
            st.starters++;
          } else if (prevMsg.sender !== curr.sender && diffMin >= 0 && diffMin <= 60) {
            // 직전 발화자가 다른 사람이고 60분 이내에 답변을 남겼을 때의 실제 반응 속도
            st.replyDiffs.push(diffMin);
          }
        }
      }

      // 대표 대사 수집: 저수지 샘플링 (전체 기간 균등 추출)
      const isValidQuote = textLen >= 6 && textLen <= 50 && 
                           !text.includes("http") && 
                           !text.startsWith("사진") && 
                           !text.startsWith("파일:") && 
                           !text.startsWith("이모티콘") &&
                           !/^[ㅋㅎㅠㅜ!?~.\s]+$/.test(text);

      if (isValidQuote) {
        st.validQuoteCount++;
        const poolCapacity = 25;
        if (st.quotesPool.length < poolCapacity) {
          st.quotesPool.push(text);
        } else {
          const r = Math.floor(Math.random() * st.validQuoteCount);
          if (r < poolCapacity) {
            st.quotesPool[r] = text;
          }
        }
        st.recentQuotes.push(text);
        if (st.recentQuotes.length > 8) st.recentQuotes.shift();
      }

      // 1:1 페어 티키타카 카운팅
      if (lastPairMsg && lastPairMsg.sender !== curr.sender && lastPairMsg.date === curr.date) {
        const pairKey = [lastPairMsg.sender, curr.sender].sort().join(" ↔ ");
        pairReplies[pairKey] = (pairReplies[pairKey] || 0) + 1;

        if (prevMsg && prevMsg.pair === pairKey) {
          streakCount++;
        } else {
          if (streakCount >= 2 && prevMsg && prevMsg.pair) {
            pairStreaks[prevMsg.pair] = (pairStreaks[prevMsg.pair] || 0) + 1;
          }
          prevMsg = { pair: pairKey };
          streakCount = 1;
        }
      }
      lastPairMsg = curr;
      prevMsg = curr;
    }

    // 3. 참여자별 CTI 성향 및 5대 지표(0~100) 정밀 정규화
    const totalStarters = validSenders.reduce((sum, s) => sum + memberStats[s].starters, 0);
    const avgStartersPerPerson = validSenders.length > 0 ? (totalStarters / validSenders.length) : 1;
    const fairShareRatio = validSenders.length > 0 ? (100 / validSenders.length) : 25;
    const totalChars = validSenders.reduce((sum, s) => sum + memberStats[s].totalLen, 0);
    const roomAvgLen = totalHumanMsgs > 0 ? (totalChars / totalHumanMsgs) : 10;

    const members = validSenders.map(s => {
      const st = memberStats[s];
      const count = st.msgCount;
      const avgLen = count > 0 ? st.totalLen / count : 0;
      const laughRate = count > 0 ? st.laughs / count : 0;
      const shortRatio = count > 0 ? (st.shortMsgs / count) * 100 : 0;
      const assertiveRatio = count > 0 ? st.assertiveHits / count : 0;
      const receptiveRatio = count > 0 ? st.receptiveHits / count : 0;
      const msgRatioVal = count > 0 ? (count / totalHumanMsgs) * 100 : 0;

      // CTI 4대 축 정밀 판정 (상대적 방 환경 적응형)
      // 1. E (점화형) vs I (관조형): 선톡 개시가 평균 이상이거나 발화 점유율이 균등 지분 이상인 경우
      const isHighInitiator = st.starters >= Math.max(2, Math.round(avgStartersPerPerson * 0.9));
      const isHighTalker = msgRatioVal >= (fairShareRatio * 0.85);
      const codeEI = (isHighInitiator || isHighTalker) ? "E" : "I";

      // 2. L (서사형) vs S (단답형): 평균 글자 수가 방 전체 평균 이상이거나 10자 이상인 경우
      const codeLS = (avgLen >= Math.max(9, roomAvgLen * 0.95)) ? "L" : "S";

      // 3. F (감정·드립형) vs T (행동·팩트형): 웃음 비율이 높거나 일상 감정/드립 교류가 과제/정산보다 많은 경우
      const codeFT = (laughRate >= 0.20 || st.emotionHits >= st.taskHits) ? "F" : "T";

      // 4. R (수용·완충형) vs A (직진·도발형): 맞장구/수용 어휘가 직진/도발 어휘보다 1.2배 이상 많은 경우
      const codeRA = (receptiveRatio >= assertiveRatio * 1.2) ? "R" : "A";

      const ctiCode = `${codeEI}${codeLS}${codeFT}${codeRA}`;
      const typeInfo = window.CTI_SYSTEM.TYPES[ctiCode] || window.CTI_SYSTEM.TYPES["ELFA"];

      // 5대 핵심 수치 (0~100 스케일)
      const initiativeVal = Math.min(99, Math.max(15, Math.round((st.starters * 4.5) + ((count / totalHumanMsgs) * 45) + 15)));
      const lengthVal = Math.min(99, Math.max(10, Math.round(avgLen * 4.2 + 10)));
      const emotionVal = Math.min(99, Math.max(20, Math.round(laughRate * 60 + (st.emotionHits / count) * 400 + 35)));
      const assertivenessVal = Math.min(99, Math.max(20, Math.round((shortRatio * 0.45) + (assertiveRatio * 800) + 25)));
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

      // 대표 대사 (저수지 샘플링 + 최근 대사)
      let combinedQuotes = [];
      if (st.recentQuotes.length > 0) {
        combinedQuotes.push(...[...st.recentQuotes].reverse().slice(0, 2));
      }
      if (st.quotesPool.length > 0) {
        const poolCopy = [...st.quotesPool].sort(() => 0.5 - Math.random());
        poolCopy.forEach(q => {
          if (!combinedQuotes.includes(q) && combinedQuotes.length < 4) {
            combinedQuotes.push(q);
          }
        });
      }
      if (combinedQuotes.length === 0) {
        combinedQuotes = ["대화에 성실히 참여했습니다!"];
      }

      // [고도화] 개인별 실제 데이터 기반 맞춤형 시그니처 해시태그 생성
      const sigs = [];
      if (owlRatio >= 12) sigs.push("새벽의망령");
      else if (earlyRatio >= 12) sigs.push("미라클모닝");
      
      if (st.banterHits >= 3) sigs.push("매운맛장난러");
      else if (st.coldHits >= 3) sigs.push("단호박직진");
      
      if (avgLen <= 7) sigs.push("초압축단답");
      else if (avgLen >= 18) sigs.push("장문썰보따리");
      
      if (st.questions >= 15) sigs.push("물음표폭격기");
      if (laughRate >= 0.28) sigs.push("웃음헤픈편");
      if (st.starters >= 10) sigs.push("선톡장인");
      if (st.photos >= 10) sigs.push("사진폭탄러");
      
      topWords.slice(0, 2).forEach(tw => {
        if (sigs.length < 4 && !sigs.includes(tw.word)) sigs.push(tw.word);
      });
      if (sigs.length < 3) sigs.push(ctiCode);

      // 실제 평균 답장 속도 (분)
      let calculatedReplySpeed = 15;
      if (st.replyDiffs && st.replyDiffs.length > 0) {
        const sumDiff = st.replyDiffs.reduce((a, b) => a + b, 0);
        calculatedReplySpeed = Math.max(1, Math.round(sumDiff / st.replyDiffs.length));
      }

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
        banterHits: st.banterHits,
        coldHits: st.coldHits,
        activeHours: `${maxHour}시 피크`,
        hourly: st.hours,
        topWords: topWords,
        owlRatio: owlRatio,
        earlyRatio: earlyRatio,
        replySpeed: calculatedReplySpeed,
        mentionCount: st.mentionCount,
        timePersona: timePersona,
        radar: {
          initiative: initiativeVal,
          length: lengthVal,
          emotion: emotionVal,
          assertiveness: assertivenessVal,
          humor: humorVal
        },
        signatures: sigs.slice(0, 4),
        quotes: combinedQuotes,
        savage: typeInfo.savage,
        advice: typeInfo.advice
      };
    });

    members.sort((a, b) => b.totalMsgs - a.totalMsgs);

    // [고도화] 1인 1유니크 트로피 시스템: 겹치지 않게 각 멤버의 상대적 개성 최상위 지표를 찾아 수여
    const trophyPool = [
      { title: "🏆 침묵 브레이커 점화상", getVal: m => m.starters },
      { title: "🏆 도파민 폭격 대상", getVal: m => m.laughs },
      { title: "🏆 새벽 수호 부엉이상", getVal: m => m.owlRatio },
      { title: "🏆 아침 기상 선발대상", getVal: m => m.earlyRatio },
      { title: "🏆 1초 컷 사이다 단답상", getVal: m => (m.avgLen > 0 ? (100 - m.avgLen) : 0) },
      { title: "🏆 셰익스피어 서사문학상", getVal: m => m.avgLen },
      { title: "🏆 호기심 대마왕상", getVal: m => m.questions },
      { title: "🏆 찰진 매운맛 드립상", getVal: m => m.banterHits },
      { title: "🏆 갤러리 털이범 사진상", getVal: m => m.photos },
      { title: "🏆 든든한 멘탈 완충재상", getVal: m => (m.radar ? m.radar.emotion : 50) }
    ];

    const awardedTrophies = new Set();
    members.forEach((m, idx) => {
      if (idx === 0) {
        m.trophy = "🏆 톡방 토크 지배자상";
        awardedTrophies.add(m.trophy);
        return;
      }

      let bestTrophy = null;
      let bestScore = -1;

      trophyPool.forEach(tp => {
        if (!awardedTrophies.has(tp.title)) {
          const val = tp.getVal(m);
          if (val > bestScore) {
            bestScore = val;
            bestTrophy = tp.title;
          }
        }
      });

      if (!bestTrophy) {
        bestTrophy = `🏆 개성 넘치는 ${m.title}상`;
      }

      awardedTrophies.add(bestTrophy);
      m.trophy = bestTrophy;
    });

    // 4. 페어별 케미스트리 랭킹 산출 (실제 상호작용 및 멘션 주입)
    const pairRankings = [];
    const memberMap = {};
    members.forEach(m => memberMap[m.name] = m);

    Object.keys(pairReplies).forEach(pairKey => {
      const [p1, p2] = pairKey.split(" ↔ ");
      const m1 = memberMap[p1];
      const m2 = memberMap[p2];
      if (m1 && m2) {
        const replies = pairReplies[pairKey];
        const mentions = pairMentions[pairKey] || 0;
        const chem = window.CTI_SYSTEM.getChemistry(m1.cti, m2.cti, p1, p2, replies, mentions);
        pairRankings.push({
          pair: [p1, p2],
          types: [m1.cti, m2.cti],
          replies: replies,
          streaks: pairStreaks[pairKey] || Math.max(1, Math.round(replies * 0.15)),
          mentions: mentions,
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

    const startDate = validDates.length > 0 ? this.normalizeDateStr(validDates[0]) : "시작일 미상";
    const endDate = validDates.length > 0 ? this.normalizeDateStr(validDates[validDates.length - 1]) : "종료일 미상";

    // [고도화 핵심] 기싸움 지수 & 평화 지수 정밀 수학적 산출
    const cRate = totalHumanMsgs > 0 ? (coldConflictCount / totalHumanMsgs) : 0;
    let tensionIndex = 0;
    let tensionDesc = "악의적 비난 없는 무자극 청정 구역";

    if (coldConflictCount === 0) {
      tensionIndex = 0;
      tensionDesc = playfulSwearCount > 0 
        ? `매운맛 드립은 넘치지만 진짜 갈등 0% (찐친 청정 구역)` 
        : `서로를 존중하고 배려하는 무자극 힐링 구역`;
    } else if (cRate <= 0.002) {
      tensionIndex = Math.min(10, Math.max(3, Math.round(cRate * 4000)));
      tensionDesc = `사소한 서운함·가벼운 정색 신호 극소량 감지`;
    } else if (cRate <= 0.008) {
      tensionIndex = Math.min(40, Math.max(12, Math.round(10 + (cRate - 0.002) * 5000)));
      tensionDesc = `주의 요망! 간헐적 냉전과 날선 대화 감지`;
    } else {
      tensionIndex = Math.min(95, Math.max(45, Math.round(40 + (cRate - 0.008) * 3000)));
      tensionDesc = `경보 발령! 잦은 갈등과 날선 언어 폭력 주의보`;
    }
    const peaceIndex = 100 - tensionIndex;

    // [고도화 핵심] 방 전체 우정 등급 (groupGrade) 동적 평가
    const topTalkerRatio = members.length > 0 ? members[0].msgRatio : 0;
    let healthScore = 75;
    if (tensionIndex >= 25) healthScore -= (tensionIndex - 20) * 0.9;
    if (playfulSwearCount >= 3 && tensionIndex < 10) healthScore += 10;
    if (topTalkerRatio < 40) healthScore += 8;
    if (pairRankings.length >= 3) healthScore += 7;
    const groupGrade = healthScore >= 92 ? "S+" : healthScore >= 82 ? "S" : healthScore >= 72 ? "A+" : healthScore >= 60 ? "A" : "B+";

    // [고도화 핵심] 톡방 총평 (groupVibe) 다채로운 알고리즘 생성
    const nightOwlRatio = totalHumanMsgs > 0 ? Number(((roomHours.slice(1, 6).reduce((a, b) => a + b, 0) / totalHumanMsgs) * 100).toFixed(1)) : 0;
    const totalLaughs = members.reduce((sum, m) => sum + m.laughs, 0);
    const laughDensity = totalHumanMsgs > 0 ? (totalLaughs / totalHumanMsgs) : 0;

    let groupVibe = "";
    if (tensionIndex >= 30) {
      groupVibe = `장난과 일상 사이에 웃음기 빠진 날선 피드백과 정색 신호가 포착됩니다 (폭력 지수 ${tensionIndex}%). 서로가 편안한 사이일수록 말의 온도를 살피는 세심한 배려가 단톡방의 수명을 지켜줍니다.`;
    } else if (playfulSwearCount >= Math.max(3, totalHumanMsgs * 0.008) && tensionIndex < 10) {
      groupVibe = `필터링 없는 거친 드립과 장난이 난무하지만 99%가 ㅋㅋㅋㅋ와 함께 터지는 '뒤끝 0% 찐친 도파민 단톡방'입니다. 겉은 매운맛이지만 속은 단단한 신뢰와 애정으로 뭉쳐 있습니다.`;
    } else if (nightOwlRatio >= 15) {
      groupVibe = `자정이 넘어야 본격적인 텐션이 폭발하는 '심야 아지트 단톡방'입니다 (새벽 발화 비중 ${nightOwlRatio}%). 밤잠을 잊은 채 쏟아내는 심야의 썰과 고민 공유가 단톡방의 끈끈한 결속력을 만듭니다.`;
    } else if (topTalkerRatio >= 45) {
      groupVibe = `'${members[0].name}'님이 톡방의 ${topTalkerRatio}%를 이끄는 강력한 원맨 기관차 단톡방입니다. 지치지 않는 분위기 메이커의 열정이 정적을 깨고 방의 활력을 불어넣고 있습니다.`;
    } else if (laughDensity >= 0.35) {
      groupVibe = `말 한마디마다 폭풍 맞장구와 웃음이 쏟아지는 '웃음 치트키 힐링 단톡방'입니다. 비난이나 도발 없이 서로의 텐션을 한없이 끌어올려 주는 행복 에너지 충전소입니다.`;
    } else {
      groupVibe = `서로의 일상과 관심사를 부담 없이 나누며 편안한 균형을 유지하는 '안정형 찰떡 단톡방'입니다. 각자의 대화 템포를 존중하며 롱런하는 우정의 표본입니다.`;
    }

    return {
      roomName: "카카오톡 대화 분석 리포트",
      totalMessages: totalHumanMsgs,
      dateRange: `${startDate} ~ ${endDate}`,
      tensionIndex: tensionIndex,
      peaceIndex: peaceIndex,
      tensionDesc: tensionDesc,
      groupGrade: groupGrade,
      groupVibe: groupVibe,
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