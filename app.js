// 앱 메인 로직 & UI 컨트롤러

let currentData = null;
let radarCharts = {};
let isAnonymized = false;
let originalDataCache = null;
let myMemberId = null; // '나'로 지정된 멤버 고유 ID
let focusedMemberId = null; // 현재 상세 분석 탭에서 포커스된 멤버
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

// CTI 캐릭터 데이터 조회 헬퍼 (전역 공유: 16개 유형 1:1 매칭 & Base64 Data URL 우선 연동)
function getCharData(ctiCode) {
  const code = (ctiCode || "ELFA").toUpperCase();
  const ctiDef = (window.CTI_SYSTEM && window.CTI_SYSTEM.TYPES) ? window.CTI_SYSTEM.TYPES[code] : null;
  const charKey = (ctiDef && ctiDef.character) ? ctiDef.character.toUpperCase() : code;
  const base = (window.CTI_SYSTEM && window.CTI_SYSTEM.CHARACTERS && window.CTI_SYSTEM.CHARACTERS[charKey]) 
    ? { ...window.CTI_SYSTEM.CHARACTERS[charKey] } 
    : { id: charKey.toLowerCase(), name: "CTI 캐릭터", desc: "단톡방 성향", img: `images/characters/cutout_${charKey.toLowerCase()}.png`, color: "#f5b73d" };

  if (window.CTI_AVATARS && window.CTI_AVATARS[charKey]) {
    base.img = window.CTI_AVATARS[charKey];
  } else if (window.CTI_AVATARS && window.CTI_AVATARS[code]) {
    base.img = window.CTI_AVATARS[code];
  }
  return base;
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

// 심층 분석 리포트 더보기 / 접기 토글 상태 및 함수
let isDeepDiveExpanded = false;

function toggleDeepDiveReports(forceState) {
  const container = document.getElementById("deepDiveCardsContainer");
  const overlay = document.getElementById("deepDiveFadeOverlay");
  const textEl = document.getElementById("deepDiveToggleText");
  const iconEl = document.getElementById("deepDiveToggleIcon");

  if (!container) return;

  if (typeof forceState === "boolean") {
    isDeepDiveExpanded = forceState;
  } else {
    isDeepDiveExpanded = !isDeepDiveExpanded;
  }

  if (isDeepDiveExpanded) {
    container.style.maxHeight = "1200px";
    if (overlay) overlay.style.opacity = "0";
    if (textEl) textEl.innerText = "심층 분석 리포트 접기";
    if (iconEl) iconEl.className = "fa-solid fa-chevron-up text-[#f5b73d] group-hover:-translate-y-0.5 transition-transform";
  } else {
    container.style.maxHeight = "144px"; // 9rem (max-h-36)
    if (overlay) overlay.style.opacity = "1";
    if (textEl) textEl.innerText = "심층 분석 리포트 더보기";
    if (iconEl) iconEl.className = "fa-solid fa-chevron-down text-[#f5b73d] group-hover:translate-y-0.5 transition-transform";
  }
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

  initMyMember();
  renderMyProfileBanner();
  renderFocusFilterBar();
  renderOverviewMembers();
  renderCharacterCards(true);
  renderChemistryTab();
  renderActivityTab();
  renderReportEncyclopedia();
}

// '나' 프로필 상태 관리 헬퍼
function initMyMember() {
  let saved = null;
  try {
    saved = localStorage.getItem("cti_my_member");
  } catch(e) {}
  if (saved && currentData && currentData.members && currentData.members.some(m => m.id === saved || m.name === saved)) {
    myMemberId = saved;
  } else {
    myMemberId = null;
  }
}

function setMyMember(memberId) {
  if (!memberId || !currentData || !currentData.members) return;
  myMemberId = memberId;
  try {
    localStorage.setItem("cti_my_member", memberId);
  } catch(e) {}

  renderMyProfileBanner();
  updateFocusBannerCard();
  renderFocusFilterBar();
  renderOverviewMembers();
  renderCharacterCards(false);

  if (typeof triggerConfetti === "function") {
    triggerConfetti();
  }
}

function changeMyMemberPrompt() {
  myMemberId = null;
  try {
    localStorage.removeItem("cti_my_member");
  } catch(e) {}
  renderMyProfileBanner();
  updateFocusBannerCard();
  renderFocusFilterBar();
  renderOverviewMembers();
  renderCharacterCards(false);
}

function renderMyProfileBanner() {
  const banner = document.getElementById("myProfileBanner");
  const statusBadge = document.getElementById("myProfileStatusBadge");
  const titleEl = document.getElementById("myProfileTitle");
  const container = document.getElementById("myProfileChipsContainer");
  if (!banner || !currentData || !currentData.members) return;

  const me = myMemberId ? currentData.members.find(x => (x.id === myMemberId || x.name === myMemberId)) : null;

  if (me) {
    if (statusBadge) {
      statusBadge.className = "text-[10px] px-2.5 py-0.5 rounded-full bg-[#f5b73d] text-[#030708] font-black whitespace-nowrap shadow-sm";
      statusBadge.innerHTML = `<i class="fa-solid fa-crown text-[9px]"></i> '나' 설정 완료`;
    }
    if (titleEl) {
      titleEl.innerHTML = `이 대화방의 '나': <span class="text-[#f5b73d] font-black">${me.name}</span> <span class="text-xs text-[#848c96] font-normal">(${me.cti} • ${getCharData(me.cti).name})</span>`;
    }
    if (container) {
      container.innerHTML = `
        <div class="flex items-center gap-2">
          <button onclick="changeMyMemberPrompt()" class="px-3 py-1.5 rounded-full text-xs font-bold bg-[#111820] hover:bg-[#16202a] text-[#848c96] hover:text-[#f6f8fa] border border-white/[0.1] transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
            <i class="fa-solid fa-arrows-rotate text-[10px]"></i> <span>다른 멤버로 변경</span>
          </button>
        </div>
      `;
    }
  } else {
    if (statusBadge) {
      statusBadge.className = "text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold whitespace-nowrap";
      statusBadge.innerHTML = `<i class="fa-solid fa-hand-pointer text-[9px]"></i> '나'를 선택해주세요`;
    }
    if (titleEl) {
      titleEl.innerText = "이 대화방에서 '나'는 누구인가요? 아래에서 본인을 클릭하세요!";
    }
    if (container) {
      container.innerHTML = "";
      currentData.members.forEach(m => {
        const charInfo = getCharData(m.cti);
        const btn = document.createElement("button");
        btn.className = "px-3 py-1.5 rounded-full text-xs font-bold bg-[#111820] hover:bg-[#f5b73d] text-[#f6f8fa] hover:text-[#030708] border border-white/[0.1] hover:border-[#f5b73d] transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-sm hover:scale-105";
        btn.innerHTML = `
          <img src="${charInfo.img}" class="w-4 h-4 object-contain shrink-0">
          <span>${m.name}</span>
        `;
        btn.onclick = () => setMyMember(m.id || m.name);
        container.appendChild(btn);
      });
    }
  }
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
    const isMe = Boolean(myMemberId && (m.id === myMemberId || m.name === myMemberId));
    const charInfo = getCharData(m.cti);
    const btn = document.createElement("button");
    btn.className = `px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-2 border whitespace-nowrap shrink-0 ${
      isFocused 
        ? 'bg-[#f5b73d] text-[#030708] border-[#f5b73d] shadow-sm scale-105' 
        : 'bg-[#111820] text-[#f6f8fa] hover:bg-[#16202a] border-white/[0.08]'
    }`;
    btn.innerHTML = `
      <img src="${charInfo.img}" class="w-4 h-4 object-contain shrink-0">
      <span>${m.name}</span>
      ${isMe ? '<i class="fa-solid fa-crown text-[10px] text-amber-400 shrink-0"></i>' : ''}
    `;
    btn.onclick = () => selectFocusMember(m.id || m.name);
    container.appendChild(btn);
  });

  updateFocusBannerCard();
}

