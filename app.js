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
    "ESTA": { bg: "rgba(224, 86, 27, 0.22)", text: "#FF7A45", border: "rgba(224, 86, 27, 0.5)" },
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
  return styles[cti] || { bg: "rgba(255, 255, 255, 0.08)", text: "#EDE8E3", border: "#383835" };
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
      dropZone.classList.add("border-[#E0561B]", "bg-[#2A2A28]");
    });

    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("border-[#E0561B]", "bg-[#2A2A28]");
    });

    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("border-[#E0561B]", "bg-[#2A2A28]");
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

  const reader = new FileReader();
  reader.onload = function(evt) {
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
      alert(`🎉 분석 완료!\n총 ${report.totalMessages.toLocaleString()}건의 대화와 ${report.members.length}명의 CTI 성향을 도출했습니다.`);
    } catch (err) {
      alert("파일 파싱 실패: " + err.message);
      console.error(err);
    }
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

function showLandingView() {
  document.getElementById("landingView").classList.remove("hidden");
  document.getElementById("reportView").classList.add("hidden");
  document.getElementById("navBackBtn").classList.add("hidden");
  document.getElementById("navUploadBtn").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showReportView() {
  document.getElementById("landingView").classList.add("hidden");
  document.getElementById("reportView").classList.remove("hidden");
  document.getElementById("navBackBtn").classList.remove("hidden");
  document.getElementById("navUploadBtn").classList.add("hidden");
  switchTab("tabOverview");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function switchTab(tabId) {
  document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.remove("bg-[#E0561B]", "text-white");
    btn.classList.add("text-[#A29E99]");
  });

  const targetTab = document.getElementById(tabId);
  if (targetTab) targetTab.classList.remove("hidden");

  const activeBtn = document.querySelector(`.tab-btn[data-target="${tabId}"]`);
  if (activeBtn) {
    activeBtn.classList.remove("text-[#A29E99]");
    activeBtn.classList.add("bg-[#E0561B]", "text-white");
  }

  if (tabId === "tabCharacters") {
    setTimeout(renderAllRadarCharts, 50);
  }
  if (tabId === "tabActivity") {
    setTimeout(renderActivityCharts, 50);
  }
}

function renderCurrentData() {
  if (!currentData) return;

  document.getElementById("roomTitle").innerText = currentData.roomName;
  document.getElementById("roomGradeBadge").innerText = `우정 ${currentData.groupGrade}`;
  document.getElementById("roomSubText").innerText = `${currentData.dateRange} • 총 ${currentData.totalMessages.toLocaleString()}건 분석`;

  document.getElementById("statTension").innerText = `${currentData.tensionIndex}%`;
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
  if (!container || !currentData || !currentData.members) return;
  container.innerHTML = "";

  const allBtn = document.createElement("button");
  const isAll = focusedMemberId === null;
  allBtn.className = `px-4 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 ${isAll ? 'bg-[#E0561B] text-white' : 'bg-[#2A2A28] text-[#EDE8E3] hover:bg-[#323230] border border-[#383835]'}`;
  allBtn.innerHTML = `<i class="fa-solid fa-users text-[11px]"></i> <span>전체 시점</span>`;
  allBtn.onclick = () => clearFocusMember();
  container.appendChild(allBtn);

  currentData.members.forEach(m => {
    const isFocused = focusedMemberId === m.id || focusedMemberId === m.name;
    const btn = document.createElement("button");
    btn.className = `px-4 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 ${isFocused ? 'bg-[#E0561B] text-white' : 'bg-[#2A2A28] text-[#EDE8E3] hover:bg-[#323230] border border-[#383835]'}`;
    btn.innerHTML = `<span>${m.avatar}</span> <span>${m.name}</span>`;
    btn.onclick = () => selectFocusMember(m.id || m.name);
    container.appendChild(btn);
  });
}

