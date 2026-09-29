// 앱 메인 로직 & UI 컨트롤러

let currentData = null;
let radarCharts = {};
let isAnonymized = false;
let originalDataCache = null;
let focusedMemberId = null;
let currentShareRatio = "story";
let activityCharts = { hourly: null, weekday: null };

// CTI 성향별 하이라이트 색상 테마 정의
function getCtiBadgeStyle(cti) {
  const styles = {
    // E계열 (활동/추진)
    "ELFA": { bg: "rgba(239, 68, 68, 0.18)", text: "#F87171", border: "rgba(239, 68, 68, 0.4)" },
    "ELFR": { bg: "rgba(244, 63, 94, 0.18)", text: "#FB7185", border: "rgba(244, 63, 94, 0.4)" },
    "ELTA": { bg: "rgba(249, 115, 22, 0.18)", text: "#FB923C", border: "rgba(249, 115, 22, 0.4)" },
    "ELTR": { bg: "rgba(234, 179, 8, 0.18)",  text: "#FACC15", border: "rgba(234, 179, 8, 0.4)" },
    "ESFA": { bg: "rgba(236, 72, 153, 0.18)", text: "#F472B6", border: "rgba(236, 72, 153, 0.4)" },
    "ESFR": { bg: "rgba(217, 70, 239, 0.18)", text: "#E879F9", border: "rgba(217, 70, 239, 0.4)" },
    "ESTA": { bg: "rgba(245, 183, 61, 0.22)", text: "#FF7A45", border: "rgba(245, 183, 61, 0.5)" },
    "ESTR": { bg: "rgba(245, 158, 11, 0.18)", text: "#FBBF24", border: "rgba(245, 158, 11, 0.4)" },
    // I계열 (관조/신중)
    "ILFA": { bg: "rgba(168, 85, 247, 0.18)", text: "#C084FC", border: "rgba(168, 85, 247, 0.4)" },
    "ILFR": { bg: "rgba(20, 184, 166, 0.18)", text: "#2DD4BF", border: "rgba(20, 184, 166, 0.4)" },
    "ILTA": { bg: "rgba(59, 130, 246, 0.18)", text: "#60A5FA", border: "rgba(59, 130, 246, 0.4)" },
    "ILTR": { bg: "rgba(99, 102, 241, 0.18)", text: "#818CF8", border: "rgba(99, 102, 241, 0.4)" },
    "ISFA": { bg: "rgba(14, 165, 233, 0.18)", text: "#38BDF8", border: "rgba(14, 165, 233, 0.4)" },
    "ISFR": { bg: "rgba(16, 185, 129, 0.18)", text: "#34D399", border: "rgba(16, 185, 129, 0.4)" },
    "ISTA": { bg: "rgba(100, 116, 139, 0.25)", text: "#CBD5E1", border: "rgba(148, 163, 184, 0.4)" },
    "ISTR": { bg: "rgba(71, 85, 105, 0.28)", text: "#94A3B8", border: "rgba(100, 116, 139, 0.45)" }
  };
  return styles[cti] || { bg: "rgba(255, 255, 255, 0.08)", text: "#f6f8fa", border: "rgba(255,255,255,0.08)" };
}

// 뱃지 HTML 생성 헬퍼
function getCtiBadgeHtml(cti, extraClass = "") {
  const s = getCtiBadgeStyle(cti);
  return `<span class="px-2.5 py-0.5 rounded-full text-xs font-black font-mono border inline-block ${extraClass}" style="background-color: ${s.bg}; color: ${s.text}; border-color: ${s.border};">${cti}</span>`;
}

// 초기화
document.addEventListener("DOMContentLoaded", () => {
  setupMainDragAndDrop();
  renderLandingEncyclopedia();
});

// 메인 화면 드래그 앤 드롭 및 파일 인풋 연결
function setupMainDragAndDrop() {
  const dropZone = document.getElementById("mainDropZone");
  const fileInput = document.getElementById("mainFileInput");

  if (dropZone) {
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("border-[#f5b73d]", "bg-[#111820]");
    });

    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("border-[#f5b73d]", "bg-[#111820]");
    });

    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("border-[#f5b73d]", "bg-[#111820]");
      if (e.dataTransfer.files.length > 0) {
        processFile(e.dataTransfer.files[0]);
      }
    });

    dropZone.addEventListener("click", (e) => {
      if (e.target.tagName !== "BUTTON" && !e.target.closest("button")) {
        if (fileInput) fileInput.click();
      }
    });
  }
}

function triggerFileInput() {
  const fileInput = document.getElementById("mainFileInput");
  if (fileInput) fileInput.click();
}

function handleFileSelect(e) {
  if (e.target.files.length > 0) {
    processFile(e.target.files[0]);
  }
}

function processFile(file) {
  if (!file.name.endsWith(".txt")) {
    alert("카카오톡 대화 내용 내보내기 텍스트 파일(.txt)을 올려주세요.");
    return;
  }

  const loadingOverlay = document.getElementById("loadingOverlay");
  const loadingSubText = document.getElementById("loadingSubText");
  if (loadingOverlay) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    if (loadingSubText) {
      loadingSubText.innerText = `파일 크기: ${sizeMb}MB • 전체 대화 전문을 100% 전수 분석 중입니다.`;
    }
    loadingOverlay.classList.remove("hidden");
  }

  const reader = new FileReader();
  reader.onload = function(evt) {
    setTimeout(() => {
      try {
        const text = evt.target.result;
        const report = window.KAKAO_PARSER.parseText(text);
        report.roomName = file.name.replace(".txt", "").replace("KakaoTalk_", "카톡 단톡방 ");
        
        currentData = report;
        originalDataCache = JSON.parse(JSON.stringify(report));
        isAnonymized = false;
        focusedMemberId = null;
        updateAnonymizeButtonText();

        showReportView();
        renderCurrentData();
        triggerConfetti();
      } catch (err) {
        alert("파일 분석 실패: " + err.message);
        console.error(err);
      } finally {
        if (loadingOverlay) loadingOverlay.classList.add("hidden");
      }
    }, 50);
  };
  reader.readAsText(file, "UTF-8");
}

function loadSampleDemo(event) {
  if (event) event.stopPropagation();
  currentData = JSON.parse(JSON.stringify(window.SAMPLE_REPORT_DATA));
  originalDataCache = JSON.parse(JSON.stringify(window.SAMPLE_REPORT_DATA));
  isAnonymized = false;
  focusedMemberId = null;
  updateAnonymizeButtonText();

  showReportView();
  renderCurrentData();
  triggerConfetti();
}

function handleHeaderHomeClick() {
  if (currentData) {
    // 분석된 데이터가 있으면 파일 업로드 화면으로 나가지 않고 리포트 홈 대시보드로 이동
    returnToReportHome();
  } else {
    showLandingView();
  }
}

function handleNavBackClick() {
  if (currentData) {
    returnToReportHome();
  } else {
    showLandingView();
  }
}