function updateFocusBannerCard() {
  if (!currentData || !currentData.members) return;
  const m = currentData.members.find(x => x.id === focusedMemberId || x.name === focusedMemberId) || currentData.members[0];
  if (!m) return;

  const charInfo = getCharData(m.cti);
  const avatarEl = document.getElementById("focusAvatar");
  if (avatarEl) {
    avatarEl.innerHTML = `<img src="${charInfo.img}" alt="${m.name}" class="w-full h-full object-contain p-1">`;
  }

  const nameEl = document.getElementById("focusName");
  if (nameEl) nameEl.innerText = m.name;

  const badgeEl = document.getElementById("focusCtiBadge");
  if (badgeEl) badgeEl.innerHTML = getCtiBadgeHtml(m.cti);

  const personaEl = document.getElementById("focusPersonaText");
  if (personaEl) personaEl.innerText = `${m.timePersona || '활동가'} • 전체 대화의 ${m.msgRatio}% 담당`;

  // '나' 액션 버튼 렌더링
  const meActionEl = document.getElementById("focusMeActionContainer");
  if (meActionEl) {
    const isMe = Boolean(myMemberId && (m.id === myMemberId || m.name === myMemberId));
    if (isMe) {
      meActionEl.innerHTML = `
        <span class="text-xs px-3 py-1.5 rounded-full bg-[#f5b73d]/20 text-[#f5b73d] border border-[#f5b73d]/50 font-black flex items-center gap-1.5 shadow-sm whitespace-nowrap">
          <i class="fa-solid fa-crown text-[11px] text-[#f5b73d]"></i> 내 프로필
        </span>
      `;
    } else {
      meActionEl.innerHTML = `
        <button onclick="setMyMember('${m.id || m.name}')" class="text-xs px-3 py-1.5 rounded-full bg-[#111820] hover:bg-[#f5b73d] text-[#848c96] hover:text-[#030708] border border-white/[0.1] font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
          <i class="fa-solid fa-user-check text-[11px]"></i> 이 멤버를 '나'로 지정
        </button>
      `;
    }
  }

  const pairs = (currentData.pairRankings || []).filter(p => p.pair.includes(m.name));
  const soulmateNameEl = document.getElementById("focusTopSoulmateName");
  const soulmateScoreEl = document.getElementById("focusTopSoulmateScore");
  const soulmateSubEl = document.getElementById("focusTopSoulmateSub");
  const soulmateLegacyEl = document.getElementById("focusTopSoulmate");

  if (pairs.length > 0) {
    const topP = pairs.reduce((best, cur) => cur.score > best.score ? cur : best, pairs[0]);
    const otherName = topP.pair[0] === m.name ? topP.pair[1] : topP.pair[0];
    if (soulmateNameEl) soulmateNameEl.innerText = otherName;
    if (soulmateScoreEl) {
      soulmateScoreEl.innerText = `${topP.score}점 (${topP.grade || 'A'}급)`;
      soulmateScoreEl.classList.remove("hidden");
    }
    if (soulmateSubEl) soulmateSubEl.innerText = `티키타카 ${topP.replies.toLocaleString()}회 주고받음`;
    if (soulmateLegacyEl) soulmateLegacyEl.innerText = `${otherName} (${topP.score}점)`;
  } else {
    if (soulmateNameEl) soulmateNameEl.innerText = "단짝 데이터 집계 중";
    if (soulmateScoreEl) soulmateScoreEl.classList.add("hidden");
    if (soulmateSubEl) soulmateSubEl.innerText = "대화 데이터가 누적되면 표시됩니다.";
    if (soulmateLegacyEl) soulmateLegacyEl.innerText = "단짝 데이터 집계 중";
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
    const charInfo = getCharData(m.cti);
    const isMe = Boolean(myMemberId && (m.id === myMemberId || m.name === myMemberId));
    const card = document.createElement("div");
    card.className = `bg-[#090e13] ${isMe ? 'border-2 border-[#f5b73d] shadow-[0_4px_30px_rgba(245,183,61,0.2)]' : 'border border-white/[0.08] hover:border-[#f5b73d]'} rounded-[28px] p-5 sm:p-6 space-y-4 cursor-pointer transition hover:-translate-y-1 shadow-[0_4px_24px_rgba(0,0,0,0.25)] flex flex-col justify-between`;
    card.onclick = () => {
      selectFocusMember(m.id || m.name);
      openReportDetail("tabCharacters");
    };
    card.innerHTML = `
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-b from-[#1c2734] to-[#0c131a] flex items-center justify-center p-1 border border-white/[0.1] shadow-inner shrink-0 overflow-hidden">
              <img src="${charInfo.img}" alt="${m.name}" class="w-full h-full object-contain">
            </div>
            <div>
              <h5 class="text-base sm:text-lg font-black text-[#f6f8fa] flex items-center gap-2 whitespace-nowrap">
                <span>${m.name}</span>
                ${isMe ? '<span class="text-[10px] px-2 py-0.5 rounded-full bg-[#f5b73d] text-[#030708] font-black flex items-center gap-1 shadow-sm whitespace-nowrap"><i class="fa-solid fa-crown text-[8px]"></i> 나</span>' : ''}
              </h5>
              <p class="text-xs text-[#f5b73d] font-bold mt-0.5 whitespace-nowrap">${m.title || charInfo.name}</p>
            </div>
          </div>
          <div>
            ${getCtiBadgeHtml(m.cti)}
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2 bg-[#030708] p-3 rounded-2xl border border-white/[0.06] text-center">
          <div>
            <span class="text-[10px] text-[#848c96] whitespace-nowrap">발화 점유율</span>
            <p class="text-xs sm:text-sm font-bold text-[#f6f8fa] mt-0.5 whitespace-nowrap">${m.msgRatio}%</p>
          </div>
          <div>
            <span class="text-[10px] text-[#848c96] whitespace-nowrap">평균 글자수</span>
            <p class="text-xs sm:text-sm font-bold text-[#f6f8fa] mt-0.5 whitespace-nowrap">${m.avgLen}자</p>
          </div>
          <div>
            <span class="text-[10px] text-[#848c96] whitespace-nowrap">대화 선제개시</span>
            <p class="text-xs sm:text-sm font-bold text-[#f5b73d] mt-0.5 whitespace-nowrap">${m.starters}회</p>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between pt-1 border-t border-white/[0.06]">
        <span class="text-[11px] px-3 py-1 rounded-full bg-[#111820] text-[#f6f8fa] border border-white/[0.08] font-medium truncate max-w-[200px]">
          ${m.trophy}
        </span>
        <span class="text-xs font-bold text-[#f5b73d] flex items-center gap-1 hover:underline whitespace-nowrap">
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

  // resetToMe가 true일 때 '나' 또는 포커스 인덱스로 맞춤
  if (resetToMe) {
    if (myMemberId) {
      const myIdx = currentData.members.findIndex(m => m.id === myMemberId || m.name === myMemberId);
      if (myIdx !== -1) currentCharDeckIndex = myIdx;
    } else if (focusedMemberId) {
      const fIdx = currentData.members.findIndex(m => m.id === focusedMemberId || m.name === focusedMemberId);
      if (fIdx !== -1) currentCharDeckIndex = fIdx;
    }
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
      const isMe = Boolean(myMemberId && (m.id === myMemberId || m.name === myMemberId));
      const charInfo = getCharData(m.cti);
      
      const btn = document.createElement("button");
      btn.className = `px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-2 shrink-0 border whitespace-nowrap ${
        isSelected 
          ? 'bg-[#f5b73d] text-[#030708] border-[#f5b73d] shadow-md scale-105' 
          : 'bg-[#111820] text-[#f6f8fa] hover:bg-[#16202a] border-white/[0.08]'
      }`;
      btn.innerHTML = `
        <img src="${charInfo.img}" class="w-4 h-4 object-contain shrink-0">
        <span>${m.name}</span>
        ${isMe ? '<i class="fa-solid fa-crown text-[10px] text-amber-400 shrink-0"></i>' : ''}
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

  const isMe = Boolean(myMemberId && (m.id === myMemberId || m.name === myMemberId));

  const quotesHtml = (m.quotes || []).map(q => `
    <li class="flex items-start gap-2 text-xs text-[#848c96] italic">
      <span class="text-[#f5b73d]">"</span>
      <span>${q}</span>
      <span class="text-[#f5b73d]">"</span>
    </li>
  `).join("");

  const signaturesHtml = (m.signatures || []).map(s => `
    <span class="px-2.5 py-1 rounded-full bg-[#111820] border border-white/[0.08] text-[#f6f8fa] text-[11px] font-mono whitespace-nowrap">#${s}</span>
  `).join("");

  container.innerHTML = `
    <div class="bg-[#090e13] ${isMe ? 'border-2 border-[#f5b73d]' : 'border border-white/[0.08]'} rounded-[36px] p-6 sm:p-7 space-y-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden transition-all duration-300">
      <!-- 카드 상단 프로필 -->
      <div class="flex items-start justify-between gap-4">
        <div class="flex items-center gap-3.5">
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-b from-[#1c2734] to-[#0c131a] border border-white/[0.12] flex items-center justify-center p-1 shadow-inner shrink-0 relative">
            <div class="absolute inset-0 bg-[#f5b73d]/10 rounded-2xl blur-md pointer-events-none"></div>
            <img src="${getCharData(m.cti).img}" class="relative z-10 w-full h-full object-contain filter drop-shadow">
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h4 class="text-xl sm:text-2xl font-black text-[#f6f8fa] flex items-center gap-2 whitespace-nowrap">
                <span>${m.name}</span>
                ${isMe ? '<span class="text-xs px-2.5 py-0.5 rounded-full bg-[#f5b73d] text-[#030708] font-black flex items-center gap-1 shadow-sm whitespace-nowrap"><i class="fa-solid fa-crown text-[10px]"></i> 내 카드</span>' : ''}
              </h4>
              ${getCtiBadgeHtml(m.cti)}
              ${!isMe ? `
                <button onclick="setMyMember('${m.id || m.name}')" class="text-xs px-2.5 py-0.5 rounded-full bg-[#111820] hover:bg-[#f5b73d] text-[#848c96] hover:text-[#030708] border border-white/[0.1] font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap">
                  <i class="fa-solid fa-user-check text-[10px]"></i> '나'로 지정
                </button>
              ` : ''}
            </div>
            <p class="text-xs font-bold text-[#f5b73d] mt-1 whitespace-nowrap">${m.title}</p>
          </div>
        </div>
        <span class="text-xs font-mono font-bold text-[#848c96] bg-[#111820] border border-white/[0.08] px-3 py-1 rounded-full whitespace-nowrap shrink-0">
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

        <div class="text-center py-2 space-y-2">
          <!-- 듀오 캐릭터 썸네일 -->
          <div class="flex items-center justify-center gap-3">
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-b from-[#1c2734] to-[#0c131a] p-1 border border-white/[0.12] flex items-center justify-center shrink-0 shadow-inner">
              <img src="${getCharData(p.types[0]).img}" alt="${p.pair[0]}" class="w-full h-full object-contain">
            </div>
            <span class="text-xl animate-pulse">❤️</span>
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-b from-[#1c2734] to-[#0c131a] p-1 border border-white/[0.12] flex items-center justify-center shrink-0 shadow-inner">
              <img src="${getCharData(p.types[1]).img}" alt="${p.pair[1]}" class="w-full h-full object-contain">
            </div>
          </div>
          <div class="text-xl font-black text-[#f6f8fa] flex items-center justify-center gap-2">
            <span>${p.pair[0]}</span>
            <span class="text-[#f5b73d] text-sm">&amp;</span>
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
          <span class="w-6 h-6 rounded-full bg-[#111820] text-[#848c96] flex items-center justify-center font-bold text-xs shrink-0">
            ${p.rank}
          </span>
          <div class="flex items-center -space-x-1.5 shrink-0">
            <div class="w-7 h-7 rounded-lg bg-gradient-to-b from-[#1c2734] to-[#0c131a] p-0.5 border border-white/[0.1] overflow-hidden">
              <img src="${getCharData(p.types[0]).img}" class="w-full h-full object-contain">
            </div>
            <div class="w-7 h-7 rounded-lg bg-gradient-to-b from-[#1c2734] to-[#0c131a] p-0.5 border border-white/[0.1] overflow-hidden">
              <img src="${getCharData(p.types[1]).img}" class="w-full h-full object-contain">
            </div>
          </div>
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
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-b from-[#1c2734] to-[#0c131a] p-0.5 border border-white/[0.1] flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
              <img src="${getCharData(m.cti).img}" alt="${m.name}" class="w-full h-full object-contain">
            </div>
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
  const c1 = getCharData(mA.cti);
  const c2 = getCharData(mB.cti);

  resultBox.innerHTML = `
    <div class="flex items-center justify-between border-b border-[#111820] pb-3">
      <div class="flex items-center gap-3">
        <div class="flex items-center -space-x-2 shrink-0">
          <div class="w-11 h-11 rounded-2xl bg-gradient-to-b from-[#1c2734] to-[#0c131a] p-1 border border-white/[0.12] shadow-inner">
            <img src="${c1.img}" class="w-full h-full object-contain">
          </div>
          <div class="w-11 h-11 rounded-2xl bg-gradient-to-b from-[#1c2734] to-[#0c131a] p-1 border border-white/[0.12] shadow-inner">
            <img src="${c2.img}" class="w-full h-full object-contain">
          </div>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="text-base font-bold text-[#f6f8fa]">${mA.name} & ${mB.name}</span>
            <span class="text-xs text-[#f5b73d] font-bold">${chem.badge}</span>
          </div>
          <div class="flex items-center gap-1.5 mt-0.5">
            ${getCtiBadgeHtml(mA.cti)}
            <span class="text-xs text-[#848c96] font-bold">&</span>
            ${getCtiBadgeHtml(mB.cti)}
          </div>
        </div>
      </div>
      <span class="text-sm font-black text-[#f5b73d]">${chem.grade}급 (${chem.score}점)</span>
    </div>
    <p class="text-xs text-[#f6f8fa] font-semibold mt-2">${chem.summary}</p>
    <p class="text-xs text-[#848c96] leading-relaxed mt-1">${chem.details}</p>
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
    const charInfo = getCharData(code);
    const card = document.createElement("div");
    card.className = "bg-[#090e13] border border-white/[0.08] hover:border-[#f5b73d] rounded-[28px] p-5 space-y-3 cursor-pointer transition hover:-translate-y-1 shadow-[0_4px_20px_rgba(0,0,0,0.2)] flex flex-col justify-between group";
    card.onclick = () => openTypeDetailModal(code);

    card.innerHTML = `
      <div class="space-y-2.5">
        <div class="flex items-center justify-between">
          ${getCtiBadgeHtml(item.code)}
          <span class="text-[10px] text-[#848c96] group-hover:text-[#f5b73d] transition-colors">클릭하여 상세</span>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-b from-[#1c2734] to-[#0c131a] p-1 border border-white/[0.1] flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
            <img src="${charInfo.img}" alt="${charInfo.name}" class="w-full h-full object-contain">
          </div>
          <div class="min-w-0">
            <h5 class="text-sm font-black text-[#f6f8fa] truncate group-hover:text-[#f5b73d] transition-colors">${item.title}</h5>
            <p class="text-xs text-[#f5b73d] font-bold mt-0.5 truncate">${charInfo.name}</p>
            <p class="text-[10px] text-[#848c96] line-clamp-1 mt-0.5">${item.sub}</p>
          </div>
        </div>
        <p class="text-xs text-[#848c96] line-clamp-2 leading-relaxed pt-1 border-t border-white/[0.06]">${item.desc}</p>
      </div>
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
    const charInfo = getCharData(code);
    const card = document.createElement("div");
    card.className = "bg-[#090e13] border border-white/[0.08] hover:border-[#f5b73d] rounded-[28px] p-4 space-y-3 cursor-pointer transition hover:-translate-y-1 shadow-[0_4px_20px_rgba(0,0,0,0.25)] flex flex-col justify-between group";
    card.onclick = () => openTypeDetailModal(code);

    card.innerHTML = `
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          ${getCtiBadgeHtml(item.code)}
          <span class="text-[10px] text-[#848c96] group-hover:text-[#f5b73d] transition-colors">상세보기</span>
        </div>
        
        <div class="flex items-center gap-2.5 pt-1">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-b from-[#1c2734] to-[#0c131a] p-1 border border-white/[0.1] flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
            <img src="${charInfo.img}" alt="${charInfo.name}" class="w-full h-full object-contain">
          </div>
          <div class="min-w-0">
            <h5 class="text-sm font-black text-[#f6f8fa] truncate group-hover:text-[#f5b73d] transition-colors">${item.title}</h5>
            <p class="text-[11px] text-[#f5b73d] font-bold mt-0.5 truncate">${charInfo.name}</p>
          </div>
        </div>

        <p class="text-[11px] text-[#848c96] line-clamp-2 leading-relaxed pt-1 border-t border-white/[0.05]">${item.desc}</p>
      </div>

      <div class="flex items-center justify-between text-[10px] text-[#848c96] pt-1">
        <span class="text-[#f5b73d]">💖 ${item.bestMatch}</span>
        <span class="text-slate-400">⚡ ${item.worstMatch}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

function openTypeDetailModal(code) {
  const item = window.CTI_SYSTEM.TYPES[code];
  if (!item) return;

  const charInfo = getCharData(code);
  const content = document.getElementById("typeModalContent");
  if (!content) return;

  content.innerHTML = `
    <div class="space-y-4">
      <!-- 캐릭터 프로필 히어로 헤더 -->
      <div class="flex items-center gap-4 border-b border-white/[0.08] pb-4">
        <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-b from-[#1c2734] to-[#0c131a] p-2 border border-white/[0.12] flex items-center justify-center shrink-0 shadow-inner relative overflow-hidden">
          <div class="absolute inset-0 rounded-3xl pointer-events-none" style="background: radial-gradient(circle, ${(charInfo.color || '#f5b73d')}44 0%, transparent 70%);"></div>
          <img src="${charInfo.img}" alt="${charInfo.name}" class="relative z-10 w-full h-full object-contain">
        </div>
        <div class="min-w-0 flex-grow text-left">
          <div class="flex items-center gap-2">
            ${getCtiBadgeHtml(item.code, "px-3 py-1 text-xs font-black")}
            <span class="text-xs text-[#f5b73d] font-black">${charInfo.name}</span>
          </div>
          <h3 class="text-xl sm:text-2xl font-black text-[#f6f8fa] mt-1 truncate">${item.title}</h3>
          <p class="text-xs text-[#848c96] font-medium mt-0.5">"${item.sub}"</p>
        </div>
      </div>

      <p class="text-xs text-[#848c96] leading-relaxed">${item.desc}</p>
      <div class="text-xs text-[#f6f8fa] font-mono bg-[#030708] p-2.5 rounded-xl border border-white/[0.08]">
        ${item.tag}
      </div>
      <div class="bg-[rgba(245,183,61,0.1)] border border-[rgba(245,183,61,0.3)] rounded-2xl p-3 space-y-1">
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

let currentCardMode = "personal"; // "personal" | "group"
let currentCardMemberIndex = 0;

function openShareModal() {
  if (!currentData) return;
  const modal = document.getElementById("shareCardModal");
  if (!modal) return;

  // 멤버 선택 셀렉트 옵션 채우기
  const select = document.getElementById("cardMemberSelect");
  if (select && currentData.members) {
    select.innerHTML = "";

    // 만약 '나'로 지정된 멤버가 있다면 그 멤버를 기본 선택!
    let targetIdx = 0;
    if (myMemberId) {
      const myIdx = currentData.members.findIndex(m => m.id === myMemberId || m.name === myMemberId);
      if (myIdx !== -1) targetIdx = myIdx;
    } else if (focusedMemberId) {
      const fIdx = currentData.members.findIndex(m => m.id === focusedMemberId || m.name === focusedMemberId);
      if (fIdx !== -1) targetIdx = fIdx;
    }

    currentData.members.forEach((m, idx) => {
      const opt = document.createElement("option");
      opt.value = idx;
      const isMe = Boolean(myMemberId && (m.id === myMemberId || m.name === myMemberId));
      opt.innerText = `${m.name} (${m.cti || 'CTI'})${isMe ? ' 👑(나)' : ''}`;
      select.appendChild(opt);
    });
    currentCardMemberIndex = targetIdx;
    select.value = targetIdx;
  }

  setCardMode("personal");
  modal.classList.remove("hidden");
}

function closeShareModal() {
  const modal = document.getElementById("shareCardModal");
  if (modal) modal.classList.add("hidden");
}

function setCardMode(mode) {
  currentCardMode = mode;
  const btnPersonal = document.getElementById("btnCardModePersonal");
  const btnGroup = document.getElementById("btnCardModeGroup");
  const selectWrapper = document.getElementById("cardMemberSelectWrapper");

  if (mode === "personal") {
    btnPersonal.className = "px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#f5b73d] text-[#030708] transition shadow-sm flex items-center gap-1.5";
    btnGroup.className = "px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#848c96] hover:text-[#f6f8fa] transition flex items-center gap-1.5";
    if (selectWrapper) selectWrapper.classList.remove("hidden");
  } else {
    btnGroup.className = "px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#f5b73d] text-[#030708] transition shadow-sm flex items-center gap-1.5";
    btnPersonal.className = "px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#848c96] hover:text-[#f6f8fa] transition flex items-center gap-1.5";
    if (selectWrapper) selectWrapper.classList.add("hidden");
  }

  renderShareCard();
}

function onCardMemberChange(val) {
  currentCardMemberIndex = parseInt(val, 10) || 0;
  renderShareCard();
}

function renderShareCard() {
  if (!currentData) return;

  const categoryTag = document.getElementById("cardCategoryTag");
  const subHeader = document.getElementById("cardSubHeader");
  const badgeRight = document.getElementById("cardBadgeRight");
  const heroSection = document.getElementById("cardHeroSection");
  const bodySection = document.getElementById("cardBodySection");
  const charImg = document.getElementById("cardCharacterImg");
  const heroName = document.getElementById("cardHeroName");
  const heroCti = document.getElementById("cardHeroCti");
  const heroTitle = document.getElementById("cardHeroTitle");
  const heroSub = document.getElementById("cardHeroSub");

  // 캐릭터 맵 조회 헬퍼 (16개 전 유형 1:1 매칭 & Tainted Canvas 원천 차단 Base64 자동 연동)
  const getCharData = (ctiCode) => {
    const code = (ctiCode || "ELFA").toUpperCase();
    const ctiDef = (window.CTI_SYSTEM && window.CTI_SYSTEM.TYPES) ? window.CTI_SYSTEM.TYPES[code] : null;
    const charKey = (ctiDef && ctiDef.character) ? ctiDef.character.toUpperCase() : code;
    const base = (window.CTI_SYSTEM && window.CTI_SYSTEM.CHARACTERS && window.CTI_SYSTEM.CHARACTERS[charKey]) 
      ? { ...window.CTI_SYSTEM.CHARACTERS[charKey] } 
      : { id: charKey.toLowerCase(), name: "CTI 캐릭터", desc: "단톡방 성향", img: `images/characters/cutout_${charKey.toLowerCase()}.png`, color: "#f5b73d" };

    // window.CTI_AVATARS에 Base64 Data URL이 있으면 우선 사용 (file:/// 보안 sandbox 오염 방지)
    if (window.CTI_AVATARS && window.CTI_AVATARS[charKey]) {
      base.img = window.CTI_AVATARS[charKey];
    } else if (window.CTI_AVATARS && window.CTI_AVATARS[code]) {
      base.img = window.CTI_AVATARS[code];
    }
    return base;
  };

  if (currentCardMode === "personal") {
    // [개인 포토카드 모드]
    const m = (currentData.members && currentData.members[currentCardMemberIndex]) 
      ? currentData.members[currentCardMemberIndex] 
      : (currentData.members ? currentData.members[0] : null);

    if (!m) return;

    const ctiDef = window.CTI_SYSTEM && window.CTI_SYSTEM.TYPES ? window.CTI_SYSTEM.TYPES[m.cti] : null;
    const charInfo = getCharData(m.cti);

    if (categoryTag) categoryTag.innerText = "CTI PERSONAL IDENTITY";
    if (subHeader) subHeader.innerText = `${currentData.roomName || '단톡방'} • ${currentData.dateRange || '최근 분석'}`;
    if (badgeRight) badgeRight.innerText = `${m.msgRatio || 0}% 지분`;

    if (heroSection) heroSection.classList.remove("hidden");
    if (charImg) {
      charImg.src = charInfo.img;
      charImg.alt = charInfo.name;
    }
    if (heroName) heroName.innerText = m.name;
    if (heroCti) {
      heroCti.innerText = m.cti || "CTI";
      heroCti.style.backgroundColor = charInfo.color || "#f5b73d";
    }
    if (heroTitle) {
      heroTitle.innerText = m.title || (ctiDef ? ctiDef.title : charInfo.name);
      heroTitle.style.color = charInfo.color || "#f5b73d";
    }
    if (heroSub) {
      const subText = (ctiDef && ctiDef.sub) ? ctiDef.sub : (m.quotes && m.quotes.length > 0 ? m.quotes[0] : charInfo.desc);
      heroSub.innerText = `"${subText}"`;
    }

    // 글로우 색상 동기화 (라디얼 그라데이션)
    const cardHeroGlow = document.getElementById("cardHeroGlow");
    if (cardHeroGlow) {
      cardHeroGlow.style.background = `radial-gradient(circle, ${(charInfo.color || '#f5b73d')}44 0%, transparent 70%)`;
    }

    // 바디: 핵심 스탯 & 시그니처 말버릇 알약 태그
    if (bodySection) {
      const sigs = (m.signatures || (m.topWords ? m.topWords.map(w => w.word) : [])).slice(0, 3);
      const sigPills = sigs.map(s => `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#16202a] text-[#f5b73d] border border-[#f5b73d]/30 whitespace-nowrap shadow-sm">#${s}</span>`).join(" ");

      // 팩폭 리포트 요약본 (온전한 문장 제시, 끝 짤림 방지)
      const savageText = (ctiDef && ctiDef.savageShort) 
        ? ctiDef.savageShort 
        : (m.savage 
            ? (m.savage.split(". ")[0] + (m.savage.includes(".") ? "." : "")) 
            : "단톡방의 침묵을 깨고 활기를 불어넣는 텐션 메이커!");

      bodySection.innerHTML = `
        <!-- 지표 2열 카드 (줄바꿈 및 받침 잘림 방지) -->
        <div class="grid grid-cols-2 gap-2 text-left">
          <div class="bg-[#090e13]/90 border border-white/[0.08] rounded-2xl p-2.5">
            <span class="text-[9px] text-[#848c96] font-bold block whitespace-nowrap">💬 총 발화량</span>
            <p class="text-xs font-black text-white mt-0.5 whitespace-nowrap break-keep leading-normal pb-0.5">
              ${(m.totalMsgs || 0).toLocaleString()}건 <span class="text-[10px] text-[#f5b73d]">(${m.msgRatio}%)</span>
            </p>
          </div>
          <div class="bg-[#090e13]/90 border border-white/[0.08] rounded-2xl p-2.5">
            <span class="text-[9px] text-[#848c96] font-bold block whitespace-nowrap">⚡ 평균 문장 길이</span>
            <p class="text-xs font-black text-white mt-0.5 whitespace-nowrap break-keep leading-normal pb-0.5">
              ${m.avgLen || 0}자 <span class="text-[10px] text-emerald-400">(${m.avgLen > 10 ? '서사형' : '압축단답'})</span>
            </p>
          </div>
        </div>

        <!-- 시그니처 말버릇 (가로 스크롤/랩 최소화) -->
        <div class="bg-[#090e13]/90 border border-white/[0.08] rounded-2xl p-2.5 text-left space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-[9px] font-bold text-[#848c96] uppercase tracking-wider flex items-center gap-1 whitespace-nowrap">
              <span>🏷️</span> 입에 붙은 시그니처 말버릇
            </span>
          </div>
          <div class="flex flex-wrap gap-1.5 pt-0.5 items-center">
            ${sigPills || '<span class="text-[10px] text-[#848c96] whitespace-nowrap">#티키타카</span>'}
          </div>
        </div>

        <!-- 뼈 때리는 팩폭 리포트 요약본 (끝 잘림 방지, 100% 온전한 문장 노출) -->
        <div class="bg-gradient-to-r from-[rgba(245,183,61,0.12)] to-[rgba(139,92,246,0.12)] border border-[rgba(245,183,61,0.25)] rounded-2xl p-2.5 text-left">
          <div class="flex items-center gap-1.5 text-[9px] font-black text-[#f5b73d] uppercase tracking-wider mb-1 whitespace-nowrap">
            <span>💀</span> 팩폭 리포트 요약
          </div>
          <p class="text-[11px] text-[#f6f8fa] leading-snug font-medium break-keep">
            ${savageText}
          </p>
        </div>
      `;
    }

  } else {
    // [단톡방 종합 포토카드 모드 - 다채롭고 풍부한 인포그래픽 리포트]
    if (categoryTag) categoryTag.innerText = "CTI GROUP REPORT";
    if (subHeader) subHeader.innerText = `${currentData.roomName || '단톡방'} • ${currentData.dateRange || '전체 기간'}`;
    if (badgeRight) badgeRight.innerText = `우정 ${currentData.groupGrade || 'S+'}`;

    if (heroSection) heroSection.classList.add("hidden");

    if (bodySection) {
      // 1. 핵심 4대 스탯 (총 대화량, 최다 발화러, 골든타임, 평화지수)
      const topTalker = (currentData.members && currentData.members.length > 0) ? currentData.members[0] : null;
      const peakTime = (currentData.activity && currentData.activity.peakHour) 
        ? `${currentData.activity.peakWeekday ? currentData.activity.peakWeekday + ' ' : ''}${currentData.activity.peakHour}`
        : (topTalker && topTalker.activeHours ? topTalker.activeHours : "심야 22시");
      const peace = currentData.peaceIndex !== undefined ? currentData.peaceIndex : 100;

      // 2. 단톡방 핫 키워드 TOP 4
      let hotKeywords = [];
      if (currentData.keywords && currentData.keywords.roomKeywords && currentData.keywords.roomKeywords.length > 0) {
        hotKeywords = currentData.keywords.roomKeywords.slice(0, 4).map(k => typeof k === 'string' ? k : k.word);
      } else {
        const wordMap = {};
        (currentData.members || []).forEach(m => {
          (m.signatures || []).forEach(s => { wordMap[s] = (wordMap[s] || 0) + 1; });
          (m.topWords || []).forEach(w => { wordMap[w.word] = (wordMap[w.word] || 0) + (w.count || 1); });
        });
        hotKeywords = Object.entries(wordMap).sort((a, b) => b[1] - a[1]).slice(0, 4).map(x => x[0]);
      }
      const kwPills = hotKeywords.map(w => `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#16202a] text-[#f5b73d] border border-[#f5b73d]/30 whitespace-nowrap">#${w}</span>`).join(" ");

      // 3. 1:1 베스트 듀오 정보
      const topPair = (currentData.pairRankings && currentData.pairRankings.length > 0) ? currentData.pairRankings[0] : null;

      // 4. 멤버 라인업 (상위 4인 캐릭터 카드)
      const memberChips = (currentData.members || []).slice(0, 4).map(m => {
        const cInfo = getCharData(m.cti);
        return `
          <div class="bg-[#0c1218]/90 border border-white/[0.08] rounded-xl p-1.5 flex items-center gap-2">
            <div class="w-9 h-9 rounded-lg bg-gradient-to-b from-[#1c2734] to-[#0c131a] border border-white/[0.1] flex items-center justify-center p-0.5 shrink-0 overflow-hidden">
              <img src="${cInfo.img}" class="w-full h-full object-contain">
            </div>
            <div class="min-w-0 flex-grow text-left">
              <div class="flex items-center gap-1">
                <span class="text-[11px] font-bold text-white truncate">${m.name}</span>
                <span class="text-[8px] font-mono font-extrabold px-1 rounded text-[#030708]" style="background-color: ${cInfo.color || '#f5b73d'};">${m.cti}</span>
              </div>
              <p class="text-[9px] text-[#848c96] truncate">${m.title || cInfo.name}</p>
            </div>
            <span class="text-[9px] font-mono font-bold text-[#f5b73d] pr-1 shrink-0">${m.msgRatio}%</span>
          </div>
        `;
      }).join("");

      bodySection.innerHTML = `
        <div class="space-y-2 text-left">
          <!-- [A] 단톡방 4대 핵심 지표 (2x2 그리드, 줄바꿈 및 받침 잘림 방지) -->
          <div class="grid grid-cols-2 gap-1.5">
            <div class="bg-[#090e13]/90 border border-white/[0.08] rounded-xl p-2 text-left">
              <span class="text-[9px] text-[#848c96] font-bold block whitespace-nowrap">💬 총 대화량</span>
              <p class="text-xs font-black text-white mt-0.5 whitespace-nowrap break-keep leading-normal pb-0.5">
                ${(currentData.totalMessages || 0).toLocaleString()}건
              </p>
            </div>
            <div class="bg-[#090e13]/90 border border-white/[0.08] rounded-xl p-2 text-left">
              <span class="text-[9px] text-[#848c96] font-bold block whitespace-nowrap">👑 최다 발화러</span>
              <p class="text-xs font-black text-white mt-0.5 whitespace-nowrap break-keep leading-normal pb-0.5">
                ${topTalker ? topTalker.name : '대화러'} <span class="text-[10px] text-[#f5b73d]">(${topTalker ? topTalker.msgRatio : 0}%)</span>
              </p>
            </div>
            <div class="bg-[#090e13]/90 border border-white/[0.08] rounded-xl p-2 text-left">
              <span class="text-[9px] text-[#848c96] font-bold block whitespace-nowrap">⏰ 활성 골든타임</span>
              <p class="text-xs font-black text-white mt-0.5 whitespace-nowrap break-keep leading-normal pb-0.5">
                ${peakTime}
              </p>
            </div>
            <div class="bg-[#090e13]/90 border border-white/[0.08] rounded-xl p-2 text-left">
              <span class="text-[9px] text-[#848c96] font-bold block whitespace-nowrap">🌿 청정 평화지수</span>
              <p class="text-xs font-black text-emerald-400 mt-0.5 whitespace-nowrap break-keep leading-normal pb-0.5">
                ${peace}% <span class="text-[10px] text-[#848c96]">(${peace >= 90 ? '갈등 0%' : '정색 주의'})</span>
              </p>
            </div>
          </div>

          <!-- [B] 단톡방 CTI 페르소나 라인업 (손그림 캐릭터 4인) -->
          <div>
            <div class="flex items-center justify-between mb-1 px-0.5">
              <span class="text-[9px] font-bold text-[#848c96] uppercase tracking-wider flex items-center gap-1 whitespace-nowrap">
                <span>👥</span> 단톡방 CTI 페르소나 라인업
              </span>
              <span class="text-[9px] text-[#848c96] font-mono">${(currentData.members || []).length}명 분석</span>
            </div>
            <div class="grid grid-cols-2 gap-1.5">
              ${memberChips}
            </div>
          </div>

          <!-- [C] 핫 토픽 키워드 -->
          <div class="bg-[#090e13]/90 border border-white/[0.08] rounded-xl p-2">
            <span class="text-[9px] font-bold text-[#848c96] uppercase tracking-wider flex items-center gap-1 mb-1 whitespace-nowrap">
              <span>🔥</span> 단톡방 최다 언급 핫토픽
            </span>
            <div class="flex flex-wrap gap-1 items-center">
              ${kwPills || '<span class="text-[10px] text-[#848c96]">#단톡방 #티키타카</span>'}
            </div>
          </div>

          <!-- [D] 1:1 최강 영혼의 단짝 -->
          ${topPair ? `
            <div class="bg-gradient-to-r from-[rgba(139,92,246,0.15)] to-[rgba(245,183,61,0.15)] border border-[rgba(139,92,246,0.3)] rounded-xl p-2 flex items-center justify-between">
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-base shrink-0">🏆</span>
                <div class="min-w-0 text-left">
                  <div class="flex items-center gap-1 whitespace-nowrap">
                    <span class="text-[9px] text-[#8b5cf6] font-extrabold uppercase">최강 소울 듀오</span>
                    <span class="text-[11px] font-black text-white">${topPair.pair[0]} ↔ ${topPair.pair[1]}</span>
                  </div>
                  <p class="text-[9px] text-[#848c96] truncate">${topPair.summary || '환상의 티키타카 호흡'}</p>
                </div>
              </div>
              <span class="text-[11px] font-mono font-black text-[#f5b73d] bg-[#f5b73d]/15 px-2 py-0.5 rounded-full shrink-0 border border-[#f5b73d]/30">${topPair.score}점</span>
            </div>
          ` : ''}

          <!-- [E] 단톡방 바이브 한 줄 평 -->
          <div class="p-2 rounded-xl bg-[#090e13]/80 border border-white/[0.08] text-center">
            <p class="text-[10px] text-[#f6f8fa] font-medium leading-relaxed italic break-keep">
              "${currentData.groupVibe || '영혼의 찰떡 단톡방!'}"
            </p>
          </div>
        </div>
      `;
    }
  }

  setShareRatio(currentShareRatio || "story");
}

function setShareRatio(ratio) {
  currentShareRatio = ratio;
  const canvas = document.getElementById("shareCardCanvas");
  const btnStory = document.getElementById("btnRatioStory");
  const btnSquare = document.getElementById("btnRatioSquare");

  if (!canvas || !btnStory || !btnSquare) return;

  if (ratio === "story") {
    canvas.style.width = "360px";
    canvas.style.minHeight = "600px";
    btnStory.className = "px-3 py-1.5 rounded-full text-xs font-bold bg-[#16202a] text-[#f5b73d] border border-[#f5b73d]/40 flex items-center gap-1 shadow-sm";
    btnSquare.className = "px-3 py-1.5 rounded-full text-xs font-medium border border-white/[0.08] bg-[#111820] text-[#848c96] hover:text-[#f6f8fa] flex items-center gap-1";
  } else {
    canvas.style.width = "380px";
    canvas.style.minHeight = "520px";
    btnSquare.className = "px-3 py-1.5 rounded-full text-xs font-bold bg-[#16202a] text-[#f5b73d] border border-[#f5b73d]/40 flex items-center gap-1 shadow-sm";
    btnStory.className = "px-3 py-1.5 rounded-full text-xs font-medium border border-white/[0.08] bg-[#111820] text-[#848c96] hover:text-[#f6f8fa] flex items-center gap-1";
  }
}

async function downloadShareCard() {
  const canvasTarget = document.getElementById("shareCardCanvas");
  if (!canvasTarget) return;

  // 1. 폰트 로딩 완료 보장 (폰트 미로딩으로 인한 텍스트 밀림 방지)
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (e) {
      console.warn("Fonts ready check warning:", e);
    }
  }

  const currentMember = (currentData && currentData.members && currentData.members[currentCardMemberIndex]) 
    ? currentData.members[currentCardMemberIndex].name 
    : "포토카드";

  const prefix = currentCardMode === "personal" ? `[CTI_포토카드]_${currentMember}` : `[CTI_단톡방]_${currentData.roomName || '리포트'}`;
  const safeTitle = prefix.replace(/[\\/:*?"<>|]/g, "_");

  try {
    // 2. html2canvas 정밀 캡처 (스크롤 오프셋 0 및 복제 엘리먼트 위치 안정화)
    const canvas = await html2canvas(canvasTarget, {
      scale: 2.5,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#090e13",
      scrollX: 0,
      scrollY: 0,
      windowWidth: document.documentElement.offsetWidth,
      windowHeight: document.documentElement.offsetHeight,
      logging: false,
      onclone: (clonedDoc) => {
        const clonedCard = clonedDoc.getElementById("shareCardCanvas");
        if (clonedCard) {
          clonedCard.style.margin = "0";
          clonedCard.style.transform = "none";
          clonedCard.style.boxShadow = "none";
          clonedCard.style.fontFamily = "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif";
          clonedCard.style.letterSpacing = "normal";

          // 모든 하위 텍스트 요소의 클리핑 방지 및 정렬 보정
          const allEls = clonedCard.querySelectorAll("*");
          allEls.forEach(el => {
            el.style.letterSpacing = "normal";
            el.style.textRendering = "geometricPrecision";
            if (el.classList.contains("truncate")) {
              el.style.overflow = "visible";
              el.style.textOverflow = "clip";
            }
          });
        }
      }
    });

    // 3. toDataURL 시도 및 Tainted Canvas 방어용 toBlob 폴백
    let dataUrl;
    try {
      dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `${safeTitle}_${currentShareRatio}.png`;
      link.href = dataUrl;
      link.click();
      triggerConfetti();
    } catch (taintErr) {
      console.warn("toDataURL fallback triggered:", taintErr);
      canvas.toBlob((blob) => {
        if (!blob) {
          alert("이미지 생성에 실패했습니다: " + taintErr.message);
          return;
        }
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `${safeTitle}_${currentShareRatio}.png`;
        link.href = blobUrl;
        link.click();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        triggerConfetti();
      }, "image/png");
    }
  } catch (err) {
    console.error("Share card export error:", err);
    alert("이미지 생성에 실패했습니다: " + err.message);
  }
}

// 모바일 웹 공유 및 데스크톱 클립보드 복사 지원
async function shareOrCopyCard() {
  const canvasTarget = document.getElementById("shareCardCanvas");
  if (!canvasTarget) return;

  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch (e) {}
  }

  const currentMember = (currentData && currentData.members && currentData.members[currentCardMemberIndex]) 
    ? currentData.members[currentCardMemberIndex].name 
    : "포토카드";

  const prefix = currentCardMode === "personal" ? `[CTI_포토카드]_${currentMember}` : `[CTI_단톡방]_${currentData.roomName || '리포트'}`;
  const safeTitle = prefix.replace(/[\\/:*?"<>|]/g, "_");

  try {
    const canvas = await html2canvas(canvasTarget, {
      scale: 2.5,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#090e13",
      scrollX: 0,
      scrollY: 0,
      windowWidth: document.documentElement.offsetWidth,
      windowHeight: document.documentElement.offsetHeight,
      logging: false,
      onclone: (clonedDoc) => {
        const clonedCard = clonedDoc.getElementById("shareCardCanvas");
        if (clonedCard) {
          clonedCard.style.margin = "0";
          clonedCard.style.transform = "none";
          clonedCard.style.boxShadow = "none";
          clonedCard.style.fontFamily = "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif";
          clonedCard.style.letterSpacing = "normal";

          // 모든 하위 텍스트 요소의 클리핑 방지 및 정렬 보정
          const allEls = clonedCard.querySelectorAll("*");
          allEls.forEach(el => {
            el.style.letterSpacing = "normal";
            el.style.textRendering = "geometricPrecision";
            if (el.classList.contains("truncate")) {
              el.style.overflow = "visible";
              el.style.textOverflow = "clip";
            }
          });
        }
      }
    });

    canvas.toBlob(async (blob) => {
      if (!blob) {
        downloadShareCard();
        return;
      }
      const file = new File([blob], `${safeTitle}.png`, { type: "image/png" });
      
      // 1. 모바일 Web Share API 지원 시 (카카오톡, 인스타그램 스토리 등 공유 시트 호출)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: safeTitle,
            text: "카카오톡 CTI 대화 성향 분석 포토카드"
          });
          triggerConfetti();
          return;
        } catch (shareErr) {
          if (shareErr.name === "AbortError") return;
        }
      }

      // 2. 데스크톱 클립보드 API 지원 시 이미지 바이너리 복사 (PC 카카오톡 등에 Ctrl+V 즉시 전송 가능)
      if (navigator.clipboard && window.ClipboardItem) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob })
          ]);
          alert("📸 포토카드 이미지가 클립보드에 복사되었습니다!\n카카오톡이나 메신저 대화창에 바로 붙여넣기(Ctrl+V) 하실 수 있습니다.");
          triggerConfetti();
          return;
        } catch (clipErr) {
          console.warn("Clipboard copy failed, fallback to download:", clipErr);
        }
      }

      // 3. 폴백: PNG 다운로드
      downloadShareCard();
    }, "image/png");

  } catch (err) {
    console.error("shareOrCopyCard error:", err);
    downloadShareCard();
  }
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