function selectFocusMember(memberId) {
  focusedMemberId = memberId;
  const m = currentData.members.find(x => x.id === memberId || x.name === memberId);
  if (!m) return;

  const banner = document.getElementById("focusBanner");
  if (banner) {
    banner.classList.remove("hidden");
    document.getElementById("focusName").innerText = m.name;
    document.getElementById("focusAvatar").innerText = m.avatar;
    document.getElementById("focusCtiBadge").innerHTML = getCtiBadgeHtml(m.cti);
    document.getElementById("focusPersonaText").innerText = `${m.timePersona || '활동가'} • 전체 대화의 ${m.msgRatio}% 담당`;

    const pairs = (currentData.pairRankings || []).filter(p => p.pair.includes(m.name));
    if (pairs.length > 0) {
      const topP = pairs.reduce((best, cur) => cur.score > best.score ? cur : best, pairs[0]);
      const otherName = topP.pair[0] === m.name ? topP.pair[1] : topP.pair[0];
      document.getElementById("focusTopSoulmate").innerText = `${otherName} (${topP.score}점, 티키타카 ${topP.replies.toLocaleString()}회)`;
    } else {
      document.getElementById("focusTopSoulmate").innerText = "집계 중";
    }

    const words = (m.topWords || []).slice(0, 3).map(w => `#${w.word}`).join(" ");
    document.getElementById("focusTopWords").innerText = words || (m.signatures || []).slice(0, 3).join(", ") || "-";
    document.getElementById("focusActiveHours").innerText = m.activeHours || "피크 타임";
  }

  renderFocusFilterBar();
  renderChemistryTab();
  renderCharacterCards();
}

function clearFocusMember() {
  focusedMemberId = null;
  const banner = document.getElementById("focusBanner");
  if (banner) banner.classList.add("hidden");
  renderFocusFilterBar();
  renderChemistryTab();
  renderCharacterCards();
}