function showLandingView() {
  document.getElementById("landingView").classList.remove("hidden");
  document.getElementById("reportView").classList.add("hidden");
  const navReportActions = document.getElementById("navReportActions");
  if (navReportActions) navReportActions.classList.add("hidden");
  navReportActions.classList.remove("flex");
  document.getElementById("navUploadBtn").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showReportView() {
  document.getElementById("landingView").classList.add("hidden");
  document.getElementById("reportView").classList.remove("hidden");
  const navReportActions = document.getElementById("navReportActions");
  if (navReportActions) {
    navReportActions.classList.remove("hidden");
    navReportActions.classList.add("flex");
  }
  document.getElementById("navUploadBtn").classList.add("hidden");
  
  // 처음 분석 후 들어왔을 때는 종합 성적표 선공개 대시보드 표시
  returnToReportHome();
}

// 2x2 버튼을 눌렀을 때: 대시보드(헤더+2x2버튼) 숨기고 해당 세부 내용만 표시
function openReportDetail(tabId) {
  const homeDashboard = document.getElementById("reportHomeDashboard");
  const detailSection = document.getElementById("reportDetailSection");
  if (homeDashboard) homeDashboard.classList.add("hidden");
  if (detailSection) detailSection.classList.remove("hidden");

  // 상세 뱃지 제목 변경
  const badgeTitleMap = {
    tabOverview: "🏆 종합 우정 성적표",
    tabCharacters: "🪪 인물별 CTI 팩폭 카드",
    tabPersonalFocus: "🎯 인물별 맞춤 리포트",
    tabChemistry: "⚡ 1:1 케미 & 궁합 랭킹",
    tabActivity: "📈 활동 패턴 & 시그니처 키워드",
    tabEncyclopedia: "📖 CTI 16가지 성향 도감"
  };
  const badgeEl = document.getElementById("detailViewBadgeTitle");
  if (badgeEl && badgeTitleMap[tabId]) {
    badgeEl.innerText = badgeTitleMap[tabId];
  }

  // 모든 세부 탭 숨김 후 대상 탭 노출
  document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
  const targetTab = document.getElementById(tabId);
  if (targetTab) targetTab.classList.remove("hidden");

  if (tabId === "tabCharacters") {
    setTimeout(renderAllRadarCharts, 50);
  }
  if (tabId === "tabActivity") {
    setTimeout(renderActivityCharts, 50);
  }
  if (tabId === "tabPersonalFocus") {
    renderFocusFilterBar();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// 상세 페이지에서 '전체 메뉴로 돌아가기'를 눌렀을 때
function returnToReportHome() {
  const homeDashboard = document.getElementById("reportHomeDashboard");
  const detailSection = document.getElementById("reportDetailSection");
  if (homeDashboard) homeDashboard.classList.remove("hidden");
  if (detailSection) detailSection.classList.add("hidden");

  // 모든 세부 탭 숨김
  document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function switchTab(tabId) {
  openReportDetail(tabId);
}

function renderCurrentData() {
  if (!currentData) return;

  const titleEl = document.getElementById("roomTitle");
  if (titleEl) titleEl.innerText = currentData.roomName;
  const gradeEl = document.getElementById("roomGradeBadge");
  if (gradeEl) gradeEl.innerText = `우정 ${currentData.groupGrade}`;
  const subEl = document.getElementById("roomSubText");
  if (subEl) subEl.innerText = `${currentData.dateRange} • 총 ${currentData.totalMessages.toLocaleString()}건 분석`;

  document.getElementById("statTension").innerText = `${currentData.tensionIndex}%`;
  const peaceBadge = document.getElementById("statPeaceBadge");
  const tensionDescEl = document.getElementById("statTensionDesc");
  if (peaceBadge) {
    peaceBadge.innerText = `평화 ${currentData.peaceIndex || (100 - currentData.tensionIndex)}%`;
    if (currentData.tensionIndex >= 30) {
      peaceBadge.className = "text-xs text-rose-300 bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-800/60";
    } else if (currentData.tensionIndex >= 10) {
      peaceBadge.className = "text-xs text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800/60";
    } else {
      peaceBadge.className = "text-xs text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/60";
    }
  }
  if (tensionDescEl && currentData.tensionDesc) {
    tensionDescEl.innerText = currentData.tensionDesc;
  }

  document.getElementById("statTotalMsgs").innerText = currentData.totalMessages.toLocaleString();
  
  if (currentData.members.length > 0) {
    const topTalker = currentData.members.reduce((prev, curr) => (prev.totalMsgs > curr.totalMsgs) ? prev : curr);
    document.getElementById("statTopTalker").innerText = topTalker.name;
    document.getElementById("statTopRatio").innerText = `${topTalker.msgRatio}%`;
  }

  if (currentData.pairRankings && currentData.pairRankings.length > 0) {
    const topPair = currentData.pairRankings[0];
    document.getElementById("statTopPair").innerText = `${topPair.pair[0]} ↔ ${topPair.pair[1]}`;
    const pairCountEl = document.getElementById("statTopPairCount");
    if (pairCountEl) pairCountEl.innerText = `${topPair.replies.toLocaleString()}회`;
  }

  document.getElementById("groupVibeText").innerText = currentData.groupVibe;

  renderFocusFilterBar();
  renderOverviewMembers();
  renderCharacterCards();
  renderChemistryTab();
  renderActivityTab();
  renderReportEncyclopedia();
}

function renderFocusFilterBar() {
  const container = document.getElementById("focusMemberFilterContainer");
  if (!container || !currentData || !currentData.members || currentData.members.length === 0) return;
  container.innerHTML = "";

  // 기본 선택 멤버가 없으면 첫 번째 멤버 자동 선택
  if (!focusedMemberId) {
    focusedMemberId = currentData.members[0].id || currentData.members[0].name;
  }

  currentData.members.forEach(m => {
    const isFocused = focusedMemberId === m.id || focusedMemberId === m.name;
    const btn = document.createElement("button");
    btn.className = `px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 border ${
      isFocused 
        ? 'bg-[#f5b73d] text-[#030708] border-[#f5b73d] shadow-sm scale-105' 
        : 'bg-[#111820] text-[#f6f8fa] hover:bg-[#16202a] border-white/[0.08]'
    }`;
    btn.innerHTML = `<span>${m.avatar}</span> <span>${m.name}</span>`;
    btn.onclick = () => selectFocusMember(m.id || m.name);
    container.appendChild(btn);
  });

  updateFocusBannerCard();
}

function updateFocusBannerCard() {
  if (!currentData || !currentData.members) return;
  const m = currentData.members.find(x => x.id === focusedMemberId || x.name === focusedMemberId) || currentData.members[0];
  if (!m) return;

  const avatarEl = document.getElementById("focusAvatar");
  if (avatarEl) avatarEl.innerText = m.avatar;

  const nameEl = document.getElementById("focusName");
  if (nameEl) nameEl.innerText = m.name;

  const badgeEl = document.getElementById("focusCtiBadge");
  if (badgeEl) badgeEl.innerHTML = getCtiBadgeHtml(m.cti);

  const personaEl = document.getElementById("focusPersonaText");
  if (personaEl) personaEl.innerText = `${m.timePersona || '활동가'} • 전체 대화의 ${m.msgRatio}% 담당`;

  const pairs = (currentData.pairRankings || []).filter(p => p.pair.includes(m.name));
  const soulmateEl = document.getElementById("focusTopSoulmate");
  if (soulmateEl) {
    if (pairs.length > 0) {
      const topP = pairs.reduce((best, cur) => cur.score > best.score ? cur : best, pairs[0]);
      const otherName = topP.pair[0] === m.name ? topP.pair[1] : topP.pair[0];
      soulmateEl.innerText = `${otherName} (${topP.score}점, 티키타카 ${topP.replies.toLocaleString()}회)`;
    } else {
      soulmateEl.innerText = "단짝 데이터 집계 중";
    }
  }

  const words = (m.topWords || []).slice(0, 3).map(w => `#${w.word}`).join(" ");
  const wordsEl = document.getElementById("focusTopWords");
  if (wordsEl) {
    wordsEl.innerText = words || (m.signatures || []).slice(0, 3).join(", ") || "-";
  }

  const hoursEl = document.getElementById("focusActiveHours");
  if (hoursEl) {
    hoursEl.innerText = m.activeHours || "피크 타임";
  }

  // 추가 심층 지표
  const ratioEl = document.getElementById("focusMsgRatio");
  if (ratioEl) ratioEl.innerText = `${m.msgRatio}%`;

  const totalMsgsEl = document.getElementById("focusTotalMsgs");
  if (totalMsgsEl) totalMsgsEl.innerText = `총 ${m.totalMsgs.toLocaleString()}건`;

  const replySpeedEl = document.getElementById("focusReplySpeed");
  if (replySpeedEl) replySpeedEl.innerText = `${m.replySpeed || 15}분`;

  const replySpeedSubEl = document.getElementById("focusReplySpeedSub");
  if (replySpeedSubEl) {
    const sp = m.replySpeed || 15;
    replySpeedSubEl.innerText = sp <= 5 ? "⚡ 초고속 칼답러" : sp <= 20 ? "🚀 평균적 반응 속도" : "🐢 느긋한 확인";
  }

  const owlRatioEl = document.getElementById("focusOwlRatio");
  if (owlRatioEl) owlRatioEl.innerText = `${m.owlRatio || 0}%`;

  const mentionCountEl = document.getElementById("focusMentionCount");
  if (mentionCountEl) mentionCountEl.innerText = `${m.mentionCount || 0}회`;

  // 단톡방 친구들과의 1:1 관계도 렌더링
  const pairListContainer = document.getElementById("focusMemberPairList");
  if (pairListContainer) {
    pairListContainer.innerHTML = "";
    if (pairs.length > 0) {
      // 점수 높은 순으로 정렬
      const sortedPairs = [...pairs].sort((a, b) => b.score - a.score);
      sortedPairs.forEach(p => {
        const otherName = p.pair[0] === m.name ? p.pair[1] : p.pair[0];
        const otherType = p.pair[0] === m.name ? p.types[1] : p.types[0];
        const item = document.createElement("div");
        item.className = "bg-[#030708] border border-white/[0.08] hover:border-white/[0.2] rounded-2xl p-3.5 flex items-center justify-between gap-2";
        item.innerHTML = `
          <div class="flex items-center gap-2.5">
            <span class="text-base font-bold text-[#f6f8fa]">${otherName}</span>
            ${getCtiBadgeHtml(otherType)}
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-[#f5b73d]">${p.score}점 (${p.grade}급)</span>
            <span class="text-[11px] text-[#848c96] font-mono">티키타카 ${p.replies.toLocaleString()}회</span>
          </div>
        `;
        pairListContainer.appendChild(item);
      });
    } else {
      pairListContainer.innerHTML = `<p class="text-xs text-[#848c96] py-3 text-center col-span-2">단톡방 내 1:1 상호작용 데이터가 부족합니다.</p>`;
    }
  }
}

function selectFocusMember(memberId) {
  focusedMemberId = memberId;
  renderFocusFilterBar();
  renderChemistryTab();
}

function clearFocusMember() {
  focusedMemberId = null;
  renderFocusFilterBar();
  renderChemistryTab();
}

// 탭 1: 종합 성적표 참여자 카드
function renderOverviewMembers() {
  const container = document.getElementById("overviewMemberGrid");
  if (!container) return;
  container.innerHTML = "";

  currentData.members.forEach(m => {
    const card = document.createElement("div");
    card.className = "bg-[#090e13] border border-white/[0.08] hover:border-[#f5b73d] rounded-[28px] p-5 sm:p-6 space-y-4 cursor-pointer transition hover:-translate-y-1 shadow-[0_4px_24px_rgba(0,0,0,0.25)] flex flex-col justify-between";
    card.onclick = () => {
      selectFocusMember(m.id || m.name);
      openReportDetail("tabCharacters");
    };
    card.innerHTML = `
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-3xl sm:text-4xl w-12 h-12 rounded-2xl bg-[#111820] flex items-center justify-center border border-white/[0.06] shadow-sm">${m.avatar}</span>
            <div>
              <h5 class="text-base sm:text-lg font-black text-[#f6f8fa] flex items-center gap-2">${m.name}</h5>
              <p class="text-xs text-[#848c96] mt-0.5">${m.title}</p>
            </div>
          </div>
          <div>
            ${getCtiBadgeHtml(m.cti)}
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2 bg-[#030708] p-3 rounded-2xl border border-white/[0.06] text-center">
          <div>
            <span class="text-[10px] text-[#848c96]">발화 점유율</span>
            <p class="text-xs sm:text-sm font-bold text-[#f6f8fa] mt-0.5">${m.msgRatio}%</p>
          </div>
          <div>
            <span class="text-[10px] text-[#848c96]">평균 글자수</span>
            <p class="text-xs sm:text-sm font-bold text-[#f6f8fa] mt-0.5">${m.avgLen}자</p>
          </div>
          <div>
            <span class="text-[10px] text-[#848c96]">대화 선제개시</span>
            <p class="text-xs sm:text-sm font-bold text-[#f5b73d] mt-0.5">${m.starters}회</p>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between pt-1 border-t border-white/[0.06]">
        <span class="text-[11px] px-3 py-1 rounded-full bg-[#111820] text-[#f6f8fa] border border-white/[0.08] font-medium truncate max-w-[200px]">
          ${m.trophy}
        </span>
        <span class="text-xs font-bold text-[#f5b73d] flex items-center gap-1 hover:underline">
          캐릭터 카드 <i class="fa-solid fa-arrow-right text-[10px]"></i>
        </span>
      </div>
    `;
    container.appendChild(card);
  });
}

// 수치 게이지 바 렌더링 헬퍼 함수
function renderStatGauge(label, value, colorClass) {
  return `
    <div class="space-y-1">
      <div class="flex justify-between text-[11px]">
        <span class="text-[#848c96] font-medium">${label}</span>
        <span class="font-mono font-bold text-[#f6f8fa]">${value}<span class="text-[9px] text-[#848c96]">/100</span></span>
      </div>
      <div class="w-full bg-[#111820] h-1.5 rounded-full overflow-hidden">
        <div class="${colorClass} h-full rounded-full transition-all duration-500" style="width: ${Math.min(100, Math.max(5, value))}%"></div>
      </div>
    </div>
  `;
}

// 탭 2: 인물별 CTI 팩폭 카드 (카드 덱 넘기기 시스템)
let currentCharDeckIndex = 0;

function renderCharacterCards(resetToMe = false) {
  if (!currentData || !currentData.members || currentData.members.length === 0) return;

  // 명시적으로 나에게 맞추라고 한 경우에만 포커스 인덱스로 맞춤
  if (resetToMe && focusedMemberId) {
    const fIdx = currentData.members.findIndex(m => m.id === focusedMemberId || m.name === focusedMemberId);
    if (fIdx !== -1) currentCharDeckIndex = fIdx;
  }

  if (currentCharDeckIndex < 0 || currentCharDeckIndex >= currentData.members.length) {
    currentCharDeckIndex = 0;
  }

  // 상단 멤버 아바타 셀렉터 렌더링
  const memberListEl = document.getElementById("charDeckMemberList");
  if (memberListEl) {
    memberListEl.innerHTML = "";
    currentData.members.forEach((m, idx) => {
      const isSelected = idx === currentCharDeckIndex;
      const isMe = Boolean(focusedMemberId && (m.id === focusedMemberId || m.name === focusedMemberId));
      
      const btn = document.createElement("button");
      btn.className = `px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-2 shrink-0 border ${
        isSelected 
          ? 'bg-[#f5b73d] text-[#030708] border-[#f5b73d] shadow-md scale-105' 
          : 'bg-[#111820] text-[#f6f8fa] hover:bg-[#16202a] border-white/[0.08]'
      }`;
      btn.innerHTML = `
        <span class="text-sm">${m.avatar}</span>
        <span>${m.name}</span>
        ${isMe ? '<i class="fa-solid fa-crown text-[10px] text-amber-900"></i>' : ''}
      `;
      btn.onclick = () => selectCharCardIndex(idx);
      memberListEl.appendChild(btn);
    });
  }

  // 카운터 텍스트 업데이트
  const counterEl = document.getElementById("charDeckCounter");
  if (counterEl) {
    counterEl.innerText = `${currentCharDeckIndex + 1} / ${currentData.members.length}`;
  }

  // 1장의 상세 카드 렌더링
  renderCurrentDeckCard();
}

function selectCharCardIndex(index) {
  if (!currentData || !currentData.members || currentData.members.length === 0) return;
  const len = currentData.members.length;
  currentCharDeckIndex = ((index % len) + len) % len;
  renderCharacterCards(false);
}

function prevCharCard() {
  selectCharCardIndex(currentCharDeckIndex - 1);
}

function nextCharCard() {
  selectCharCardIndex(currentCharDeckIndex + 1);
}

function renderCurrentDeckCard() {
  const container = document.getElementById("characterCardDeckView");
  if (!container || !currentData || !currentData.members) return;

  const m = currentData.members[currentCharDeckIndex];
  if (!m) return;

  const isMe = Boolean(focusedMemberId && (m.id === focusedMemberId || m.name === focusedMemberId));

  const quotesHtml = (m.quotes || []).map(q => `
    <li class="flex items-start gap-2 text-xs text-[#848c96] italic">
      <span class="text-[#f5b73d]">"</span>
      <span>${q}</span>
      <span class="text-[#f5b73d]">"</span>
    </li>
  `).join("");

  const signaturesHtml = (m.signatures || []).map(s => `
    <span class="px-2.5 py-1 rounded-full bg-[#111820] border border-white/[0.08] text-[#f6f8fa] text-[11px] font-mono">#${s}</span>
  `).join("");

  container.innerHTML = `
    <div class="bg-[#090e13] ${isMe ? 'border-2 border-[#f5b73d]' : 'border border-white/[0.08]'} rounded-[36px] p-6 sm:p-7 space-y-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden transition-all duration-300">
      <!-- 카드 상단 프로필 -->
      <div class="flex items-start justify-between gap-4">
        <div class="flex items-center gap-3.5">
          <div class="w-16 h-16 rounded-2xl bg-[#111820] border border-white/[0.08] flex items-center justify-center text-3xl shadow-sm">
            ${m.avatar}
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h4 class="text-xl sm:text-2xl font-black text-[#f6f8fa] flex items-center gap-2">
                <span>${m.name}</span>
                ${isMe ? '<span class="text-xs px-2.5 py-0.5 rounded-full bg-[#f5b73d] text-white font-black flex items-center gap-1 shadow-sm"><i class="fa-solid fa-crown text-[10px]"></i> 내 카드</span>' : ''}
              </h4>
              ${getCtiBadgeHtml(m.cti)}
            </div>
            <p class="text-xs font-bold text-[#f5b73d] mt-1">${m.title}</p>
          </div>
        </div>
        <span class="text-xs font-mono font-bold text-[#848c96] bg-[#111820] border border-white/[0.08] px-3 py-1 rounded-full">
          대화 지분 ${m.msgRatio}%
        </span>
      </div>

      <!-- 레이더 차트 및 5대 지표 수치 진단 섹션 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-[#030708] p-4 sm:p-5 rounded-2xl border border-white/[0.08]">
        <div class="h-56 relative flex items-center justify-center">
          <canvas id="activeRadarChart"></canvas>
        </div>
        <div class="space-y-2.5">
          <div class="flex items-center justify-between pb-1 border-b border-[#111820]">
            <span class="text-xs font-bold text-[#f6f8fa] flex items-center gap-1.5">
              <i class="fa-solid fa-sliders text-[#f5b73d]"></i> 5대 성향 수치 진단
            </span>
            <span class="text-[10px] text-[#848c96]">전수 분석 통계</span>
          </div>
          ${renderStatGauge("⚡ 점화력 (화제 개시)", m.radar.initiative, "bg-[#f5b73d]")}
          ${renderStatGauge("📏 문장 길이 (호흡)", m.radar.length, "bg-[#38bdf8]")}
          ${renderStatGauge("💬 감정 / 드립 (공감)", m.radar.emotion, "bg-emerald-400")}
          ${renderStatGauge("🎯 직진 / 도발 (단도직입)", m.radar.assertiveness, "bg-purple-400")}
          ${renderStatGauge("🤣 유머 감각 (티키타카)", m.radar.humor, "bg-[#f5b73d]")}
        </div>
      </div>

      <!-- 기본 대화 집계 통계 4칸 -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
        <div class="bg-[#030708] p-3 rounded-xl border border-[#111820]">
          <span class="text-[11px] text-[#848c96] block mb-0.5">총 발화량</span>
          <strong class="text-sm text-[#f6f8fa] font-mono">${m.totalMsgs.toLocaleString()}건</strong>
        </div>
        <div class="bg-[#030708] p-3 rounded-xl border border-[#111820]">
          <span class="text-[11px] text-[#848c96] block mb-0.5">평균 글자 수</span>
          <strong class="text-sm text-[#f6f8fa] font-mono">${m.avgLen}자</strong>
        </div>
        <div class="bg-[#030708] p-3 rounded-xl border border-[#111820]">
          <span class="text-[11px] text-[#848c96] block mb-0.5">대화 점화 (선톡)</span>
          <strong class="text-sm text-[#f5b73d] font-mono">${m.starters}회</strong>
        </div>
        <div class="bg-[#030708] p-3 rounded-xl border border-[#111820]">
          <span class="text-[11px] text-[#848c96] block mb-0.5">웃음 / 질문</span>
          <strong class="text-sm text-[#f6f8fa] font-mono">${m.laughs.toLocaleString()} / ${m.questions}</strong>
        </div>
      </div>

      <!-- 시그니처 키워드 -->
      <div class="space-y-1.5">
        <p class="text-xs font-bold text-[#848c96]">시그니처 키워드</p>
        <div class="flex flex-wrap gap-1.5">${signaturesHtml}</div>
      </div>

      <!-- 박제된 대표 대사 -->
      <div class="space-y-2 bg-[#030708] p-3.5 rounded-2xl border border-white/[0.08]">
        <p class="text-xs font-bold text-[#848c96] flex items-center gap-1.5">
          <i class="fa-solid fa-quote-left text-[#f5b73d]"></i> 박제된 대표 대사
        </p>
        <ul class="space-y-1.5">${quotesHtml}</ul>
      </div>

      <!-- 뼈 때리는 팩폭 피드백 -->
      <div class="bg-[rgba(245, 183, 61,0.08)] border border-[rgba(245, 183, 61,0.3)] rounded-2xl p-4 space-y-2">
        <div class="flex items-center gap-2 text-[#f5b73d] text-xs font-bold">
          <i class="fa-solid fa-skull-crossbones"></i> 뼈 때리는 팩폭 피드백
        </div>
        <p class="text-xs sm:text-sm text-[#f6f8fa] leading-relaxed font-medium">${m.savage}</p>
        <div class="pt-1 text-[11px] text-[#848c96] flex items-center gap-1.5 border-t border-white/[0.05]">
          <i class="fa-solid fa-lightbulb text-[#f5b73d]"></i> 조언: ${m.advice}
        </div>
      </div>

      <div class="text-right">
        <span class="text-xs font-extrabold px-3 py-1 rounded-full bg-[#111820] border border-white/[0.08] text-[#f6f8fa]">
          ${m.trophy}
        </span>
      </div>
    </div>
  `;

  // 레이더 차트 렌더링
  setTimeout(renderActiveRadarChart, 30);
}

// 현재 활성화된 1장의 카드에 레이더 차트 렌더링
function renderActiveRadarChart() {
  if (!currentData || !currentData.members) return;
  const m = currentData.members[currentCharDeckIndex];
  if (!m) return;

  const canvas = document.getElementById("activeRadarChart");
  if (!canvas) return;

  if (radarCharts['active']) {
    radarCharts['active'].destroy();
  }

  const ctx = canvas.getContext("2d");
  radarCharts['active'] = new Chart(ctx, {
    type: "radar",
    data: {
      labels: ["점화력", "문장길이", "감정/드립", "직진/도발", "유머감각"],
      datasets: [{
        label: m.name,
        data: [
          Number(m.radar.initiative) || 0,
          Number(m.radar.length) || 0,
          Number(m.radar.emotion) || 0,
          Number(m.radar.assertiveness) || 0,
          Number(m.radar.humor) || 0
        ],
        backgroundColor: "rgba(245, 183, 61, 0.28)",
        borderColor: "#f5b73d",
        borderWidth: 2,
        pointBackgroundColor: "#f5b73d",
        pointBorderColor: "#f6f8fa",
        pointBorderWidth: 1.5,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => ` ${c.label}: ${c.raw}점`
          }
        }
      },
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: { display: false, stepSize: 20 },
          grid: { color: "rgba(255, 255, 255, 0.08)" },
          angleLines: { color: "rgba(255, 255, 255, 0.08)" },
          pointLabels: {
            color: "#848c96",
            font: { size: 11, family: "Pretendard Variable", weight: "bold" }
          }
        }
      }
    }
  });
}

function renderAllRadarCharts() {
  renderActiveRadarChart();
}

// 탭 3: 케미 & 궁합 탭
function renderChemistryTab() {
  const showcaseContainer = document.getElementById("pairTopShowcaseContainer");
  const listContainer = document.getElementById("pairRankingsContainer");
  if (!showcaseContainer || !listContainer) return;
  
  showcaseContainer.innerHTML = "";
  listContainer.innerHTML = "";

  let pairs = (currentData.pairRankings || []);
  const focusedMemberObj = currentData.members.find(x => x.id === focusedMemberId || x.name === focusedMemberId);
  const targetName = focusedMemberObj ? focusedMemberObj.name : focusedMemberId;

  if (targetName) {
    const focusedPairs = pairs.filter(p => p.pair.includes(targetName));
    const otherPairs = pairs.filter(p => !p.pair.includes(targetName));
    pairs = [...focusedPairs, ...otherPairs];
  }

  // 상위 3위 분리
  const top3Pairs = pairs.slice(0, 3);
  const remainPairs = pairs.slice(3);

  const medalStyles = [
    { rankBadge: "🥇 1위 영혼의 단짝", border: "border-[#f5b73d]", bg: "bg-[#090e13]", glow: "shadow-[0_8px_30px_rgba(245,183,61,0.18)]" },
    { rankBadge: "🥈 2위 찰떡 콤비", border: "border-slate-300", bg: "bg-[#090e13]", glow: "shadow-[0_8px_30px_rgba(203,213,225,0.12)]" },
    { rankBadge: "🥉 3위 티키타카 메이트", border: "border-amber-700", bg: "bg-[#090e13]", glow: "shadow-[0_8px_30px_rgba(180,83,9,0.12)]" }
  ];

  top3Pairs.forEach((p, idx) => {
    const style = medalStyles[idx] || medalStyles[2];
    const isMyPair = Boolean(targetName && p.pair.includes(targetName));
    const card = document.createElement("div");
    card.className = `${style.bg} ${style.border} ${style.glow} border rounded-[32px] p-5 space-y-4 relative flex flex-col justify-between`;
    
    card.innerHTML = `
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-black px-3 py-1 rounded-full bg-[#111820] text-[#f6f8fa] border border-white/[0.08]">
            ${style.rankBadge}
          </span>
          <span class="text-xs font-black px-2.5 py-0.5 rounded-full bg-[#f5b73d] text-[#030708]">
            ${p.score}점 (${p.grade}급)
          </span>
        </div>

        <div class="text-center py-2 space-y-1">
          <div class="text-2xl font-black text-[#f6f8fa] flex items-center justify-center gap-2">
            <span>${p.pair[0]}</span>
            <span class="text-[#f5b73d] text-lg">❤️</span>
            <span>${p.pair[1]}</span>
          </div>
          <div class="flex items-center justify-center gap-2">
            ${getCtiBadgeHtml(p.types[0])}
            <span class="text-xs text-[#848c96] font-bold">&</span>
            ${getCtiBadgeHtml(p.types[1])}
          </div>
        </div>

        <div class="bg-[#030708] p-3 rounded-2xl border border-white/[0.06] text-center">
          <p class="text-xs font-bold text-[#f5b73d]">${p.badge}</p>
          <p class="text-[11px] text-[#848c96] mt-1">${p.summary}</p>
        </div>
      </div>

      <div class="flex items-center justify-between pt-2 border-t border-white/[0.06] text-[11px] font-mono text-[#848c96]">
        <span>티키타카: <strong class="text-[#f6f8fa]">${p.replies.toLocaleString()}회</strong></span>
        <span>스트릭: <strong class="text-[#f6f8fa]">${p.streaks}회</strong></span>
      </div>
    `;
    showcaseContainer.appendChild(card);
  });

  // 나머지 순위는 2열 그리드로 컴팩트하게 노출
  remainPairs.forEach(p => {
    const isMyPair = Boolean(targetName && p.pair.includes(targetName));
    const card = document.createElement("div");
    card.className = "bg-[#090e13] border border-white/[0.08] hover:border-white/[0.2] rounded-[24px] p-4 space-y-3 transition";

    let gradeColor = "text-[#f5b73d] bg-[rgba(234,164,58,0.15)] border-[rgba(234,164,58,0.4)]";
    if (p.grade.includes("SS")) gradeColor = "text-[#f5b73d] bg-[rgba(245, 183, 61,0.15)] border-[rgba(245, 183, 61,0.4)]";
    else if (p.grade === "A") gradeColor = "text-emerald-400 bg-emerald-950/60 border-emerald-800/60";
    else if (p.grade === "B+") gradeColor = "text-[#38bdf8] bg-[rgba(56, 189, 248,0.15)] border-[rgba(56, 189, 248,0.4)]";

    card.innerHTML = `
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2.5">
          <span class="w-6 h-6 rounded-full bg-[#111820] text-[#848c96] flex items-center justify-center font-bold text-xs">
            ${p.rank}
          </span>
          <span class="text-sm font-bold text-[#f6f8fa]">${p.pair[0]} ↔ ${p.pair[1]}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="px-2 py-0.5 rounded-full text-[11px] font-bold border ${gradeColor}">${p.grade}급 (${p.score}점)</span>
        </div>
      </div>
      <div class="bg-[#030708] p-2.5 rounded-xl border border-white/[0.06] flex items-center justify-between text-[11px]">
        <span class="text-[#848c96] truncate max-w-[200px]">${p.summary}</span>
        <span class="text-[#f5b73d] font-mono shrink-0">${p.replies.toLocaleString()}건</span>
      </div>
    `;
    listContainer.appendChild(card);
  });

  populateSimulator();
}

// 탭 4: 활동 패턴 & 시그니처 키워드
function renderActivityTab() {
  if (!currentData) return;
  const act = currentData.activity;

  if (act) {
    const peakHEl = document.getElementById("activityPeakHour");
    const peakWEl = document.getElementById("activityPeakWeekday");
    if (peakHEl) peakHEl.innerText = act.peakHour || "-";
    if (peakWEl) peakWEl.innerText = act.peakWeekday || "-";
  }

  let topOwl = null;
  let topEarly = null;
  if (currentData.members && currentData.members.length > 0) {
    topOwl = [...currentData.members].sort((a, b) => (b.owlRatio || 0) - (a.owlRatio || 0))[0];
    topEarly = [...currentData.members].sort((a, b) => (b.earlyRatio || 0) - (a.earlyRatio || 0))[0];
  }

  if (topOwl) {
    const el = document.getElementById("activityTopOwl");
    const subEl = document.getElementById("activityTopOwlSub");
    if (el) el.innerText = topOwl.name;
    if (subEl) subEl.innerText = `새벽 지분 ${topOwl.owlRatio || 0}%`;
  }
  if (topEarly) {
    const el = document.getElementById("activityTopEarly");
    const subEl = document.getElementById("activityTopEarlySub");
    if (el) el.innerText = topEarly.name;
    if (subEl) subEl.innerText = `아침 지분 ${topEarly.earlyRatio || 0}%`;
  }

  const kwContainer = document.getElementById("roomKeywordsContainer");
  if (kwContainer) {
    kwContainer.innerHTML = "";
    const kws = currentData.keywords?.roomKeywords || [];
    kws.forEach((kw, idx) => {
      const tag = document.createElement("span");
      let tagClass = "text-xs px-3 py-1.5 rounded-full transition cursor-default border ";
      if (idx === 0) {
        tagClass += "text-sm font-black bg-[#f5b73d] text-white border-transparent shadow-sm";
      } else if (idx < 3) {
        tagClass += "font-bold bg-[rgba(234,164,58,0.18)] text-[#f5b73d] border-[rgba(234,164,58,0.4)]";
      } else if (idx < 8) {
        tagClass += "font-semibold bg-[rgba(56, 189, 248,0.15)] text-[#38bdf8] border-[rgba(56, 189, 248,0.35)]";
      } else if (idx < 15) {
        tagClass += "font-medium bg-[#111820] text-[#f6f8fa] border-white/[0.08]";
      } else {
        tagClass += "bg-[#030708] text-[#848c96] border-[#111820]";
      }
      tag.className = tagClass;
      tag.innerHTML = `<span>#${kw.word}</span> <span class="opacity-75 text-[10px] font-mono">(${kw.count}회)</span>`;
      kwContainer.appendChild(tag);
    });
  }

  const catchContainer = document.getElementById("memberCatchphraseGrid");
  if (catchContainer) {
    catchContainer.innerHTML = "";
    currentData.members.forEach(m => {
      const card = document.createElement("div");
      card.className = "bg-[#090e13] border border-white/[0.08] rounded-[24px] p-4 space-y-3 shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:border-[#4A4A45] transition";
      
      const wordsList = (m.topWords || []).map((w, i) => `
        <div class="flex items-center justify-between text-xs py-1 border-b border-[#111820] last:border-none">
          <span class="text-[#f6f8fa] font-medium"><strong class="text-[#f5b73d] mr-1.5">${i + 1}.</strong> #${w.word}</span>
          <span class="text-[11px] font-mono text-[#848c96] bg-[#030708] border border-[#111820] px-2 py-0.5 rounded-full">${w.count}회</span>
        </div>
      `).join("");

      card.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-2xl">${m.avatar}</span>
            <div>
              <h5 class="text-sm font-bold text-[#f6f8fa]">${m.name}</h5>
              <div class="mt-0.5">${getCtiBadgeHtml(m.cti)}</div>
            </div>
          </div>
          <span class="text-[11px] px-2.5 py-1 rounded-full bg-[#111820] text-[#f6f8fa] border border-white/[0.08] font-medium">
            ${m.timePersona || "활동가"}
          </span>
        </div>
        <div class="pt-1 space-y-1">
          <p class="text-[11px] text-[#848c96] font-bold uppercase tracking-wider">자주 쓰는 말버릇 TOP 5</p>
          <div class="bg-[#030708] rounded-xl p-2.5 space-y-0.5 border border-[#111820]">
            ${wordsList || "<p class='text-xs text-[#848c96] py-1'>단어 분석 중</p>"}
          </div>
        </div>
        ${m.quotes && m.quotes[0] ? `
          <div class="pt-1 text-[11px] text-[#848c96] italic bg-[#030708] p-2 rounded-xl border border-[#111820]">
            "${m.quotes[0]}"
          </div>
        ` : ""}
      `;
      catchContainer.appendChild(card);
    });
  }

  renderActivityCharts();
}

function renderActivityCharts() {
  if (!currentData) return;
  const act = currentData.activity;
  if (!act) return;

  const hourlyCanvas = document.getElementById("hourlyActivityChart");
  if (hourlyCanvas) {
    if (activityCharts.hourly) activityCharts.hourly.destroy();
    const ctx = hourlyCanvas.getContext("2d");
    
    const grad = ctx.createLinearGradient(0, 0, 0, 220);
    grad.addColorStop(0, "rgba(245, 183, 61,0.35)");
    grad.addColorStop(1, "rgba(245, 183, 61,0.0)");

    const labels = Array.from({ length: 24 }, (_, i) => `${i}시`);
    const data = act.hourly || Array(24).fill(0);

    activityCharts.hourly = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: "대화량",
          data: data,
          borderColor: "#f5b73d",
          borderWidth: 2.5,
          backgroundColor: grad,
          fill: true,
          tension: 0.35,
          pointRadius: 2.5,
          pointHoverRadius: 6,
          pointBackgroundColor: "#f5b73d"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (c) => ` 발화: ${c.parsed.y.toLocaleString()}건`
            }
          }
        },
        scales: {
          x: {
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: { color: "#848c96", font: { size: 10, family: "Pretendard Variable" } }
          },
          y: {
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: { color: "#848c96", font: { size: 10, family: "Pretendard Variable" } }
          }
        }
      }
    });
  }

  const weekdayCanvas = document.getElementById("weekdayActivityChart");
  if (weekdayCanvas) {
    if (activityCharts.weekday) activityCharts.weekday.destroy();
    const ctx = weekdayCanvas.getContext("2d");

    const days = ["월", "화", "수", "목", "금", "토", "일"];
    const labels = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"];
    const data = days.map(d => act.weekday?.[d] || 0);
    const maxVal = Math.max(...data);
    const bgColors = data.map(v => v === maxVal ? "#f5b73d" : "rgba(245, 183, 61, 0.28)");

    activityCharts.weekday = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "대화량",
          data: data,
          backgroundColor: bgColors,
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (c) => ` 발화: ${c.parsed.y.toLocaleString()}건`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "#848c96", font: { size: 10, family: "Pretendard Variable" } }
          },
          y: {
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            ticks: { color: "#848c96", font: { size: 10, family: "Pretendard Variable" } }
          }
        }
      }
    });
  }
}

function populateSimulator() {
  const selA = document.getElementById("simSelectA");
  const selB = document.getElementById("simSelectB");
  if (!selA || !selB || !currentData.members) return;

  selA.innerHTML = "";
  selB.innerHTML = "";

  currentData.members.forEach((m, idx) => {
    selA.innerHTML += `<option value="${m.id}">${m.name} (${m.cti} - ${m.title})</option>`;
    selB.innerHTML += `<option value="${m.id}" ${idx === 1 ? 'selected' : ''}>${m.name} (${m.cti} - ${m.title})</option>`;
  });

  runChemistrySimulation();
}

function runChemistrySimulation() {
  const selA = document.getElementById("simSelectA");
  const selB = document.getElementById("simSelectB");
  const resultBox = document.getElementById("simResultBox");
  if (!selA || !selB || !resultBox) return;

  if (selA.value === selB.value) {
    resultBox.innerHTML = `<p class="text-xs text-[#f5b73d]">자신과의 궁합입니다! 완벽한 자기이해의 경지입니다.</p>`;
    return;
  }

  const mA = currentData.members.find(m => m.id === selA.value);
  const mB = currentData.members.find(m => m.id === selB.value);
  if (!mA || !mB) return;

  const chem = window.CTI_SYSTEM.getChemistry(mA.cti, mB.cti, mA.name, mB.name);

  resultBox.innerHTML = `
    <div class="flex items-center justify-between border-b border-[#111820] pb-2">
      <div class="flex items-center gap-2">
        <span class="text-base font-bold text-[#f6f8fa]">${mA.name} & ${mB.name}</span>
        <span class="text-xs text-[#f5b73d] font-bold">${chem.badge}</span>
      </div>
      <span class="text-sm font-black text-[#f5b73d]">${chem.grade}급 (${chem.score}점)</span>
    </div>
    <p class="text-xs text-[#f6f8fa] font-semibold">${chem.summary}</p>
    <p class="text-xs text-[#848c96] leading-relaxed">${chem.details}</p>
  `;
}

// 탭 5: CTI 16가지 성향 도감
function renderReportEncyclopedia() {
  const container = document.getElementById("reportEncyclopediaGrid");
  if (!container || !window.CTI_SYSTEM) return;
  container.innerHTML = "";

  const allTypes = window.CTI_SYSTEM.TYPES;
  Object.keys(allTypes).forEach(code => {
    const item = allTypes[code];
    const card = document.createElement("div");
    card.className = "bg-[#090e13] border border-white/[0.08] hover:border-[#f5b73d] rounded-[32px] p-5 space-y-3 cursor-pointer transition hover:-translate-y-1 shadow-[0_4px_20px_rgba(0,0,0,0.2)]";
    card.onclick = () => openTypeDetailModal(code);

    card.innerHTML = `
      <div class="flex items-center justify-between">
        ${getCtiBadgeHtml(item.code)}
        <span class="text-[10px] text-[#848c96]">클릭하여 상세</span>
      </div>
      <div>
        <h5 class="text-sm font-bold text-[#f6f8fa] truncate">${item.title}</h5>
        <p class="text-xs text-[#f5b73d] font-medium mt-0.5 line-clamp-1">${item.sub}</p>
      </div>
      <p class="text-xs text-[#848c96] line-clamp-3 leading-relaxed">${item.desc}</p>
      <div class="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[11px]">
        <span class="text-[#f5b73d] font-medium">💖 ${item.bestMatch}</span>
        <span class="text-[#848c96] font-medium">⚡ ${item.worstMatch}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

// 메인 랜딩 16가지 도감
function renderLandingEncyclopedia() {
  const container = document.getElementById("landingEncyclopediaGrid");
  if (!container || !window.CTI_SYSTEM) return;
  container.innerHTML = "";

  const allTypes = window.CTI_SYSTEM.TYPES;
  Object.keys(allTypes).forEach(code => {
    const item = allTypes[code];
    const card = document.createElement("div");
    card.className = "bg-[#090e13] border border-white/[0.08] hover:border-[#f5b73d] rounded-[32px] p-5 space-y-2 cursor-pointer transition hover:-translate-y-1 shadow-[0_4px_20px_rgba(0,0,0,0.2)]";
    card.onclick = () => openTypeDetailModal(code);

    card.innerHTML = `
      <div class="flex items-center justify-between">
        ${getCtiBadgeHtml(item.code)}
        <span class="text-[10px] text-[#848c96]">상세보기</span>
      </div>
      <h5 class="text-sm font-bold text-[#f6f8fa] truncate">${item.title}</h5>
      <p class="text-xs text-[#848c96] line-clamp-2">${item.desc}</p>
    `;
    container.appendChild(card);
  });
}

function openTypeDetailModal(code) {
  const item = window.CTI_SYSTEM.TYPES[code];
  if (!item) return;

  const content = document.getElementById("typeModalContent");
  if (!content) return;

  content.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <div>
          ${getCtiBadgeHtml(item.code, "px-3 py-1 text-sm font-black")}
          <h3 class="text-xl font-black text-[#f6f8fa] mt-2">${item.title}</h3>
          <p class="text-xs text-[#f5b73d] font-medium">${item.sub}</p>
        </div>
      </div>
      <p class="text-xs text-[#848c96] leading-relaxed">${item.desc}</p>
      <div class="text-xs text-[#f6f8fa] font-mono bg-[#030708] p-2.5 rounded-xl border border-white/[0.08]">
        ${item.tag}
      </div>
      <div class="bg-[rgba(245, 183, 61,0.1)] border border-[rgba(245, 183, 61,0.3)] rounded-2xl p-3 space-y-1">
        <p class="text-xs text-[#f5b73d] font-bold">🔥 뼈 때리는 팩폭</p>
        <p class="text-xs text-[#f6f8fa] leading-relaxed">${item.savage}</p>
        <p class="text-[11px] text-[#848c96] pt-1">💡 성찰 조언: ${item.advice}</p>
      </div>
      <div class="grid grid-cols-2 gap-3 pt-2 text-xs">
        <div class="p-3 rounded-xl bg-[#030708] border border-white/[0.08]">
          <span class="text-[#848c96]">💖 찰떡궁합</span>
          <p class="text-base font-bold text-[#f5b73d] mt-1">${item.bestMatch}</p>
        </div>
        <div class="p-3 rounded-xl bg-[#030708] border border-white/[0.08]">
          <span class="text-[#848c96]">⚡ 파국주의</span>
          <p class="text-base font-bold text-[#848c96] mt-1">${item.worstMatch}</p>
        </div>
      </div>
    </div>
  `;

  document.getElementById("typeDetailModal").classList.remove("hidden");
}

function closeTypeDetailModal() {
  const modal = document.getElementById("typeDetailModal");
  if (modal) modal.classList.add("hidden");
}

function toggleAnonymize() {
  if (!currentData || !originalDataCache) return;

  isAnonymized = !isAnonymized;
  const nameMap = {};

  if (isAnonymized) {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    originalDataCache.members.forEach((m, idx) => {
      nameMap[m.name] = `참여자 ${letters[idx % letters.length]}`;
    });

    currentData.members.forEach(m => {
      m.name = nameMap[m.id] || m.name;
    });

    (currentData.pairRankings || []).forEach(p => {
      p.pair = [nameMap[p.pair[0]] || p.pair[0], nameMap[p.pair[1]] || p.pair[1]];
    });
  } else {
    currentData = JSON.parse(JSON.stringify(originalDataCache));
  }

  updateAnonymizeButtonText();
  renderCurrentData();
}

function updateAnonymizeButtonText() {
  const textEl = document.getElementById("anonymizeText");
  if (textEl) {
    textEl.innerText = isAnonymized ? "실명 모드로 복구" : "가명 모드 (A,B,C)";
  }
}

function captureCurrentTab() {
  const reportView = document.getElementById("reportView");
  if (!reportView) return;

  html2canvas(reportView, {
    backgroundColor: "#030708",
    scale: 2
  }).then(canvas => {
    const link = document.createElement("a");
    link.download = `CTI_단톡방_리포트_${new Date().toISOString().slice(0,10)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }).catch(err => {
    alert("캡처에 실패했습니다: " + err.message);
  });
}

function triggerConfetti() {
  if (typeof confetti === "function") {
    confetti({
      particleCount: 70,
      spread: 80,
      origin: { y: 0.6 }
    });
  }
}

function openShareModal() {
  if (!currentData) return;
  const modal = document.getElementById("shareCardModal");
  if (!modal) return;

  const roomTitleEl = document.getElementById("cardRoomTitle");
  const gradeBadgeEl = document.getElementById("cardGradeBadge");
  const dateRangeEl = document.getElementById("cardDateRange");
  const totalMsgsEl = document.getElementById("cardTotalMsgs");
  const groupVibeEl = document.getElementById("cardGroupVibe");

  if (roomTitleEl) roomTitleEl.innerText = currentData.roomName || "단톡방 리포트";
  if (gradeBadgeEl) gradeBadgeEl.innerText = `우정 ${currentData.groupGrade || "S+"}`;
  if (dateRangeEl) dateRangeEl.innerText = currentData.dateRange || "분석 완료";
  if (totalMsgsEl) totalMsgsEl.innerText = (currentData.totalMessages || 0).toLocaleString();
  if (groupVibeEl) groupVibeEl.innerText = `"${currentData.groupVibe || '영혼의 찰떡 단톡방'}"`;

  if (currentData.pairRankings && currentData.pairRankings.length > 0) {
    const p = currentData.pairRankings[0];
    const topPairEl = document.getElementById("cardTopPair");
    const topPairScoreEl = document.getElementById("cardTopPairScore");
    if (topPairEl) topPairEl.innerText = `${p.pair[0]} ↔ ${p.pair[1]}`;
    if (topPairScoreEl) topPairScoreEl.innerText = `${p.score}점 (${p.grade}급)`;
  }

  const grid = document.getElementById("cardMembersGrid");
  if (grid) {
    grid.innerHTML = "";
    (currentData.members || []).slice(0, 4).forEach(m => {
      const chip = document.createElement("div");
      chip.className = "bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 flex items-center gap-2";
      chip.innerHTML = `
        <span class="text-xl">${m.avatar}</span>
        <div class="min-w-0">
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-bold text-white truncate">${m.name}</span>
            ${getCtiBadgeHtml(m.cti, "text-[9px] px-1.5 py-0.2")}
          </div>
          <p class="text-[10px] text-slate-400 truncate">${m.title}</p>
        </div>
      `;
      grid.appendChild(chip);
    });
  }

  setShareRatio(currentShareRatio || "story");
  modal.classList.remove("hidden");
}

function closeShareModal() {
  const modal = document.getElementById("shareCardModal");
  if (modal) modal.classList.add("hidden");
}

function setShareRatio(ratio) {
  currentShareRatio = ratio;
  const canvas = document.getElementById("shareCardCanvas");
  const btnStory = document.getElementById("btnRatioStory");
  const btnSquare = document.getElementById("btnRatioSquare");

  if (!canvas || !btnStory || !btnSquare) return;

  if (ratio === "story") {
    canvas.style.width = "380px";
    canvas.style.minHeight = "600px";
    btnStory.className = "px-4 py-2 rounded-[20px] text-xs font-medium bg-[#f5b73d] text-white flex items-center gap-1.5 shadow-sm";
    btnSquare.className = "px-4 py-2 rounded-[20px] text-xs font-medium border border-white/[0.08] bg-[#111820] text-[#f6f8fa] flex items-center gap-1.5 hover:bg-[#16202a]";
  } else {
    canvas.style.width = "420px";
    canvas.style.minHeight = "460px";
    btnSquare.className = "px-4 py-2 rounded-[20px] text-xs font-medium bg-[#f5b73d] text-white flex items-center gap-1.5 shadow-sm";
    btnStory.className = "px-4 py-2 rounded-[20px] text-xs font-medium border border-white/[0.08] bg-[#111820] text-[#f6f8fa] flex items-center gap-1.5 hover:bg-[#16202a]";
  }
}

function downloadShareCard() {
  const canvasTarget = document.getElementById("shareCardCanvas");
  if (!canvasTarget) return;

  html2canvas(canvasTarget, {
    scale: 2.5,
    useCORS: true,
    backgroundColor: "#0f172a"
  }).then(canvas => {
    const link = document.createElement("a");
    const safeTitle = (currentData.roomName || "단톡방").replace(/[\\/:*?"<>|]/g, "_");
    link.download = `[CTI_포토카드]_${safeTitle}_${currentShareRatio}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    triggerConfetti();
  }).catch(err => {
    alert("이미지 생성에 실패했습니다: " + err.message);
  });
}

// ==================== 대화 내보내기 방법 가이드 모달 ====================

const GUIDE_STEPS = {
  mobile: [
    {
      step: 1,
      title: "단톡방 메뉴(≡) 열기",
      desc: "대화를 분석할 카카오톡 채팅방에 들어간 뒤, 우측 상단의 메뉴(≡) 아이콘을 터치합니다.",
      img: "images/guide/mobile_1.jpg"
    },
    {
      step: 2,
      title: "채팅방 서랍 설정(⚙️) 들어가기",
      desc: "열린 채팅방 서랍 메뉴의 우측 상단에 위치한 톱니바퀴(⚙️) 아이콘을 터치합니다.",
      img: "images/guide/mobile_2.jpg"
    },
    {
      step: 3,
      title: "대화 내용 내보내기 선택",
      desc: "채팅방 설정 화면을 아래로 스크롤하여 [대화 내용 내보내기] 메뉴를 터치합니다.",
      img: "images/guide/mobile_3.jpg"
    },
    {
      step: 4,
      title: "텍스트 메시지만 보내기",
      desc: "[텍스트 메시지만 보내기]를 선택하여 '나에게 카톡 보내기', 이메일 전송 또는 파일 앱에 저장한 후 업로드합니다.",
      img: "images/guide/mobile_4.jpg"
    }
  ],
  pc: [
    {
      step: 1,
      title: "단톡방 우측 상단 메뉴(≡) 클릭",
      desc: "PC 카카오톡 채팅방 우측 상단의 햄버거 메뉴(≡) 버튼을 클릭합니다.",
      img: "images/guide/pc_1.png"
    },
    {
      step: 2,
      title: "대화 내용 ➔ 대화 내보내기",
      desc: "펼쳐진 메뉴에서 [대화 내용]에 마우스를 올린 후 [대화 내보내기]를 클릭합니다.",
      img: "images/guide/pc_2.png"
    },
    {
      step: 3,
      title: "텍스트 파일(.txt)로 저장",
      desc: "원하는 PC 폴더 경로에 텍스트 파일(.txt)로 저장한 뒤 본 사이트 업로드 화면으로 끌어다 놓으세요.",
      img: "images/guide/pc_3.png"
    }
  ]
};

let currentGuideTab = 'mobile';

function openGuideModal(tab = 'mobile') {
  const modal = document.getElementById("guideModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  switchGuideTab(tab);
}

function closeGuideModal() {
  const modal = document.getElementById("guideModal");
  if (modal) modal.classList.add("hidden");
}

function switchGuideTab(tab) {
  currentGuideTab = tab;
  const tabMobile = document.getElementById("guideTabMobile");
  const tabPc = document.getElementById("guideTabPc");
  const container = document.getElementById("guideContentContainer");
  if (!container) return;

  if (tab === 'mobile') {
    tabMobile.className = "flex-1 py-2.5 px-4 rounded-2xl font-bold text-xs transition flex items-center justify-center gap-2 bg-[#f5b73d] text-[#030708] shadow-sm";
    tabPc.className = "flex-1 py-2.5 px-4 rounded-2xl font-semibold text-xs transition flex items-center justify-center gap-2 bg-[#111820] text-[#848c96] hover:text-[#f6f8fa] border border-white/[0.08]";
  } else {
    tabPc.className = "flex-1 py-2.5 px-4 rounded-2xl font-bold text-xs transition flex items-center justify-center gap-2 bg-[#f5b73d] text-[#030708] shadow-sm";
    tabMobile.className = "flex-1 py-2.5 px-4 rounded-2xl font-semibold text-xs transition flex items-center justify-center gap-2 bg-[#111820] text-[#848c96] hover:text-[#f6f8fa] border border-white/[0.08]";
  }

  const steps = GUIDE_STEPS[tab] || [];
  container.innerHTML = steps.map((item, idx) => `
    <div class="bg-[#111820] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-3.5">
      <div class="flex items-center gap-2.5">
        <span class="w-6 h-6 rounded-full bg-[#f5b73d] text-[#030708] text-xs font-black flex items-center justify-center shadow-sm">
          ${item.step}
        </span>
        <h4 class="text-sm sm:text-base font-bold text-[#f6f8fa] tracking-tight">
          ${item.title}
        </h4>
      </div>
      <p class="text-xs text-[#848c96] leading-relaxed break-keep pl-8">
        ${item.desc}
      </p>
      <div class="mt-2 bg-[#090e13] rounded-xl border border-white/[0.06] overflow-hidden flex items-center justify-center p-2">
        <img src="${item.img}" alt="${item.title}" class="max-h-[380px] w-auto object-contain rounded-lg shadow-md hover:scale-[1.01] transition-transform duration-200" loading="lazy" />
      </div>
    </div>
  `).join("");
}