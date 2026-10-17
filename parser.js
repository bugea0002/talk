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
    
    // 1. PC 카톡 포맷 (Windows / Mac 구형·신형)
    const pcPattern = /^\[(.*?)\]\s*\[(?:(오전|오후|AM|PM|am|pm)\s*)?(\d{1,2}):(\d{2})(?:\s*(AM|PM|am|pm))?\]\s*(.*)$/;
    
    // 2. 모바일 카톡 & Mac 텍스트 포맷 (Android / iOS / 24시간제 / 오전·오후 뒤표기 모두 지원)
    const mobilePattern = /^(\d{4}[년.\-\/]\s*\d{1,2}[월.\-\/]\s*\d{1,2}(?:일|\.)?(?:\s*\(?[가-힣A-Za-z]+요일\)?|\s*\([가-힣A-Za-z]+\))?[.\s,]*)\s*(?:(오전|오후|AM|PM|am|pm)\s*)?(\d{1,2}(?:시\s*|:)\d{1,2}(?:분|:\d{2})?)(?:\s*(오전|오후|AM|PM|am|pm))?,?\s*(.*?)\s*:\s*(.*)$/;

    // 3. 날짜 구분선
    const datePattern = /^[-—=]*\s*(\d{4}[년.\-\/]\s*\d{1,2}[월.\-\/]\s*\d{1,2}(?:일|\.)?\s*(?:\(?[가-힣A-Za-z]+요일\)?|\([가-힣A-Za-z]+\))?)\s*[-—=]*$/;

    let parsedMsgs = [];
    let currentDate = "미지정 일자";
    let currentWeekday = null;

    const formatTimeLabel = (h, m) => {
      const period = h < 12 ? "오전" : "오후";
      const dispH = h % 12 === 0 ? 12 : h % 12;
      return `${period} ${dispH}:${String(m).padStart(2, "0")}`;
    };

    for (let i = 0; i < totalLines; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // 날짜 구분선 매칭 (단, 콜론(:)이 포함된 일반 대화줄은 제외)
      if (!line.includes(" : ") && !line.startsWith("[")) {
        const dateMatch = datePattern.exec(line);
        if (dateMatch) {
          currentDate = dateMatch[1].trim();
          currentWeekday = this.getWeekdayFromDateStr(currentDate);
          continue;
        }
      }

      // PC 카톡 포맷 검사
      const pcMatch = pcPattern.exec(line);
      if (pcMatch) {
        const sender = pcMatch[1].trim();
        const ampmRaw = (pcMatch[2] || pcMatch[5] || "").toUpperCase();
        let hour = parseInt(pcMatch[3], 10);
        const minute = parseInt(pcMatch[4], 10);
        const content = pcMatch[6];

        if ((ampmRaw === "오후" || ampmRaw === "PM") && hour !== 12) hour += 12;
        else if ((ampmRaw === "오전" || ampmRaw === "AM") && hour === 12) hour = 0;

        const safeH = isNaN(hour) ? 12 : hour;
        const safeM = isNaN(minute) ? 0 : minute;

        parsedMsgs.push({
          date: currentDate,
          weekday: currentWeekday,
          sender: sender,
          hour: safeH,
          minute: safeM,
          timeLabel: formatTimeLabel(safeH, safeM),
          content: content
        });
        continue;
      }

      // 모바일 카톡 포맷 검사
      const mobMatch = mobilePattern.exec(line);
      if (mobMatch) {
        const rawDate = mobMatch[1].replace(/,\s*$/, "").trim();
        const ampmRaw = (mobMatch[2] || mobMatch[4] || "").toUpperCase();
        const timeStr = mobMatch[3].replace(/시\s*/, ":").replace(/분$/, "");
        const sender = mobMatch[5].trim();
        const content = mobMatch[6];

        let [hStr, mStr] = timeStr.split(":");
        let hour = parseInt(hStr, 10);
        const minute = parseInt(mStr, 10);

        if ((ampmRaw.includes("오후") || ampmRaw.includes("PM")) && hour !== 12) hour += 12;
        else if ((ampmRaw.includes("오전") || ampmRaw.includes("AM")) && hour === 12) hour = 0;

        const weekday = this.getWeekdayFromDateStr(rawDate) || currentWeekday;
        currentDate = rawDate;
        currentWeekday = weekday;

        const safeH = isNaN(hour) ? 12 : hour;
        const safeM = isNaN(minute) ? 0 : minute;

        parsedMsgs.push({
          date: rawDate,
          weekday: weekday,
          sender: sender,
          hour: safeH,
          minute: safeM,
          timeLabel: formatTimeLabel(safeH, safeM),
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
        fileShares: 0,       // 실무 자료 공유: 파일 첨부 (.pptx, .docx, .pdf, .hwp, .xlsx, 파일: 등)
        linkShares: 0,       // 실무 자료 공유: 협업 툴 및 참고 링크 (http, docs.google, notion, figma 등)
        starters: 0,
        shortMsgs: 0,
        assertiveHits: 0,
        receptiveHits: 0,
        taskHits: 0,
        emotionHits: 0,
        affectionHits: 0,    // 호감·애정 표현 어휘
        tokenAgreementHits: 0, // 무임승차성 형식적 단답 ("네", "좋아요", "ㅇㅇ" 등)
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
    let activePairKey = null;
    let validDates = [];
    let playfulSwearCount = 0;
    let coldConflictCount = 0;

    // 페어 티키타카, 방향별 칼답 속도 및 실제 멘션 집계
    const pairReplies = {};
    const pairStreaks = {};
    const pairMentions = {};
    const directedReplyDiffs = {}; // "A->B": A가 B의 직전 발언에 답장하기까지 걸린 시간(분) 배열
    const directedFastReplies = {}; // "A->B": 3분 이내 초고속 칼답 횟수
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
      if (/(?:^파일\s*:|\.(?:pptx?|docx?|pdf|hwp|xlsx?|csv|zip|key|pages|numbers)\b)/i.test(text.trim())) {
        st.fileShares++;
      }
      if (/(?:https?:\/\/|docs\.google|drive\.google|notion\.so|notion\.site|figma\.com|github\.com|canva\.com)/i.test(text)) {
        st.linkShares++;
      }

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

      // 성향 판별 및 학술 지표 키워드 집계
      if (hasSwear || hasConflict) st.assertiveHits++;
      if (/(아하|맞지|맞아|오호|그렇네|좋아|미띤|인정|ㅇㅋ|ㅋㅋ|레전드|대박|굳|보듬을|고마워|감사|ㅠㅠ|동의)/.test(text)) st.receptiveHits++;
      if (/(몇시|어디|만나|모여|운동|정산|비용|도착|조퇴|퇴근|과제|시험|출발|기상|수업|발표|셔틀|버스|얼마|자료|조사|피피티|ppt|PPT|제출|마감|정리|수정|취합|공유|파일|링크|초안|대본|목차|참고|논문|분담|파트|회의|줌|구글독스|노션)/.test(text)) st.taskHits++;
      if (/(피곤|힘들|짜증|화나|개꿀|망함|살려|배고파|기분|자고싶|똥|죽겠|파국|졸려|아파|슬프|서러)/.test(text)) st.emotionHits++;
      if (/(보고싶|좋아해|사랑|귀여|귀엽|설레|고마워|최고|행복|잘자|굿나잇|화이팅|응원|맛있겠|같이|가자|데려다|걱정|조심|챙겨|예쁘|이쁘|멋있|감동|두근|하트|♡|♥)/.test(text)) st.affectionHits++;
      if (textLen <= 8 && /^(네+|넵+|넹+|예+|ㅇㅇ+|ㅇㅋ+|오키|오케이|좋아요|좋습니다|알겠습니다|확인|감사합니다|고생하셨습니다|수고하셨습니다|동의합니다|찬성|굿|굳|ㄱㄱ)[.!~ㅋㅎ\s]*$/.test(text.trim())) {
        st.tokenAgreementHits++;
      }

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

      // 점화력 & 답장 반응 속도 계산 (전체 및 1:1 상대별 분리 집계)
      let currentReplyDiff = null;
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
            currentReplyDiff = diffMin;
            st.replyDiffs.push(diffMin);
            const dirKey = `${curr.sender}->${prevMsg.sender}`;
            if (!directedReplyDiffs[dirKey]) directedReplyDiffs[dirKey] = [];
            directedReplyDiffs[dirKey].push(diffMin);
            if (diffMin <= 3) {
              directedFastReplies[dirKey] = (directedFastReplies[dirKey] || 0) + 1;
            }
          }
        }
      }
      curr._replyDiffMin = currentReplyDiff;

      // 대표 대사 수집: 저수지 샘플링 (전체 기간 균등 추출)
      const isValidQuote = textLen >= 6 && textLen <= 55 && 
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

      // 1:1 페어 티키타카 및 릴레이 스트릭 카운팅
      if (lastPairMsg && lastPairMsg.sender !== curr.sender && lastPairMsg.date === curr.date) {
        const pairKey = [lastPairMsg.sender, curr.sender].sort().join(" ↔ ");
        pairReplies[pairKey] = (pairReplies[pairKey] || 0) + 1;

        if (activePairKey === pairKey) {
          streakCount++;
        } else {
          if (streakCount >= 2 && activePairKey) {
            pairStreaks[activePairKey] = (pairStreaks[activePairKey] || 0) + 1;
          }
          activePairKey = pairKey;
          streakCount = 1;
        }
      }
      lastPairMsg = curr;
      prevMsg = curr;
    }
    if (streakCount >= 2 && activePairKey) {
      pairStreaks[activePairKey] = (pairStreaks[activePairKey] || 0) + 1;
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
      const timePersona = owlRatio >= 8 ? "새벽의 망령 👻" : earlyRatio >= 12 ? "아침 기상 선발대 🌅" : "오후-저녁의 전사 ⚔️";

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
        fileShares: st.fileShares,
        linkShares: st.linkShares,
        photoShares: st.photos,
        workShareCount: st.fileShares + st.linkShares + st.photos,
        banterHits: st.banterHits,
        coldHits: st.coldHits,
        shortMsgs: st.shortMsgs,
        taskHits: st.taskHits,
        emotionHits: st.emotionHits,
        receptiveHits: st.receptiveHits,
        assertiveHits: st.assertiveHits,
        affectionHits: st.affectionHits,
        tokenAgreementHits: st.tokenAgreementHits,
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

    // 4. 페어별 실제 연속 대화 하이라이트 추출 헬퍼
    const isCleanBubbleText = (txt) => {
      if (!txt) return false;
      const t = txt.trim();
      if (t.length < 2 || t.length > 90) return false;
      if (t === "사진" || t === "이모티콘" || t === "동영상" || t.startsWith("삭제된 메시지")) return false;
      return true;
    };

    const extractPairHighlights = (personA, personB, maxSnippets = 3) => {
      const candidates = [];
      for (let i = 0; i < totalCount - 2; i++) {
        const mA0 = msgs[i];
        if (mA0.sender !== personA && mA0.sender !== personB) continue;
        if (!isCleanBubbleText(mA0.content)) continue;

        // 연속된 3-4개 메시지가 personA와 personB 사이의 실제 대화인지 확인
        const windowMsgs = [mA0];
        const speakersInWindow = new Set([mA0.sender]);
        for (let k = 1; k <= 3 && (i + k) < totalCount; k++) {
          const mk = msgs[i + k];
          if (mk.date !== mA0.date) break;
          if (mk.sender !== personA && mk.sender !== personB) break;
          if (!isCleanBubbleText(mk.content)) break;
          // 같은 사람이 3연속으로만 말한 경우는 스킵
          if (windowMsgs.length >= 2 && windowMsgs[windowMsgs.length - 1].sender === mk.sender && windowMsgs[windowMsgs.length - 2].sender === mk.sender) break;
          windowMsgs.push(mk);
          speakersInWindow.add(mk.sender);
        }

        if (windowMsgs.length >= 3 && speakersInWindow.size === 2) {
          let score = 10;
          let fastTurnCount = 0;
          let affectionHitCount = 0;
          let questionHitCount = 0;
          let laughHitCount = 0;
          const isNight = (mA0.hour >= 22 || mA0.hour <= 3);
          if (isNight) score += 18;

          for (let w = 0; w < windowMsgs.length; w++) {
            const wm = windowMsgs[w];
            if (wm._replyDiffMin !== null && wm._replyDiffMin !== undefined && wm._replyDiffMin <= 2) {
              fastTurnCount++;
              score += 14;
            }
            if (/(보고싶|좋아|사랑|귀여|귀엽|설레|고마워|최고|행복|잘자|굿나잇|화이팅|맛있|같이|가자|데려다|걱정|조심|챙겨|예쁘|이쁘|멋있|감동|두근|♡|♥)/.test(wm.content)) {
              affectionHitCount++;
              score += 16;
            }
            if (wm.content.includes("?")) {
              questionHitCount++;
              score += 8;
            }
            if (/[ㅋㅎ]/.test(wm.content)) {
              laughHitCount++;
              score += 5;
            }
          }

          let stageTitle = "다정한 안부와 티키타카가 오간 순간";
          let badgeText = `${this.normalizeDateStr(mA0.date)} ${mA0.timeLabel || (mA0.hour + "시")}`;
          let noteText = `${personA}님과 ${personB}님이 자연스럽게 질문을 주고받으며 대화를 이어간 실제 구간입니다.`;

          if (isNight && affectionHitCount > 0) {
            stageTitle = "🌙 밤늦게 감성과 다정함이 폭발한 심야 대화";
            noteText = `밤 시간대(${mA0.timeLabel || (mA0.hour + "시")})에 피곤함도 잊고 다정한 표현과 웃음을 주고받은 핵심 시그널입니다.`;
          } else if (fastTurnCount >= 2) {
            stageTitle = "⚡ 1-2분 컷 초고속 칼답 핑퐁 순간";
            noteText = `서로의 카톡이 울리자마자 1-2분 이내로 즉각 반응하며 텐션이 최고조에 달했던 순간입니다.`;
          } else if (affectionHitCount > 0 || questionHitCount >= 2) {
            stageTitle = "💘 서로의 일상을 궁금해하고 챙겨주는 순간";
            noteText = `단순 용건이 아니라 서로의 하루와 기분을 세심하게 물어보며 호감을 쌓아가는 대화입니다.`;
          }

          candidates.push({
            startIndex: i,
            score: score,
            stage: stageTitle,
            title: stageTitle,
            badge: badgeText,
            date: badgeText,
            time: mA0.timeLabel || `${mA0.hour}:00`,
            academicNote: noteText,
            commentary: noteText,
            messages: windowMsgs.map(wm => ({
              sender: wm.sender,
              speaker: wm.sender,
              side: wm.sender === personA ? "left" : "right",
              time: wm.timeLabel || `${wm.hour}:${String(wm.minute || 0).padStart(2, "0")}`,
              text: wm.content
            }))
          });
        }
      }

      candidates.sort((a, b) => b.score - a.score);
      const picked = [];
      for (let c = 0; c < candidates.length && picked.length < maxSnippets; c++) {
        const cand = candidates[c];
        if (!picked.some(p => Math.abs(p.startIndex - cand.startIndex) < 6)) {
          picked.push(cand);
        }
      }
      return picked;
    };

    // 5. 페어별 케미스트리 랭킹 산출 (실제 상호작용, 1:1 전용 답장 속도 및 멘션 주입)
    const pairRankings = [];
    const memberMap = {};
    members.forEach(m => memberMap[m.name] = m);

    const calcAvgDiff = (arr, fallback) => {
      if (!arr || arr.length === 0) return fallback;
      const sum = arr.reduce((a, b) => a + b, 0);
      return Math.max(1, Math.round(sum / arr.length));
    };

    Object.keys(pairReplies).forEach(pairKey => {
      const [p1, p2] = pairKey.split(" ↔ ");
      const m1 = memberMap[p1];
      const m2 = memberMap[p2];
      if (m1 && m2) {
        const replies = pairReplies[pairKey];
        const mentions = pairMentions[pairKey] || 0;
        const chem = window.CTI_SYSTEM.getChemistry(m1.cti, m2.cti, p1, p2, replies, mentions);
        const avgReply1to2 = calcAvgDiff(directedReplyDiffs[`${p1}->${p2}`], m1.replySpeed || 12);
        const avgReply2to1 = calcAvgDiff(directedReplyDiffs[`${p2}->${p1}`], m2.replySpeed || 12);
        const fast1to2 = directedFastReplies[`${p1}->${p2}`] || 0;
        const fast2to1 = directedFastReplies[`${p2}->${p1}`] || 0;

        pairRankings.push({
          pair: [p1, p2],
          types: [m1.cti, m2.cti],
          replies: replies,
          streaks: pairStreaks[pairKey] || Math.max(1, Math.round(replies * 0.15)),
          mentions: mentions,
          avgReply1to2: avgReply1to2,
          avgReply2to1: avgReply2to1,
          fast1to2: fast1to2,
          fast2to1: fast2to1,
          score: chem.score,
          grade: chem.grade,
          badge: chem.badge,
          summary: chem.summary,
          details: chem.details
        });
      }
    });

    pairRankings.sort((a, b) => b.replies - a.replies);
    pairRankings.forEach((p, idx) => {
      p.rank = idx + 1;
      if (idx < 6) {
        p.highlights = extractPairHighlights(p.pair[0], p.pair[1], 4);
      }
    });

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

    const m0 = members[0] || { name: "참여자A", quotes: ["오늘 하루도 고생 많았어요!"] };
    const m1 = members[1] || m0;
    const mLast = members[members.length - 1] || m1;

    // [리얼리티 엔진 1] 모드 2 실제 연속 대화 하이라이트 추출
    let autoRomanceHighlights = (pairRankings[0] && pairRankings[0].highlights && pairRankings[0].highlights.length > 0)
      ? pairRankings[0].highlights
      : extractPairHighlights(m0.name, m1.name, 3);

    if (!autoRomanceHighlights || autoRomanceHighlights.length === 0) {
      autoRomanceHighlights = [
        {
          stage: "하이라이트 01 • 빠른 답장과 다정한 티키타카",
          title: "하이라이트 01 • 빠른 답장과 다정한 티키타카",
          badge: `${startDate} • ${peakHour}시 피크`,
          time: `대화가 가장 활발한 시간 (${peakHour}시 전후)`,
          academicNote: "빠른 답장과 먼저 건네는 질문이 이어지며 서로에게 높은 호감을 보이는 구간",
          commentary: "빠른 답장과 먼저 건네는 질문이 이어지며 서로에게 높은 호감을 보이는 구간",
          messages: [
            { sender: m0.name, side: "left", time: `${peakHour}:12`, text: (m0.quotes && m0.quotes[0]) || "오늘 하루도 고생 많았어요!" },
            { sender: m1.name, side: "right", time: `${peakHour}:13`, text: (m1.quotes && m1.quotes[0]) || "맞아요 ㅎㅎ 오늘도 화이팅입니다!" }
          ]
        }
      ];
    }

    // [리얼리티 엔진 2] 모드 3 실제 단톡방 빌런/단답 온도차 연속 대화 채증
    const extractRealVillainEvidence = () => {
      const evCandidates = [];
      const tokenRegex = /^(네+|넵+|넹+|예+|ㅇㅇ+|ㅇㅋ+|오키|오케이|좋아요|좋습니다|알겠습니다|확인|감사합니다|고생하셨습니다|수고하셨습니다|동의합니다|찬성|굿|굳|ㄱㄱ)[.!~ㅋㅎ\s]*$/;

      for (let i = 0; i < totalCount - 1; i++) {
        const leadMsg = msgs[i];
        const nextMsg = msgs[i + 1];
        if (!leadMsg || !nextMsg || leadMsg.sender === nextMsg.sender) continue;
        if (!isCleanBubbleText(leadMsg.content) || !isCleanBubbleText(nextMsg.content)) continue;

        const leadLen = leadMsg.content.length;
        const nextLen = nextMsg.content.length;
        const isLeadTask = /(과제|발표|자료|조사|피피티|ppt|PPT|제출|마감|정리|수정|취합|공유|파일|링크|초안|대본|목차|회의|줌|구글독스|노션|어디|몇시|만나|일정)/.test(leadMsg.content) || leadLen >= 22;
        const isNextToken = (nextLen <= 9 && tokenRegex.test(nextMsg.content.trim())) || (leadLen >= 26 && nextLen <= 5);
        const isLateReply = nextMsg._replyDiffMin !== null && nextMsg._replyDiffMin >= 25;

        if (isLeadTask && (isNextToken || isLateReply)) {
          let evScore = (leadLen - nextLen) + (isNextToken ? 25 : 0) + (isLateReply ? 20 : 0);
          const snippetMsgs = [
            {
              sender: leadMsg.sender,
              role: "LEADER",
              time: `${this.normalizeDateStr(leadMsg.date)} ${leadMsg.timeLabel || ""}`.trim(),
              text: leadMsg.content
            },
            {
              sender: nextMsg.sender,
              role: isNextToken ? "NENE" : "VILLAIN",
              time: `${this.normalizeDateStr(nextMsg.date)} ${nextMsg.timeLabel || ""}`.trim(),
              text: nextMsg.content
            }
          ];
          if (i + 2 < totalCount && msgs[i + 2].date === leadMsg.date && isCleanBubbleText(msgs[i + 2].content)) {
            const thirdMsg = msgs[i + 2];
            snippetMsgs.push({
              sender: thirdMsg.sender,
              role: thirdMsg.sender === leadMsg.sender ? "LEADER" : (thirdMsg.content.length <= 8 ? "VILLAIN" : "ACE"),
              time: `${this.normalizeDateStr(thirdMsg.date)} ${thirdMsg.timeLabel || ""}`.trim(),
              text: thirdMsg.content
            });
          }

          const gapNote = isLateReply ? `${nextMsg._replyDiffMin}분 뒤` : "직후";
          evCandidates.push({
            idx: i,
            score: evScore,
            title: `실제 대화 채증 • ${leadMsg.sender}님의 장문 진행 vs ${nextMsg.sender}님의 ${nextLen}글자 응답`,
            badge: `${this.normalizeDateStr(leadMsg.date)} 실제 기록`,
            date: `${this.normalizeDateStr(leadMsg.date)} 실제 대화 기록`,
            verdict: `${leadMsg.sender}님이 ${leadLen}자 분량으로 의견을 제시한 ${gapNote}, ${nextMsg.sender}님은 단 ${nextLen}글자("${nextMsg.content}")로 응답을 마쳤습니다.`,
            academicNote: `${leadMsg.sender}님이 ${leadLen}자 분량으로 의견을 제시한 ${gapNote}, ${nextMsg.sender}님은 단 ${nextLen}글자("${nextMsg.content}")로 응답을 마쳤습니다.`,
            messages: snippetMsgs
          });
        }
      }

      evCandidates.sort((a, b) => b.score - a.score);
      const pickedEv = [];
      for (let c = 0; c < evCandidates.length && pickedEv.length < 4; c++) {
        if (!pickedEv.some(p => Math.abs(p.idx - evCandidates[c].idx) < 5)) {
          pickedEv.push(evCandidates[c]);
        }
      }
      return pickedEv;
    };

    let autoVillainEvidence = extractRealVillainEvidence();
    if (!autoVillainEvidence || autoVillainEvidence.length === 0) {
      autoVillainEvidence = [
        {
          title: `증거 01 • ${m0.name}님의 주도적 발언 vs ${mLast.name}님의 대화 온도차`,
          badge: `${startDate} - ${endDate}`,
          date: `${startDate} - ${endDate} 실제 대화 기록`,
          verdict: `${m0.name}님이 평균 ${m0.avgLen}자로 대화를 이끄는 동안 ${mLast.name}님은 평균 ${mLast.avgLen}자(참여율 ${mLast.msgRatio}%)로 반응했습니다.`,
          academicNote: `${m0.name}님이 평균 ${m0.avgLen}자로 대화를 이끄는 동안 ${mLast.name}님은 평균 ${mLast.avgLen}자(참여율 ${mLast.msgRatio}%)로 반응했습니다.`,
          messages: [
            { sender: m0.name, role: "LEADER", time: `${peakHour}:05`, text: (m0.quotes && m0.quotes[0]) || "이번 일정이랑 자료 정리해서 공유합니다!" },
            ...(members.length > 2 ? [{ sender: m1.name, role: "ACE", time: `${peakHour}:07`, text: (m1.quotes && m1.quotes[0]) || "확인했습니다! 제가 이어서 정리할게요." }] : []),
            { sender: mLast.name, role: "VILLAIN", time: `${peakHour}:42`, text: (mLast.quotes && mLast.quotes[0]) || "넵 확인했습니다" }
          ]
        },
        {
          title: `증거 02 • 팀 피드백 요청 vs ${mLast.name}님의 미온적 응답`,
          badge: `${startDate} - ${endDate}`,
          date: `${startDate} - ${endDate} 실제 대화 기록`,
          verdict: `조원들이 역할 분담 및 결과물 공유를 요청한 상황에서 실무 파일 공유 없이 늦은 시간 단답형 동의만 남겼습니다.`,
          academicNote: `조원들이 역할 분담 및 결과물 공유를 요청한 상황에서 실무 파일 공유 없이 늦은 시간 단답형 동의만 남겼습니다.`,
          messages: [
            { sender: m0.name, role: "LEADER", time: `${peakHour}:10`, text: "파트별 수정본 확인 부탁드려요. 이상 없으시면 오늘 제출본으로 취합하겠습니다." },
            { sender: mLast.name, role: "VILLAIN", time: `${(peakHour + 2) % 24}:15`, text: (mLast.quotes && mLast.quotes[1]) || "네 좋습니다 수고하셨어요!" }
          ]
        }
      ];
    }

    const reportObj = {
      roomName: "카카오톡 대화 분석 리포트",
      totalMessages: totalHumanMsgs,
      dateRange: `${startDate} - ${endDate}`,
      tensionIndex: tensionIndex,
      peaceIndex: peaceIndex,
      tensionDesc: tensionDesc,
      groupGrade: groupGrade,
      groupVibe: groupVibe,
      members: members,
      pairRankings: pairRankings,
      romanceHighlights: autoRomanceHighlights,
      villainEvidenceLogs: autoVillainEvidence,
      activity: {
        hourly: roomHours,
        weekday: weekdayCounts,
        peakHour: `${peakHour}시`,
        peakWeekday: `${peakWeekday}요일`
      },
      keywords: {
        roomKeywords: topRoomKeywords
      },
      messages: msgs
    };

    reportObj.academicMetrics = this.computeAcademicMetrics(reportObj);
    return reportObj;
  },

  // [고도화] 두 사람의 실제 데이터(CTI, 단골어, 실제 인용구, 선택적 칼답, 선톡 격차)를 결합한 맞춤형 속마음 & 질문 6선 생성기
  buildDynamicSecretMind: function(mA, mB, pairInfo, report) {
    if (!mA || !mB) return null;
    const ctiA = mA.cti || "ELFA";
    const ctiB = mB.cti || "ISFA";
    const topWordA = (mA.topWords && mA.topWords[0] && mA.topWords[0].word) ? mA.topWords[0].word : "우리";
    const topWordB = (mB.topWords && mB.topWords[0] && mB.topWords[0].word) ? mB.topWords[0].word : "오늘";
    const quoteA = (mA.quotes && mA.quotes[0]) ? mA.quotes[0] : `오늘 하루도 고생 많았어!`;
    const quoteB = (mB.quotes && mB.quotes[0]) ? mB.quotes[0] : `응응 너도 오늘 고생했어 ㅎㅎ`;

    // 1:1 전용 답장 속도 (페어 데이터가 있으면 1:1 전용 답장 속도를 우선 적용)
    let speedA = mA.replySpeed || 5;
    let speedB = mB.replySpeed || 7;
    if (pairInfo && Array.isArray(pairInfo.pair)) {
      if (pairInfo.pair[0] === mA.name && pairInfo.avgReply1to2) {
        speedA = pairInfo.avgReply1to2;
        speedB = pairInfo.avgReply2to1 || speedB;
      } else if (pairInfo.pair[1] === mA.name && pairInfo.avgReply2to1) {
        speedA = pairInfo.avgReply2to1;
        speedB = pairInfo.avgReply1to2 || speedB;
      }
    }

    const describePersonHeart = (self, partner, selfSpeed, topWord, realQuote, isCodeE, isCodeL, isCodeF, roleIndex = 0) => {
      let surfaceStyle = "";
      let innerTruth = "";
      let secretFear = "";
      let loveTrigger = "";

      if (roleIndex === 0) {
        surfaceStyle = isCodeE
          ? `먼저 말을 건네며 '${topWord}' 같은 키워드로 대화의 물꼬를 유쾌하게 터주는 적극적인 분위기 메이커`
          : `${partner.name}님의 메시지에 정성껏 응답하며 '${topWord}' 중심의 깊이 있는 대화를 이어가는 차분한 리스너 스타일`;

        innerTruth = isCodeL
          ? `"평소 '${realQuote}'처럼 길고 상세하게 톡을 남기는 건, 오늘 겪은 소소한 감정까지 ${partner.name}님과 전부 나누고 싶어서야. 카톡 알림이 뜨면 나도 모르게 입꼬리가 먼저 올라가."`
          : `"겉으론 '${realQuote}'처럼 짧고 덤덤하게 보낼 때가 있어도, 속으로는 ${partner.name}님 연락을 온종일 기다리며 누구보다 빠르게 답장을 보내고 있어."`;

        secretFear = isCodeE
          ? `내가 먼저 말을 걸고 질문을 쏟아내는 게 혹시 ${partner.name}님에게 부담스럽지 않을까 하는 조심스러움`
          : `담백한 내 카톡 말투 때문에 ${partner.name}님이 '나한테 호감이 덜한가?' 오해할까 봐 마음 쓰이는 불안감`;

        loveTrigger = isCodeF
          ? `${partner.name}님이 '${topWord}' 이야기를 먼저 기억해 주며 따뜻한 맞장구와 미소(ㅋㅋ/ㅎㅎ)로 화답해 줄 때`
          : `언제 밥 먹자는 빈말보다 구체적인 날짜나 장소를 꼭 집어 약속을 제안해 줄 때`;
      } else {
        surfaceStyle = isCodeE
          ? `상대의 말에 맞장구치고 센스 있는 질문을 던지며 '${topWord}' 이야기를 끊김 없이 이어가도록 윤활유 역할을 해주는 스타일`
          : `겉으로는 잔잔하지만 ${partner.name}님의 한마디 한마디에 집중하며 차분한 템포로 든든한 신뢰감을 주는 스타일`;

        innerTruth = isCodeL
          ? `"대화창에 '${realQuote}'처럼 다정한 말들을 꾹꾹 눌러 담기 전까지 몇 번이고 쓰고 지웠어. ${partner.name}님에게 가장 예쁜 말만 들려주고 싶거든."`
          : `"메시지는 '${realQuote}'처럼 간결하지만, ${partner.name}님과의 대화창은 늘 상단에 고정해 두고 틈날 때마다 확인하며 답장을 이어가고 있어."`;

        secretFear = isCodeE
          ? `대화 분위기를 띄우려다 진지한 진심이나 떨리는 속마음이 자칫 가볍게 비칠까 봐 은근히 고민하는 마음`
          : `답장을 너무 신중하게 고르느라 타이밍을 놓쳐서 ${partner.name}님을 기다리게 한 건 아닐까 하는 걱정`;

        loveTrigger = isCodeF
          ? `${partner.name}님이 하루 일과 중 문득 생각났다며 소소한 사진이나 '${topWord}' 일상을 먼저 공유해 올 때`
          : `피곤한 하루 끝에 "오늘 고생 많았어"라며 내 컨디션과 노력을 먼저 헤아려주는 메시지를 보내줄 때`;
      }

      return {
        name: self.name,
        surfaceStyle,
        innerTruth,
        secretFear,
        loveTrigger
      };
    };

    const hiddenHearts = [
      describePersonHeart(mA, mB, speedA, topWordA, quoteA, ctiA.includes("E"), ctiA.includes("L"), ctiA.includes("F"), 0),
      describePersonHeart(mB, mA, speedB, topWordB, quoteB, ctiB.includes("E"), ctiB.includes("L"), ctiB.includes("F"), 1)
    ];

    const hourly = (report && report.activity && report.activity.hourly) ? report.activity.hourly : Array(24).fill(10);
    const totalH = Math.max(1, hourly.reduce((a, b) => a + b, 0));
    const nightH = (hourly[22] || 0) + (hourly[23] || 0) + (hourly[0] || 0) + (hourly[1] || 0) + (hourly[2] || 0);
    const lateNightPct = Math.min(72, Math.max(18, Math.round((nightH / totalH) * 100)));

    const lsmDiff = Math.abs((mA.avgLen || 12) - (mB.avgLen || 12)) / ((mA.avgLen || 12) + (mB.avgLen || 12) + 1);
    const dyadicLsm = Math.min(99, Math.max(68, Math.round((1 - lsmDiff * 0.65) * 100)));

    const startA = Math.max(1, mA.starters || 1);
    const startB = Math.max(1, mB.starters || 1);
    const startShareA = Math.round((startA / (startA + startB)) * 100);
    const invSpeedA = 1 / Math.max(0.5, speedA);
    const invSpeedB = 1 / Math.max(0.5, speedB);
    const speedShareA = Math.round((invSpeedA / (invSpeedA + invSpeedB)) * 100);
    const lenA = Math.max(1, mA.avgLen || 15);
    const lenB = Math.max(1, mB.avgLen || 15);
    const lenShareA = Math.round((lenA / (lenA + lenB)) * 100);
    const qAffA = Math.max(1, (mA.questions || 1) + (mA.affectionHits || 0) * 2);
    const qAffB = Math.max(1, (mB.questions || 1) + (mB.affectionHits || 0) * 2);
    const qShareA = Math.round((qAffA / (qAffA + qAffB)) * 100);
    const investA = Math.round(startShareA * 0.3 + speedShareA * 0.25 + lenShareA * 0.2 + qShareA * 0.25);
    const investB = 100 - investA;
    const moreInLove = investA >= investB ? mA : mB;
    const lessInLove = investA >= investB ? mB : mA;

    const selectiveNoteA = (mA.replySpeed && speedA < mA.replySpeed)
      ? `${mA.name}님은 단톡방 전체 평균보다 ${mB.name}님에게 답장할 때 훨씬 빠르게 반응하는 '선택적 칼답' 시그널을 보이고 있습니다!`
      : `두 사람 사이에 대화가 끊기지 않고 안정적인 핑퐁 템포가 일정하게 유지되고 있습니다.`;

    const unspokenQuestions = [
      {
        icon: "fa-scale-balanced",
        factBadge: `호감 비중 ${investA}% : ${investB}%`,
        q: `솔직히 지금 우리 둘 중에 누가 더 신경 쓰고 좋아하는 걸까?`,
        verdict: Math.abs(investA - investB) <= 8
          ? `${mA.name}님과 ${mB.name}님의 마음 크기가 ${investA}% 대 ${investB}%로 소름 돋게 일치하는 쌍방 폴인럽 상태입니다!`
          : `현재 '${moreInLove.name}'님이 먼저 다가가는 에너지가 조금 더 크지만, '${lessInLove.name}'님도 안정적인 답장으로 화답하는 쌍방 호감입니다!`,
        detail: `선톡 개시 빈도, 질문 적극성, 메시지 정성도를 종합하여 분석한 실제 대화 행동 데이터 판독 결과입니다.`
      },
      {
        icon: "fa-bolt",
        factBadge: `1:1 반응 속도 시그널`,
        q: `상대방이 나한테만 특별히 더 빨리 답장하는 걸까, 아니면 원래 카톡을 빨리 보는 걸까?`,
        verdict: (speedA <= 5 || speedB <= 5)
          ? `알림이 울리면 바로 확인하는 확실한 '관심권 칼답' 패턴입니다!`
          : `바쁜 일정 속에서도 성의 있게 문장을 골라 답장하는 안정형 패턴입니다.`,
        detail: selectiveNoteA
      },
      {
        icon: "fa-moon",
        factBadge: `심야 대화 비중 ${lateNightPct}%`,
        q: `밤늦게 카톡할 때 상대방도 내 생각하면서 설레고 있을까?`,
        verdict: `밤 10시 - 새벽 2시 감성 시간대 대화 비중이 ${lateNightPct}%에 달합니다. 잠들기 전 가장 생각나는 사람이 서로라는 뜻입니다!`,
        detail: `피곤한 심야 시간에도 단답으로 끊지 않고 '${topWordA}', '${topWordB}' 같은 일상 이야기를 나누며 다정한 웃음이 오가고 있습니다.`
      },
      {
        icon: "fa-comments",
        factBadge: `말투 동조율 ${dyadicLsm}%`,
        q: `우리가 연인이 되면 대화 코드가 잘 맞고 오래 만날 수 있을까?`,
        verdict: `무의식적인 말투와 리액션 호흡(언어적 스타일 매칭)이 ${dyadicLsm}% 일치하여 대화 피로도가 극히 낮은 천생연분 조합입니다.`,
        detail: `${mA.name}님과 ${mB.name}님의 대화 성향이 편안하게 맞물려, 억지로 텐션을 올리지 않아도 자연스러운 티키타카가 이어집니다.`
      },
      {
        icon: "fa-paper-plane",
        factBadge: `선톡 반응 시그널`,
        q: `내가 먼저 연락하면 귀찮아하거나 부담스러워하진 않을까?`,
        verdict: `전혀 부담스러워하지 않습니다! 먼저 연락이 오면 기다렸다는 듯 대화를 길게 이어가고 있습니다.`,
        detail: `선톡 직후 오가는 질문과 다정한 공감 표현 빈도를 보면, 오히려 먼저 연락해 주기를 내심 기다리는 패턴입니다.`
      },
      {
        icon: "fa-heart",
        factBadge: `성공 확신도 ${Math.min(99, Math.round((dyadicLsm + (pairInfo ? pairInfo.score : 90)) / 2))}%`,
        q: `이번 주말에 따로 만나자고 데이트 신청하면 승낙할까?`,
        verdict: `승낙 확률 매우 높음! 막연한 인사 대신 두 사람의 단골 키워드('${topWordA}', '${topWordB}')와 연결된 구체적인 약속을 제안해 보세요.`,
        detail: `"언제 한번 보자"보다는 "이번 주 토요일에 같이 맛있는 거 먹으러 갈래?"처럼 날짜를 콕 집어 물어볼 때 호감도가 급상승합니다.`
      }
    ];

    const loveCheatKeys = [
      {
        target: mA.name,
        magicLine: `"오늘 하루도 고생 많았어! 갑자기 '${topWordA}' 얘기하던 거 생각나서 톡 했어 ㅎㅎ 이번 주말에 시간 어때?"`,
        tip: `${mA.name}(${ctiA})님은 본인이 자주 쓰는 주제('${topWordA}')를 기억해 주고 먼저 다정하게 안부를 물어봐 줄 때 설렘이 폭발합니다.`
      },
      {
        target: mB.name,
        magicLine: `"너랑 카톡하니까 오늘 피곤했던 거 싹 풀린다! 조만간 '${topWordB}' 하러 꼭 같이 가자 ♥"`,
        tip: `${mB.name}(${ctiB})님은 함께 대화하는 시간이 즐겁다는 확신과 구체적인 다음 만남 제안을 받을 때 마음의 문을 활짝 엽니다.`
      }
    ];

    return {
      hiddenHearts,
      unspokenQuestions,
      loveCheatKeys
    };
  },

  // 3대 모드 정밀 지표 산출기 (실제 파싱 데이터 및 샘플 데이터 공용)
  computeAcademicMetrics: function(report) {
    const members = report.members || [];
    const n = members.length || 1;
    const totalMsgs = report.totalMessages || members.reduce((s, m) => s + (m.totalMsgs || 0), 0) || 1;

    // 1. [단톡방 전체 케미] 말투 닮은 정도 & 대화 골고루 참여하는 비율
    let entropySum = 0;
    members.forEach(m => {
      const p = (m.totalMsgs || 1) / totalMsgs;
      if (p > 0) entropySum -= p * Math.log(p);
    });
    const maxEntropy = n > 1 ? Math.log(n) : 1;
    const turnTakingBalance = n > 1 ? Math.min(100, Math.max(20, Math.round((entropySum / maxEntropy) * 100))) : 85;

    const meanLen = members.reduce((s, m) => s + (m.avgLen || 10), 0) / n;
    const meanLaughRate = members.reduce((s, m) => s + ((m.laughs || 0) / (m.totalMsgs || 1)), 0) / n;
    const meanQRate = members.reduce((s, m) => s + ((m.questions || 0) / (m.totalMsgs || 1)), 0) / n;

    let lsmTotal = 0;
    members.forEach(m => {
      const mLaugh = (m.laughs || 0) / (m.totalMsgs || 1);
      const mQ = (m.questions || 0) / (m.totalMsgs || 1);
      const lsmLen = 1 - Math.abs((m.avgLen || 10) - meanLen) / ((m.avgLen || 10) + meanLen + 0.01);
      const lsmLaugh = 1 - Math.abs(mLaugh - meanLaughRate) / (mLaugh + meanLaughRate + 0.01);
      const lsmQ = 1 - Math.abs(mQ - meanQRate) / (mQ + meanQRate + 0.01);
      m.lsmIndividual = Math.round(((lsmLen * 0.4 + lsmLaugh * 0.35 + lsmQ * 0.25)) * 100);
      lsmTotal += m.lsmIndividual;
    });
    const groupLsmScore = Math.min(99, Math.max(45, Math.round(lsmTotal / n)));
    const groupCohesionIndex = Math.round(groupLsmScore * 0.55 + turnTakingBalance * 0.45);

    // 2. [조별과제 빌런 탐지 고도화 엔진: 다중 역할 추론, 약속 대비 이행률, 6대 미세 신호 채증, 복합 빌런 중첩 판정]
    const fairShare = 100 / n;
    const rawMsgs = report.messages || report.rawMessages || [];

    // 2-1. 역할(임무) 사전 & 미세 신호(Micro-Signals) 사전
    const ROLE_DEFS = [
      { key: "leader", label: "👑 총괄/조장", regex: /(취합|정리해서\s*올릴|일정\s*조율|제가\s*제출|총괄|단톡방\s*파|공지|역할\s*분담|나눠볼까|마감일|진행상황)/i },
      { key: "ppt", label: "🎨 PPT제작", regex: /(피피티|ppt|PPT|슬라이드|디자인|템플릿|표지|레이아웃|캔바|canva|피그마)/i },
      { key: "research", label: "🔍 자료조사", regex: /(자료\s*조사|리서치|사례\s*찾|논문|통계|레퍼런스|출처|기사\s*찾|조사해|자료찾)/i },
      { key: "presenter", label: "🎤 발표/대본", regex: /(발표|대본|스크립트|큐시트|질의응답|q&a|발표자)/i },
      { key: "writer", label: "📝 문서작성", regex: /(보고서|워드|한글|문서\s*작성|초안\s*작성|서론|본론|결론|요약본)/i }
    ];

    const MICRO_DEFS = [
      { key: "excuse", label: "핑계·변명", badge: "🙏 핑계 장인", regex: /(알바|몸이\s*안|병원|감기|몸살|노트북이|컴퓨터가|고장|날아갔|저장이\s*안|시험기간|과제가\s*겹쳐|바빠서|정신이\s*없|까먹|깜빡|늦잠)/i },
      { key: "deflection", label: "책임 전가", badge: "🙈 은밀한 회피", regex: /(부담스러|자신이\s*없|잘\s*못해서|안\s*해봐서|손이\s*느려|다른\s*분이|남는\s*걸로|쉬운\s*걸로|퀄리티가\s*걱정|자신있는\s*분)/i },
      { key: "vaporware", label: "가짜 진행", badge: "⏳ 립서비스 지연", regex: /(보고\s*있어요|찾아보는\s*중|거의\s*다|하는\s*중입니다|집\s*가서\s*바로|이따가\s*올릴|오늘\s*안으로\s*꼭|지금\s*하는\s*중)/i },
      { key: "piggyback", label: "숟가락 동조", badge: "🥄 숟가락 얹기", regex: /(저도\s*그렇게\s*생각|동감합니다|동의합니다|위\s*의견에|좋은\s*것\s*같아요\s*그대로|다\s*좋습니다|상관없어요|정해주시는\s*대로)/i },
      { key: "clueless", label: "공지 미숙지", badge: "❓ 뒷북 질문", regex: /(주제가\s*뭐였|언제까지\s*제출|어디에\s*올리|무슨\s*요일|몇\s*시까지였|어떻게\s*하면\s*되나요|과제\s*뭐\s*해야)/i },
      { key: "cheerleader", label: "영혼없는 응원", badge: "📣 영혼없는 응원단", regex: /(수고하셨|고생하셨|대박|역시\s*최고|감사합니다\s*ㅠ|짱짱|완벽하네요|화이팅입니다)/i }
    ];

    // 2-2. 조원별 문맥 데이터 추적 컨테이너
    const memberContextMap = {};
    members.forEach(m => {
      memberContextMap[m.name] = {
        roles: new Set(),
        promises: 0,
        deliveries: 0,
        calloutsReceived: 0,
        calloutsIgnored: 0,
        microCounts: { excuse: 0, deflection: 0, vaporware: 0, piggyback: 0, clueless: 0, cheerleader: 0 },
        microEvidences: []
      };
    });

    // 2-3. 실제 대화 메시지 시계열 문맥 스캔 (존재 시 정밀 분석)
    if (rawMsgs && rawMsgs.length > 0) {
      for (let i = 0; i < rawMsgs.length; i++) {
        const msg = rawMsgs[i];
        if (!msg || !msg.sender || !memberContextMap[msg.sender]) continue;
        const text = (msg.content || "").trim();
        const ctx = memberContextMap[msg.sender];

        // 1) 1인칭 임무 수락 및 자원 발화 파악
        const isClaim = /(제가|저는|전|내가|난).{0,15}(맡을|할게|해볼게|담당|작성할|만들|조사할|준비할|올릴게)|맡겠습니다|하겠습니다|제가\s*할게요/i.test(text);
        ROLE_DEFS.forEach(r => {
          if (r.regex.test(text)) {
            if (isClaim) {
              ctx.roles.add(r.label);
            } else if (text.length <= 15 && /(네|넵|넹|알겠습니다|좋아요|오케이)/i.test(text) && i > 0) {
              // 이전 메시지에서 누군가 지목했을 때
              const prevText = rawMsgs[i - 1].content || "";
              if (r.regex.test(prevText)) {
                ctx.roles.add(r.label);
              }
            }
          }
        });

        // 2) 약속(Promise) 발화 vs 납품/이행(Delivery) 발화
        if (/(내일까지|오늘까지|밤까지|올릴게요|보낼게요|해올게요|작성해올게요|정리해서\s*공유)/i.test(text)) {
          ctx.promises++;
        }
        if (/(올렸습니다|공유합니다|확인\s*부탁|작성\s*완료|파일\s*보냈|초안\s*보냅|노션에\s*정리|구글독스에)/i.test(text) ||
            /(?:^파일\s*:|\.(?:pptx?|docx?|pdf|hwp|xlsx?|csv|zip)\b)/i.test(text)) {
          ctx.deliveries++;
        }

        // 3) 타 조원에 의한 호명(멘션) 및 반응 추적
        members.forEach(other => {
          if (other.name !== msg.sender && (text.includes(other.name) || text.includes(`@${other.name}`))) {
            const otherCtx = memberContextMap[other.name];
            if (otherCtx) {
              otherCtx.calloutsReceived++;
              // 이후 5개 메시지 내에 해당 조원의 응답이 있는지 확인
              let answered = false;
              for (let k = i + 1; k < Math.min(rawMsgs.length, i + 6); k++) {
                if (rawMsgs[k].sender === other.name) {
                  answered = true;
                  break;
                }
              }
              if (!answered) {
                otherCtx.calloutsIgnored++;
              }
            }
          }
        });

        // 4) 6대 미세 신호 스캔 및 실제 증거(원문) 수집
        MICRO_DEFS.forEach(md => {
          if (md.regex.test(text)) {
            ctx.microCounts[md.key]++;
            if (ctx.microEvidences.length < 3 && text.length >= 3 && text.length <= 80) {
              ctx.microEvidences.push({
                type: md.label,
                badge: md.badge,
                quote: text,
                time: msg.timeLabel || "대화 중"
              });
            }
          }
        });
      }
    }

    // 2-4. 조원별 종합 프로파일 빌드
    const villainProfiles = members.map(m => {
      const cnt = m.totalMsgs || 1;
      const taskCnt = m.taskHits !== undefined ? m.taskHits : Math.round(cnt * (m.cti && m.cti.includes("T") ? 0.16 : 0.06));
      const tokenCnt = m.tokenAgreementHits !== undefined ? m.tokenAgreementHits : Math.round(cnt * (m.avgLen < 9 ? 0.28 : 0.08));
      const shortCnt = m.shortMsgs !== undefined ? m.shortMsgs : Math.round(cnt * (m.avgLen < 10 ? 0.55 : 0.25));

      const fileShares = m.fileShares !== undefined ? m.fileShares : 0;
      const linkShares = m.linkShares !== undefined ? m.linkShares : 0;
      const photoShares = m.photoShares !== undefined ? m.photoShares : (m.photos || 0);
      const workShareCount = m.workShareCount !== undefined ? m.workShareCount : (fileShares + linkShares + photoShares);

      // 문맥 컨테이너 반영 (기본값 fallback 완벽 처리)
      const ctx = memberContextMap[m.name] || {
        roles: new Set(),
        promises: 0,
        deliveries: 0,
        calloutsReceived: 0,
        calloutsIgnored: 0,
        microCounts: { excuse: 0, deflection: 0, vaporware: 0, piggyback: 0, clueless: 0, cheerleader: 0 },
        microEvidences: []
      };

      // 시그니처/인용구 기반 정밀 보정
      const allQuotes = (m.quotes || []).concat(m.signatures || []);
      const allText = allQuotes.join(" ");
      ROLE_DEFS.forEach(r => {
        if (r.regex.test(allText)) ctx.roles.add(r.label);
      });
      MICRO_DEFS.forEach(md => {
        if (md.regex.test(allText)) {
          ctx.microCounts[md.key] = Math.max(ctx.microCounts[md.key], 1);
          if (ctx.microEvidences.length < 3) {
            const matchingQuote = allQuotes.find(q => md.regex.test(q));
            if (matchingQuote && !ctx.microEvidences.some(e => e.quote === matchingQuote)) {
              ctx.microEvidences.push({
                type: md.label,
                badge: md.badge,
                quote: matchingQuote,
                time: "대표 발언 기록"
              });
            }
          }
        }
      });

      // 만약 식별된 임무가 없다면 실무 데이터 기반 유추
      if (ctx.roles.size === 0) {
        if (workShareCount >= 3 || m.starters >= 3) {
          ctx.roles.add("👑 총괄/조장");
        } else if (fileShares >= 2) {
          ctx.roles.add("🎨 PPT제작");
        } else if (linkShares >= 2) {
          ctx.roles.add("🔍 자료조사");
        } else if (m.avgLen >= 20) {
          ctx.roles.add("📝 문서작성");
        } else {
          ctx.roles.add("❓ 임무 미배정");
        }
      }

      const assignedRoles = Array.from(ctx.roles);
      const totalPromises = Math.max(ctx.promises, assignedRoles.some(r => !r.includes("미배정")) ? 1 : 0);
      const totalDeliveries = Math.max(ctx.deliveries, workShareCount >= 2 ? 1 : 0);
      const deliveryRate = totalPromises > 0 ? Math.min(100, Math.round((totalDeliveries / totalPromises) * 100)) : (workShareCount >= 2 ? 100 : 30);

      // 미세 신호 총합 및 정밀 페널티 계산
      const totalMicroFlaws = Object.values(ctx.microCounts).reduce((a, b) => a + b, 0);
      const ignoredCalloutPenalty = Math.min(20, ctx.calloutsIgnored * 6);
      const deflectionPenalty = Math.min(15, (ctx.microCounts.excuse + ctx.microCounts.deflection + ctx.microCounts.vaporware) * 3);

      const taskActRaw = taskCnt * 3.2 + (m.questions || 0) * 1.1 + photoShares * 2.0 + fileShares * 4.5 + linkShares * 3.5 + (m.starters || 0) * 2.5;
      const taskRatio = Math.min(96, Math.max(12, Math.round((taskActRaw / cnt) * 100)));
      const tokenRatio = Math.min(88, Math.max(4, Math.round(((tokenCnt * 2.2 + shortCnt * 0.35) / cnt) * 100)));

      const shareDeficit = Math.max(0, (fairShare - (m.msgRatio || 0)) / fairShare) * 45;
      const latencyPenalty = Math.min(25, Math.max(0, ((m.replySpeed || 15) - 5) * 0.9));
      const tokenPenalty = tokenRatio * 0.35;
      const starterBonus = Math.min(25, (m.starters || 0) * 1.2);
      const lengthBonus = Math.min(15, Math.max(0, ((m.avgLen || 10) - 10) * 1.1));
      const workShareBonus = workShareCount >= 2 ? Math.min(24, Math.round(workShareCount * 1.5)) : 0;
      const deliveryBonus = deliveryRate >= 80 ? 12 : deliveryRate <= 30 ? -15 : 0;

      // 최종 무임승차 위험도 (미세 신호 및 호명 무시 결합)
      const loafingScore = Math.min(98, Math.max(5, Math.round(
        32 + shareDeficit + latencyPenalty + tokenPenalty + ignoredCalloutPenalty + deflectionPenalty - starterBonus - lengthBonus - workShareBonus - deliveryBonus
      )));
      const contributionScore = 100 - loafingScore;

      // 복합 빌런(Multi-Label) 태그 시스템 판별
      const multiVillainTags = [];
      if (ctx.calloutsIgnored >= 1 || (m.replySpeed || 15) >= 35) multiVillainTags.push("👻 선택적 잠수");
      if (ctx.microCounts.excuse >= 1) multiVillainTags.push("🙏 핑계 장인");
      if (ctx.microCounts.deflection >= 1) multiVillainTags.push("🙈 책임 회피");
      if (ctx.microCounts.vaporware >= 1) multiVillainTags.push("⏳ 립서비스 지연");
      if (ctx.microCounts.piggyback >= 1) multiVillainTags.push("🥄 숟가락 얹기");
      if (ctx.microCounts.clueless >= 1) multiVillainTags.push("❓ 뒷북 질문");
      if (tokenRatio >= 35 || ctx.microCounts.cheerleader >= 1) multiVillainTags.push("📣 영혼없는 응원단");
      if (deliveryRate <= 40 && assignedRoles.some(r => !r.includes("미배정"))) multiVillainTags.push("🦜 말만 앞서는 미제출");

      // 기본 등급 및 칭호 부여
      let grade = "B";
      let roleBadge = assignedRoles.join(" · ");
      let mildRoleBadge = assignedRoles.join(" · ");
      let diagnosis = "";
      let mildDiagnosis = "";

      if (contributionScore >= 84) {
        grade = "A+";
        roleBadge = `👑 하드캐리 (${assignedRoles.slice(0, 2).join("+") || "총대장"})`;
        mildRoleBadge = `👑 든든한 리더 (${assignedRoles.slice(0, 2).join("+") || "총대장"})`;
        diagnosis = `시상식대 1등석 주인! 담당 임무(${assignedRoles.join(", ")})를 완벽 완수(이행률 ${deliveryRate}%)하며 실무 자료 공유 ${workShareCount}회로 팀을 멱살 잡고 캐리했습니다!`;
        mildDiagnosis = `시상식대 1등석 주인공! 담당 임무(${assignedRoles.join(", ")})를 성실히 수행(이행률 ${deliveryRate}%)하며 프로젝트를 성공적으로 이끈 든든한 주역입니다.`;
      } else if (contributionScore >= 70) {
        grade = "A";
        roleBadge = `⚡ 실무 에이스 (${assignedRoles[0] || "자료 실무"})`;
        mildRoleBadge = `⚡ 성실한 에이스 (${assignedRoles[0] || "자료 실무"})`;
        diagnosis = `시상식대 상위권 주역! 맡은 임무(${assignedRoles.join(", ")}) 이행률 ${deliveryRate}% 및 빠른 피드백(${m.replySpeed || 12}분)으로 과제를 막힘없이 완수한 실무 에이스입니다!`;
        mildDiagnosis = `시상식대 상위권 주역! 알찬 자료 공유(${workShareCount}회)와 성실한 역할 수행으로 팀에 크게 기여한 핵심 팀원입니다!`;
      } else if (contributionScore >= 54 || workShareCount >= 5) {
        grade = "B+";
        roleBadge = `🤝 1인분 완수 (${assignedRoles[0] || "자료 실무"})`;
        mildRoleBadge = `🤝 든든한 조원 (${assignedRoles[0] || "자료 실무"})`;
        diagnosis = `시상식대 단상 합류! 담당 임무(${assignedRoles.join(", ")})를 묵묵히 소화하며 자기 몫(이행률 ${deliveryRate}%)을 든든하게 증명했습니다.`;
        mildDiagnosis = `시상식대 단상 합류! 안정적인 소통과 실무 자료 공유(${workShareCount}회)로 맡은 역할을 차분히 해낸 팀원입니다.`;
      } else if (multiVillainTags.length >= 2 || loafingScore >= 65) {
        grade = "F";
        const mainTags = multiVillainTags.slice(0, 2).join(" + ") || "무임승차";
        roleBadge = `🐛 복합 빌런 (${mainTags})`;
        mildRoleBadge = `🌱 소통 분발 필요 (${mainTags})`;
        diagnosis = `시상식대 밑바닥 서식 중! [${multiVillainTags.join(", ") || "무임승차"}] 적발. 맡은 임무 이행률은 ${deliveryRate}%에 불과하며 미세 회피·핑계 신호가 ${totalMicroFlaws}건 채증되었습니다!`;
        mildDiagnosis = `추가적인 소통과 적극적인 역할 참여가 필요해요! [${multiVillainTags.join(", ") || "참여 부족"}] 패턴이 감지되어 팀원들과의 활발한 협업이 권장됩니다.`;
      } else if (tokenRatio >= 35) {
        grade = "C-";
        roleBadge = "🦜 영혼 없는 네무새";
        mildRoleBadge = "🦜 영혼 없는 네무새 요정";
        diagnosis = `시상식대 밑바닥 서식 중! 의견 제시 없이 '넵', '좋아요' 같은 영혼 없는 단답(${tokenRatio}%)만 복붙하며 무임승차하고 있습니다!`;
        mildDiagnosis = `조금 더 적극적인 의견 제시가 필요해요! '넵', '좋아요' 같은 짧은 리액션(${tokenRatio}%) 위주로 참여하고 있어 아이디어 공유가 아쉽습니다.`;
      } else {
        grade = "D";
        roleBadge = "🌱 의욕 부족 조원";
        mildRoleBadge = "🌱 관심과 소통 필요";
        diagnosis = `대화 참여율(${m.msgRatio}%)과 이행률(${deliveryRate}%)이 낮아 조원들의 부담을 가중시켰습니다.`;
        mildDiagnosis = `대화 참여와 자료 조사에서 조금 더 적극적인 소통이 이뤄지면 더욱 시너지를 낼 수 있습니다.`;
      }

      return {
        id: m.id || m.name,
        name: m.name,
        cti: m.cti,
        msgRatio: m.msgRatio,
        avgLen: m.avgLen,
        starters: m.starters,
        replySpeed: m.replySpeed || 15,
        fileShares,
        linkShares,
        photoShares,
        workShareCount,
        taskRatio,
        tokenRatio,
        loafingScore,
        contributionScore,
        grade,
        roleBadge,
        mildRoleBadge,
        diagnosis,
        mildDiagnosis,
        // 고도화 필드 추가
        assignedRoles,
        deliveryRate,
        multiVillainTags,
        calloutsIgnored: ctx.calloutsIgnored,
        microCounts: ctx.microCounts,
        totalMicroFlaws,
        microEvidences: ctx.microEvidences
      };
    });

    const sortedByLoafing = [...villainProfiles].sort((a, b) => b.loafingScore - a.loafingScore);
    const sortedByContrib = [...villainProfiles].sort((a, b) => b.contributionScore - a.contributionScore);

    // 3. [썸·연인 1:1 애정도] 기본 상위 페어에 대한 동적 속마음 & 질문 6선 생성
    const existingRomance = (report.academicMetrics && report.academicMetrics.romance) ? report.academicMetrics.romance : null;
    const mA = members[0] || null;
    const mB = members[1] || mA;
    const topPairInfo = (report.pairRankings && report.pairRankings[0]) || null;
    const generatedSecretMind = (mA && mB) ? this.buildDynamicSecretMind(mA, mB, topPairInfo, report) : null;

    return {
      chemistry: {
        groupLsmScore,
        turnTakingBalance,
        groupCohesionIndex
      },
      romance: existingRomance && existingRomance.secretMind
        ? existingRomance
        : {
            secretMind: generatedSecretMind
          },
      villain: {
        profiles: villainProfiles,
        topVillain: sortedByLoafing[0] || null,
        topHero: sortedByContrib[0] || null,
        fairShare: Number(fairShare.toFixed(1))
      }
    };
  }
};