// 탭 1: 종합 성적표 참여자 카드
function renderOverviewMembers() {
  const container = document.getElementById("overviewMemberGrid");
  if (!container) return;
  container.innerHTML = "";

  currentData.members.forEach(m => {
    const card = document.createElement("div");
    card.className = "bg-[#222220] border border-[#383835] hover:border-[#E0561B] rounded-[24px] p-5 space-y-3 cursor-pointer transition hover:-translate-y-1 shadow-[0_4px_20px_rgba(0,0,0,0.2)]";
    card.onclick = () => {
      selectFocusMember(m.id || m.name);
      switchTab("tabCharacters");
    };
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="text-3xl">${m.avatar}</span>
        ${getCtiBadgeHtml(m.cti)}
      </div>
      <div>
        <h5 class="text-base font-bold text-[#EDE8E3] flex items-center gap-1.5">${m.name}</h5>
        <p class="text-xs text-[#A29E99]">${m.title}</p>
      </div>
      <div class="space-y-1 pt-1 border-t border-[#383835] text-[11px] text-[#A29E99]">
        <div class="flex justify-between"><span>발화량</span><strong class="text-[#EDE8E3]">${m.totalMsgs.toLocaleString()}건 (${m.msgRatio}%)</strong></div>
        <div class="flex justify-between"><span>호흡</span><strong class="text-[#EDE8E3]">평균 ${m.avgLen}자</strong></div>
        <div class="flex justify-between"><span>대화 개시</span><strong class="text-[#E0561B]">${m.starters}회</strong></div>
      </div>
      <div class="pt-1">
        <span class="inline-block text-[11px] px-2.5 py-1 rounded-full bg-[#2A2A28] text-[#EDE8E3] border border-[#383835] font-medium">${m.trophy}</span>
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
        <span class="text-[#A29E99] font-medium">${label}</span>
        <span class="font-mono font-bold text-[#EDE8E3]">${value}<span class="text-[9px] text-[#A29E99]">/100</span></span>
      </div>
      <div class="w-full bg-[#2A2A28] h-1.5 rounded-full overflow-hidden">
        <div class="${colorClass} h-full rounded-full transition-all duration-500" style="width: ${Math.min(100, Math.max(5, value))}%"></div>
      </div>
    </div>
  `;
}

// 탭 2: 인물별 CTI 팩폭 카드
function renderCharacterCards() {
  const container = document.getElementById("characterCardsContainer");
  if (!container) return;
  container.innerHTML = "";

  Object.keys(radarCharts).forEach(key => {
    if (radarCharts[key]) radarCharts[key].destroy();
  });
  radarCharts = {};

  currentData.members.forEach((m, idx) => {
    const isMe = Boolean(focusedMemberId && (m.id === focusedMemberId || m.name === focusedMemberId));
    const card = document.createElement("div");
    card.id = `charCard-${m.id}`;
    card.className = isMe 
      ? "bg-[#222220] border-2 border-[#E0561B] rounded-[32px] p-6 space-y-5 shadow-[0_4px_24px_rgba(0,0,0,0.3)] relative overflow-hidden" 
      : "bg-[#222220] border border-[#383835] rounded-[32px] p-6 space-y-5 shadow-[0_4px_20px_rgba(0,0,0,0.2)] relative overflow-hidden";
    
    const quotesHtml = (m.quotes || []).map(q => `
      <li class="flex items-start gap-2 text-xs text-[#A29E99] italic">
        <span class="text-[#E0561B]">"</span>
        <span>${q}</span>
        <span class="text-[#E0561B]">"</span>
      </li>
    `).join("");

    const signaturesHtml = (m.signatures || []).map(s => `
      <span class="px-2.5 py-1 rounded-full bg-[#2A2A28] border border-[#383835] text-[#EDE8E3] text-[11px] font-mono">#${s}</span>
    `).join("");

    card.innerHTML = `
      <div class="flex items-start justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="w-14 h-14 rounded-2xl bg-[#2A2A28] border border-[#383835] flex items-center justify-center text-3xl">
            ${m.avatar}
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h4 class="text-xl font-black text-[#EDE8E3] flex items-center gap-2">
                <span>${m.name}</span>
                ${isMe ? '<span class="text-xs px-2.5 py-0.5 rounded-full bg-[#E0561B] text-white font-black flex items-center gap-1 shadow-sm"><i class="fa-solid fa-crown text-[10px]"></i> 내 카드</span>' : ''}
              </h4>
              ${getCtiBadgeHtml(m.cti)}
            </div>
            <p class="text-xs text-[#E0561B] font-semibold mt-0.5">${m.title}</p>
          </div>
        </div>
        <span class="text-xs font-bold text-[#A29E99] bg-[#2A2A28] border border-[#383835] px-2.5 py-1 rounded-full">
          점유율 ${m.msgRatio}%
        </span>
      </div>

      <!-- 레이더 차트 및 5대 지표 수치 진단 섹션 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-[#181817] p-4 rounded-2xl border border-[#383835]">
        <div class="h-52 relative flex items-center justify-center">
          <canvas id="radar-${idx}"></canvas>
        </div>
        <div class="space-y-2.5">
          <div class="flex items-center justify-between pb-1 border-b border-[#2A2A28]">
            <span class="text-xs font-bold text-[#EDE8E3] flex items-center gap-1.5">
              <i class="fa-solid fa-sliders text-[#E0561B]"></i> 5대 성향 수치 진단
            </span>
            <span class="text-[10px] text-[#A29E99]">전수 분석 통계</span>
          </div>
          ${renderStatGauge("⚡ 점화력 (화제 개시)", m.radar.initiative, "bg-[#E0561B]")}
          ${renderStatGauge("📏 문장 길이 (호흡)", m.radar.length, "bg-[#5B8DF5]")}
          ${renderStatGauge("💬 감정 / 드립 (공감)", m.radar.emotion, "bg-emerald-400")}
          ${renderStatGauge("🎯 직진 / 도발 (단도직입)", m.radar.assertiveness, "bg-purple-400")}
          ${renderStatGauge("🤣 유머 감각 (티키타카)", m.radar.humor, "bg-[#EAA43A]")}
        </div>
      </div>

      <!-- 기본 대화 집계 통계 -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
        <div class="bg-[#181817] p-2.5 rounded-xl border border-[#2A2A28]">
          <span class="text-[11px] text-[#A29E99] block mb-0.5">총 발화량</span>
          <strong class="text-[#EDE8E3] font-mono">${m.totalMsgs.toLocaleString()}건</strong>
        </div>
        <div class="bg-[#181817] p-2.5 rounded-xl border border-[#2A2A28]">
          <span class="text-[11px] text-[#A29E99] block mb-0.5">평균 글자 수</span>
          <strong class="text-[#EDE8E3] font-mono">${m.avgLen}자</strong>
        </div>
        <div class="bg-[#181817] p-2.5 rounded-xl border border-[#2A2A28]">
          <span class="text-[11px] text-[#A29E99] block mb-0.5">대화 점화 (선톡)</span>
          <strong class="text-[#E0561B] font-mono">${m.starters}회</strong>
        </div>
        <div class="bg-[#181817] p-2.5 rounded-xl border border-[#2A2A28]">
          <span class="text-[11px] text-[#A29E99] block mb-0.5">웃음/질문</span>
          <strong class="text-[#EDE8E3] font-mono">${m.laughs.toLocaleString()} / ${m.questions}</strong>
        </div>
      </div>

      <div class="space-y-1.5">
        <p class="text-xs font-bold text-[#A29E99]">시그니처 키워드</p>
        <div class="flex flex-wrap gap-1.5">${signaturesHtml}</div>
      </div>

      <div class="space-y-2 bg-[#181817] p-3 rounded-2xl border border-[#383835]">
        <p class="text-xs font-bold text-[#A29E99] flex items-center gap-1.5">
          <i class="fa-solid fa-quote-left text-[#E0561B]"></i> 박제된 대표 대사
        </p>
        <ul class="space-y-1.5">${quotesHtml}</ul>
      </div>

      <div class="bg-[rgba(224,86,27,0.08)] border border-[rgba(224,86,27,0.3)] rounded-2xl p-3.5 space-y-1.5">
        <div class="flex items-center gap-2 text-[#E0561B] text-xs font-bold">
          <i class="fa-solid fa-skull-crossbones"></i> 뼈 때리는 팩폭 피드백
        </div>
        <p class="text-xs text-[#EDE8E3] leading-relaxed font-medium">${m.savage}</p>
        <div class="pt-1 text-[11px] text-[#A29E99] flex items-center gap-1">
          <i class="fa-solid fa-lightbulb text-[#EAA43A]"></i> 조언: ${m.advice}
        </div>
      </div>

      <div class="text-right">
        <span class="text-xs font-extrabold px-3 py-1 rounded-full bg-[#2A2A28] border border-[#383835] text-[#EDE8E3]">
          ${m.trophy}
        </span>
      </div>
    `;
    container.appendChild(card);
  });

  setTimeout(renderAllRadarCharts, 50);
}

// 레이더 차트 렌더링 (순서 및 스케일 0~100 일치 보정)
function renderAllRadarCharts() {
  if (!currentData || !currentData.members) return;

  currentData.members.forEach((m, idx) => {
    const canvas = document.getElementById(`radar-${idx}`);
    if (!canvas) return;

    if (radarCharts[idx]) radarCharts[idx].destroy();

    const ctx = canvas.getContext("2d");
    radarCharts[idx] = new Chart(ctx, {
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
          backgroundColor: "rgba(224, 86, 27, 0.28)",
          borderColor: "#E0561B",
          borderWidth: 2,
          pointBackgroundColor: "#E0561B",
          pointBorderColor: "#EDE8E3",
          pointBorderWidth: 1.5,
          pointRadius: 3.5,
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
            beginAtZero: true,
            angleLines: { color: "rgba(255, 255, 255, 0.12)" },
            grid: { color: "rgba(255, 255, 255, 0.10)" },
            pointLabels: {
              font: { size: 11, family: "Pretendard Variable", weight: "600" },
              color: "#A29E99"
            },
            ticks: {
              display: false,
              stepSize: 20
            }
          }
        }
      }
    });
  });
}

// 탭 3: 케미 & 궁합 탭
function renderChemistryTab() {
  const container = document.getElementById("pairRankingsContainer");
  if (!container) return;
  container.innerHTML = "";

  let pairs = (currentData.pairRankings || []);
  const focusedMemberObj = currentData.members.find(x => x.id === focusedMemberId || x.name === focusedMemberId);
  const targetName = focusedMemberObj ? focusedMemberObj.name : focusedMemberId;

  if (targetName) {
    const focusedPairs = pairs.filter(p => p.pair.includes(targetName));
    const otherPairs = pairs.filter(p => !p.pair.includes(targetName));
    pairs = [...focusedPairs, ...otherPairs];
  }

  pairs.forEach(p => {
    const isMyPair = Boolean(targetName && p.pair.includes(targetName));
    const card = document.createElement("div");
    card.className = isMyPair 
      ? "bg-[#222220] border-2 border-[#EAA43A] rounded-[24px] p-5 space-y-3 shadow-[0_4px_24px_rgba(0,0,0,0.3)] transition relative" 
      : "bg-[#222220] border border-[#383835] rounded-[24px] p-5 space-y-3 hover:border-[#4A4A45] transition";

    let gradeColor = "text-[#EAA43A] bg-[rgba(234,164,58,0.15)] border-[rgba(234,164,58,0.4)]";
    if (p.grade.includes("SS")) gradeColor = "text-[#E0561B] bg-[rgba(224,86,27,0.15)] border-[rgba(224,86,27,0.4)]";
    else if (p.grade === "A") gradeColor = "text-emerald-400 bg-emerald-950/60 border-emerald-800/60";
    else if (p.grade === "B+") gradeColor = "text-[#5B8DF5] bg-[rgba(91,141,245,0.15)] border-[rgba(91,141,245,0.4)]";

    card.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <span class="w-7 h-7 rounded-full bg-[#2A2A28] border border-[#383835] text-[#EDE8E3] flex items-center justify-center font-black text-sm">
            ${p.rank}
          </span>
          <div>
            <h4 class="text-base font-black text-[#EDE8E3] flex items-center gap-2">
              <span>${p.pair[0]}</span>
              ${getCtiBadgeHtml(p.types[0])}
              <span class="text-[#A29E99]">↔</span>
              <span>${p.pair[1]}</span>
              ${getCtiBadgeHtml(p.types[1])}
            </h4>
          </div>
        </div>
        <div class="flex items-center gap-2">
          ${isMyPair ? '<span class="px-2.5 py-1 rounded-full text-xs font-black bg-[#E0561B] text-white flex items-center gap-1 shadow-sm"><i class="fa-solid fa-star text-[10px]"></i> 나와의 케미</span>' : ''}
          <span class="px-2.5 py-1 rounded-full text-xs font-black border ${gradeColor}">${p.grade}급 (${p.score}점)</span>
          <span class="text-xs font-bold text-[#EDE8E3] bg-[#2A2A28] border border-[#383835] px-3 py-1 rounded-full">${p.badge}</span>
        </div>
      </div>

      <div class="bg-[#181817] p-3 rounded-xl border border-[#383835] flex flex-wrap items-center justify-between gap-2 text-xs">
        <p class="text-[#EDE8E3] font-medium">${p.summary}</p>
        <div class="flex gap-3 text-[#A29E99] text-[11px] shrink-0 font-mono">
          <span>답장: <strong class="text-[#E0561B]">${p.replies.toLocaleString()}건</strong></span>
          <span>1:1 스트릭: <strong class="text-[#EDE8E3]">${p.streaks}회</strong></span>
          <span>호출: <strong class="text-[#EDE8E3]">${p.mentions}회</strong></span>
        </div>
      </div>

      <p class="text-xs text-[#A29E99] leading-relaxed">${p.details || ''}</p>
    `;
    container.appendChild(card);
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
        tagClass += "text-sm font-black bg-[#E0561B] text-white border-transparent shadow-sm";
      } else if (idx < 3) {
        tagClass += "font-bold bg-[rgba(234,164,58,0.18)] text-[#EAA43A] border-[rgba(234,164,58,0.4)]";
      } else if (idx < 8) {
        tagClass += "font-semibold bg-[rgba(91,141,245,0.15)] text-[#5B8DF5] border-[rgba(91,141,245,0.35)]";
      } else if (idx < 15) {
        tagClass += "font-medium bg-[#2A2A28] text-[#EDE8E3] border-[#383835]";
      } else {
        tagClass += "bg-[#181817] text-[#A29E99] border-[#2A2A28]";
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
      card.className = "bg-[#222220] border border-[#383835] rounded-[24px] p-4 space-y-3 shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:border-[#4A4A45] transition";
      
      const wordsList = (m.topWords || []).map((w, i) => `
        <div class="flex items-center justify-between text-xs py-1 border-b border-[#2A2A28] last:border-none">
          <span class="text-[#EDE8E3] font-medium"><strong class="text-[#E0561B] mr-1.5">${i + 1}.</strong> #${w.word}</span>
          <span class="text-[11px] font-mono text-[#A29E99] bg-[#181817] border border-[#2A2A28] px-2 py-0.5 rounded-full">${w.count}회</span>
        </div>
      `).join("");

      card.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-2xl">${m.avatar}</span>
            <div>
              <h5 class="text-sm font-bold text-[#EDE8E3]">${m.name}</h5>
              <div class="mt-0.5">${getCtiBadgeHtml(m.cti)}</div>
            </div>
          </div>
          <span class="text-[11px] px-2.5 py-1 rounded-full bg-[#2A2A28] text-[#EDE8E3] border border-[#383835] font-medium">
            ${m.timePersona || "활동가"}
          </span>
        </div>
        <div class="pt-1 space-y-1">
          <p class="text-[11px] text-[#A29E99] font-bold uppercase tracking-wider">자주 쓰는 말버릇 TOP 5</p>
          <div class="bg-[#181817] rounded-xl p-2.5 space-y-0.5 border border-[#2A2A28]">
            ${wordsList || "<p class='text-xs text-[#A29E99] py-1'>단어 분석 중</p>"}
          </div>
        </div>
        ${m.quotes && m.quotes[0] ? `
          <div class="pt-1 text-[11px] text-[#A29E99] italic bg-[#181817] p-2 rounded-xl border border-[#2A2A28]">
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
    grad.addColorStop(0, "rgba(224,86,27,0.35)");
    grad.addColorStop(1, "rgba(224,86,27,0.0)");

    const labels = Array.from({ length: 24 }, (_, i) => `${i}시`);
    const data = act.hourly || Array(24).fill(0);

    activityCharts.hourly = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: "대화량",
          data: data,
          borderColor: "#E0561B",
          borderWidth: 2.5,
          backgroundColor: grad,
          fill: true,
          tension: 0.35,
          pointRadius: 2.5,
          pointHoverRadius: 6,
          pointBackgroundColor: "#E0561B"
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
            grid: { color: "rgba(255,255,255,0.05)" },
            ticks: { color: "#A29E99", font: { size: 10, family: "Pretendard Variable" } }
          },
          y: {
            grid: { color: "rgba(255,255,255,0.05)" },
            ticks: { color: "#A29E99", font: { size: 10, family: "Pretendard Variable" } }
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
    const bgColors = data.map(v => v === maxVal ? "#E0561B" : "rgba(234,164,58,0.6)");

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
            ticks: { color: "#A29E99", font: { size: 10, family: "Pretendard Variable" } }
          },
          y: {
            grid: { color: "rgba(255,255,255,0.05)" },
            ticks: { color: "#A29E99", font: { size: 10, family: "Pretendard Variable" } }
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
    resultBox.innerHTML = `<p class="text-xs text-[#E0561B]">자신과의 궁합입니다! 완벽한 자기이해의 경지입니다.</p>`;
    return;
  }

  const mA = currentData.members.find(m => m.id === selA.value);
  const mB = currentData.members.find(m => m.id === selB.value);
  if (!mA || !mB) return;

  const chem = window.CTI_SYSTEM.getChemistry(mA.cti, mB.cti, mA.name, mB.name);

  resultBox.innerHTML = `
    <div class="flex items-center justify-between border-b border-[#2A2A28] pb-2">
      <div class="flex items-center gap-2">
        <span class="text-base font-bold text-[#EDE8E3]">${mA.name} & ${mB.name}</span>
        <span class="text-xs text-[#E0561B] font-bold">${chem.badge}</span>
      </div>
      <span class="text-sm font-black text-[#E0561B]">${chem.grade}급 (${chem.score}점)</span>
    </div>
    <p class="text-xs text-[#EDE8E3] font-semibold">${chem.summary}</p>
    <p class="text-xs text-[#A29E99] leading-relaxed">${chem.details}</p>
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
    card.className = "bg-[#222220] border border-[#383835] hover:border-[#E0561B] rounded-[32px] p-5 space-y-3 cursor-pointer transition hover:-translate-y-1 shadow-[0_4px_20px_rgba(0,0,0,0.2)]";
    card.onclick = () => openTypeDetailModal(code);

    card.innerHTML = `
      <div class="flex items-center justify-between">
        ${getCtiBadgeHtml(item.code)}
        <span class="text-[10px] text-[#A29E99]">클릭하여 상세</span>
      </div>
      <div>
        <h5 class="text-sm font-bold text-[#EDE8E3] truncate">${item.title}</h5>
        <p class="text-xs text-[#E0561B] font-medium mt-0.5 line-clamp-1">${item.sub}</p>
      </div>
      <p class="text-xs text-[#A29E99] line-clamp-3 leading-relaxed">${item.desc}</p>
      <div class="pt-2 border-t border-[#383835] flex items-center justify-between text-[11px]">
        <span class="text-[#E0561B] font-medium">💖 ${item.bestMatch}</span>
        <span class="text-[#A29E99] font-medium">⚡ ${item.worstMatch}</span>
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
    card.className = "bg-[#222220] border border-[#383835] hover:border-[#E0561B] rounded-[32px] p-5 space-y-2 cursor-pointer transition hover:-translate-y-1 shadow-[0_4px_20px_rgba(0,0,0,0.2)]";
    card.onclick = () => openTypeDetailModal(code);

    card.innerHTML = `
      <div class="flex items-center justify-between">
        ${getCtiBadgeHtml(item.code)}
        <span class="text-[10px] text-[#A29E99]">상세보기</span>
      </div>
      <h5 class="text-sm font-bold text-[#EDE8E3] truncate">${item.title}</h5>
      <p class="text-xs text-[#A29E99] line-clamp-2">${item.desc}</p>
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
      <div class="flex items-center justify-between border-b border-[#383835] pb-3">
        <div>
          ${getCtiBadgeHtml(item.code, "px-3 py-1 text-sm font-black")}
          <h3 class="text-xl font-black text-[#EDE8E3] mt-2">${item.title}</h3>
          <p class="text-xs text-[#E0561B] font-medium">${item.sub}</p>
        </div>
      </div>
      <p class="text-xs text-[#A29E99] leading-relaxed">${item.desc}</p>
      <div class="text-xs text-[#EDE8E3] font-mono bg-[#181817] p-2.5 rounded-xl border border-[#383835]">
        ${item.tag}
      </div>
      <div class="bg-[rgba(224,86,27,0.1)] border border-[rgba(224,86,27,0.3)] rounded-2xl p-3 space-y-1">
        <p class="text-xs text-[#E0561B] font-bold">🔥 뼈 때리는 팩폭</p>
        <p class="text-xs text-[#EDE8E3] leading-relaxed">${item.savage}</p>
        <p class="text-[11px] text-[#A29E99] pt-1">💡 성찰 조언: ${item.advice}</p>
      </div>
      <div class="grid grid-cols-2 gap-3 pt-2 text-xs">
        <div class="p-3 rounded-xl bg-[#181817] border border-[#383835]">
          <span class="text-[#A29E99]">💖 찰떡궁합</span>
          <p class="text-base font-bold text-[#E0561B] mt-1">${item.bestMatch}</p>
        </div>
        <div class="p-3 rounded-xl bg-[#181817] border border-[#383835]">
          <span class="text-[#A29E99]">⚡ 파국주의</span>
          <p class="text-base font-bold text-[#A29E99] mt-1">${item.worstMatch}</p>
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
    backgroundColor: "#181817",
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
    btnStory.className = "px-4 py-2 rounded-[20px] text-xs font-medium bg-[#E0561B] text-white flex items-center gap-1.5 shadow-sm";
    btnSquare.className = "px-4 py-2 rounded-[20px] text-xs font-medium border border-[#383835] bg-[#2A2A28] text-[#EDE8E3] flex items-center gap-1.5 hover:bg-[#323230]";
  } else {
    canvas.style.width = "420px";
    canvas.style.minHeight = "460px";
    btnSquare.className = "px-4 py-2 rounded-[20px] text-xs font-medium bg-[#E0561B] text-white flex items-center gap-1.5 shadow-sm";
    btnStory.className = "px-4 py-2 rounded-[20px] text-xs font-medium border border-[#383835] bg-[#2A2A28] text-[#EDE8E3] flex items-center gap-1.5 hover:bg-[#323230]";
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