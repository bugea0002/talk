// 앱 메인 로직 & UI 컨트롤러

let currentData = null;
let radarCharts = {};
let isAnonymized = false;
let isNameMasked = false; // 전역 이름 가리기 상태 (isAnonymized와 동기화)
let isSampleMode = false; // 샘플 체험 모드 여부
let cachedRawText = null; // 업로드된 .txt 원문 캐시
let cachedFileName = null; // 업로드된 파일명 캐시
let isVillainMildMode = false; // 모드 3 순한맛(평화 모드) 여부
let originalDataCache = null;
let myMemberId = null; // '나'로 지정된 멤버 고유 ID
let focusedMemberId = null; // 현재 상세 분석 탭에서 포커스된 멤버
let currentShareRatio = "story";
let activityCharts = { hourly: null, weekday: null };
let selectedAnalysisMode = "chemistry"; // 'chemistry' | 'romance' | 'villain'
let selectedRomancePair = [0, 1]; // 썸·연인 모드 비교 대상 인덱스 [A, B]
let currentRomanceSubTab = "summary"; // 'summary' | 'signals' | 'mind' | 'highlights'
let currentVillainSubTab = "ranking"; // 'ranking' | 'spotlight' | 'evidence' | 'peer'
let currentVillainSort = "contribution"; // 'contribution' | 'villain' (기본값: 기여도 순)
let isLightMode = false;

// 공통 이름 마스킹 포맷 함수 (김민지 -> 김○지, 민우 -> 민○)
function formatName(name, masked = isNameMasked) {
  if (!name || typeof name !== "string") return name || "";
  if (!masked) return name;
  const trimmed = name.trim();
  const chars = Array.from(trimmed);
  if (chars.length <= 1) return trimmed;
  if (chars.length === 2) return `${chars[0]}○`;
  if (chars.length === 3) return `${chars[0]}○${chars[2]}`;
  return `${chars[0]}${"○".repeat(Math.min(chars.length - 2, 2))}${chars[chars.length - 1]}`;
}

// 문장 내 등장하는 모든 멤버 실명(및 3글자 이름의 성 제외 2글자 호칭)을 마스킹
function maskNamesInText(text, masked = isNameMasked) {
  if (!text || typeof text !== "string" || !masked || !originalDataCache || !Array.isArray(originalDataCache.members)) {
    return text;
  }
  let out = text;
  const replacements = [];
  originalDataCache.members.forEach((m) => {
    const rawName = (m && m.name) ? String(m.name).trim() : "";
    if (!rawName) return;
    replacements.push({ from: rawName, to: formatName(rawName, true) });
    const chars = Array.from(rawName);
    // 3글자 한국어 이름(예: 박준영, 김민지)이 대화문에서 '준영아', '민지님' 등으로 쓰인 경우 함께 마스킹
    if (chars.length === 3) {
      const givenName = chars.slice(1).join("");
      if (givenName.length === 2) {
        replacements.push({ from: givenName, to: `${chars[1]}○` });
      }
    }
  });
  replacements.sort((a, b) => b.from.length - a.from.length);
  replacements.forEach(({ from, to }) => {
    if (from && out.includes(from)) {
      out = out.split(from).join(to);
    }
  });
  return out;
}

// 원본 데이터 캐시(originalDataCache)로부터 마스킹 상태가 반영된 데이터 객체 생성
function buildDisplayDataFromCache(masked = isNameMasked) {
  if (!originalDataCache) return null;
  const shouldMask = typeof masked === "boolean" ? masked : isNameMasked;
  const clone = JSON.parse(JSON.stringify(originalDataCache));
  if (!shouldMask) return clone;

  const nameMap = {};
  (originalDataCache.members || []).forEach((m) => {
    nameMap[m.name] = formatName(m.name, true);
  });
  const mapSingleName = (n) => (nameMap[n] ? nameMap[n] : formatName(n, true));

  if (clone.roomName) {
    clone.roomName = maskNamesInText(clone.roomName, true);
  }
  if (clone.groupVibe) {
    clone.groupVibe = maskNamesInText(clone.groupVibe, true);
  }

  if (Array.isArray(clone.members)) {
    clone.members.forEach((m) => {
      m.name = mapSingleName(m.name);
      if (m.bestMatch) m.bestMatch = mapSingleName(m.bestMatch);
      if (m.worstMatch) m.worstMatch = mapSingleName(m.worstMatch);
      if (m.factBomb) m.factBomb = maskNamesInText(m.factBomb, true);
      if (m.bestMatchReason) m.bestMatchReason = maskNamesInText(m.bestMatchReason, true);
      if (m.worstMatchReason) m.worstMatchReason = maskNamesInText(m.worstMatchReason, true);
      if (Array.isArray(m.sampleQuotes)) {
        m.sampleQuotes = m.sampleQuotes.map((q) => maskNamesInText(q, true));
      }
    });
  }

  if (Array.isArray(clone.pairRankings)) {
    clone.pairRankings.forEach((p) => {
      if (Array.isArray(p.pair)) {
        p.pair = p.pair.map((n) => mapSingleName(n));
      }
      if (p.summary) p.summary = maskNamesInText(p.summary, true);
      if (p.reason) p.reason = maskNamesInText(p.reason, true);
    });
  }

  if (Array.isArray(clone.quotes)) {
    clone.quotes.forEach((q) => {
      if (q.speaker) q.speaker = mapSingleName(q.speaker);
      if (q.text) q.text = maskNamesInText(q.text, true);
      if (q.context) q.context = maskNamesInText(q.context, true);
    });
  }

  if (Array.isArray(clone.romanceHighlights)) {
    clone.romanceHighlights.forEach((h) => {
      if (h.title) h.title = maskNamesInText(h.title, true);
      if (h.aiComment) h.aiComment = maskNamesInText(h.aiComment, true);
      if (Array.isArray(h.messages)) {
        h.messages.forEach((msg) => {
          if (msg.speaker) msg.speaker = mapSingleName(msg.speaker);
          if (msg.text) msg.text = maskNamesInText(msg.text, true);
        });
      }
    });
  }

  if (Array.isArray(clone.villainEvidenceLogs)) {
    clone.villainEvidenceLogs.forEach((ev) => {
      if (ev.suspect) ev.suspect = mapSingleName(ev.suspect);
      if (ev.title) ev.title = maskNamesInText(ev.title, true);
      if (ev.verdict) ev.verdict = maskNamesInText(ev.verdict, true);
      if (Array.isArray(ev.messages)) {
        ev.messages.forEach((msg) => {
          if (msg.speaker) msg.speaker = mapSingleName(msg.speaker);
          if (msg.text) msg.text = maskNamesInText(msg.text, true);
        });
      }
    });
  }

  if (clone.academicMetrics) {
    if (clone.academicMetrics.villain) {
      const v = clone.academicMetrics.villain;
      if (v.topCarry) v.topCarry = mapSingleName(v.topCarry);
      if (v.topVillain) v.topVillain = mapSingleName(v.topVillain);
      if (Array.isArray(v.profiles)) {
        v.profiles.forEach((p) => {
          if (p.name) p.name = mapSingleName(p.name);
          if (p.diagnosis) p.diagnosis = maskNamesInText(p.diagnosis, true);
          if (p.mildDiagnosis) p.mildDiagnosis = maskNamesInText(p.mildDiagnosis, true);
        });
      }
    }
    if (clone.academicMetrics.romance && clone.academicMetrics.romance.secretMind) {
      const sm = clone.academicMetrics.romance.secretMind;
      ["memberA", "memberB"].forEach((key) => {
        if (sm[key]) {
          if (sm[key].name) sm[key].name = mapSingleName(sm[key].name);
          if (sm[key].surfaceStyle) sm[key].surfaceStyle = maskNamesInText(sm[key].surfaceStyle, true);
          if (sm[key].innerTruth) sm[key].innerTruth = maskNamesInText(sm[key].innerTruth, true);
          if (sm[key].fearTrigger) sm[key].fearTrigger = maskNamesInText(sm[key].fearTrigger, true);
          if (sm[key].secretWish) sm[key].secretWish = maskNamesInText(sm[key].secretWish, true);
        }
      });
      if (Array.isArray(sm.unspokenQuestions)) {
        sm.unspokenQuestions.forEach((uq) => {
          if (uq.from) uq.from = mapSingleName(uq.from);
          if (uq.to) uq.to = mapSingleName(uq.to);
          if (uq.q) uq.q = maskNamesInText(uq.q, true);
          if (uq.a) uq.a = maskNamesInText(uq.a, true);
        });
      }
    }
  }

  return clone;
}

// 글로벌 토스트(Toast) 알림 표시 함수
function showToast(message, icon = "fa-circle-check", accentColor = "#f5b73d") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  let resolvedIcon = icon;
  let resolvedColor = accentColor;
  if (icon === "loading") {
    resolvedIcon = "fa-spinner fa-spin";
    resolvedColor = "#38bdf8";
  } else if (icon === "success") {
    resolvedIcon = "fa-circle-check";
    resolvedColor = "#10b981";
  } else if (icon === "error") {
    resolvedIcon = "fa-triangle-exclamation";
    resolvedColor = "#f43f5e";
  } else if (icon === "info") {
    resolvedIcon = "fa-circle-info";
    resolvedColor = "#f5b73d";
  }

  const toast = document.createElement("div");
  toast.className = "pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-2xl transition-all duration-300 opacity-0 translate-y-2 text-xs sm:text-sm font-bold";
  if (isLightMode) {
    toast.style.backgroundColor = "rgba(255, 255, 255, 0.98)";
    toast.style.borderColor = "rgba(15, 23, 42, 0.15)";
    toast.style.color = "#0f172a";
  } else {
    toast.style.backgroundColor = "rgba(17, 24, 32, 0.96)";
    toast.style.borderColor = "rgba(245, 183, 61, 0.4)";
    toast.style.color = "#f6f8fa";
  }
  toast.innerHTML = `
    <i class="fa-solid ${resolvedIcon} text-base shrink-0" style="color: ${resolvedColor};"></i>
    <span class="break-keep">${message}</span>
  `;
  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.remove("opacity-0", "translate-y-2");
    toast.classList.add("opacity-100", "translate-y-0");
  });
  setTimeout(() => {
    toast.classList.remove("opacity-100", "translate-y-0");
    toast.classList.add("opacity-0", "translate-y-2");
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 2900);
}

// 업로드 에러 배너 표시/숨김 함수
function showUploadError(title, desc) {
  const banner = document.getElementById("uploadErrorBanner");
  const titleEl = document.getElementById("uploadErrorTitle");
  const descEl = document.getElementById("uploadErrorDesc");
  if (titleEl && title) titleEl.innerText = title;
  if (descEl && desc) descEl.innerText = desc;
  if (banner) {
    banner.classList.remove("hidden");
    banner.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function hideUploadError() {
  const banner = document.getElementById("uploadErrorBanner");
  if (banner) banner.classList.add("hidden");
}

// 화이트 모드 / 다크 모드 토글 및 동기화
function initColorMode() {
  try {
    const saved = localStorage.getItem("cti_color_mode");
    if (saved === "light") {
      isLightMode = true;
      document.body.classList.add("light-mode");
    }
  } catch (e) {}
  syncColorModeButtons();
}

function toggleColorMode() {
  isLightMode = !isLightMode;
  document.body.classList.toggle("light-mode", isLightMode);
  try {
    localStorage.setItem("cti_color_mode", isLightMode ? "light" : "dark");
  } catch (e) {}
  syncColorModeButtons();
  if (currentData) {
    try {
      renderActiveRadarChart();
      renderActivityCharts();
    } catch (e) {}
  }
}

function syncColorModeButtons() {
  const btnLanding = document.getElementById("btnToggleColorModeLanding");
  const btnReport = document.getElementById("btnToggleColorModeReport");
  const labelHtml = isLightMode
    ? `<i class="fa-solid fa-moon text-indigo-500"></i> <span>다크 모드</span>`
    : `<i class="fa-solid fa-sun text-[#f5b73d]"></i> <span>화이트 모드</span>`;
  if (btnLanding) btnLanding.innerHTML = labelHtml;
  if (btnReport) btnReport.innerHTML = labelHtml;
}

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

// CTI 캐릭터 데이터 조회 헬퍼
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
  return `<span class="px-2.5 py-0.5 rounded-full text-xs font-black border inline-block ${extraClass}" style="background-color: ${s.bg}; color: ${s.text}; border-color: ${s.border};">${cti}</span>`;
}

// 초기화
document.addEventListener("DOMContentLoaded", () => {
  initColorMode();
  setupMainDragAndDrop();
  renderLandingEncyclopedia();
  initInteractiveEffects();
});

// 마우스 커서 추적 스포트라이트 및 3D 홀로그램 틸트 인터랙션
function initInteractiveEffects() {
  if (window.__ctiInteractiveBound) return;
  window.__ctiInteractiveBound = true;

  document.addEventListener("pointermove", (e) => {
    const cards = document.querySelectorAll(".bento-card, .theme-card, #mainDropZone");
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      if (card.offsetParent === null) continue;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);
    }

    const tiltTarget = e.target.closest ? e.target.closest(".tilt-card-3d") : null;
    document.querySelectorAll(".tilt-card-3d").forEach((el) => {
      if (el !== tiltTarget) {
        el.style.transform = "perspective(1100px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
      }
    });
    if (tiltTarget && window.innerWidth >= 768) {
      const rect = tiltTarget.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width;
      const relY = (e.clientY - rect.top) / rect.height;
      const rotateY = (relX - 0.5) * 8;
      const rotateX = (0.5 - relY) * 8;
      tiltTarget.style.transform = `perspective(1100px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.01, 1.01, 1.01)`;
      tiltTarget.style.setProperty("--glare-x", `${(relX * 100).toFixed(1)}%`);
      tiltTarget.style.setProperty("--glare-y", `${(relY * 100).toFixed(1)}%`);
    }
  }, { passive: true });
}

// 숫자 카운트업 애니메이션 헬퍼
function animateValue(el, endValue, suffix = "", duration = 750, formatComma = false) {
  if (!el) return;
  const num = Number(endValue);
  if (isNaN(num)) {
    el.innerText = `${endValue}${suffix}`;
    return;
  }
  const startTime = performance.now();
  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(num * eased);
    el.innerText = `${formatComma ? current.toLocaleString() : current}${suffix}`;
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      el.innerText = `${formatComma ? num.toLocaleString() : num}${suffix}`;
    }
  }
  requestAnimationFrame(step);
}

// 메인 화면 드래그 앤 드롭 및 파일 인풋 연결
function setupMainDragAndDrop() {
  const dropZone = document.getElementById("mainDropZone");
  const fileInput = document.getElementById("mainFileInput");

  if (dropZone) {
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("border-[#f5b73d]/60", "bg-[#12141a]");
    });

    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("border-[#f5b73d]/60", "bg-[#12141a]");
    });

    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("border-[#f5b73d]/60", "bg-[#12141a]");
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
  if (!file) return;
  const lowerName = (file.name || "").toLowerCase();
  if (!lowerName.endsWith(".txt")) {
    showUploadError(
      "지원하지 않는 파일 확장자입니다 (.txt 파일만 가능)",
      `업로드하신 파일(${file.name})은 텍스트 파일이 아닙니다. 카카오톡 채팅방 설정의 [대화 내용 내보내기]를 통해 저장된 .txt 파일을 업로드해 주세요.`
    );
    return;
  }

  hideUploadError();
  const loadingOverlay = document.getElementById("loadingOverlay");
  const loadingSubText = document.getElementById("loadingSubText");
  if (loadingOverlay) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    if (loadingSubText) {
      loadingSubText.innerText = `파일 크기: ${sizeMb}MB • 전체 대화 전문을 100% 분석 중입니다.`;
    }
    loadingOverlay.classList.remove("hidden");
  }

  const reader = new FileReader();
  reader.onload = function(evt) {
    setTimeout(() => {
      try {
        const text = evt.target.result;
        if (!text || text.trim().length < 10) {
          throw new Error("파일 내용이 비어 있거나 너무 짧습니다.");
        }
        const report = window.KAKAO_PARSER.parseText(text);
        if (!report || !Array.isArray(report.members) || report.members.length === 0 || !report.totalMessages) {
          throw new Error("카카오톡 대화 내역 패턴(날짜·시간·발화자)을 찾을 수 없습니다.");
        }
        report.roomName = file.name.replace(/\.txt$/i, "").replace("KakaoTalk_", "카톡 대화방 ");
        report.lockedMode = selectedAnalysisMode;
        
        isSampleMode = false;
        cachedRawText = text;
        cachedFileName = file.name;
        originalDataCache = JSON.parse(JSON.stringify(report));
        isAnonymized = false;
        isNameMasked = false;
        currentData = buildDisplayDataFromCache(false);
        focusedMemberId = null;
        selectedRomancePair = [0, 1];
        currentRomanceSubTab = "summary";
        currentVillainSubTab = "ranking";
        villainGameSelectedMember = null;
        updateAnonymizeButtonText();

        showReportView();
        renderCurrentData();
        triggerConfetti();
      } catch (err) {
        showUploadError(
          "카카오톡 대화 내보내기 형식이 아닙니다",
          `${err.message || "유효한 카카오톡 대화 패턴을 인식하지 못했습니다."} 일반 메모 파일이 아닌 카카오톡 앱의 [대화 내용 내보내기] 기능으로 추출한 원본 .txt 파일인지 확인해 주세요.`
        );
        console.error(err);
      } finally {
        if (loadingOverlay) loadingOverlay.classList.add("hidden");
      }
    }, 50);
  };
  reader.readAsText(file, "UTF-8");
}

function getSampleDataByMode(mode) {
  if (mode === "romance" && window.SAMPLE_ROMANCE_DATA) {
    return window.SAMPLE_ROMANCE_DATA;
  }
  if (mode === "villain" && window.SAMPLE_VILLAIN_DATA) {
    return window.SAMPLE_VILLAIN_DATA;
  }
  return window.SAMPLE_REPORT_DATA;
}

function loadSampleDemo(event) {
  if (event) event.stopPropagation();
  hideUploadError();
  isSampleMode = true;
  cachedRawText = null;
  cachedFileName = null;
  const targetSample = getSampleDataByMode(selectedAnalysisMode);
  const sampleCopy = JSON.parse(JSON.stringify(targetSample));
  sampleCopy.lockedMode = selectedAnalysisMode;
  originalDataCache = JSON.parse(JSON.stringify(sampleCopy));
  isAnonymized = false;
  isNameMasked = false;
  currentData = buildDisplayDataFromCache(false);
  focusedMemberId = null;
  selectedRomancePair = [0, 1];
  currentRomanceSubTab = "summary";
  currentVillainSubTab = "ranking";
  villainGameSelectedMember = null;
  updateAnonymizeButtonText();

  showReportView();
  renderCurrentData();
  triggerConfetti();
}

// 결과 화면에서 재업로드 없이 분석 모드 즉시 전환
function switchReportMode(mode) {
  if (!mode || !currentData) return;
  selectedAnalysisMode = mode;
  selectAnalysisMode(mode);

  if (isSampleMode) {
    const targetSample = getSampleDataByMode(mode);
    const sampleCopy = JSON.parse(JSON.stringify(targetSample));
    sampleCopy.lockedMode = mode;
    originalDataCache = JSON.parse(JSON.stringify(sampleCopy));
  } else if (originalDataCache) {
    originalDataCache.lockedMode = mode;
  } else if (cachedRawText && window.KAKAO_PARSER) {
    const report = window.KAKAO_PARSER.parseText(cachedRawText);
    report.roomName = (cachedFileName || "카톡 대화방").replace(/\.txt$/i, "").replace("KakaoTalk_", "카톡 대화방 ");
    report.lockedMode = mode;
    originalDataCache = JSON.parse(JSON.stringify(report));
  }

  currentData = buildDisplayDataFromCache(isNameMasked);
  if (currentData) {
    currentData.lockedMode = mode;
    currentData.lockedAnalysisMode = mode;
  }
  focusedMemberId = null;
  selectedRomancePair = [0, 1];
  currentRomanceSubTab = "summary";
  currentVillainSubTab = "ranking";
  villainGameSelectedMember = null;

  updateReportModeSwitcherUI(mode);
  renderCurrentData();
  returnToReportHome();

  const modeNames = {
    chemistry: "모드 1 • 단톡방 전체 케미 분석",
    romance: "모드 2 • 썸·연인 1:1 애정도 정밀 진단",
    villain: "모드 3 • 조별과제 빌런·무임승차 탐지"
  };
  showToast(`${modeNames[mode] || "선택한 모드"} 리포트로 즉시 전환되었습니다`, "fa-wand-magic-sparkles");
}

function updateReportModeSwitcherUI(activeMode) {
  const modes = [
    { key: "chemistry", activeClass: "bg-[#f5b73d] text-[#030708] shadow-sm font-extrabold", inactiveClass: "text-[#848c96] hover:text-[#f6f8fa] font-bold" },
    { key: "romance", activeClass: "bg-[#ec4899] text-white shadow-sm font-extrabold", inactiveClass: "text-[#848c96] hover:text-[#f6f8fa] font-bold" },
    { key: "villain", activeClass: "bg-[#10b981] text-[#030708] shadow-sm font-extrabold", inactiveClass: "text-[#848c96] hover:text-[#f6f8fa] font-bold" }
  ];
  modes.forEach(({ key, activeClass, inactiveClass }) => {
    const btn = document.getElementById(`reportModeBtn_${key}`);
    if (!btn) return;
    btn.className = `px-2.5 py-1 rounded-full text-[11px] transition flex items-center gap-1 ${key === activeMode ? activeClass : inactiveClass}`;
  });
}

function handleHeaderHomeClick() {
  if (currentData) {
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
  // 새 파일이나 다른 모드를 선택할 수 있도록 현재 분석 잠금 해제
  currentData = null;
  originalDataCache = null;
  const fileInput = document.getElementById("mainFileInput");
  if (fileInput) fileInput.value = "";

  const landingView = document.getElementById("landingView");
  const reportView = document.getElementById("reportView");
  if (landingView) landingView.classList.remove("hidden");
  if (reportView) reportView.classList.add("hidden");
  
  const navReportActions = document.getElementById("navReportActions");
  if (navReportActions) {
    navReportActions.classList.add("hidden");
    navReportActions.classList.remove("flex");
  }
  const navUploadBtn = document.getElementById("navUploadBtn");
  if (navUploadBtn) navUploadBtn.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showReportView() {
  const landingView = document.getElementById("landingView");
  const reportView = document.getElementById("reportView");
  if (landingView) landingView.classList.add("hidden");
  if (reportView) reportView.classList.remove("hidden");
  
  const navReportActions = document.getElementById("navReportActions");
  if (navReportActions) {
    navReportActions.classList.remove("hidden");
    navReportActions.classList.add("flex");
  }
  const navUploadBtn = document.getElementById("navUploadBtn");
  if (navUploadBtn) navUploadBtn.classList.add("hidden");
  
  returnToReportHome();
}

// CTI 4대 지표 토글 상태 및 함수
let isCtiGuideExpanded = false;
function toggleCtiGuide() {
  const content = document.getElementById("ctiGuideContent");
  const icon = document.getElementById("ctiGuideToggleIcon");
  if (!content) return;
  isCtiGuideExpanded = !isCtiGuideExpanded;
  if (isCtiGuideExpanded) {
    content.classList.remove("hidden");
    if (icon) icon.className = "fa-solid fa-chevron-up text-[#f5b73d] transition-transform duration-300";
  } else {
    content.classList.add("hidden");
    if (icon) icon.className = "fa-solid fa-chevron-down text-[#f5b73d] transition-transform duration-300";
  }
}

// 16가지 성향 도감 토글 상태 및 함수
let isEncyclopediaGuideExpanded = false;
function toggleEncyclopediaGuide() {
  const container = document.getElementById("encyclopediaGuideContainer");
  const icon = document.getElementById("encyclopediaToggleIcon");
  if (!container) return;
  isEncyclopediaGuideExpanded = !isEncyclopediaGuideExpanded;
  if (isEncyclopediaGuideExpanded) {
    container.classList.remove("hidden");
    if (icon) icon.className = "fa-solid fa-chevron-up text-[#38bdf8] transition-transform duration-300";
    renderLandingEncyclopedia();
  } else {
    container.classList.add("hidden");
    if (icon) icon.className = "fa-solid fa-chevron-down text-[#38bdf8] transition-transform duration-300";
  }
}

// 테마 프리셋 시스템: 웜 앰버 (노 보더) 기본 설정
let currentThemePreset = "warm";
function setThemePreset(theme) {
  currentThemePreset = theme;
  const reportView = document.getElementById("reportView");
  if (!reportView) return;

  reportView.classList.remove("theme-obsidian", "theme-warm", "theme-glass");
  reportView.classList.add(`theme-${theme}`);
}

function initThemePreset() {
  setThemePreset("warm");
}

// 세부 리포트 진입 및 탭 전환: 대시보드 숨기고 해당 세부 내용 및 상단 세그먼트 탭 동기화
function openReportDetail(tabId, targetIndex = null) {
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

  // 상단 세그먼트 탭 독 활성 스타일 동기화
  document.querySelectorAll(".detail-tab-btn").forEach(btn => {
    const isTarget = btn.getAttribute("data-tab") === tabId;
    btn.className = `detail-tab-btn px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
      isTarget
        ? "bg-[#f5b73d] text-[#060608] shadow-[0_2px_12px_rgba(245,183,61,0.3)] font-black"
        : "text-[#8e929f] hover:text-[#f4f4f6] hover:bg-white/[0.04]"
    }`;
  });

  // 모든 세부 탭 숨김 후 대상 탭 노출
  document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
  const targetTab = document.getElementById(tabId);
  if (targetTab) targetTab.classList.remove("hidden");

  if (tabId === "tabCharacters") {
    if (typeof targetIndex === "number" && currentData && currentData.members) {
      currentCharDeckIndex = Math.max(0, Math.min(targetIndex, currentData.members.length - 1));
    }
    renderCharacterCards(false);
    setTimeout(renderActiveRadarChart, 50);
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

  // 샘플 데이터 등 academicMetrics가 없는 경우에도 학술 논문 지표 자동 산출 보장
  if (!currentData.academicMetrics && window.KAKAO_PARSER && typeof window.KAKAO_PARSER.computeAcademicMetrics === "function") {
    currentData.academicMetrics = window.KAKAO_PARSER.computeAcademicMetrics(currentData);
  }

  const titleEl = document.getElementById("roomTitle");
  if (titleEl) titleEl.innerText = currentData.roomName;
  const gradeEl = document.getElementById("roomGradeBadge");
  if (gradeEl) gradeEl.innerText = `우정 ${currentData.groupGrade}`;
  const subEl = document.getElementById("roomSubText");
  if (subEl) subEl.innerText = `${currentData.dateRange} • 총 ${currentData.totalMessages.toLocaleString()}건 분석`;

  initMyMember();
  initThemePreset();
  renderMyProfileBanner();
  renderModeDedicatedDashboard();
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
  renderModeDedicatedDashboard();
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
  renderModeDedicatedDashboard();
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
      statusBadge.className = "text-[10px] px-2.5 py-0.5 rounded-full bg-[#f5b73d] text-[#060608] font-black whitespace-nowrap shadow-sm";
      statusBadge.innerHTML = `<i class="fa-solid fa-crown text-[9px]"></i> 나 설정됨`;
    }
    if (titleEl) {
      titleEl.innerHTML = `<span class="text-[#f5b73d] font-black">${me.name}</span> <span class="text-[11px] text-[#8e929f]">(${me.cti})</span>`;
    }
    if (container) {
      container.innerHTML = `
        <button onclick="changeMyMemberPrompt()" class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#12141a] hover:bg-[#191c24] text-[#8e929f] hover:text-[#f4f4f6] border border-white/[0.1] transition flex items-center gap-1 cursor-pointer whitespace-nowrap">
          <i class="fa-solid fa-arrows-rotate text-[9px]"></i> <span>변경</span>
        </button>
      `;
    }
  } else {
    if (statusBadge) {
      statusBadge.className = "text-[10px] px-2.5 py-0.5 rounded-full bg-[#f5b73d]/15 text-[#f5b73d] border border-[#f5b73d]/35 font-bold whitespace-nowrap";
      statusBadge.innerHTML = `<i class="fa-solid fa-hand-pointer text-[9px]"></i> 나 선택`;
    }
    if (titleEl) {
      titleEl.innerText = "본인을 클릭하세요:";
    }
    if (container) {
      container.innerHTML = "";
      currentData.members.forEach(m => {
        const charInfo = getCharData(m.cti);
        const btn = document.createElement("button");
        btn.className = "px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#12141a] hover:bg-[#f5b73d] text-[#f4f4f6] hover:text-[#060608] border border-white/[0.1] hover:border-[#f5b73d] transition flex items-center gap-1 cursor-pointer whitespace-nowrap shadow-sm";
        btn.innerHTML = `
          <img src="${charInfo.img}" class="w-3.5 h-3.5 object-contain shrink-0">
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
        ? 'bg-[#f5b73d] text-[#060608] border-[#f5b73d] shadow-[0_4px_14px_rgba(245,183,61,0.3)] scale-105' 
        : 'bg-[#12141a] text-[#f4f4f6] hover:bg-[#191c24] border-white/[0.08]'
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
  if (personaEl) personaEl.innerText = `${m.timePersona || '활동가'}`;

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
        item.className = "theme-sub-card rounded-2xl p-3.5 flex items-center justify-between gap-2";
        item.innerHTML = `
          <div class="flex items-center gap-2.5">
            <span class="text-base font-bold text-white">${otherName}</span>
            ${getCtiBadgeHtml(otherType)}
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-[#f5b73d]">${p.score}점 (${p.grade}급)</span>
            <span class="text-[11px] text-white/70">티키타카 ${p.replies.toLocaleString()}회</span>
          </div>
        `;
        pairListContainer.appendChild(item);
      });
    } else {
      pairListContainer.innerHTML = `<p class="text-xs text-white/70 py-3 text-center col-span-2">단톡방 내 1:1 상호작용 데이터가 부족합니다.</p>`;
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

// [핵심] 랜딩 페이지 모드별 CTI 도감 토글 관리 (인원별 프리뷰 독은 제거됨)
function updateLandingPreviewDock(mode) {
  const ctiGuide = document.getElementById("landingCtiGuideSection");
  if (ctiGuide) {
    if (mode === "chemistry") {
      ctiGuide.classList.remove("hidden");
    } else {
      ctiGuide.classList.add("hidden");
    }
  }
}

// [핵심] 분석 전 모드 선택 컨트롤러 (한 번 분석된 파일에서는 다른 모드로 전환 불가!)
function selectPreAnalysisMode(mode) {
  if (!["chemistry", "romance", "villain"].includes(mode)) return;

  // 이미 파일 분석이 완료되어 결과 화면이 열려 있다면 모드 전환을 차단합니다.
  const reportView = document.getElementById("reportView");
  if (currentData && reportView && !reportView.classList.contains("hidden")) {
    return;
  }

  selectedAnalysisMode = mode;

  const modeMeta = {
    chemistry: {
      cite: "선택된 모드: 🔥 단톡방 전체 케미 (다른 모드는 새 파일 열기에서 다시 분석)",
      heroLine1: `<span class="inline-block whitespace-nowrap">우리 단톡방, <span class="bg-gradient-to-r from-[#fde68a] via-[#f5b73d] to-[#f59e0b] bg-clip-text text-transparent">누가 제일 잘 통할까?</span></span>`,
      heroLine2: "카톡으로 보는 찐친 궁합 & 16종 캐릭터",
      heroDesc: `원하는 <strong class="text-[#f4f4f6] font-bold">분석 모드</strong>를 고르고 <strong class="text-[#f5b73d] font-bold">카톡 대화 파일(.txt)</strong>만 올리면 3초 만에 결과가 나옵니다.`,
      badgeHtml: `<i class="fa-solid fa-fire text-[11px]"></i><span>STEP 2 • 단톡방 전체 케미 모드로 분석 시작</span>`,
      badgeClass: "inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-[#f5b73d]/12 text-[#f5b73d] border border-[#f5b73d]/25 tracking-wide",
      headline: "여기에 단톡방 대화 파일(.txt)을 끌어다 놓거나 버튼을 눌러 열기",
      subline: "대화 파일을 올리면 누가 가장 잘 통하는지 한눈에 보기 쉽게 정리해 드립니다",
      btnClass: "w-full py-4 sm:py-4.5 px-8 bg-gradient-to-b from-[#f7c14d] to-[#eaa829] hover:from-[#f9ca63] hover:to-[#f5b73d] text-[#060608] font-black text-base sm:text-lg rounded-2xl transition-all duration-200 shadow-[0_10px_30px_rgba(245,183,61,0.32),inset_0_1px_0_0_rgba(255,255,255,0.45)] flex items-center justify-center gap-2.5 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer",
      iconClass: "fa-solid fa-fire",
      accentColor: "#f5b73d"
    },
    romance: {
      cite: "선택된 모드: 💕 썸·연인 1:1 애정도 (다른 모드는 새 파일 열기에서 다시 분석)",
      heroLine1: `<span class="inline-block whitespace-nowrap">우리 둘 사이, <span class="bg-gradient-to-r from-pink-300 via-rose-400 to-amber-300 bg-clip-text text-transparent">누가 더 좋아할까?</span></span>`,
      heroLine2: "카톡으로 보는 1:1 호감도 & 숨겨진 속마음",
      heroDesc: `원하는 <strong class="text-[#f4f4f6] font-bold">분석 모드</strong>를 고르고 <strong class="text-pink-400 font-bold">카톡 대화 파일(.txt)</strong>만 올리면 3초 만에 결과가 나옵니다.`,
      badgeHtml: `<i class="fa-solid fa-heart text-[11px]"></i><span>STEP 2 • 썸·연인 1:1 애정도 모드로 분석 시작</span>`,
      badgeClass: "inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-pink-500/15 text-pink-300 border border-pink-400/35 tracking-wide",
      headline: "썸남·썸녀·연인과의 1:1 카톡 대화 파일(.txt)을 여기에 올려주세요",
      subline: "답장 속도와 선톡 비율로 누가 더 좋아하는지, 숨겨진 속마음까지 바로 알려드립니다",
      btnClass: "w-full py-4 sm:py-4.5 px-8 bg-gradient-to-b from-pink-400 to-rose-500 hover:from-pink-300 hover:to-rose-400 text-[#060608] font-black text-base sm:text-lg rounded-2xl transition-all duration-200 shadow-[0_10px_30px_rgba(244,114,182,0.32),inset_0_1px_0_0_rgba(255,255,255,0.45)] flex items-center justify-center gap-2.5 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer",
      iconClass: "fa-solid fa-heart-pulse",
      accentColor: "#f472b6"
    },
    villain: {
      cite: "선택된 모드: 🚨 조별과제 빌런 탐지 (다른 모드는 새 파일 열기에서 다시 분석)",
      heroLine1: `<span class="inline-block whitespace-nowrap">우리 조 단톡방, <span class="bg-gradient-to-r from-emerald-300 via-teal-400 to-rose-400 bg-clip-text text-transparent">누가 무임승차 빌런일까?</span></span>`,
      heroLine2: "카톡으로 보는 과제 기여도 시상식 & 빌런 참교육",
      heroDesc: `원하는 <strong class="text-[#f4f4f6] font-bold">분석 모드</strong>를 고르고 <strong class="text-emerald-400 font-bold">카톡 대화 파일(.txt)</strong>만 올리면 3초 만에 결과가 나옵니다.`,
      badgeHtml: `<i class="fa-solid fa-radar text-[11px]"></i><span>STEP 2 • 조별과제 빌런 탐지 모드로 분석 시작</span>`,
      badgeClass: "inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-400/35 tracking-wide",
      headline: "조별과제·팀플 단톡방 대화 파일(.txt)을 여기에 올려주세요",
      subline: "하드캐리 조원 시상식대부터 바닥 기는 무임승차 빌런 참교육까지 한눈에 판독합니다",
      btnClass: "w-full py-4 sm:py-4.5 px-8 bg-gradient-to-b from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-[#060608] font-black text-base sm:text-lg rounded-2xl transition-all duration-200 shadow-[0_10px_30px_rgba(52,211,153,0.3),inset_0_1px_0_0_rgba(255,255,255,0.45)] flex items-center justify-center gap-2.5 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer",
      iconClass: "fa-solid fa-user-secret",
      accentColor: "#34d399"
    }
  };

  const meta = modeMeta[mode];

  // 1. 랜딩 페이지 슬림 카드 3종 활성 스타일 업데이트
  const cardConfigs = [
    { key: "chemistry", activeBg: "from-[#f5b73d]/18 via-[#141722] to-[#0c0e14] border-2 border-[#f5b73d] shadow-[0_12px_35px_rgba(245,183,61,0.2)]", badgeColor: "bg-[#f5b73d] text-[#060608]" },
    { key: "romance", activeBg: "from-pink-500/18 via-[#171320] to-[#0c0e14] border-2 border-pink-400 shadow-[0_12px_35px_rgba(244,114,182,0.22)]", badgeColor: "bg-pink-400 text-[#060608]" },
    { key: "villain", activeBg: "from-emerald-500/18 via-[#111a1b] to-[#0c0e14] border-2 border-emerald-400 shadow-[0_12px_35px_rgba(52,211,153,0.2)]", badgeColor: "bg-emerald-400 text-[#060608]" }
  ];

  cardConfigs.forEach(cfg => {
    const cardEl = document.getElementById(`modeCard_${cfg.key}`);
    if (!cardEl) return;
    const badgeEl = cardEl.querySelector(".mode-check-badge");
    if (cfg.key === mode) {
      cardEl.className = `text-left rounded-2xl px-4 py-3.5 transition-all duration-300 relative overflow-hidden group cursor-pointer bg-gradient-to-br ${cfg.activeBg} flex items-center justify-between gap-2.5`;
      if (badgeEl) {
        badgeEl.className = `mode-check-badge text-[10px] font-black px-2 py-0.5 rounded-full ${cfg.badgeColor} shrink-0`;
        badgeEl.innerText = "선택됨";
      }
    } else {
      cardEl.className = "text-left rounded-2xl px-4 py-3.5 transition-all duration-300 relative overflow-hidden group cursor-pointer bg-[#101219]/90 hover:bg-[#151822] border border-white/[0.08] hover:border-white/[0.2] flex items-center justify-between gap-2.5";
      if (badgeEl) {
        badgeEl.className = "mode-check-badge text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/[0.06] text-[#8e929f] shrink-0";
        badgeEl.innerText = "선택";
      }
    }
  });

  // 2. 랜딩 페이지 히어로 & 드롭존 실시간 반영
  const citeEl = document.getElementById("selectedModeAcademicCite");
  if (citeEl) citeEl.innerText = meta.cite;
  const line1El = document.getElementById("landingHeroTitleLine1");
  if (line1El) line1El.innerHTML = meta.heroLine1;
  const line2El = document.getElementById("landingHeroTitleLine2");
  if (line2El) line2El.innerText = meta.heroLine2;
  const descEl = document.getElementById("landingHeroDesc");
  if (descEl) descEl.innerHTML = meta.heroDesc;
  const dzBadge = document.getElementById("dropZoneModeBadge");
  if (dzBadge) {
    dzBadge.className = meta.badgeClass;
    dzBadge.innerHTML = meta.badgeHtml;
  }
  const dzHeadline = document.getElementById("dropZoneHeadline");
  if (dzHeadline) dzHeadline.innerText = meta.headline;
  const dzSubline = document.getElementById("dropZoneSubline");
  if (dzSubline) dzSubline.innerText = meta.subline;
  const dzBtn = document.getElementById("dropZonePrimaryBtn");
  if (dzBtn) dzBtn.className = meta.btnClass;
  const dzIcon = document.getElementById("dropZoneMainIcon");
  if (dzIcon) dzIcon.className = meta.iconClass;

  updateLandingPreviewDock(mode);
}

// 썸·연인 모드 비교 대상 커플 A, B 변경 핸들러
function setRomancePairMember(slotIndex, memberIndex) {
  const idx = Number(memberIndex);
  if (isNaN(idx) || !currentData || !currentData.members) return;
  selectedRomancePair[slotIndex] = idx;
  if (selectedRomancePair[0] === selectedRomancePair[1] && currentData.members.length > 1) {
    selectedRomancePair[1 - slotIndex] = (idx + 1) % currentData.members.length;
  }
  renderModeDedicatedDashboard();
}

// 썸·연인 모드 서브 탭 전환 핸들러
function setRomanceSubTab(tab) {
  currentRomanceSubTab = tab;
  renderModeDedicatedDashboard();
}

// 썸·연인 모드 탭 3: 차마 못 물어본 질문 6선 말풍선 선택 상태 및 토글(ON/OFF) 핸들러
let selectedUnspokenQuestionIdx = 0;
function selectUnspokenQuestion(idx) {
  const parsed = Number(idx);
  if (isNaN(parsed) || parsed < 0 || selectedUnspokenQuestionIdx === parsed) {
    selectedUnspokenQuestionIdx = -1; // 같은 말풍선을 다시 누르면 끄기(OFF)
  } else {
    selectedUnspokenQuestionIdx = parsed; // 새 말풍선을 누르면 켜기(ON)
  }
  renderModeDedicatedDashboard();
}

// 조별과제 빌런 모드 서브 탭 전환 핸들러
function setVillainSubTab(tab) {
  currentVillainSubTab = tab;
  renderModeDedicatedDashboard();
}

// 조별과제 빌런 순위 정렬 기준 변경 핸들러
function setVillainRankSort(sortType) {
  currentVillainSort = sortType;
  renderModeDedicatedDashboard();
}

// 조별과제 빌런 표현 수위(매운맛/순한맛) 토글 핸들러
function setVillainSpiceMode(isMild) {
  isVillainMildMode = Boolean(isMild);
  renderModeDedicatedDashboard();
  showToast(
    isVillainMildMode
      ? "🌱 순한맛(평화 모드)으로 전환되었습니다 • 단톡방 공유용 순화 표현이 적용됩니다"
      : "🌶️ 매운맛(팩폭 모드)으로 전환되었습니다 • 직설적인 팩트 폭격 표현이 적용됩니다",
    isVillainMildMode ? "fa-seedling" : "fa-pepper-hot",
    isVillainMildMode ? "#10b981" : "#f43f5e"
  );
}

// [핵심] 선택된 모드 전용으로 리포트를 렌더링 (다른 분석 모드로 보려면 새 파일 열기로 다시 분석)
function renderModeDedicatedDashboard() {
  const container = document.getElementById("modeDedicatedViewContainer");
  if (!container || !currentData) return;

  if (!currentData.academicMetrics && window.KAKAO_PARSER && typeof window.KAKAO_PARSER.computeAcademicMetrics === "function") {
    currentData.academicMetrics = window.KAKAO_PARSER.computeAcademicMetrics(currentData);
  }

  const activeMode = currentData.lockedAnalysisMode || currentData.lockedMode || selectedAnalysisMode;
  selectedAnalysisMode = activeMode;
  updateReportModeSwitcherUI(activeMode);

  const lineupSection = document.getElementById("overviewMemberLineupSection");
  const deepDiveSection = document.getElementById("deepDiveWrapper");
  const myProfileBanner = document.getElementById("myProfileBanner");
  const headerIconBox = document.getElementById("reportHeaderIconBox");
  const headerTitleText = document.getElementById("reportHeaderTitleText");
  const btnSharePhotocard = document.getElementById("btnSharePhotocard");
  const lockedBanner = document.getElementById("lockedReportModeBanner");

  if (btnSharePhotocard) btnSharePhotocard.classList.remove("hidden");

  if (activeMode === "romance") {
    if (lineupSection) lineupSection.classList.add("hidden");
    if (deepDiveSection) deepDiveSection.classList.add("hidden");
    if (myProfileBanner) myProfileBanner.classList.add("hidden");
    if (headerIconBox) {
      headerIconBox.className = "w-8 h-8 rounded-xl bg-pink-500/15 border border-pink-400/35 flex items-center justify-center text-sm text-pink-300 group-hover:bg-pink-400 group-hover:text-[#060608] transition-all";
      headerIconBox.innerHTML = `<i class="fa-solid fa-heart-pulse"></i>`;
    }
    if (headerTitleText) {
      headerTitleText.innerHTML = `
        1:1 썸·연인 <span class="text-pink-400">애정도 &amp; 속마음</span> 분석 리포트
      `;
    }
    if (lockedBanner) {
      lockedBanner.className = "px-4 py-2 rounded-full text-xs font-bold flex flex-wrap items-center gap-2 bg-pink-500/15 text-pink-300 border border-pink-400/40";
      lockedBanner.innerHTML = `
        <span class="px-2.5 py-0.5 rounded-full bg-pink-400 text-[#060608] font-black flex items-center gap-1">
          <i class="fa-solid fa-heart text-[10px]"></i> 💕 1:1 썸·연인 애정도 분석
        </span>
        <span class="text-[#a8b0c2] text-[11px] hidden sm:inline">다른 분석 모드로 보려면 우측 상단 [새 파일 열기 / 모드 변경]에서 다시 분석해 주세요</span>
      `;
    }
    renderRomanceModeUI(container);
  } else if (activeMode === "villain") {
    if (lineupSection) lineupSection.classList.add("hidden");
    if (deepDiveSection) deepDiveSection.classList.add("hidden");
    if (myProfileBanner) myProfileBanner.classList.add("hidden");
    if (headerIconBox) {
      headerIconBox.className = "w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-400/35 flex items-center justify-center text-sm text-emerald-300 group-hover:bg-emerald-400 group-hover:text-[#060608] transition-all";
      headerIconBox.innerHTML = `<i class="fa-solid fa-user-secret"></i>`;
    }
    if (headerTitleText) {
      headerTitleText.innerHTML = `
        조별과제 <span class="text-emerald-400">기여도 순위 &amp; 빌런 탐지</span> 리포트
      `;
    }
    if (lockedBanner) {
      lockedBanner.className = "px-4 py-2 rounded-full text-xs font-bold flex flex-wrap items-center gap-2 bg-emerald-500/15 text-emerald-300 border border-emerald-400/40";
      lockedBanner.innerHTML = `
        <span class="px-2.5 py-0.5 rounded-full bg-emerald-400 text-[#060608] font-black flex items-center gap-1">
          <i class="fa-solid fa-user-secret text-[10px]"></i> 🚨 조별과제 빌런 탐지 분석
        </span>
        <span class="text-[#a8b0c2] text-[11px] hidden sm:inline">다른 분석 모드로 보려면 우측 상단 [새 파일 열기 / 모드 변경]에서 다시 분석해 주세요</span>
      `;
    }
    renderVillainModeUI(container);
  } else {
    if (lineupSection) lineupSection.classList.remove("hidden");
    if (deepDiveSection) deepDiveSection.classList.remove("hidden");
    if (myProfileBanner) myProfileBanner.classList.remove("hidden");
    if (headerIconBox) {
      headerIconBox.className = "w-8 h-8 rounded-xl bg-[#f5b73d]/15 border border-[#f5b73d]/30 flex items-center justify-center text-sm text-[#f5b73d] group-hover:bg-[#f5b73d] group-hover:text-[#060608] transition-all";
      headerIconBox.innerHTML = `<i class="fa-solid fa-comment-dots"></i>`;
    }
    if (headerTitleText) {
      headerTitleText.innerHTML = `
        단톡방 <span class="text-[#f5b73d]">전체 케미 &amp; 캐릭터</span> 리포트
      `;
    }
    if (lockedBanner) {
      lockedBanner.className = "px-4 py-2 rounded-full text-xs font-bold flex flex-wrap items-center gap-2 bg-[#f5b73d]/15 text-[#f5b73d] border border-[#f5b73d]/40";
      lockedBanner.innerHTML = `
        <span class="px-2.5 py-0.5 rounded-full bg-[#f5b73d] text-[#060608] font-black flex items-center gap-1">
          <i class="fa-solid fa-fire text-[10px]"></i> 🔥 단톡방 전체 케미 분석
        </span>
        <span class="text-[#a8b0c2] text-[11px] hidden sm:inline">다른 분석 모드로 보려면 우측 상단 [새 파일 열기 / 모드 변경]에서 다시 분석해 주세요</span>
      `;
    }
    renderChemistryModeUI(container);
  }
}

// ============================================================================
// [MODE 01] 🔥 단톡방 전체 케미 UI (이름과 핵심 결과를 한눈에 크게 강조)
// ============================================================================
function renderChemistryModeUI(container) {
  const members = currentData.members || [];
  const pairs = currentData.pairRankings || [];
  const topPair = pairs[0] || null;
  const topTalker = members[0] || { name: "-", msgRatio: 0, cti: "ELFA" };
  const acad = (currentData.academicMetrics && currentData.academicMetrics.chemistry) || {
    groupLsmScore: 88,
    turnTakingBalance: 84,
    groupCohesionIndex: 86
  };

  let p1 = members[0] || { name: "멤버A", cti: "ELFA" };
  let p2 = members[1] || members[0] || { name: "멤버B", cti: "ILTR" };
  if (topPair) {
    p1 = members.find(m => m.name === topPair.pair[0]) || p1;
    p2 = members.find(m => m.name === topPair.pair[1]) || p2;
  }
  const c1 = getCharData(p1.cti);
  const c2 = getCharData(p2.cti);
  const pairScore = topPair ? topPair.score : 95;
  const pairReplies = topPair ? topPair.replies : 0;
  const pairSummary = topPair ? topPair.summary : "말투와 리액션 호흡이 찰떡같이 맞아떨어지는 단톡방 최고의 단짝입니다.";

  container.innerHTML = `
    <div class="space-y-7">
      <!-- 1. 메인 결과 스포트라이트: 이름과 점수를 가장 크게! -->
      <div class="relative rounded-[36px] p-6 sm:p-9 bg-gradient-to-br from-[#161822]/90 via-[#0e1017]/95 to-[#090a0f] border border-white/[0.08] overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.65)]">
        <div class="absolute -top-24 -left-20 w-80 h-80 rounded-full bg-[#f5b73d]/12 blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-24 -right-20 w-80 h-80 rounded-full bg-sky-500/10 blur-3xl pointer-events-none"></div>

        <div class="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <!-- 좌측 7열: 단톡방 케미 점수 & 핵심 한 줄 결론 -->
          <div class="lg:col-span-7 space-y-4">
            <div class="flex flex-wrap items-center gap-2">
              <span class="px-3 py-1 rounded-full text-xs font-black bg-[#f5b73d] text-[#060608]">🔥 단톡방 전체 케미 분석 결과</span>
              <span class="px-3 py-1 rounded-full text-xs font-black bg-[#f5b73d]/15 text-[#f5b73d] border border-[#f5b73d]/35">우정 등급 ${currentData.groupGrade}</span>
            </div>

            <div class="space-y-1">
              <p class="text-xs sm:text-sm font-bold text-[#8e929f]">우리 단톡방 종합 케미 점수</p>
              <h3 class="text-3xl sm:text-5xl font-black text-[#f4f4f6] tracking-tight leading-tight">
                단톡방 케미 <span class="text-[#f5b73d]">${acad.groupCohesionIndex}점</span>
              </h3>
            </div>

            <p class="text-base sm:text-lg text-[#f4f4f6] font-bold leading-relaxed break-keep">
              ${currentData.groupVibe}
            </p>

            <!-- 직관적인 2열 지표 바 -->
            <div class="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-5 border-t border-white/[0.07]">
              <div class="space-y-1.5">
                <div class="flex items-center justify-between text-xs sm:text-sm">
                  <span class="text-[#d4d7e0] font-bold">말투·웃음 닮은 정도</span>
                  <span class=" font-black text-base text-[#f5b73d]">${acad.groupLsmScore}%</span>
                </div>
                <div class="w-full h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div class="h-full rounded-full bg-gradient-to-r from-[#f5b73d] to-amber-300" style="width: ${acad.groupLsmScore}%"></div>
                </div>
                <p class="text-xs text-[#8e929f]">서로 말투와 리액션 길이가 얼마나 비슷한지 보여줍니다</p>
              </div>

              <div class="space-y-1.5">
                <div class="flex items-center justify-between text-xs sm:text-sm">
                  <span class="text-[#d4d7e0] font-bold">골고루 대화에 참여한 정도</span>
                  <span class=" font-black text-base text-[#38bdf8]">${acad.turnTakingBalance}%</span>
                </div>
                <div class="w-full h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div class="h-full rounded-full bg-gradient-to-r from-[#38bdf8] to-indigo-400" style="width: ${acad.turnTakingBalance}%"></div>
                </div>
                <p class="text-xs text-[#8e929f]">소외되는 사람 없이 모두가 고르게 대화한 비율입니다</p>
              </div>
            </div>
          </div>

          <!-- 우측 5열: 최고의 단짝 1위 크게 강조 -->
          <div onclick="openReportDetail('tabChemistry')" class="lg:col-span-5 flex flex-col items-center justify-center text-center cursor-pointer group py-3 px-4 rounded-3xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] transition-all">
            <span class="text-xs font-black text-[#38bdf8] tracking-wide mb-3 flex items-center gap-1.5">
              <i class="fa-solid fa-bolt"></i> 이 방에서 가장 죽이 잘 맞는 단짝 1위
            </span>

            <div class="relative flex items-center justify-center">
              <div class="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-b from-[#1e2230] to-[#0d0f17] p-2.5 border-2 border-[#f5b73d]/60 shadow-[0_0_35px_rgba(245,183,61,0.2)] group-hover:scale-105 transition-transform z-10">
                <img src="${c1.img}" alt="${p1.name}" class="w-full h-full object-contain">
              </div>
              <div class="-ml-4 z-20 w-14 h-14 rounded-full bg-[#090a0f] border-2 border-[#38bdf8] flex flex-col items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.4)]">
                <span class="text-sm font-black text-[#38bdf8] leading-none">${pairScore}점</span>
              </div>
              <div class="-ml-4 w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-b from-[#1e2230] to-[#0d0f17] p-2.5 border-2 border-[#38bdf8]/60 shadow-[0_0_35px_rgba(56,189,248,0.2)] group-hover:scale-105 transition-transform z-10">
                <img src="${c2.img}" alt="${p2.name}" class="w-full h-full object-contain">
              </div>
            </div>

            <div class="mt-4 space-y-1.5">
              <div class="text-2xl sm:text-3xl font-black text-[#f4f4f6] group-hover:text-[#f5b73d] transition-colors">
                ${p1.name} ↔ ${p2.name}
              </div>
              <p class="text-xs sm:text-sm text-[#38bdf8] font-bold">서로 주고받은 대화 ${pairReplies.toLocaleString()}회 • ${topPair ? topPair.badge : "최강 단짝"}</p>
              <p class="text-xs text-[#8e929f] max-w-xs mx-auto line-clamp-2 pt-0.5">${pairSummary}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. 핵심 요약 4칸 (이름과 수치를 큼직하게!) -->
      <div class="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.08] bg-[#0d0f16]/80 rounded-3xl border border-white/[0.06] px-2 py-4">
        <div class="px-5 py-2 flex flex-col justify-between">
          <span class="text-xs text-[#8e929f] font-bold flex items-center gap-1.5"><i class="fa-solid fa-crown text-amber-300"></i> 가장 말을 많이 한 1위</span>
          <div class="flex items-baseline gap-2 mt-1.5">
            <span class="text-2xl sm:text-3xl font-black text-[#f4f4f6] truncate">${topTalker.name}</span>
            <span class="text-sm font-black text-[#f5b73d]">${topTalker.msgRatio}%</span>
          </div>
          <span class="text-xs text-[#8e929f] mt-1 truncate">먼저 말 걸기 ${topTalker.starters}회</span>
        </div>

        <div class="px-5 py-2 flex flex-col justify-between">
          <span class="text-xs text-[#8e929f] font-bold flex items-center gap-1.5"><i class="fa-solid fa-comments text-[#f5b73d]"></i> 전체 대화 수</span>
          <div class="flex items-baseline gap-1.5 mt-1.5">
            <span class="text-2xl sm:text-3xl font-black text-[#f4f4f6]">${currentData.totalMessages.toLocaleString()}</span>
            <span class="text-xs text-[#8e929f]">건</span>
          </div>
          <span class="text-xs text-[#8e929f] mt-1 truncate">${currentData.dateRange}</span>
        </div>

        <div class="px-5 py-2 flex flex-col justify-between">
          <span class="text-xs text-[#8e929f] font-bold flex items-center gap-1.5"><i class="fa-solid fa-dove text-emerald-400"></i> 단톡방 평화 지수</span>
          <div class="flex items-baseline gap-2 mt-1.5">
            <span class="text-2xl sm:text-3xl font-black text-emerald-400">${currentData.peaceIndex || (100 - currentData.tensionIndex)}%</span>
          </div>
          <span class="text-xs text-[#8e929f] mt-1 truncate">${currentData.tensionDesc}</span>
        </div>

        <div class="px-5 py-2 flex flex-col justify-between">
          <span class="text-xs text-[#8e929f] font-bold flex items-center gap-1.5"><i class="fa-solid fa-clock text-[#38bdf8]"></i> 가장 활발한 시간</span>
          <div class="flex items-baseline gap-2 mt-1.5">
            <span class="text-2xl sm:text-3xl font-black text-[#38bdf8]">${currentData.activity ? currentData.activity.peakWeekday : "금요일"} ${currentData.activity ? currentData.activity.peakHour : "22시"}</span>
          </div>
          <span class="text-xs text-[#8e929f] mt-1 truncate">대화가 가장 많이 터지는 시간</span>
        </div>
      </div>
    </div>
  `;
}

// ============================================================================
// [MODE 02] 💕 썸·연인 1:1 애정도 & 속마음 판독 리포트 UI (4개 서브 탭 분리형)
// ============================================================================
function renderRomanceModeUI(container) {
  const members = currentData.members || [];
  if (members.length === 0) return;

  const idxA = Math.min(selectedRomancePair[0] || 0, members.length - 1);
  const idxB = members.length > 1 ? Math.min(selectedRomancePair[1] || 1, members.length - 1) : 0;
  const mA = members[idxA];
  const mB = members[idxB];
  const cA = getCharData(mA.cti);
  const cB = getCharData(mB.cti);

  // 1. 1:1 말투·웃음·질문 닮은 정도 계산
  const lsmLen = 1 - Math.abs((mA.avgLen || 10) - (mB.avgLen || 10)) / ((mA.avgLen || 10) + (mB.avgLen || 10) + 0.1);
  const lsmLaugh = 1 - Math.abs(((mA.laughs || 1) / (mA.totalMsgs || 1)) - ((mB.laughs || 1) / (mB.totalMsgs || 1))) / (((mA.laughs || 1) / (mA.totalMsgs || 1)) + ((mB.laughs || 1) / (mB.totalMsgs || 1)) + 0.01);
  const lsmQ = 1 - Math.abs(((mA.questions || 1) / (mA.totalMsgs || 1)) - ((mB.questions || 1) / (mB.totalMsgs || 1))) / (((mA.questions || 1) / (mA.totalMsgs || 1)) + ((mB.questions || 1) / (mB.totalMsgs || 1)) + 0.01);
  const dyadicLsm = Math.min(99, Math.max(55, Math.round((lsmLen * 0.4 + lsmLaugh * 0.35 + lsmQ * 0.25) * 100)));

  const pairData = (currentData.pairRankings || []).find(p => p.pair.includes(mA.name) && p.pair.includes(mB.name));

  // 2. 답장 속도 비교 (1:1 페어 전용 답장 속도가 있으면 우선 반영 + 단톡방 평균 대비 '선택적 칼답' 편애 지수 감지)
  let speedA = Math.max(1, mA.replySpeed || 4);
  let speedB = Math.max(1, mB.replySpeed || 5);
  let fastRepliesA = 0;
  let fastRepliesB = 0;
  if (pairData && Array.isArray(pairData.pair)) {
    if (pairData.pair[0] === mA.name) {
      if (pairData.avgReply1to2) speedA = Math.max(1, pairData.avgReply1to2);
      if (pairData.avgReply2to1) speedB = Math.max(1, pairData.avgReply2to1);
      fastRepliesA = pairData.fastReplies1to2 || 0;
      fastRepliesB = pairData.fastReplies2to1 || 0;
    } else {
      if (pairData.avgReply2to1) speedA = Math.max(1, pairData.avgReply2to1);
      if (pairData.avgReply1to2) speedB = Math.max(1, pairData.avgReply1to2);
      fastRepliesA = pairData.fastReplies2to1 || 0;
      fastRepliesB = pairData.fastReplies1to2 || 0;
    }
  }
  const selectiveBoostA = (mA.replySpeed && mA.replySpeed > speedA) ? Math.round(((mA.replySpeed - speedA) / mA.replySpeed) * 100) : 0;
  const selectiveBoostB = (mB.replySpeed && mB.replySpeed > speedB) ? Math.round(((mB.replySpeed - speedB) / mB.replySpeed) * 100) : 0;

  const invSpeedA = 1 / speedA;
  const invSpeedB = 1 / speedB;
  const speedShareA = Math.round((invSpeedA / (invSpeedA + invSpeedB)) * 100);
  const speedShareB = 100 - speedShareA;

  // 3. 먼저 말 걸기, 메시지 길이, 질문·다정 어휘 비율
  const startA = Math.max(1, mA.starters || 1);
  const startB = Math.max(1, mB.starters || 1);
  const startShareA = Math.round((startA / (startA + startB)) * 100);
  const startShareB = 100 - startShareA;

  const lenA = Math.max(1, mA.avgLen || 15);
  const lenB = Math.max(1, mB.avgLen || 15);
  const lenShareA = Math.round((lenA / (lenA + lenB)) * 100);
  const lenShareB = 100 - lenShareA;

  const qAffA = Math.max(1, (mA.questions || 1) + (mA.affectionHits || 0) * 2);
  const qAffB = Math.max(1, (mB.questions || 1) + (mB.affectionHits || 0) * 2);
  const qShareA = Math.round((qAffA / (qAffA + qAffB)) * 100);
  const qShareB = 100 - qShareA;

  // 종합 마음 크기 비중 (누가 더 좋아하는가?)
  const totalInvestA = Math.round(startShareA * 0.3 + speedShareA * 0.25 + lenShareA * 0.2 + qShareA * 0.25);
  const totalInvestB = 100 - totalInvestA;
  const moreInLove = totalInvestA >= totalInvestB ? mA : mB;
  const lessInLove = totalInvestA >= totalInvestB ? mB : mA;
  const investDiff = Math.abs(totalInvestA - totalInvestB);

  const romanceScore = Math.min(99, Math.max(68, Math.round(dyadicLsm * 0.5 + (pairData ? pairData.score : 92) * 0.5)));

  // 한눈에 들어오는 관계 결론 타이틀 & 설명
  let stageBadge = "💞 서로 푹 빠진 연인·쌍방 호감";
  let bigConclusionTitle = `${mA.name} ♥ ${mB.name}, 서로 똑같이 좋아하는 쌍방 폴인럽!`;
  if (romanceScore >= 92 && investDiff <= 8) {
    stageBadge = "💞 완벽한 쌍방 호감";
    bigConclusionTitle = `${mA.name} ♥ ${mB.name}, 둘 다 서로에게 푹 빠져 있습니다!`;
  } else if (romanceScore >= 85 && investDiff > 8) {
    stageBadge = `💘 ${moreInLove.name}님의 직진 리드`;
    bigConclusionTitle = `지금은 '${moreInLove.name}'님이 ${investDiff}%p 더 적극적으로 표현하고 있어요!`;
  } else if (romanceScore >= 75) {
    stageBadge = "🌸 설레는 썸 상승기";
    bigConclusionTitle = `'${moreInLove.name}'님이 대화를 이끌며 호감도가 빠르게 올라가고 있어요!`;
  } else {
    stageBadge = "💭 온도 차 조율 필요";
    bigConclusionTitle = `'${moreInLove.name}'님이 더 많이 다가가는 중! 연락 템포를 맞춰보세요`;
  }

  let romanceVerdict = "";
  if (investDiff <= 6) {
    romanceVerdict = `두 사람의 마음 표현 비율이 <strong>${totalInvestA}% 대 ${totalInvestB}%</strong>로 거의 똑같습니다! 누가 한 명만 애타는 관계가 아니라 서로 연락 빈도와 답장 속도가 찰떡같이 맞물리는 이상적인 커플·쌍방 호감입니다.`;
  } else {
    romanceVerdict = `대화 기록을 보면 <strong>'${moreInLove.name}'</strong>님의 애정 표현 비중이 <strong>${Math.max(totalInvestA, totalInvestB)}%</strong>로 <strong>'${lessInLove.name}'</strong>님보다 <strong>${investDiff}%p 더 높습니다</strong>. 먼저 말을 걸거나 질문을 던지며 대화를 다정하게 이끌어가는 쪽은 '${moreInLove.name}'님입니다.`;
  }

  // 3인 이상 톡방일 때만 비교 대상 선택 드롭다운 표시
  const isStrictDyad = members.length <= 2;
  const optionsA = members.map((m, i) => `<option value="${i}" ${i === idxA ? "selected" : ""} class="bg-[#0e1017] text-white">${m.name}</option>`).join("");
  const optionsB = members.map((m, i) => `<option value="${i}" ${i === idxB ? "selected" : ""} class="bg-[#0e1017] text-white">${m.name}</option>`).join("");

  const topHeaderBarHtml = isStrictDyad
    ? `
      <div class="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 rounded-full bg-gradient-to-r from-pink-500/15 via-[#15111e] to-sky-500/15 border border-pink-400/30">
        <div class="flex items-center gap-2.5 text-xs sm:text-sm font-black text-pink-200">
          <span class="w-2.5 h-2.5 rounded-full bg-pink-400 animate-ping"></span>
          <span>1:1 썸·연인 애정도 &amp; 속마음 리포트</span>
        </div>
        <div class="flex items-center gap-3 text-sm">
          <span class="text-pink-300 font-black">${mA.name}</span>
          <span class="text-pink-400">♥</span>
          <span class="text-sky-300 font-black">${mB.name}</span>
          <span class="text-xs text-[#8e929f]">| 총 ${(currentData.totalMessages || 0).toLocaleString()}건 대화</span>
        </div>
      </div>
    `
    : `
      <div class="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 rounded-full bg-gradient-to-r from-pink-500/12 via-[#13111c] to-sky-500/12 border border-pink-400/25">
        <div class="flex items-center gap-2 text-xs font-bold text-pink-300">
          <i class="fa-solid fa-heart-circle-check"></i>
          <span>비교할 두 사람을 선택하세요</span>
        </div>
        <div class="flex items-center gap-2">
          <select onchange="setRomancePairMember(0, this.value)" class="px-3.5 py-1.5 rounded-full text-xs font-black bg-[#0c0e14] text-pink-300 border border-pink-400/40 focus:outline-none cursor-pointer">
            ${optionsA}
          </select>
          <span class="text-pink-400 font-black text-sm">♥</span>
          <select onchange="setRomancePairMember(1, this.value)" class="px-3.5 py-1.5 rounded-full text-xs font-black bg-[#0c0e14] text-sky-300 border border-sky-400/40 focus:outline-none cursor-pointer">
            ${optionsB}
          </select>
        </div>
      </div>
    `;

  // 서브 탭 네비게이션 바 (한 페이지에 모든 정보를 쏟아붓지 않고 4개 탭으로 분리!)
  const romanceTabs = [
    { key: "summary", icon: "fa-heart", label: "1. 누가 더 좋아할까?" },
    { key: "signals", icon: "fa-bolt", label: "2. 답장·선톡·말투 비교" },
    { key: "mind", icon: "fa-wand-magic-sparkles", label: "3. 숨겨진 속마음 & 못 물어본 질문" },
    { key: "highlights", icon: "fa-comments", label: "4. 실제 설렘 대화 & 조언" }
  ];

  const subTabNavHtml = `
    <div class="flex flex-wrap items-center gap-2 p-2 rounded-3xl bg-[#0d0f16]/95 border border-pink-400/25">
      ${romanceTabs.map(t => {
        const isActive = currentRomanceSubTab === t.key;
        return `
          <button onclick="setRomanceSubTab('${t.key}')" class="flex-1 min-w-[140px] py-3 px-4 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            isActive
              ? "bg-gradient-to-r from-pink-400 to-rose-400 text-[#060608] shadow-[0_4px_20px_rgba(244,114,182,0.35)]"
              : "bg-white/[0.03] hover:bg-white/[0.08] text-[#d4d7e0]"
          }">
            <i class="fa-solid ${t.icon}"></i>
            <span>${t.label}</span>
          </button>
        `;
      }).join("")}
    </div>
  `;

  // 시간대별 대화 비율
  const hourly = (currentData.activity && currentData.activity.hourly) ? currentData.activity.hourly : [35, 18, 8, 2, 1, 2, 9, 28, 64, 72, 68, 85, 94, 78, 72, 80, 88, 96, 112, 134, 156, 188, 245, 210];
  const totalHourly = Math.max(1, hourly.reduce((a, b) => a + b, 0));
  const lateNightSum = (hourly[22] || 0) + (hourly[23] || 0) + (hourly[0] || 0) + (hourly[1] || 0) + (hourly[2] || 0);
  const lateNightRatio = Math.min(68, Math.max(18, Math.round((lateNightSum / totalHourly) * 100)));
  const dayTimeSum = hourly.slice(9, 18).reduce((a, b) => a + b, 0);
  const dayTimeRatio = Math.round((dayTimeSum / totalHourly) * 100);
  const eveningRatio = Math.max(10, 100 - lateNightRatio - dayTimeRatio);

  const wordsA = (mA.topWords && mA.topWords.length > 0) ? mA.topWords.slice(0, 5) : [{ word: "보고싶어", count: 42 }, { word: "조심히", count: 31 }, { word: "밥먹었어?", count: 27 }];
  const wordsB = (mB.topWords && mB.topWords.length > 0) ? mB.topWords.slice(0, 5) : [{ word: "얼른보자", count: 39 }, { word: "고마워", count: 33 }, { word: "집가자", count: 24 }];

  // 서브 탭별 컨텐츠 생성
  let subTabBodyHtml = "";

  if (currentRomanceSubTab === "summary") {
    subTabBodyHtml = `
      <!-- 탭 1: 누가 더 좋아할까? (이름과 호감도 점수를 가장 크게!) -->
      <div class="relative rounded-[36px] p-6 sm:p-10 bg-gradient-to-b from-[#1a1221]/95 via-[#110e18]/98 to-[#090a0f] border border-pink-400/25 overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.7)]">
        <div class="absolute -top-20 left-1/4 w-72 h-72 rounded-full bg-pink-500/12 blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-20 right-1/4 w-72 h-72 rounded-full bg-sky-500/12 blur-3xl pointer-events-none"></div>

        <div class="relative z-10 flex flex-col items-center text-center space-y-6">
          <span class="px-4 py-1.5 rounded-full text-xs sm:text-sm font-black bg-pink-500/20 text-pink-200 border border-pink-400/35">
            ${stageBadge}
          </span>

          <!-- 한 줄 결론 대형 타이틀 -->
          <h3 class="text-2xl sm:text-4xl font-black text-[#f4f4f6] tracking-tight leading-snug max-w-3xl break-keep">
            ${bigConclusionTitle}
          </h3>

          <!-- 좌우 인물 & 중앙 애정도 점수 (이름과 점수를 압도적으로 크게!) -->
          <div class="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6 items-center pt-2">
            <!-- 인물 A -->
            <div class="flex flex-col items-center space-y-3 p-5 rounded-3xl bg-pink-500/[0.06] border border-pink-400/25">
              <div class="relative">
                <div class="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-b from-pink-500/25 to-[#0e1017] p-2.5 border-2 border-pink-400 shadow-[0_0_35px_rgba(244,114,182,0.3)]">
                  <img src="${cA.img}" alt="${mA.name}" class="w-full h-full object-contain">
                </div>
              </div>
              <div class="space-y-1">
                <h4 class="text-2xl sm:text-3xl font-black text-[#f4f4f6]">${mA.name}</h4>
                <div class="text-xl sm:text-2xl font-black text-pink-300">애정 표현 ${totalInvestA}%</div>
                <p class="text-xs text-[#d4d7e0] font-semibold">${mA.roleDesc || mA.title}</p>
                <p class="text-xs text-[#8e929f] pt-1">먼저 말 걸기 ${mA.starters}회 • 1:1 답장 ${speedA}분</p>
                ${selectiveBoostA >= 15 ? `<span class="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-pink-400 text-[#060608]">⚡ ${mB.name}님에게 ${selectiveBoostA}% 더 칼답!</span>` : ""}
              </div>
            </div>

            <!-- 중앙: 종합 호감도 -->
            <div class="flex flex-col items-center justify-center space-y-3">
              <div class="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-br from-pink-500/25 via-rose-500/15 to-sky-500/25 border-2 border-pink-300/60 flex flex-col items-center justify-center shadow-[0_0_55px_rgba(244,114,182,0.35)]">
                <span class="text-xs font-black text-pink-200">두 사람 호감도</span>
                <span class="text-4xl sm:text-6xl font-black text-white leading-none my-1.5">${romanceScore}<span class="text-xl font-bold text-pink-300">점</span></span>
                <span class="text-xs font-bold text-emerald-300">말투 닮은 정도 ${dyadicLsm}%</span>
              </div>
              <span class="text-xs sm:text-sm font-bold text-pink-200">
                ${pairData && pairData.exchanges ? `두 사람 직접 티키타카 ${pairData.exchanges}회 · 최대 ${pairData.maxStreak || 12}연속 대화` : `주고받은 대화 총 ${(currentData.totalMessages || 0).toLocaleString()}건`}
              </span>
            </div>

            <!-- 인물 B -->
            <div class="flex flex-col items-center space-y-3 p-5 rounded-3xl bg-sky-500/[0.06] border border-sky-400/25">
              <div class="relative">
                <div class="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-b from-sky-500/25 to-[#0e1017] p-2.5 border-2 border-sky-400 shadow-[0_0_35px_rgba(56,189,248,0.3)]">
                  <img src="${cB.img}" alt="${mB.name}" class="w-full h-full object-contain">
                </div>
              </div>
              <div class="space-y-1">
                <h4 class="text-2xl sm:text-3xl font-black text-[#f4f4f6]">${mB.name}</h4>
                <div class="text-xl sm:text-2xl font-black text-sky-300">애정 표현 ${totalInvestB}%</div>
                <p class="text-xs text-[#d4d7e0] font-semibold">${mB.roleDesc || mB.title}</p>
                <p class="text-xs text-[#8e929f] pt-1">먼저 말 걸기 ${mB.starters}회 • 1:1 답장 ${speedB}분</p>
                ${selectiveBoostB >= 15 ? `<span class="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-sky-400 text-[#060608]">⚡ ${mA.name}님에게 ${selectiveBoostB}% 더 칼답!</span>` : ""}
              </div>
            </div>
          </div>

          <!-- 직관적인 결과 요약 -->
          <div class="max-w-3xl mx-auto pt-5 border-t border-white/[0.08] space-y-4">
            <p class="text-base sm:text-lg text-[#f4f4f6] leading-relaxed break-keep">${romanceVerdict}</p>
            <div class="flex flex-wrap items-center justify-center gap-3 pt-1">
              <button onclick="setRomanceSubTab('mind')" class="px-5 py-2.5 rounded-full text-xs sm:text-sm font-black bg-pink-400 hover:bg-pink-300 text-[#060608] transition-all cursor-pointer flex items-center gap-2 shadow-lg">
                <i class="fa-solid fa-wand-magic-sparkles"></i> 두 사람의 숨겨진 속마음 &amp; 질문 6선 보기
              </button>
              <button onclick="setRomanceSubTab('signals')" class="px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold bg-white/[0.06] hover:bg-white/[0.12] text-[#f4f4f6] border border-white/[0.1] transition-all cursor-pointer flex items-center gap-2">
                <i class="fa-solid fa-bolt text-pink-300"></i> 답장 속도·선톡 비교 보기
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (currentRomanceSubTab === "signals") {
    subTabBodyHtml = `
      <!-- 탭 2: 답장·선톡·말투 상세 비교 -->
      <div class="space-y-6">
        <div class="rounded-[32px] p-6 sm:p-8 bg-[#0d0f16]/90 border border-white/[0.07] space-y-6">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] pb-4">
            <div>
              <h4 class="text-xl sm:text-2xl font-black text-[#f4f4f6] flex items-center gap-2">
                <i class="fa-solid fa-scale-unbalanced-flip text-pink-400"></i> 누가 더 적극적으로 다가갔을까?
              </h4>
              <p class="text-xs sm:text-sm text-[#8e929f] mt-1">선톡 횟수, 1:1 전용 답장 속도, 메시지 길이, 다정한 표현 횟수를 나란히 비교했습니다.</p>
            </div>
            <div class="flex items-center gap-4 text-sm font-black">
              <span class="flex items-center gap-1.5 text-pink-300"><span class="w-3 h-3 rounded-full bg-pink-400"></span>${mA.name} ${totalInvestA}%</span>
              <span class="flex items-center gap-1.5 text-sky-300"><span class="w-3 h-3 rounded-full bg-sky-400"></span>${mB.name} ${totalInvestB}%</span>
            </div>
          </div>

          <div class="space-y-6">
            <!-- 바 1: 누가 먼저 연락할까 -->
            <div class="space-y-2">
              <div class="flex justify-between items-baseline text-xs sm:text-sm font-bold">
                <span class="text-pink-300 text-sm sm:text-base font-black">${mA.name} ${startShareA}% · ${mA.starters}회</span>
                <span class="text-[#f4f4f6] text-sm sm:text-base font-black">① 누가 먼저 연락할까?</span>
                <span class="text-sky-300 text-sm sm:text-base font-black">${mB.starters}회 · ${startShareB}% ${mB.name}</span>
              </div>
              <div class="w-full h-4 rounded-full bg-[#161924] overflow-hidden flex p-0.5 gap-1">
                <div class="h-full rounded-l-full bg-gradient-to-r from-pink-500 to-rose-400" style="width: ${startShareA}%"></div>
                <div class="h-full rounded-r-full bg-gradient-to-l from-sky-500 to-cyan-400" style="width: ${startShareB}%"></div>
              </div>
            </div>

            <!-- 바 2: 누가 더 빨리 답장할까 -->
            <div class="space-y-2">
              <div class="flex justify-between items-baseline text-xs sm:text-sm font-bold">
                <span class="text-pink-300 text-sm sm:text-base font-black">${mA.name} 1:1 평균 ${speedA}분${fastRepliesA > 0 ? ` (칼답 ${fastRepliesA}회)` : ""}</span>
                <span class="text-[#f4f4f6] text-sm sm:text-base font-black">② 누가 더 빨리 답장할까?</span>
                <span class="text-sky-300 text-sm sm:text-base font-black">${fastRepliesB > 0 ? `(칼답 ${fastRepliesB}회) ` : ""}1:1 평균 ${speedB}분 ${mB.name}</span>
              </div>
              <div class="w-full h-4 rounded-full bg-[#161924] overflow-hidden flex p-0.5 gap-1">
                <div class="h-full rounded-l-full bg-gradient-to-r from-pink-500 to-rose-400" style="width: ${speedShareA}%"></div>
                <div class="h-full rounded-r-full bg-gradient-to-l from-sky-500 to-cyan-400" style="width: ${speedShareB}%"></div>
              </div>
              ${(selectiveBoostA >= 15 || selectiveBoostB >= 15) ? `
                <div class="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                  ${selectiveBoostA >= 15 ? `<span class="text-pink-300 font-bold">💘 ${mA.name}님은 평소 평균(${mA.replySpeed}분)보다 ${mB.name}님에게 <strong>${speedA}분</strong>으로 ${selectiveBoostA}% 더 빨리 칼답합니다!</span>` : `<span></span>`}
                  ${selectiveBoostB >= 15 ? `<span class="text-sky-300 font-bold">💘 ${mB.name}님은 평소 평균(${mB.replySpeed}분)보다 ${mA.name}님에게 <strong>${speedB}분</strong>으로 ${selectiveBoostB}% 더 빨리 칼답합니다!</span>` : `<span></span>`}
                </div>
              ` : ""}
            </div>

            <!-- 바 3: 누가 더 길고 정성스럽게 보낼까 -->
            <div class="space-y-2">
              <div class="flex justify-between items-baseline text-xs sm:text-sm font-bold">
                <span class="text-pink-300 text-sm sm:text-base font-black">${mA.name} 평균 ${mA.avgLen}자</span>
                <span class="text-[#f4f4f6] text-sm sm:text-base font-black">③ 누가 더 길고 정성스럽게 말할까?</span>
                <span class="text-sky-300 text-sm sm:text-base font-black">평균 ${mB.avgLen}자 ${mB.name}</span>
              </div>
              <div class="w-full h-4 rounded-full bg-[#161924] overflow-hidden flex p-0.5 gap-1">
                <div class="h-full rounded-l-full bg-gradient-to-r from-pink-500 to-rose-400" style="width: ${lenShareA}%"></div>
                <div class="h-full rounded-r-full bg-gradient-to-l from-sky-500 to-cyan-400" style="width: ${lenShareB}%"></div>
              </div>
            </div>

            <!-- 바 4: 다정한 질문과 애정 표현 -->
            <div class="space-y-2">
              <div class="flex justify-between items-baseline text-xs sm:text-sm font-bold">
                <span class="text-pink-300 text-sm sm:text-base font-black">${mA.name} ${qShareA}% · 질문 ${mA.questions}회</span>
                <span class="text-[#f4f4f6] text-sm sm:text-base font-black">④ 누가 더 궁금해하고 다정하게 표현할까?</span>
                <span class="text-sky-300 text-sm sm:text-base font-black">질문 ${mB.questions}회 · ${qShareB}% ${mB.name}</span>
              </div>
              <div class="w-full h-4 rounded-full bg-[#161924] overflow-hidden flex p-0.5 gap-1">
                <div class="h-full rounded-l-full bg-gradient-to-r from-pink-500 to-rose-400" style="width: ${qShareA}%"></div>
                <div class="h-full rounded-r-full bg-gradient-to-l from-sky-500 to-cyan-400" style="width: ${qShareB}%"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- 밤 시간 대화 비율 & 자주 쓰는 다정 어휘 -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div class="lg:col-span-5 rounded-[32px] p-6 sm:p-7 bg-[#0d0f16]/90 border border-white/[0.07] flex flex-col justify-between space-y-5">
            <div>
              <h4 class="text-lg sm:text-xl font-black text-[#f4f4f6] flex items-center gap-2">
                <i class="fa-solid fa-moon text-amber-300"></i> 밤늦게 얼마나 자주 대화할까?
              </h4>
              <p class="text-xs text-[#8e929f] mt-1">밤 10시 - 새벽 2시 사이의 대화 비율이 높을수록 사적인 친밀도가 깊습니다.</p>
            </div>

            <div class="space-y-4">
              <div class="p-4 rounded-2xl bg-gradient-to-r from-pink-500/12 via-purple-500/10 to-sky-500/12 border border-pink-400/20 flex items-center justify-between">
                <div>
                  <span class="text-xs sm:text-sm font-black text-pink-200">🌙 밤 10시 - 새벽 2시 대화 비율</span>
                  <p class="text-xs text-[#8e929f] mt-0.5">가장 활발한 시간: ${currentData.activity ? currentData.activity.peakWeekday : "일요일"} ${currentData.activity ? currentData.activity.peakHour : "23시"}</p>
                </div>
                <span class="text-3xl font-black text-pink-300">${lateNightRatio}%</span>
              </div>

              <div class="space-y-2.5 text-xs">
                <div class="flex items-center justify-between">
                  <span class="text-[#8e929f]">☀️ 낮 시간 (09시-18시)</span>
                  <span class=" font-bold text-[#d4d7e0]">${dayTimeRatio}%</span>
                </div>
                <div class="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <div class="h-full rounded-full bg-sky-400/70" style="width: ${dayTimeRatio}%"></div>
                </div>

                <div class="flex items-center justify-between pt-1">
                  <span class="text-[#8e929f]">🌆 저녁 시간 (18시-22시)</span>
                  <span class=" font-bold text-[#d4d7e0]">${eveningRatio}%</span>
                </div>
                <div class="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <div class="h-full rounded-full bg-indigo-400/80" style="width: ${eveningRatio}%"></div>
                </div>

                <div class="flex items-center justify-between pt-1">
                  <span class="text-pink-300 font-bold">🌙 밤·새벽 감성 시간 (22시-02시)</span>
                  <span class=" font-black text-pink-300">${lateNightRatio}%</span>
                </div>
                <div class="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <div class="h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-400" style="width: ${lateNightRatio}%"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="lg:col-span-7 rounded-[32px] p-6 sm:p-7 bg-[#0d0f16]/90 border border-white/[0.07] flex flex-col justify-between space-y-5">
            <div>
              <h4 class="text-lg sm:text-xl font-black text-[#f4f4f6] flex items-center gap-2">
                <i class="fa-solid fa-heart text-pink-400"></i> 서로에게 가장 많이 쓴 다정한 말
              </h4>
              <p class="text-xs text-[#8e929f] mt-1">두 사람이 대화에서 가장 자주 꺼낸 애정 표현과 말버릇입니다.</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="p-5 rounded-2xl bg-pink-500/[0.06] border border-pink-400/20 space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-base font-black text-pink-300">${mA.name}님의 단골 표현</span>
                  <span class="text-xs text-[#8e929f]">웃음 ${mA.laughs}회</span>
                </div>
                <div class="flex flex-wrap gap-1.5">
                  ${wordsA.map((w, i) => `
                    <span class="px-3 py-1 rounded-full text-xs font-bold ${i === 0 ? "bg-pink-400 text-[#060608]" : "bg-white/[0.06] text-pink-200 border border-pink-400/20"}">
                      #${w.word} <span class=" text-[10px] opacity-80">${w.count}</span>
                    </span>
                  `).join("")}
                </div>
              </div>

              <div class="p-5 rounded-2xl bg-sky-500/[0.06] border border-sky-400/20 space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-base font-black text-sky-300">${mB.name}님의 단골 표현</span>
                  <span class="text-xs text-[#8e929f]">웃음 ${mB.laughs}회</span>
                </div>
                <div class="flex flex-wrap gap-1.5">
                  ${wordsB.map((w, i) => `
                    <span class="px-3 py-1 rounded-full text-xs font-bold ${i === 0 ? "bg-sky-400 text-[#060608]" : "bg-white/[0.06] text-sky-200 border border-sky-400/20"}">
                      #${w.word} <span class=" text-[10px] opacity-80">${w.count}</span>
                    </span>
                  `).join("")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (currentRomanceSubTab === "mind") {
    // 탭 3: 숨겨진 속마음 & 차마 못 물어본 질문 6선 (페어 변경 시 해당 페어 맞춤형 동적 생성!)
    const acadRomance = (currentData.academicMetrics && currentData.academicMetrics.romance) || {};
    const staticSecretMind = acadRomance.secretMind || null;
    const isDefaultPair = idxA === 0 && (idxB === 1 || members.length === 1);
    const dynamicSecretMind = (window.KAKAO_PARSER && typeof window.KAKAO_PARSER.buildDynamicSecretMind === "function")
      ? window.KAKAO_PARSER.buildDynamicSecretMind(mA, mB, pairData, currentData)
      : null;
    const secretMind = (isDefaultPair && staticSecretMind) ? staticSecretMind : (dynamicSecretMind || staticSecretMind);

    const hiddenHearts = (secretMind && secretMind.hiddenHearts) || [
      {
        name: mA.name,
        surfaceStyle: `겉으로는 밝게 안부를 묻고 먼저 말을 건네는 편`,
        innerTruth: `"내가 먼저 연락하는 건 전혀 자존심 상하지 않아. 다만 네가 내 카톡을 보고 바로 웃으며 답장해 줄 때 하루 피로가 다 녹아내려."`,
        secretFear: `내가 너무 자주 연락해서 부담스러워하면 어쩌지 하는 작은 걱정`,
        loveTrigger: `약속 날짜를 먼저 정해주거나 사소한 말도 기억해 줄 때`
      },
      {
        name: mB.name,
        surfaceStyle: `짧고 담백하게 핵심만 말하는 듯 보이는 편`,
        innerTruth: `"표현이 서툴러서 글자 수는 짧을 때가 있어도, 네 카톡 알림이 울리면 하던 일을 멈추고 제일 먼저 확인하고 있어."`,
        secretFear: `표현을 많이 못 해서 내 마음이 작은 줄 오해받을까 봐 걱정`,
        loveTrigger: `재촉하지 않고 다정하게 내 하루를 물어봐 줄 때`
      }
    ];
    const unspokenQuestions = (secretMind && secretMind.unspokenQuestions && secretMind.unspokenQuestions.length > 0)
      ? secretMind.unspokenQuestions
      : [
          {
            icon: "fa-scale-balanced",
            factBadge: `호감 비중 ${totalInvestA}% : ${totalInvestB}%`,
            q: `솔직히 우리 둘 중에 누가 더 좋아하는 거야?`,
            verdict: totalInvestA >= totalInvestB
              ? `${mA.name}님이 먼저 다가가는 에너지가 조금 더 크지만, ${mB.name}님의 답장 성의도 못지않은 쌍방 호감입니다!`
              : `${mB.name}님이 대화의 끈을 더 적극적으로 잡고 있고, ${mA.name}님도 기분 좋게 발맞추고 있습니다!`,
            detail: `선톡 횟수(${mA.starters}회 vs ${mB.starters}회)와 질문 세례(${mA.questions}회 vs ${mB.questions}회)를 종합하면 한쪽만 매달리는 관계가 아니라 서로 마음이 통한 상태입니다.`
          },
          {
            icon: "fa-clock",
            factBadge: `평균 답장 ${speedA}분 vs ${speedB}분`,
            q: `가끔 답장이 늦을 때, 나한테 식었거나 어장관리하는 걸까?`,
            verdict: `어장관리가 아니라 바쁜 와중에도 성의 있게 답장하려고 타이밍을 챙기는 패턴입니다.`,
            detail: `두 사람의 평균 답장 속도는 ${speedA}분, ${speedB}분으로 매우 안정적이며, 단답으로 대화를 끊지 않고 질문과 리액션을 이어가고 있습니다.`
          },
          {
            icon: "fa-moon",
            factBadge: `심야 대화 ${lateNightRatio}% 일치`,
            q: `밤늦게 카톡할 때 상대방도 내 생각하면서 설레고 있을까?`,
            verdict: `밤 10시 이후 감성 대화 호흡이 ${lateNightRatio}%에 달합니다. 밤마다 서로에게 집중하고 있습니다!`,
            detail: `피곤한 밤 시간대에도 대화가 끊기지 않고 웃음(ㅋㅋ/ㅎㅎ)과 다정한 표현이 오가는 것은 이성적 호감이 높을 때 나타나는 대표적인 시그널입니다.`
          },
          {
            icon: "fa-comments",
            factBadge: `말투 닮은 정도 ${dyadicLsm}%`,
            q: `우리가 사귀게 되면 대화가 잘 통하고 오래 만날 수 있을까?`,
            verdict: `무의식적인 말투와 리액션 호흡이 ${dyadicLsm}%나 닮아 있어 연인이 되면 티키타카가 아주 잘 맞을 커플입니다.`,
            detail: `억지로 맞추지 않아도 자주 쓰는 단어와 문장 길이(${mA.avgLen}자 vs ${mB.avgLen}자)가 비슷해 대화 피로도가 매우 낮습니다.`
          },
          {
            icon: "fa-paper-plane",
            factBadge: `선톡 ${mA.starters}회 : ${mB.starters}회`,
            q: `내가 먼저 연락하면 귀찮아하거나 부담스러워하진 않을까?`,
            verdict: `전혀 부담스러워하지 않습니다! 오히려 먼저 연락이 오면 반갑게 웃으며 대화를 길게 이어가고 있습니다.`,
            detail: `선톡 직후 상대방의 웃음 반응(${mA.laughs + mB.laughs}회)과 질문 빈도를 보면 연락을 기다리고 있었다는 신호가 뚜렷합니다.`
          },
          {
            icon: "fa-heart",
            factBadge: `호감 확신도 ${romanceScore}점`,
            q: `지금 바로 주말에 따로 만나자고 데이트 신청해도 될까?`,
            verdict: `성공 확률 매우 높음! 막연한 약속 대신 날짜와 메뉴를 콕 집어서 제안해 보세요.`,
            detail: `"언제 밥 한번 먹자"보다는 "이번 주 토요일에 맛있는 거 먹으러 갈래?"처럼 구체적으로 물어볼 때 호감도가 급상승합니다.`
          }
        ];
    const loveCheatKeys = (secretMind && secretMind.loveCheatKeys && secretMind.loveCheatKeys.length > 0)
      ? secretMind.loveCheatKeys
      : [
          {
            target: mA.name,
            magicLine: `"오늘 하루도 고생 많았어! 갑자기 네 생각나서 톡 했어 ㅎㅎ 이번 주말에 시간 어때?"`,
            tip: `${mA.name}님은 자기 일상을 다정하게 챙겨주고 먼저 만남을 제안할 때 설렘을 크게 느낍니다.`
          },
          {
            target: mB.name,
            magicLine: `"너랑 카톡하니까 오늘 피곤했던 거 싹 풀린다! 다음에 거기 같이 가보자 ♥"`,
            tip: `${mB.name}님은 함께 대화하는 시간이 즐겁다는 확신을 주면 마음의 문을 활짝 엽니다.`
          }
        ];

    subTabBodyHtml = `
      <div class="space-y-7">
        <!-- 1. 두 사람의 겉말 vs 숨겨진 진짜 속마음 번역기 -->
        <div class="rounded-[32px] p-6 sm:p-8 bg-gradient-to-br from-[#191224]/95 via-[#110f1a]/95 to-[#090a0f] border border-pink-400/30 space-y-6">
          <div>
            <span class="px-3 py-1 rounded-full text-xs font-black bg-pink-400 text-[#060608]">속마음 번역기</span>
            <h4 class="text-xl sm:text-3xl font-black text-[#f4f4f6] mt-2">
              카톡 말투 뒤에 숨겨진 <span class="text-pink-300">${mA.name} ♥ ${mB.name}</span>의 진짜 속마음
            </h4>
            <p class="text-xs sm:text-sm text-[#8e929f] mt-1">선톡 비율, 답장 속도, 밤 시간 대화 습관을 바탕으로 두 사람이 말하지 못한 속마음을 읽어냈습니다.</p>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
            ${hiddenHearts.map((hh, idx) => {
              const isFirst = idx === 0;
              const heartName = hh.name || (isFirst ? mA.name : mB.name);
              return `
                <div class="p-6 rounded-3xl ${isFirst ? "bg-pink-500/[0.07] border border-pink-400/30" : "bg-sky-500/[0.07] border border-sky-400/30"} space-y-4">
                  <div class="flex items-center justify-between border-b border-white/[0.08] pb-3">
                    <span class="text-xl sm:text-2xl font-black ${isFirst ? "text-pink-300" : "text-sky-300"}">${heartName}님의 속마음</span>
                    <span class="px-3 py-1 rounded-full text-xs font-bold bg-white/[0.06] text-[#d4d7e0]">겉말 vs 속마음</span>
                  </div>
                  <div class="space-y-1">
                    <span class="text-xs font-bold text-[#8e929f]">겉으로 보이는 카톡 스타일</span>
                    <p class="text-xs sm:text-sm text-[#d4d7e0] font-semibold">${hh.surfaceStyle}</p>
                  </div>
                  <div class="p-4 rounded-2xl bg-[#090a0f]/90 border border-white/[0.08] space-y-1.5">
                    <span class="text-xs font-black ${isFirst ? "text-pink-300" : "text-sky-300"} flex items-center gap-1.5">
                      <i class="fa-solid fa-heart"></i> 차마 말 못 한 진짜 속마음
                    </span>
                    <p class="text-sm sm:text-base font-bold text-[#f4f4f6] leading-relaxed break-keep">${hh.innerTruth}</p>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                    <div class="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <span class="font-bold text-rose-300 block mb-1">남몰래 신경 쓰는 걱정</span>
                      <span class="text-[#d4d7e0] leading-relaxed">${hh.secretFear}</span>
                    </div>
                    <div class="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <span class="font-bold text-emerald-300 block mb-1">설렘이 터지는 포인트</span>
                      <span class="text-[#d4d7e0] leading-relaxed">${hh.loveTrigger}</span>
                    </div>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>

        <!-- 2. 연인·썸 사이 차마 물어보지 못했던 질문 6선 (좌측 작은 말풍선 6개 모음 + 우측 대형 답변 스테이지 토글) -->
        <div class="rounded-[32px] p-6 sm:p-8 bg-[#0d0f16]/90 border border-white/[0.07] space-y-6">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span class="px-3 py-1 rounded-full text-xs font-black bg-purple-400 text-[#060608]">💬 차마 못 물어본 질문 6선</span>
              <h4 class="text-xl sm:text-2xl font-black text-[#f4f4f6] mt-2">
                궁금한 질문 말풍선을 눌러보세요!
              </h4>
              <p class="text-xs sm:text-sm text-[#8e929f] mt-1">왼쪽의 작은 질문 말풍선을 누르면 오른쪽 큰 공간에 답변이 열리고, 다시 누르면 닫힙니다.</p>
            </div>
            <span class="px-3 py-1.5 rounded-full text-xs font-extrabold bg-pink-500/15 text-pink-300 border border-pink-400/30">
              👆 말풍선 클릭 시 켜기 / 다시 클릭 시 끄기
            </span>
          </div>

          <!-- 좌측 작은 말풍선 6개 모음 (5열) + 우측 대형 답변 스테이지 (7열) -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch pt-1">
            <!-- 왼쪽: 꼬리 달린 작은 말풍선 6개 -->
            <div class="lg:col-span-5 flex flex-col justify-between gap-2.5">
              ${unspokenQuestions.map((uq, idx) => {
                const isSelected = selectedUnspokenQuestionIdx === idx;
                return `
                  <button type="button" onclick="selectUnspokenQuestion(${idx})" class="group relative text-left pl-4 pr-3.5 py-3 rounded-2xl rounded-bl-none transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? "bg-gradient-to-r from-pink-500/30 via-purple-500/20 to-[#191528] border-2 border-pink-400 shadow-[0_6px_20px_rgba(244,114,182,0.25)] translate-x-1"
                      : "bg-[#131622]/95 hover:bg-[#191d2d] border border-white/[0.09] hover:border-pink-400/40"
                  }">
                    <!-- 말풍선 좌하단 꼬리 장식 -->
                    <span class="absolute -bottom-[7px] left-3 w-3 h-3 rotate-45 ${
                      isSelected
                        ? "bg-[#26172c] border-b-2 border-r-2 border-pink-400"
                        : "bg-[#131622] border-b border-r border-white/[0.09] group-hover:border-pink-400/40"
                    }"></span>

                    <div class="flex items-center gap-2.5 min-w-0">
                      <span class="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-black ${
                        isSelected ? "bg-pink-400 text-[#060608]" : "bg-white/[0.08] text-pink-300"
                      }">
                        Q${idx + 1}
                      </span>
                      <p class="text-xs sm:text-sm font-extrabold leading-snug break-keep truncate ${
                        isSelected ? "text-[#f4f4f6]" : "text-[#d4d7e0] group-hover:text-white"
                      }">
                        ${uq.q}
                      </p>
                    </div>

                    <span class="shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full ${
                      isSelected
                        ? "bg-pink-400/20 text-amber-300 border border-pink-400/40"
                        : "bg-white/[0.04] text-[#8e929f] group-hover:text-pink-300"
                    }">
                      ${isSelected ? "닫기 ✕" : "열기 ▶"}
                    </span>
                  </button>
                `;
              }).join("")}
            </div>

            <!-- 오른쪽: 선택한 말풍선이 좌상단에 작게 자리잡고 아래에 답변이 크게 나오는 스테이지 -->
            <div class="lg:col-span-7 flex flex-col">
              ${(() => {
                const isOpen = selectedUnspokenQuestionIdx >= 0 && selectedUnspokenQuestionIdx < unspokenQuestions.length;
                if (!isOpen) {
                  return `
                    <div class="h-full min-h-[280px] rounded-3xl p-8 bg-[#090a10]/80 border-2 border-dashed border-white/[0.1] flex flex-col items-center justify-center text-center space-y-3">
                      <div class="w-14 h-14 rounded-2xl bg-pink-500/15 border border-pink-400/30 flex items-center justify-center text-2xl text-pink-300">
                        💬
                      </div>
                      <h5 class="text-base sm:text-lg font-black text-[#f4f4f6]">질문 말풍선이 닫혀 있습니다</h5>
                      <p class="text-xs sm:text-sm text-[#8e929f] max-w-md break-keep">
                        왼쪽에 모여 있는 6개의 작은 말풍선 중 궁금한 질문을 클릭하면, 이곳에 상세 데이터 판독 답변이 크게 펼쳐집니다.
                      </p>
                    </div>
                  `;
                }
                const activeIdx = selectedUnspokenQuestionIdx;
                const activeQ = unspokenQuestions[activeIdx];
                return `
                  <div class="h-full relative rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-[#1b1426] via-[#121420] to-[#0b0d14] border-2 border-pink-400/45 shadow-[0_18px_45px_rgba(0,0,0,0.55)] flex flex-col justify-between space-y-5">
                    <!-- 좌상단에 작게 자리잡은 선택된 질문 말풍선 + 우상단 데이터 뱃지/끄기 버튼 -->
                    <div class="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.08] pb-4">
                      <div class="relative inline-flex items-center gap-2 px-4 py-2 rounded-2xl rounded-tl-none bg-pink-500/25 border border-pink-400/60 shadow-sm max-w-full">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-pink-400 text-[#060608] shrink-0">
                          💬 Q${activeIdx + 1}
                        </span>
                        <span class="text-xs sm:text-sm font-black text-pink-100 break-keep">
                          "${activeQ.q}"
                        </span>
                      </div>
                      <div class="flex items-center gap-2 shrink-0">
                        <span class="px-3 py-1 rounded-full text-xs font-black bg-pink-500/20 text-pink-200 border border-pink-400/35">
                          📊 ${activeQ.factBadge || "실제 대화 기반"}
                        </span>
                        <button type="button" onclick="selectUnspokenQuestion(${activeIdx})" class="px-2.5 py-1 rounded-full text-xs font-black bg-white/[0.07] hover:bg-rose-500/30 text-[#d4d7e0] hover:text-rose-200 border border-white/[0.1] cursor-pointer transition">
                          닫기 ✕
                        </button>
                      </div>
                    </div>

                    <!-- 큰 공간에 표시되는 한 줄 결론 & 상세 데이터 판독 -->
                    <div class="space-y-4 my-auto">
                      <div class="p-5 sm:p-6 rounded-2xl bg-[#090a10]/95 border border-amber-300/35 space-y-2.5">
                        <div class="text-xs font-black text-amber-300 flex items-center gap-1.5">
                          <i class="fa-solid fa-wand-magic-sparkles"></i> 실제 카톡 데이터 한 줄 결론
                        </div>
                        <p class="text-lg sm:text-2xl font-black text-[#f4f4f6] leading-snug break-keep">
                          👉 ${activeQ.verdict}
                        </p>
                      </div>

                      <div class="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07] space-y-2">
                        <span class="text-xs font-bold text-pink-300 flex items-center gap-1.5">
                          <i class="fa-solid fa-magnifying-glass-chart"></i> 카톡 기록 기반 상세 해설
                        </span>
                        <p class="text-sm sm:text-base text-[#d4d7e0] font-medium leading-relaxed break-keep">
                          ${activeQ.detail}
                        </p>
                      </div>
                    </div>
                  </div>
                `;
              })()}
            </div>
          </div>
        </div>

        <!-- 3. 데이터로 본 두 사람의 대화 온도 & 맞춤 소통 가이드 ('심장을 뛰게 할 카톡 한마디' 대체) -->
        <div class="rounded-[32px] p-6 sm:p-8 bg-gradient-to-r from-pink-500/12 via-[#12131d] to-sky-500/12 border border-pink-400/25 space-y-5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span class="px-3 py-1 rounded-full text-xs font-black bg-amber-300 text-[#060608]">💡 대화 온도 &amp; 소통 리듬 가이드</span>
              <h4 class="text-lg sm:text-2xl font-black text-[#f4f4f6] mt-2 flex items-center gap-2">
                데이터로 본 <span class="text-pink-300">${mA.name}</span> &amp; <span class="text-sky-300">${mB.name}</span>의 카톡 호흡 맞출 포인트
              </h4>
              <p class="text-xs sm:text-sm text-[#8e929f] mt-1">억지스러운 멘트 대신 두 사람의 실제 답장 속도·문장 길이·리액션 습관에서 찾은 편안한 대화 팁입니다.</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="p-5 rounded-2xl bg-[#090a0f]/90 border border-white/[0.08] space-y-2">
              <div class="flex items-center justify-between">
                <span class="px-2.5 py-0.5 rounded-full text-xs font-black bg-pink-400 text-[#060608]">⏱️ 답장 템포 궁합</span>
                <span class="text-xs font-bold text-pink-300">${speedA}분 vs ${speedB}분</span>
              </div>
              <p class="text-sm sm:text-base font-black text-[#f4f4f6] pt-1 break-keep">
                ${Math.abs(speedA - speedB) <= 5
                  ? "서로 답장 간격이 비슷해 기다림 스트레스가 적은 안정형 템포"
                  : speedA < speedB
                  ? `${mA.name}님은 빠른 실시간 소통파, ${mB.name}님은 여유 있게 정리해 답하는 스타일`
                  : `${mB.name}님은 빠른 실시간 소통파, ${mA.name}님은 여유 있게 정리해 답하는 스타일`}
              </p>
              <p class="text-xs text-[#8e929f] leading-relaxed break-keep">
                ${Math.abs(speedA - speedB) <= 5
                  ? "지금처럼 자연스러운 속도를 유지하면 대화 피로도 없이 오래 대화를 이어갈 수 있습니다."
                  : "답장이 조금 늦더라도 단답으로 끊지 않고 성의 있게 이어가고 있으니 속도 차이로 오해할 필요가 전혀 없습니다."}
              </p>
            </div>

            <div class="p-5 rounded-2xl bg-[#090a0f]/90 border border-white/[0.08] space-y-2">
              <div class="flex items-center justify-between">
                <span class="px-2.5 py-0.5 rounded-full text-xs font-black bg-sky-400 text-[#060608]">💬 말투·문장 호흡</span>
                <span class="text-xs font-bold text-sky-300">동조율 ${dyadicLsm}%</span>
              </div>
              <p class="text-sm sm:text-base font-black text-[#f4f4f6] pt-1 break-keep">
                평균 ${mA.avgLen}자 vs ${mB.avgLen}자 • 웃음·공감 리액션 ${mA.laughs + mB.laughs}회
              </p>
              <p class="text-xs text-[#8e929f] leading-relaxed break-keep">
                ${dyadicLsm >= 75
                  ? "자주 쓰는 말투와 문장 호흡이 이미 많이 닮아 있어, 일상적인 소소한 이야기를 나눌 때 가장 케미가 빛납니다."
                  : "한 명은 핵심 위주, 한 명은 풍부한 표현 위주로 대화해 서로의 빈자리를 채워주는 상호보완형 대화 스타일입니다."}
              </p>
            </div>

            <div class="p-5 rounded-2xl bg-[#090a0f]/90 border border-white/[0.08] space-y-2">
              <div class="flex items-center justify-between">
                <span class="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-400 text-[#060608]">🌙 베스트 대화 타이밍</span>
                <span class="text-xs font-bold text-purple-300">심야 비중 ${lateNightRatio}%</span>
              </div>
              <p class="text-sm sm:text-base font-black text-[#f4f4f6] pt-1 break-keep">
                ${lateNightRatio >= 22
                  ? "하루 일과를 마친 밤 10시 이후 감성 대화가 가장 잘 통하는 커플"
                  : "낮과 저녁 시간대 일상 공유가 활발하고 건강한 텐션을 유지하는 커플"}
              </p>
              <p class="text-xs text-[#8e929f] leading-relaxed break-keep">
                질문 횟수(${mA.questions + mB.questions}회)가 활발할수록 대화가 길어지므로, 근황 보고 끝에 가벼운 질문 하나를 덧붙이면 티키타카가 훨씬 잘 이어집니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    // 탭 4: 실제 설렘 대화 하이라이트 & 관계 조언 (선택된 페어 전용 실제 연속 대화를 최우선 표시!)
    const rawHighlights = (pairData && pairData.highlights && pairData.highlights.length > 0)
      ? pairData.highlights
      : (currentData.romanceHighlights && currentData.romanceHighlights.length > 0)
      ? currentData.romanceHighlights
      : [
          {
            title: "다정한 안부와 칼답이 오간 순간",
            badge: "설렘 하이라이트 01",
            messages: [
              { sender: mA.name, time: "밤 11:42", text: (mA.quotes && mA.quotes[0]) ? mA.quotes[0] : "오늘 하루도 고생 많았어! 집 들어가면 카톡 해줘 ♥" },
              { sender: mB.name, time: "밤 11:43", text: (mB.quotes && mB.quotes[0]) ? mB.quotes[0] : "응응 방금 도착했어! 너랑 연락하니까 피곤한 거 싹 풀린다 ㅎㅎ" }
            ],
            commentary: "서로의 하루를 챙기는 다정한 선톡과 1분 만의 칼답에서 깊은 호감이 드러납니다."
          },
          {
            title: "주말 약속과 닮아가는 말투",
            badge: "설렘 하이라이트 02",
            messages: [
              { sender: mB.name, time: "오후 6:15", text: (mB.quotes && mB.quotes[1]) ? mB.quotes[1] : "이번 주말에 날씨 좋대! 같이 맛있는 거 먹으러 갈래?" },
              { sender: mA.name, time: "오후 6:16", text: (mA.quotes && mA.quotes[1]) ? mA.quotes[1] : "완전 좋아!! 안 그래도 너한테 주말에 보자고 하려 했는데 텔레파시 통했네 ㅋㅋㅋ" }
            ],
            commentary: "서로를 향한 호감 표현과 일상 공유가 자연스럽게 이어지는 그린라이트 대화입니다."
          }
        ];

    const highlightSectionsHtml = rawHighlights.map((hl) => {
      // hl.messages 배열 형태(sender/speaker)와 단일 speaker/text 형태를 모두 호환 처리
      const msgs = Array.isArray(hl.messages)
        ? hl.messages
        : [{ sender: hl.sender || hl.speaker || mA.name, time: hl.time || "심야", text: hl.text || "" }];

      const bubbles = msgs.map((msg, mIdx) => {
        const speakerName = msg.sender || msg.speaker || (msg.side === "left" ? mA.name : msg.side === "right" ? mB.name : (mIdx % 2 === 0 ? mA.name : mB.name));
        const isPersonA = speakerName === mA.name || msg.side === "left";
        return `
          <div class="flex flex-col ${isPersonA ? "items-start" : "items-end"} space-y-1">
            <div class="flex items-center gap-2 px-1">
              <span class="text-xs font-black ${isPersonA ? "text-pink-300" : "text-sky-300"}">${speakerName}</span>
              <span class="text-[10px] text-[#8e929f]">${msg.time || hl.date || ""}</span>
            </div>
            <div class="max-w-full px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold leading-relaxed ${isPersonA ? "bg-pink-500/15 text-[#f4f4f6] border border-pink-400/30 rounded-tl-sm" : "bg-sky-500/15 text-[#f4f4f6] border border-sky-400/30 rounded-tr-sm"}">
              "${msg.text}"
            </div>
          </div>
        `;
      }).join("");

      const hlTitle = hl.title || hl.stage || "실제 설렘 대화 순간";
      const hlBadge = hl.badge || hl.tag || hl.date || "호감 시그널";
      const hlNote = hl.commentary || hl.academicNote || "";

      return `
        <div class="p-5 sm:p-6 rounded-3xl bg-[#090a0f] border border-white/[0.07] flex flex-col justify-between space-y-4 shadow-[0_4px_25px_rgba(0,0,0,0.3)]">
          <div class="space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
              <span class="text-sm sm:text-base font-black text-[#f4f4f6]">${hlTitle}</span>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-pink-500/15 text-pink-300 border border-pink-400/30">${hlBadge}</span>
            </div>
            <div class="space-y-3">
              ${bubbles}
            </div>
          </div>
          ${hlNote ? `<p class="text-xs sm:text-sm text-[#d4d7e0] bg-white/[0.03] px-4 py-2.5 rounded-xl border border-white/[0.05] mt-auto">💡 ${hlNote}</p>` : ""}
        </div>
      `;
    }).join("");

    subTabBodyHtml = `
      <div class="rounded-[32px] p-6 sm:p-8 bg-[#0d0f16]/90 border border-white/[0.07] space-y-6">
        <div>
          <h4 class="text-xl sm:text-2xl font-black text-[#f4f4f6] flex items-center gap-2">
            <i class="fa-solid fa-comments text-pink-400"></i> ${mA.name} ♥ ${mB.name}님의 설렘 가득한 실제 대화 &amp; 맞춤 조언
          </h4>
          <p class="text-xs sm:text-sm text-[#8e929f] mt-1">대화 속에서 호감이 가장 진하게 묻어났던 순간과 두 분을 위한 맞춤 연애 조언입니다.</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
          ${highlightSectionsHtml}
        </div>

        <!-- 두 사람을 위한 맞춤형 조언 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div class="p-5 rounded-2xl bg-gradient-to-br from-pink-500/10 to-transparent border border-pink-400/25 space-y-2">
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full text-xs font-black bg-pink-400 text-[#060608]">${mA.name}님에게</span>
              <span class="text-sm font-black text-pink-200">${mA.name}님을 위한 연애 조언</span>
            </div>
            <p class="text-xs sm:text-sm text-[#d4d7e0] leading-relaxed break-keep">
              ${totalInvestA >= totalInvestB
                ? `${mA.name}님이 먼저 다정하게 말을 걸어주고(${mA.starters}회) 세심하게 반응해 준 덕분에 두 사람의 대화가 늘 따뜻하게 이어지고 있습니다. 가끔은 ${mB.name}님이 먼저 다가올 수 있도록 살짝 여유를 주면 설렘이 배가 됩니다.`
                : `${mB.name}님의 다정한 연락에 ${mA.name}님도 평균 ${speedA}분 내외의 빠른 답장으로 화답하고 있습니다. 지금보다 먼저 안부를 묻는 횟수를 조금만 늘려주면 ${mB.name}님이 훨씬 큰 확신을 얻게 됩니다.`}
            </p>
          </div>

          <div class="p-5 rounded-2xl bg-gradient-to-br from-sky-500/10 to-transparent border border-sky-400/25 space-y-2">
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full text-xs font-black bg-sky-400 text-[#060608]">${mB.name}님에게</span>
              <span class="text-sm font-black text-sky-200">${mB.name}님을 위한 연애 조언</span>
            </div>
            <p class="text-xs sm:text-sm text-[#d4d7e0] leading-relaxed break-keep">
              ${totalInvestB >= totalInvestA
                ? `${mB.name}님은 평균 ${speedB}분의 빠른 답장과 다정한 질문(${mB.questions}회)으로 ${mA.name}님에게 큰 안정감을 주고 있습니다. 지금의 템포를 유지하면서 구체적인 다음 만남을 제안해 보세요.`
                : `${mB.name}님의 말투와 웃음 호흡은 이미 ${mA.name}님과 ${dyadicLsm}%나 닮아 있습니다. ${mA.name}님이 건네는 안부에 평소보다 한 문장만 더 길게 마음을 표현해 주면 완벽한 균형을 이룹니다.`}
            </p>
          </div>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="space-y-6">
      ${topHeaderBarHtml}
      ${subTabNavHtml}
      ${subTabBodyHtml}
    </div>
  `;
}

// ============================================================================
// [MODE 03] 🚨 조별과제 빌런 탐지 & 기여도 시상식대 + 빌런 참교육 게임 UI
// ============================================================================
let villainGameTargetName = null;
let villainGameWeaponIdx = 0;
let villainGameHp = 100;
let villainGameHits = 0;
let villainGameCombo = 0;
let villainGameComboTimer = null;
let villainGameBounceTimer = null;
let villainGameStamps = [];
let villainGameSoundEnabled = true;
let villainAudioCtx = null;

const VILLAIN_WEAPONS = [
  { id: "slipper", icon: "🩴", name: "진실의 삼선 슬리퍼", dmg: 15, hitText: "짝!! 정신차려!", stamp: "🩴", color: "text-amber-300", ringColor: "border-amber-300", badge: "빠른 스냅 연타", particles: ["🩴", "💥", "💢", "✨"] },
  { id: "ppt", icon: "📑", name: "100장짜리 PPT 뭉치", dmg: 35, hitText: "네가 안 한 장표 폭격!!", stamp: "📄", color: "text-sky-300", ringColor: "border-sky-300", badge: "장표 다발 투척", particles: ["📄", "📊", "📑", "📎", "💨"] },
  { id: "fstamp", icon: "🔨", name: "F학점 빨간 도장 망치", dmg: 60, hitText: "학점 F 쾅쾅!!", stamp: "[F학점]", color: "text-rose-400", ringColor: "border-rose-500", badge: "묵직한 지진 강타", particles: ["🔨", "💢", "💥", "🩸", "⚡"] },
  { id: "kakao", icon: "📢", name: "새벽 3시 카톡 알림 폭탄", dmg: 85, hitText: "읽씹 금지!! 단톡 소환!", stamp: "💬1", color: "text-yellow-300", ringColor: "border-yellow-300", badge: "알림 연쇄 폭발", particles: ["💬", "📢", "🔔", "⚡", "💥"] },
  { id: "laser", icon: "⚡", name: "발표자 명단 제외 광선검", dmg: 150, hitText: "이름 빼버린다 CRIT!!", stamp: "[제명]", color: "text-emerald-300", ringColor: "border-emerald-300", badge: "궁극 레이저 처형", particles: ["⚡", "✨", "💀", "🔥", "💥"] }
];

function toggleVillainGameSound(event) {
  if (event) event.stopPropagation();
  villainGameSoundEnabled = !villainGameSoundEnabled;
  const btn = document.getElementById("villainSoundToggleBtn");
  if (btn) {
    btn.innerHTML = villainGameSoundEnabled
      ? `<i class="fa-solid fa-volume-high text-amber-300"></i> <span>타격음 ON</span>`
      : `<i class="fa-solid fa-volume-xmark text-[#8e929f]"></i> <span>타격음 OFF</span>`;
  }
}

function playVillainHitSound(weaponId, isKo) {
  if (!villainGameSoundEnabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!villainAudioCtx) villainAudioCtx = new AudioCtx();
    if (villainAudioCtx.state === "suspended") villainAudioCtx.resume();

    const now = villainAudioCtx.currentTime;

    if (weaponId === "slipper") {
      // 찰진 슬리퍼 스냅음 (고주파 노이즈 + 짧은 스냅 톤)
      const osc = villainAudioCtx.createOscillator();
      const gain = villainAudioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.09);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(villainAudioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } else if (weaponId === "ppt") {
      // 두꺼운 종이 뭉치 타격음
      const osc = villainAudioCtx.createOscillator();
      const gain = villainAudioCtx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.14);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(villainAudioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    } else if (weaponId === "fstamp") {
      // 묵직한 망치 내려찍기 중저음 임팩트
      const osc = villainAudioCtx.createOscillator();
      const gain = villainAudioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.24);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(gain);
      gain.connect(villainAudioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.24);
    } else if (weaponId === "kakao") {
      // 카톡 알림음 2음계 + 폭발 임팩트
      const osc1 = villainAudioCtx.createOscillator();
      const gain1 = villainAudioCtx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.setValueAtTime(1174.66, now + 0.06);
      gain1.gain.setValueAtTime(0.22, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc1.connect(gain1);
      gain1.connect(villainAudioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.18);
    } else {
      // 광선검 레이저 슬래시
      const osc = villainAudioCtx.createOscillator();
      const gain = villainAudioCtx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(960, now);
      osc.frequency.exponentialRampToValueAtTime(68, now + 0.26);
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
      osc.connect(gain);
      gain.connect(villainAudioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    }

    if (isKo) {
      const koOsc = villainAudioCtx.createOscillator();
      const koGain = villainAudioCtx.createGain();
      koOsc.type = "triangle";
      koOsc.frequency.setValueAtTime(440, now + 0.08);
      koOsc.frequency.exponentialRampToValueAtTime(95, now + 0.45);
      koGain.gain.setValueAtTime(0.3, now + 0.08);
      koGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      koOsc.connect(koGain);
      koGain.connect(villainAudioCtx.destination);
      koOsc.start(now + 0.08);
      koOsc.stop(now + 0.45);
    }
  } catch (e) {
    // 오디오 컨텍스트 제한 시 무시
  }
}

function getVillainDamageOverlayHtml(hp) {
  if (hp > 70) {
    return `<span class="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-300 text-[#060608] shadow">😎 뻔뻔함 풀충전</span>`;
  }
  if (hp > 35) {
    return `
      <span class="absolute -top-2 -left-2 text-lg sm:text-xl animate-bounce">💦</span>
      <span class="absolute top-2 -right-2 text-base sm:text-lg rotate-12">🩹</span>
      <span class="absolute -bottom-2 right-0 px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-500 text-white shadow">😰 당황·식은땀</span>
    `;
  }
  if (hp > 0) {
    return `
      <span class="absolute -top-5 left-1/2 -translate-x-1/2 text-lg sm:text-xl animate-spin">💫</span>
      <span class="absolute top-0 -left-2 text-base sm:text-lg">💢</span>
      <span class="absolute bottom-1 -right-2 text-base sm:text-lg">🩹</span>
      <span class="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow whitespace-nowrap">😭 멘탈 붕괴 직전</span>
    `;
  }
  return `
    <span class="absolute -top-8 left-1/2 -translate-x-1/2 text-2xl sm:text-3xl animate-bounce">👻</span>
    <span class="absolute -top-2 -right-3 text-xl sm:text-2xl rotate-12">🏳️</span>
    <span class="absolute top-1 -left-2 text-base sm:text-lg">💫</span>
    <span class="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white border border-amber-300 shadow whitespace-nowrap">💀 영혼 가출 K.O.</span>
  `;
}

function selectVillainGameTarget(name) {
  villainGameTargetName = name;
  villainGameHp = 100;
  villainGameHits = 0;
  villainGameCombo = 0;
  villainGameStamps = [];
  const container = document.getElementById("modeDedicatedViewContainer") || document.getElementById("modeDedicatedSection");
  if (container) renderVillainModeUI(container);
}

function getVillainWeaponCursorUrl(emoji) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><text x="24" y="34" font-size="30" text-anchor="middle">${emoji}</text></svg>`;
  return `url('data:image/svg+xml;utf8,${encodeURIComponent(svg)}') 24 24, crosshair`;
}

function moveVillainWeaponCursor(event) {
  const arenaBox = document.getElementById("villainArenaBox");
  const cursorEl = document.getElementById("villainFloatingWeaponCursor");
  if (!arenaBox || !cursorEl || !event) return;
  const rect = arenaBox.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  cursorEl.style.left = `${x}px`;
  cursorEl.style.top = `${y}px`;
  cursorEl.classList.remove("opacity-0");
}

function hideVillainWeaponCursor() {
  const cursorEl = document.getElementById("villainFloatingWeaponCursor");
  if (cursorEl) cursorEl.classList.add("opacity-0");
}

function selectVillainWeapon(idx) {
  villainGameWeaponIdx = Number(idx) || 0;
  const container = document.getElementById("modeDedicatedViewContainer") || document.getElementById("modeDedicatedSection");
  if (container) renderVillainModeUI(container);
}

function resetVillainGame() {
  villainGameHp = 100;
  villainGameHits = 0;
  villainGameCombo = 0;
  villainGameStamps = [];
  const container = document.getElementById("modeDedicatedViewContainer") || document.getElementById("modeDedicatedSection");
  if (container) renderVillainModeUI(container);
}

function hitVillainTarget(event) {
  if (event) event.stopPropagation();
  const acadVillain = (currentData && currentData.academicMetrics && currentData.academicMetrics.villain) || null;
  if (!acadVillain || !acadVillain.profiles) return;

  const profiles = acadVillain.profiles;
  const topVillain = acadVillain.topVillain || profiles[profiles.length - 1];
  const targetProfile = profiles.find(p => p.name === villainGameTargetName) || topVillain;
  const weapon = VILLAIN_WEAPONS[villainGameWeaponIdx] || VILLAIN_WEAPONS[0];

  const wasAlive = villainGameHp > 0;
  if (villainGameHp <= 0) {
    villainGameHits += 1;
    villainGameCombo += 1;
  } else {
    const pctDmg = Math.max(8, Math.round(weapon.dmg / 3.2));
    villainGameHp = Math.max(0, villainGameHp - pctDmg);
    villainGameHits += 1;
    villainGameCombo += 1;
    if (villainGameHp === 0 && typeof triggerConfetti === "function") {
      triggerConfetti();
    }
  }
  const justKo = wasAlive && villainGameHp === 0;
  playVillainHitSound(weapon.id, justKo);

  if (villainGameStamps.length < 16) {
    villainGameStamps.push({
      label: weapon.stamp,
      top: Math.floor(12 + Math.random() * 72),
      left: Math.floor(18 + Math.random() * 64),
      rot: Math.floor(-32 + Math.random() * 64)
    });
  }

  if (villainGameComboTimer) clearTimeout(villainGameComboTimer);
  villainGameComboTimer = setTimeout(() => {
    villainGameCombo = 0;
    const comboEl = document.getElementById("villainComboBadge");
    if (comboEl) comboEl.classList.add("opacity-0");
  }, 2400);

  // DOM 요소 참조
  const arenaBox = document.getElementById("villainArenaBox");
  const avatarBox = document.getElementById("villainSandbagBox");
  const headEl = document.getElementById("villainRagdollHead");
  const armLeftEl = document.getElementById("villainArmLeft");
  const armRightEl = document.getElementById("villainArmRight");
  const legLeftEl = document.getElementById("villainLegLeft");
  const legRightEl = document.getElementById("villainLegRight");
  const dmgOverlayEl = document.getElementById("villainDamageOverlay");
  const hpBar = document.getElementById("villainHpBar");
  const hpText = document.getElementById("villainHpText");
  const speechText = document.getElementById("villainSpeechBubble");
  const comboEl = document.getElementById("villainComboBadge");
  const hitCountEl = document.getElementById("villainHitCount");
  const koBanner = document.getElementById("villainKoBanner");
  const stampsLayer = document.getElementById("villainStampsLayer");
  const cursorInnerEl = document.getElementById("villainFloatingWeaponCursorInner");

  // 마우스 따라다니는 무기 커서 자체도 타격 순간 스윙 반동 애니메이션
  if (cursorInnerEl) {
    cursorInnerEl.style.transform = "rotate(-55deg) scale(1.45)";
    setTimeout(() => {
      if (cursorInnerEl) cursorInnerEl.style.transform = "rotate(-12deg) scale(1)";
    }, 130);
  }

  // 1. 클릭 위치 기반 방향성 물리 넉백(Directional Knockback) + 관절형 래그돌 사지 파닥거림
  if (avatarBox && arenaBox) {
    const arenaRect = arenaBox.getBoundingClientRect();
    const boxRect = avatarBox.getBoundingClientRect();
    const centerX = boxRect.left + boxRect.width / 2;
    const centerY = boxRect.top + boxRect.height / 2;

    const clickX = (event && event.clientX) ? event.clientX : centerX + (Math.random() * 40 - 20);
    const clickY = (event && event.clientY) ? event.clientY : centerY + (Math.random() * 40 - 20);

    // 타격 지점 반대 방향으로 튕겨나가는 벡터 산출
    const deltaX = centerX - clickX;
    const deltaY = centerY - clickY;
    const forceMult = Math.min(2.2, 0.85 + weapon.dmg / 95);
    const knockX = Math.max(-46, Math.min(46, Math.round((deltaX || (villainGameHits % 2 === 0 ? 22 : -22)) * 0.45 * forceMult)));
    const knockY = Math.max(-28, Math.min(28, Math.round((deltaY || -16) * 0.35 * forceMult)));
    const tiltDeg = Math.max(-32, Math.min(32, Math.round((knockX >= 0 ? 1 : -1) * (14 + weapon.dmg * 0.11))));

    // Squash & Stretch (타격 순간 납작해지며 반대쪽으로 튕김)
    avatarBox.style.transition = "transform 75ms cubic-bezier(0.2, 0.9, 0.3, 1.3)";
    avatarBox.style.transform = `translate(${knockX}px, ${knockY}px) rotate(${tiltDeg}deg) scale(1.16, 0.82)`;

    // 머리·양팔·양다리 관절 독립 회전
    if (headEl) {
      const headRot = (villainGameHits % 2 === 0 ? -24 : 24) + Math.round(knockX * 0.3);
      headEl.style.transform = `rotate(${headRot}deg) translateY(-4px) scale(1.06, 0.92)`;
    }
    if (armLeftEl) {
      const armLRot = 45 + Math.floor(Math.random() * 75);
      armLeftEl.style.transform = `rotate(${armLRot}deg)`;
    }
    if (armRightEl) {
      const armRRot = -(45 + Math.floor(Math.random() * 75));
      armRightEl.style.transform = `rotate(${armRRot}deg)`;
    }
    if (legLeftEl) {
      const legLRot = 18 + Math.floor(Math.random() * 42);
      legLeftEl.style.transform = `rotate(${legLRot}deg)`;
    }
    if (legRightEl) {
      const legRRot = -(18 + Math.floor(Math.random() * 42));
      legRightEl.style.transform = `rotate(${legRRot}deg)`;
    }

    if (villainGameBounceTimer) clearTimeout(villainGameBounceTimer);
    villainGameBounceTimer = setTimeout(() => {
      if (!avatarBox) return;
      avatarBox.style.transition = "transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1)";
      if (villainGameHp <= 0) {
        avatarBox.style.transform = "translate(0px, 24px) rotate(-78deg) scale(1.05, 0.88)";
        if (headEl) headEl.style.transform = "rotate(-18deg)";
        if (armLeftEl) armLeftEl.style.transform = "rotate(115deg)";
        if (armRightEl) armRightEl.style.transform = "rotate(-95deg)";
        if (legLeftEl) legLeftEl.style.transform = "rotate(28deg)";
        if (legRightEl) legRightEl.style.transform = "rotate(-32deg)";
      } else {
        avatarBox.style.transform = "translate(0px, 0px) rotate(0deg) scale(1)";
        if (headEl) headEl.style.transform = "rotate(0deg) scale(1)";
        if (armLeftEl) armLeftEl.style.transform = "rotate(14deg)";
        if (armRightEl) armRightEl.style.transform = "rotate(-14deg)";
        if (legLeftEl) legLeftEl.style.transform = "rotate(4deg)";
        if (legRightEl) legRightEl.style.transform = "rotate(-4deg)";
      }
    }, 95);

    // 2. 고위력 무기 타격 시 아레나 지진
    if (weapon.dmg >= 60) {
      arenaBox.classList.remove("villain-arena-shake");
      void arenaBox.offsetWidth;
      arenaBox.classList.add("villain-arena-shake");
    }

    // 아레나 내부 상대 좌표 (마우스 커서 위치 & 타겟 중심 좌표)
    const relX = Math.max(24, Math.min(arenaRect.width - 24, clickX - arenaRect.left));
    const relY = Math.max(24, Math.min(arenaRect.height - 24, clickY - arenaRect.top));
    const targetRelX = centerX - arenaRect.left + (Math.random() * 28 - 14);
    const targetRelY = centerY - arenaRect.top - 12 + (Math.random() * 28 - 14);

    // 3. 마우스 커서로부터 무기가 날아가 타겟에 꽂히는 발사체(Projectile) + 타격 스윙 연출
    const projEl = document.createElement("div");
    projEl.className = "pointer-events-none absolute z-40 select-none transition-all duration-150 ease-out";
    projEl.style.left = `${relX}px`;
    projEl.style.top = `${relY}px`;
    projEl.style.transform = "translate(-50%, -50%) rotate(-45deg) scale(1.15)";
    projEl.innerHTML = `<div class="text-4xl sm:text-5xl drop-shadow-[0_10px_20px_rgba(0,0,0,0.95)]">${weapon.icon}</div>`;
    arenaBox.appendChild(projEl);

    requestAnimationFrame(() => {
      projEl.style.left = `${targetRelX}px`;
      projEl.style.top = `${targetRelY}px`;
      projEl.style.transform = "translate(-50%, -50%) rotate(320deg) scale(1.45)";
    });
    setTimeout(() => projEl.remove(), 170);

    // 타격 지점 무기 슬래시/임팩트 이펙트
    const weaponFxEl = document.createElement("div");
    weaponFxEl.className = "pointer-events-none absolute z-30 select-none";
    weaponFxEl.style.left = `${targetRelX}px`;
    weaponFxEl.style.top = `${targetRelY}px`;

    if (weapon.id === "laser") {
      const slashAngle = Math.floor(-45 + Math.random() * 90);
      weaponFxEl.innerHTML = `
        <div class="w-64 sm:w-80 h-2.5 rounded-full bg-gradient-to-r from-transparent via-emerald-300 to-transparent shadow-[0_0_30px_#10b981]" style="transform: translate(-50%, -50%) rotate(${slashAngle}deg);"></div>
      `;
    } else {
      weaponFxEl.innerHTML = `<div class="text-5xl sm:text-6xl drop-shadow-[0_10px_20px_rgba(0,0,0,0.9)] transition-all duration-200" style="transform: translate(-50%, -50%) rotate(-35deg) scale(1.3);">${weapon.icon}</div>`;
    }
    arenaBox.appendChild(weaponFxEl);
    requestAnimationFrame(() => {
      const inner = weaponFxEl.firstElementChild;
      if (inner) {
        inner.style.transform = weapon.id === "laser"
          ? "translate(-50%, -50%) scaleX(1.35) scaleY(0.2)"
          : "translate(-50%, -50%) rotate(25deg) scale(0.85)";
        inner.style.opacity = "0";
      }
    });
    setTimeout(() => weaponFxEl.remove(), 240);

    // 4. 원형 충격파 링 (Shockwave Ring)
    const ringEl = document.createElement("div");
    ringEl.className = `pointer-events-none absolute z-20 w-10 h-10 rounded-full border-4 ${weapon.ringColor || "border-rose-400"} opacity-90 transition-all duration-300 ease-out`;
    ringEl.style.left = `${targetRelX}px`;
    ringEl.style.top = `${targetRelY}px`;
    ringEl.style.transform = "translate(-50%, -50%) scale(0.3)";
    arenaBox.appendChild(ringEl);
    requestAnimationFrame(() => {
      ringEl.style.transform = `translate(-50%, -50%) scale(${weapon.dmg >= 85 ? 3.4 : 2.3})`;
      ringEl.style.opacity = "0";
    });
    setTimeout(() => ringEl.remove(), 320);

    // 5. 방사형 타격 파티클
    const particlePool = weapon.particles || ["💥", "💢", "✨"];
    const particleCount = weapon.id === "ppt" ? 8 : weapon.dmg >= 60 ? 7 : 5;
    for (let i = 0; i < particleCount; i++) {
      const pEl = document.createElement("span");
      pEl.className = "pointer-events-none absolute z-30 text-base sm:text-xl select-none transition-all duration-500 ease-out";
      pEl.innerText = particlePool[i % particlePool.length];
      pEl.style.left = `${targetRelX}px`;
      pEl.style.top = `${targetRelY}px`;
      pEl.style.transform = "translate(-50%, -50%) scale(0.8)";
      arenaBox.appendChild(pEl);

      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() * 0.5 - 0.25);
      const dist = 48 + Math.random() * 68;
      const tx = Math.round(Math.cos(angle) * dist);
      const ty = Math.round(Math.sin(angle) * dist) + (weapon.id === "ppt" ? 24 : 0);
      const rot = Math.round(-140 + Math.random() * 280);

      requestAnimationFrame(() => {
        pEl.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) rotate(${rot}deg) scale(1.15)`;
        pEl.style.opacity = "0";
      });
      setTimeout(() => pEl.remove(), 520);
    }

    // 6. 플로팅 데미지 팝업 생성
    const floatEl = document.createElement("div");
    floatEl.className = `pointer-events-none absolute z-40 font-black text-base sm:text-xl ${weapon.color} drop-shadow-[0_4px_12px_rgba(0,0,0,0.95)] transition-all duration-500 whitespace-nowrap`;
    floatEl.style.left = `${targetRelX}px`;
    floatEl.style.top = `${Math.max(24, targetRelY - 28)}px`;
    floatEl.style.transform = "translate(-50%, 0) scale(0.95)";
    floatEl.innerText = `${weapon.icon} -${weapon.dmg} ${weapon.hitText}`;
    arenaBox.appendChild(floatEl);
    requestAnimationFrame(() => {
      floatEl.style.transform = "translate(-50%, -44px) scale(1.14)";
      floatEl.style.opacity = "0";
    });
    setTimeout(() => floatEl.remove(), 520);
  }

  if (dmgOverlayEl) {
    dmgOverlayEl.innerHTML = getVillainDamageOverlayHtml(villainGameHp);
  }

  if (hpBar) {
    hpBar.style.width = `${villainGameHp}%`;
    hpBar.className = `h-full rounded-full transition-all duration-200 ${
      villainGameHp > 60 ? "bg-gradient-to-r from-rose-500 to-amber-400" : villainGameHp > 25 ? "bg-gradient-to-r from-amber-500 to-orange-500" : "bg-rose-600"
    }`;
  }
  if (hpText) {
    hpText.innerText = villainGameHp <= 0 ? "0% (참교육 K.O.!)" : `${villainGameHp}%`;
  }
  if (hitCountEl) {
    hitCountEl.innerText = `${villainGameHits}회 타격`;
  }
  if (comboEl) {
    comboEl.classList.remove("opacity-0");
    comboEl.innerText = `🔥 ${villainGameCombo} COMBO!`;
  }
  if (stampsLayer) {
    stampsLayer.innerHTML = villainGameStamps.map(s => `
      <span class="pointer-events-none absolute px-1.5 py-0.5 rounded text-xs sm:text-sm font-black ${
        s.label.includes("[") ? "bg-rose-600 text-white border border-white/60 shadow-lg" : "text-lg sm:text-xl"
      }" style="top:${s.top}%;left:${s.left}%;transform:translate(-50%,-50%) rotate(${s.rot}deg);">${s.label}</span>
    `).join("");
  }

  if (speechText) {
    const memberObj = (currentData.members || []).find(m => m.name === targetProfile.name);
    const realQuote = (memberObj && memberObj.quotes && memberObj.quotes[0]) || "아 넵!! 저는 다 좋습니다 ㅎㅎ";
    if (villainGameHp > 70) {
      speechText.innerText = `"${realQuote}" (아직 정신 못 차리고 뻔뻔하게 변명 중!)`;
    } else if (villainGameHp > 35) {
      speechText.innerText = `"잠깐만요!! 지금 노트북 켜고 있어요!! 진짜 오늘 밤까지 올릴게요 ㅠㅠ"`;
    } else if (villainGameHp > 0) {
      speechText.innerText = `"살려주세요!! PPT 발표자 명단에서 제 이름만은 빼지 말아 주세요 ㅠㅠ 제발!!"`;
    } else {
      speechText.innerText = `💀 [참교육 완료] "제가 잘못했습니다... 지금 당장 결론 장표 30페이지 밤새서 만들겠습니다!!"`;
    }
  }

  if (koBanner) {
    if (villainGameHp <= 0) {
      koBanner.classList.remove("hidden");
    } else {
      koBanner.classList.add("hidden");
    }
  }
}

function getVillainRoleBadgeText(p) {
  if (!p) return "";
  if (!isVillainMildMode) return p.roleBadge || "";
  if (p.mildRoleBadge) return p.mildRoleBadge;
  return String(p.roleBadge || "")
    .replace(/영혼 없는 네무새 버러지/g, "영혼 없는 네무새 요정")
    .replace(/무임승차 버러지/g, "소통이 필요한 잠수러")
    .replace(/연락두절 잠수 빌런/g, "소통이 필요한 잠수러")
    .replace(/무임승차 빌런/g, "소통이 필요한 잠수러")
    .replace(/버러지/g, "주의 요망")
    .replace(/빌런/g, "잠수러");
}

function getVillainDiagnosisText(p) {
  if (!p) return "";
  if (!isVillainMildMode) return p.diagnosis || "";
  if (p.mildDiagnosis) return p.mildDiagnosis;
  return String(p.diagnosis || "")
    .replace(/무임승차 버러지/g, "소통이 필요한 잠수러")
    .replace(/네무새 버러지/g, "네무새 요정")
    .replace(/버러지/g, "잠수러")
    .replace(/빌런/g, "소통 주의 조원")
    .replace(/강제 수면 중입니다/g, "응답을 기다리는 중입니다")
    .replace(/증발했습니다/g, "소통이 뜸했습니다");
}

function renderVillainModeUI(container) {
  const acadVillain = (currentData.academicMetrics && currentData.academicMetrics.villain) || null;
  if (!acadVillain || !acadVillain.profiles || acadVillain.profiles.length === 0) return;

  const profiles = acadVillain.profiles;
  const topVillain = acadVillain.topVillain || profiles[profiles.length - 1];
  const topHero = acadVillain.topHero || profiles[0];
  const vChar = getCharData(topVillain.cti);
  const hChar = getCharData(topHero.cti);

  if (!villainGameTargetName || !profiles.some(p => p.name === villainGameTargetName)) {
    villainGameTargetName = topVillain.name;
  }

  // 기여도 순 정렬 / 빌런 위험도 순 정렬
  const contribSorted = [...profiles].sort((a, b) => b.contributionScore - a.contributionScore);
  const villainSorted = [...profiles].sort((a, b) => b.loafingScore - a.loafingScore);
  const activeList = currentVillainSort === "villain" ? villainSorted : contribSorted;

  // 상위 2인의 과제 독박 비중
  const totalContrib = Math.max(1, contribSorted.reduce((acc, p) => acc + (p.contributionScore || 0), 0));
  const topTwoContrib = contribSorted.slice(0, Math.min(2, contribSorted.length)).reduce((acc, p) => acc + (p.contributionScore || 0), 0);
  const carryConcentration = Math.min(92, Math.round((topTwoContrib / totalContrib) * 100));

  const gradeColors = {
    "A+": "bg-emerald-400 text-[#060608]",
    "A": "bg-teal-400 text-[#060608]",
    "B+": "bg-sky-400 text-[#060608]",
    "B": "bg-amber-400 text-[#060608]",
    "C-": "bg-orange-500 text-white",
    "F": "bg-rose-500 text-white"
  };

  // Phase 3-1: 조별과제 표현 수위 조절 토글 (🌶️ 매운맛 / 🌱 순한맛)
  const spiceToggleBarHtml = `
    <div class="flex flex-wrap items-center justify-between gap-3 p-4 rounded-3xl bg-[#0d0f16]/95 border border-emerald-400/25">
      <div class="flex items-center gap-2.5">
        <span class="px-2.5 py-1 rounded-full text-xs font-black ${isVillainMildMode ? "bg-emerald-400 text-[#060608]" : "bg-rose-500 text-white"}">
          ${isVillainMildMode ? "🌱 순한맛 (평화 모드)" : "🌶️ 매운맛 (팩폭 모드)"}
        </span>
        <span class="text-xs sm:text-sm font-bold text-[#d4d7e0]">
          ${isVillainMildMode
            ? "실제 강의 조별과제 단톡방에도 부담 없이 공유할 수 있도록 위트 있고 완화된 표현으로 표시됩니다."
            : "직설적인 팩폭 워딩이 적용된 기본 모드입니다. 단톡방 공유 시 순한맛으로 전환해 보세요!"}
        </span>
      </div>
      <div class="flex items-center gap-1.5 p-1 rounded-2xl bg-[#141722] border border-white/[0.08]">
        <button onclick="setVillainSpiceMode(false)" class="px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
          !isVillainMildMode
            ? "bg-rose-500 text-white shadow-[0_2px_12px_rgba(244,63,94,0.35)]"
            : "text-[#8e929f] hover:text-white"
        }">
          🌶️ 매운맛 (팩폭 모드)
        </button>
        <button onclick="setVillainSpiceMode(true)" class="px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
          isVillainMildMode
            ? "bg-emerald-400 text-[#060608] shadow-[0_2px_12px_rgba(52,211,153,0.35)]"
            : "text-[#8e929f] hover:text-white"
        }">
          🌱 순한맛 (평화 모드)
        </button>
      </div>
    </div>
  `;

  // 서브 탭 네비게이션 바 (BUG-02-4: 4번 탭 이모지 중복 제거)
  const villainTabs = [
    { key: "ranking", emoji: "🏆", label: isVillainMildMode ? "1. 기여도 시상식대 & 무임승차 주의보" : "1. 기여도 시상식대 & 버러지 바닥" },
    { key: "spotlight", emoji: "⚖️", label: isVillainMildMode ? "2. 하드캐리 1위 vs 잠수러 1위" : "2. 하드캐리 1위 vs 빌런 1위" },
    { key: "evidence", emoji: "💬", label: "3. 실제 단톡방 증거 대화" },
    { key: "peer", emoji: "🥊", label: "4. 빌런 참교육 샌드백 게임" }
  ];

  const subTabNavHtml = `
    <div class="flex flex-wrap items-center gap-2 p-2 rounded-3xl bg-[#0d0f16]/95 border border-emerald-400/25">
      ${villainTabs.map(t => {
        const isActive = currentVillainSubTab === t.key;
        return `
          <button onclick="setVillainSubTab('${t.key}')" class="flex-1 min-w-[140px] py-3 px-4 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            isActive
              ? "bg-gradient-to-r from-emerald-400 to-teal-400 text-[#060608] shadow-[0_4px_20px_rgba(52,211,153,0.35)]"
              : "bg-white/[0.03] hover:bg-white/[0.08] text-[#d4d7e0]"
          }">
            <span>${t.emoji} ${t.label}</span>
          </button>
        `;
      }).join("")}
    </div>
  `;

  // 상단 한눈에 보는 핵심 요약 배너
  const topSummaryStripHtml = `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="p-5 rounded-3xl bg-gradient-to-br from-emerald-500/15 to-[#0d0f16] border border-emerald-400/35 flex items-center justify-between">
        <div>
          <span class="text-xs font-black text-emerald-300">👑 멱살 잡고 캐리한 총대장 1위</span>
          <div class="text-2xl sm:text-3xl font-black text-[#f4f4f6] mt-1">${topHero.name}</div>
          <span class="text-xs text-[#d4d7e0] font-bold">기여 점수 ${topHero.contributionScore}점 • 실무 자료 ${topHero.workShareCount || 0}회 • 학점 ${topHero.grade}</span>
        </div>
        <img src="${hChar.img}" alt="${topHero.name}" class="w-16 h-16 rounded-full bg-[#11191a] p-1.5 border-2 border-emerald-400 object-contain shrink-0">
      </div>

      <div class="p-5 rounded-3xl bg-gradient-to-br from-rose-500/15 to-[#0d0f16] border border-rose-500/40 flex items-center justify-between">
        <div>
          <span class="text-xs font-black text-rose-300">${isVillainMildMode ? "🌱 소통이 필요한 잠수러 1위" : "🐛 바닥 기는 무임승차 버러지 1위"}</span>
          <div class="text-2xl sm:text-3xl font-black text-[#f4f4f6] mt-1">${topVillain.name}</div>
          <span class="text-xs text-rose-300 font-bold">${isVillainMildMode ? "소통 필요 지수" : "빌런 위험도"} ${topVillain.loafingScore}% • 실무 자료 ${topVillain.workShareCount || 0}회 • 학점 ${topVillain.grade}</span>
        </div>
        <img src="${vChar.img}" alt="${topVillain.name}" class="w-16 h-16 rounded-full bg-[#1c1116] p-1.5 border-2 border-rose-500 object-contain shrink-0">
      </div>

      <div class="p-5 rounded-3xl bg-[#0d0f16]/90 border border-white/[0.08] flex flex-col justify-center">
        <span class="text-xs font-bold text-[#8e929f]">상위 2명에게 몰린 과제 독박 비율</span>
        <div class="flex items-baseline gap-2 mt-1">
          <span class="text-3xl sm:text-4xl font-black text-amber-300">${carryConcentration}%</span>
          <span class="text-xs text-[#8e929f]">/ 1인당 공평 기준 ${acadVillain.fairShare}%</span>
        </div>
        <p class="text-xs text-[#d4d7e0] mt-1">시상식대 위 소수 인원이 과제를 통째로 떠안았습니다</p>
      </div>
    </div>
  `;

  let subTabBodyHtml = "";

  if (currentVillainSubTab === "ranking") {
    // 시상식대(Podium) 인원 vs 바닥 인원(Crawlers) 분리
    let podiumMembers = contribSorted.filter(p => p.loafingScore < 55 && p.grade !== "F" && p.grade !== "C-").slice(0, 3);
    if (podiumMembers.length === 0) {
      podiumMembers = contribSorted.slice(0, Math.min(2, contribSorted.length));
    }
    const podiumNames = new Set(podiumMembers.map(p => p.name));
    let crawlerMembers = contribSorted.filter(p => !podiumNames.has(p.name));
    if (crawlerMembers.length === 0 && contribSorted.length > 1) {
      const lastM = contribSorted[contribSorted.length - 1];
      crawlerMembers = [lastM];
      podiumMembers = podiumMembers.filter(p => p.name !== lastM.name);
    }

    // 시상식대 배치 순서: [2위(좌), 1위(중앙 최고 높이), 3위(우)]
    const podiumSlots = [];
    if (podiumMembers[1]) podiumSlots.push({ member: podiumMembers[1], rank: 2 });
    if (podiumMembers[0]) podiumSlots.push({ member: podiumMembers[0], rank: 1 });
    if (podiumMembers[2]) podiumSlots.push({ member: podiumMembers[2], rank: 3 });

    const podiumColumnsHtml = podiumSlots.map(slot => {
      const p = slot.member;
      const r = slot.rank;
      const cInfo = getCharData(p.cti);
      const heightClass = r === 1 ? "h-40 sm:h-48" : r === 2 ? "h-28 sm:h-36" : "h-24 sm:h-28";
      const pillarStyle = r === 1
        ? "bg-gradient-to-t from-[#14261f] via-emerald-500/25 to-amber-400/35 border-t-4 border-amber-300 shadow-[0_-10px_35px_rgba(245,183,61,0.25)]"
        : r === 2
        ? "bg-gradient-to-t from-[#121c24] via-teal-500/20 to-sky-400/25 border-t-4 border-sky-300"
        : "bg-gradient-to-t from-[#161822] via-indigo-500/15 to-purple-400/20 border-t-4 border-purple-300";
      const crownIcon = r === 1 ? "👑 1st 하드캐리 총대장" : r === 2 ? "🥈 2nd 실무 에이스" : "🥉 3rd 든든 조원";

      return `
        <div class="flex flex-col items-center justify-end flex-1 max-w-[220px]">
          <!-- 시상식대 위 빛나는 캐릭터 -->
          <div class="flex flex-col items-center text-center mb-3 space-y-1">
            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-black ${r === 1 ? "bg-amber-300 text-[#060608] shadow-md" : "bg-emerald-400/20 text-emerald-300 border border-emerald-400/35"}">${crownIcon}</span>
            <div class="relative mt-1">
              <div class="${r === 1 ? "w-20 h-20 sm:w-24 sm:h-24 border-amber-300 shadow-[0_0_30px_rgba(245,183,61,0.4)]" : "w-16 h-16 sm:w-20 sm:h-20 border-emerald-400/60"} rounded-full bg-[#11191a] p-2 border-2 flex items-center justify-center">
                <img src="${cInfo.img}" alt="${p.name}" class="w-full h-full object-contain">
              </div>
              <span class="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-lg text-[11px] font-black ${gradeColors[p.grade] || "bg-emerald-400 text-black"}">학점 ${p.grade}</span>
            </div>
            <div class="text-base sm:text-xl font-black text-[#f4f4f6] pt-1">${p.name}</div>
            <div class="text-xs font-bold text-emerald-300">기여도 ${p.contributionScore}점 · 자료공유 ${p.workShareCount || 0}회</div>
          </div>

          <!-- 단상 기둥 -->
          <div class="w-full ${heightClass} ${pillarStyle} rounded-t-3xl border-x border-white/[0.1] flex flex-col items-center justify-center p-3 text-center relative overflow-hidden">
            <span class="text-2xl sm:text-4xl font-black ${r === 1 ? "text-amber-300" : "text-[#f4f4f6]/80"}">${r}위</span>
            <span class="text-[11px] sm:text-xs font-bold text-[#d4d7e0] mt-1 line-clamp-1">${getVillainRoleBadgeText(p)}</span>
          </div>
        </div>
      `;
    }).join("");

    const crawlersFloorHtml = crawlerMembers.map((p, idx) => {
      const cInfo = getCharData(p.cti);
      const memberObj = (currentData.members || []).find(m => m.name === p.name);
      const excuseQuote = (memberObj && memberObj.quotes && memberObj.quotes[0]) || (p.tokenRatio >= 35 ? "넵!! 저는 다 좋습니다 ㅎㅎ" : "아 알바 중이라 지금 봤네요;;");
      const isWorst = p.name === topVillain.name;

      return `
        <div class="p-4 rounded-2xl bg-[#140b0f]/95 border ${isWorst ? "border-rose-500/50 shadow-[0_0_25px_rgba(244,63,94,0.2)]" : "border-rose-500/25"} flex items-center justify-between gap-4 relative overflow-hidden">
          <div class="flex items-center gap-3.5 min-w-0">
            <!-- 바닥에서 납작하게 기어가는 아바타 연출 -->
            <div class="relative shrink-0">
              <div class="w-14 h-14 rounded-2xl bg-[#1f1016] p-1.5 border border-rose-500/40 flex items-center justify-center" style="transform: rotate(-14deg) scale(1.06, 0.82);">
                <img src="${cInfo.img}" alt="${p.name}" class="w-full h-full object-contain opacity-90">
              </div>
              <span class="absolute -top-2 -left-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow">${isVillainMildMode ? "🌱 주의 구간" : "🐛 바닥 기는 중"}</span>
            </div>

            <div class="space-y-1 text-left min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-base sm:text-lg font-black text-rose-200">${p.name}</span>
                <span class="px-2 py-0.5 rounded text-xs font-black bg-rose-500 text-white">학점 ${p.grade}</span>
                <span class="text-xs font-black text-rose-400">${getVillainRoleBadgeText(p)}</span>
              </div>
              <p class="text-xs text-[#d4d7e0] font-semibold truncate">💬 단골 변명·단답: <span class="text-amber-200">"${excuseQuote}"</span></p>
            </div>
          </div>

          <div class="flex items-center gap-4 shrink-0 text-right">
            <div>
              <span class="text-[10px] font-bold text-[#8e929f] block">기여 점수</span>
              <span class="text-base sm:text-lg font-black text-amber-300">${p.contributionScore}점</span>
            </div>
            <div>
              <span class="text-[10px] font-bold text-[#8e929f] block">${isVillainMildMode ? "주의 지수" : "빌런 위험도"}</span>
              <span class="text-base sm:text-lg font-black text-rose-400">${p.loafingScore}%</span>
            </div>
          </div>
        </div>
      `;
    }).join("");

    // 탭 1 하단: 한눈에 비교하는 컴팩트 핵심 수치 성적표 (다중 역할 & 약속 이행률 & 미세 신호 채증 & 복합 빌런 연동)
    const leaderboardRowsHtml = activeList.map((p, idx) => {
      const cInfo = getCharData(p.cti);
      const gBadge = gradeColors[p.grade] || "bg-white/10 text-white";
      const isVillainTop = p.loafingScore >= 55 || p.grade === "F" || p.grade === "C-";
      const rankBadgeClass = idx === 0
        ? (currentVillainSort === "villain" ? "bg-rose-500 text-white" : "bg-emerald-400 text-[#060608]")
        : "bg-white/[0.08] text-[#d4d7e0]";

      // 다중 임무 및 복합 빌런 태그 뱃지 렌더링
      const roles = (Array.isArray(p.assignedRoles) && p.assignedRoles.length > 0)
        ? p.assignedRoles
        : [p.roleBadge || "일반 조원"];
      const multiTags = (Array.isArray(p.multiVillainTags) && p.multiVillainTags.length > 0)
        ? p.multiVillainTags
        : [];
      const dRate = p.deliveryRate !== undefined ? p.deliveryRate : (p.contributionScore >= 60 ? 90 : 35);
      const microCount = p.totalMicroFlaws !== undefined ? p.totalMicroFlaws : (p.tokenRatio >= 35 ? 3 : 0);
      const ignoredCount = p.calloutsIgnored || 0;

      return `
        <tr class="border-b border-white/[0.06] last:border-none ${isVillainTop ? "bg-rose-500/[0.05] hover:bg-rose-500/[0.1]" : "hover:bg-white/[0.03]"} transition-colors">
          <td class="py-3.5 px-3 text-center whitespace-nowrap">
            <span class="inline-flex items-center justify-center w-7 h-7 rounded-lg font-black text-xs ${rankBadgeClass}">${idx + 1}</span>
          </td>
          <td class="py-3.5 px-3 whitespace-nowrap">
            <div class="flex items-center gap-2.5">
              <img src="${cInfo.img}" alt="${p.name}" class="w-9 h-9 rounded-full bg-[#141722] p-1 border border-white/[0.12] object-contain shrink-0">
              <div>
                <div class="flex items-center gap-1.5">
                  <span class="text-sm sm:text-base font-black text-[#f4f4f6]">${p.name}</span>
                  <span class="text-[10px] font-black px-1.5 py-0.5 rounded ${gBadge}">${p.grade}</span>
                </div>
                <div class="flex flex-wrap items-center gap-1 mt-0.5">
                  ${roles.map(r => `<span class="text-[10px] font-black px-1.5 py-0.2 rounded bg-white/[0.07] text-emerald-300 border border-emerald-400/20">${r}</span>`).join("")}
                </div>
                ${multiTags.length > 0 ? `
                  <div class="flex flex-wrap items-center gap-1 mt-1">
                    ${multiTags.map(t => `<span class="text-[9px] font-black px-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">${t}</span>`).join("")}
                  </div>
                ` : ""}
              </div>
            </div>
          </td>
          <td class="py-3.5 px-3 text-center whitespace-nowrap">
            <span class="text-base sm:text-lg font-black ${p.contributionScore >= 65 ? "text-emerald-400" : p.contributionScore >= 40 ? "text-amber-300" : "text-rose-400"}">${p.contributionScore}점</span>
          </td>
          <td class="py-3.5 px-3 text-center whitespace-nowrap">
            <span class="text-base sm:text-lg font-black ${p.loafingScore >= 60 ? "text-rose-400" : p.loafingScore >= 35 ? "text-amber-300" : "text-emerald-400"}">${p.loafingScore}%</span>
          </td>
          <td class="py-3.5 px-3 text-center whitespace-nowrap">
            <span class="px-2 py-0.5 rounded text-xs font-black ${dRate >= 70 ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}">${dRate}%</span>
            <span class="text-[10px] text-[#8e929f] block mt-0.5">약속 대비 이행</span>
          </td>
          <td class="py-3.5 px-3 text-center whitespace-nowrap">
            <span class="px-2 py-0.5 rounded-md text-xs font-black bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">${p.workShareCount || 0}회</span>
            <span class="text-[10px] text-[#8e929f] block mt-0.5">파일${p.fileShares || 0}·링크${p.linkShares || 0}·사진${p.photoShares || 0}</span>
          </td>
          <td class="py-3.5 px-3 text-center whitespace-nowrap">
            <span class="text-xs sm:text-sm font-black ${microCount >= 2 ? "text-rose-300" : "text-[#d4d7e0]"}">${microCount}건</span>
            <span class="text-[10px] text-[#8e929f] block">단답 ${p.tokenRatio}%</span>
          </td>
          <td class="py-3.5 px-3 text-center whitespace-nowrap">
            <span class="text-xs sm:text-sm font-black ${p.replySpeed >= 45 ? "text-rose-300" : "text-[#d4d7e0]"}">${p.replySpeed}분</span>
            ${ignoredCount > 0 ? `<span class="text-[10px] text-rose-400 font-bold block">호명무시 ${ignoredCount}회</span>` : ""}
          </td>
        </tr>
      `;
    }).join("");

    subTabBodyHtml = `
      <div class="space-y-6">
        <!-- 🏆 조별과제 기여도 시상식대 & 무임승차 구간 -->
        <div class="rounded-[32px] p-6 sm:p-8 bg-gradient-to-b from-[#111922] via-[#0d1017] to-[#12090d] border border-emerald-400/30 space-y-6 overflow-hidden">
          <div class="text-center space-y-1.5">
            <span class="px-3.5 py-1 rounded-full text-xs font-black bg-amber-300 text-[#060608]">${isVillainMildMode ? "🏆 조별과제 명예의 시상식대 vs 🌱 무임승차 주의보 구간" : "🏆 조별과제 명예의 시상식대 vs 🐛 밑바닥 버러지"}</span>
            <h4 class="text-2xl sm:text-3xl font-black text-[#f4f4f6] pt-1">
              ${isVillainMildMode ? "하드캐리 조원은 단상 위로, 소통이 필요한 조원은 분발 구간으로!" : "하드캐리 조원은 단상 위로, 무임승차 빌런은 시상식대 밑바닥으로!"}
            </h4>
            <p class="text-xs sm:text-sm text-[#8e929f]">과제를 멱살 잡고 이끈 주역들과 추가적인 참여·소통이 필요한 인원을 분리했습니다.</p>
          </div>

          <!-- 시상식대 (Podium) -->
          <div class="pt-6 px-2 sm:px-8 flex items-end justify-center gap-3 sm:gap-6 border-b-4 border-emerald-400/40">
            ${podiumColumnsHtml}
          </div>

          <!-- 시상식대 밑바닥 (Crawling Villains Zone) -->
          <div class="rounded-3xl p-5 sm:p-6 bg-[#0b0608]/95 border-2 border-dashed border-rose-500/40 space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="px-3 py-1 rounded-full text-xs font-black bg-rose-600 text-white">${isVillainMildMode ? "🌱 시상식대 아래 • 무임승차 주의보 구간" : "🐛 시상식대 밑바닥 • 무임승차 버러지 서식지"}</span>
                <span class="text-xs font-bold text-rose-300">${isVillainMildMode ? "적극적인 과제 참여와 의견 공유가 필요합니다!" : "단상 위에 올라갈 자격 없음!"}</span>
              </div>
              <span class="text-xs text-[#8e929f]">상단 4번 [🥊 빌런 참교육 샌드백 게임] 탭에서 참교육할 수 있습니다</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              ${crawlersFloorHtml}
            </div>
          </div>
        </div>

        <!-- 한눈에 비교하는 핵심 수치 성적표 -->
        <div class="rounded-[32px] p-6 sm:p-8 bg-[#0d0f16]/90 border border-white/[0.07] space-y-5">
          <div class="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] pb-4">
            <div>
              <h4 class="text-xl sm:text-2xl font-black text-[#f4f4f6] flex items-center gap-2">
                <i class="fa-solid fa-table-list text-emerald-400"></i> 조원별 핵심 기여도 &amp; ${isVillainMildMode ? "참여도" : "빌런 지수"} 수치 성적표
              </h4>
              <p class="text-xs sm:text-sm text-[#8e929f] mt-1">대화 문맥으로 파악된 각 조원의 <b>담당 역할, 약속 이행률, 6대 미세 회피 채증</b> 수치를 한눈에 비교합니다.</p>
            </div>

            <div class="flex items-center gap-1.5 p-1 rounded-2xl bg-[#141722] border border-white/[0.08]">
              <button onclick="setVillainRankSort('contribution')" class="px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                currentVillainSort === "contribution"
                  ? "bg-emerald-400 text-[#060608] shadow"
                  : "text-[#8e929f] hover:text-white"
              }">
                🏆 기여 점수 높은 순
              </button>
              <button onclick="setVillainRankSort('villain')" class="px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                currentVillainSort === "villain"
                  ? "bg-rose-500 text-white shadow"
                  : "text-[#8e929f] hover:text-white"
              }">
                🚨 ${isVillainMildMode ? "주의 지수 높은 순" : "빌런 위험 순"}
              </button>
            </div>
          </div>

          <div class="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#090b10]">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-white/[0.08] bg-[#121622] text-[11px] font-black text-[#8e929f] uppercase">
                  <th class="py-3 px-3 text-center whitespace-nowrap">순위</th>
                  <th class="py-3 px-3 whitespace-nowrap">조원 · 담당 임무 (다중)</th>
                  <th class="py-3 px-3 text-center whitespace-nowrap text-emerald-300">기여 점수</th>
                  <th class="py-3 px-3 text-center whitespace-nowrap text-rose-300">${isVillainMildMode ? "주의 지수" : "빌런 위험도"}</th>
                  <th class="py-3 px-3 text-center whitespace-nowrap text-sky-300">임무 이행률</th>
                  <th class="py-3 px-3 text-center whitespace-nowrap">실무 자료 공유</th>
                  <th class="py-3 px-3 text-center whitespace-nowrap text-amber-300">미세 회피·핑계</th>
                  <th class="py-3 px-3 text-center whitespace-nowrap">평균 답장·호명</th>
                </tr>
              </thead>
              <tbody>
                ${leaderboardRowsHtml}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  } else if (currentVillainSubTab === "spotlight") {
    // 탭 2: 하드캐리 1위 vs 빌런 1위 집중 비교
    subTabBodyHtml = `
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <!-- 좌측 6열: 🏆 하드캐리 1위 -->
        <div class="lg:col-span-6 relative rounded-[32px] p-6 sm:p-8 bg-gradient-to-br from-emerald-500/15 via-[#0f1718] to-[#090a0f] border border-emerald-400/35 flex flex-col justify-between overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
          <div class="space-y-5">
            <div class="flex items-center justify-between">
              <span class="px-3.5 py-1 rounded-full text-xs font-black bg-emerald-400 text-[#060608]">👑 멱살 잡고 캐리한 총대장 1위</span>
              <span class="text-xs font-bold text-emerald-300">시상식대 1등석 주인</span>
            </div>

            <div class="flex items-center gap-4 pt-1">
              <div class="w-24 h-24 rounded-full bg-[#11191a] p-2.5 border-2 border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.25)] shrink-0">
                <img src="${hChar.img}" alt="${topHero.name}" class="w-full h-full object-contain">
              </div>
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="text-3xl sm:text-4xl font-black text-[#f4f4f6]">${topHero.name}</h3>
                  <span class="px-3 py-1 rounded-lg text-sm font-black bg-emerald-400 text-[#060608]">추천 학점 ${topHero.grade}</span>
                </div>
                <p class="text-base sm:text-lg font-black text-emerald-300 mt-1">${getVillainRoleBadgeText(topHero)} • 과제 참여 ${topHero.contributionScore}점</p>
              </div>
            </div>

            <p class="text-base sm:text-lg font-bold text-[#f4f4f6] leading-relaxed pt-4 border-t border-white/[0.08] break-keep">
              ${getVillainDiagnosisText(topHero)}
            </p>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-center">
              <div class="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                <span class="text-xs text-[#8e929f] block">전체 대화 비중</span>
                <span class="text-xl font-black text-emerald-300">${topHero.msgRatio}%</span>
              </div>
              <div class="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                <span class="text-xs text-[#8e929f] block">실무 자료 공유</span>
                <span class="text-xl font-black text-emerald-300">${topHero.workShareCount || 0}회</span>
              </div>
              <div class="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                <span class="text-xs text-[#8e929f] block">먼저 의견 제시</span>
                <span class="text-xl font-black text-emerald-300">${topHero.starters}회</span>
              </div>
              <div class="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                <span class="text-xs text-[#8e929f] block">평균 글자 수</span>
                <span class="text-xl font-black text-emerald-300">${topHero.avgLen}자</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 우측 6열: 🚨 무임승차 빌런 1위 -->
        <div class="lg:col-span-6 relative rounded-[32px] p-6 sm:p-8 bg-gradient-to-br from-rose-500/15 via-[#191016] to-[#090a0f] border border-rose-500/40 flex flex-col justify-between overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
          <div class="space-y-5">
            <div class="flex items-center justify-between">
              <span class="px-3.5 py-1 rounded-full text-xs font-black bg-rose-500 text-white">${isVillainMildMode ? "🌱 소통이 필요한 잠수러 1위" : "🐛 바닥 기는 무임승차 버러지 1위"}</span>
              <span class="text-xs font-bold text-rose-300">${isVillainMildMode ? "무임승차 주의보 구간" : "시상식대 밑바닥 서식"}</span>
            </div>

            <div class="flex items-center gap-4 pt-1">
              <div class="w-24 h-24 rounded-full bg-[#1c1116] p-2.5 border-2 border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.3)] shrink-0">
                <img src="${vChar.img}" alt="${topVillain.name}" class="w-full h-full object-contain">
              </div>
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="text-3xl sm:text-4xl font-black text-[#f4f4f6]">${topVillain.name}</h3>
                  <span class="px-3 py-1 rounded-lg text-sm font-black bg-rose-500 text-white">추천 학점 ${topVillain.grade}</span>
                </div>
                <p class="text-base sm:text-lg font-black text-rose-400 mt-1">${getVillainRoleBadgeText(topVillain)} • ${isVillainMildMode ? "주의 지수" : "빌런 위험도"} ${topVillain.loafingScore}%</p>
              </div>
            </div>

            <p class="text-base sm:text-lg font-bold text-[#f4f4f6] leading-relaxed pt-4 border-t border-white/[0.08] break-keep">
              ${getVillainDiagnosisText(topVillain)}
            </p>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-center">
              <div class="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                <span class="text-xs text-[#8e929f] block">전체 대화 비중</span>
                <span class="text-xl font-black text-rose-300">${topVillain.msgRatio}%</span>
              </div>
              <div class="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                <span class="text-xs text-[#8e929f] block">실무 자료 공유</span>
                <span class="text-xl font-black text-rose-300">${topVillain.workShareCount || 0}회</span>
              </div>
              <div class="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                <span class="text-xs text-[#8e929f] block">영혼 없는 대답</span>
                <span class="text-xl font-black text-rose-300">${topVillain.tokenRatio}%</span>
              </div>
              <div class="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                <span class="text-xs text-[#8e929f] block">평균 답장 시간</span>
                <span class="text-xl font-black text-rose-300">${topVillain.replySpeed}분</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (currentVillainSubTab === "evidence") {
    // 탭 3: 실제 단톡방 증거 대화 (sender / speaker 모두 완벽 호환!)
    const evidenceLogs = (currentData.villainEvidenceLogs && currentData.villainEvidenceLogs.length > 0)
      ? currentData.villainEvidenceLogs
      : [
          {
            title: `${topHero.name}님의 하드캐리 vs ${topVillain.name}님의 무임승차 대화`,
            badge: "실제 대화 증거 #1",
            verdict: `${topHero.name}님이 먼저 의견을 내고 일정을 조율할 때, ${topVillain.name}님은 평균 ${topVillain.replySpeed}분 뒤 짧은 대답만 반복했습니다.`,
            messages: [
              {
                sender: topHero.name,
                time: "오후 9:00",
                roleTag: "👑 하드캐리 총대장",
                text: (currentData.members.find(m => m.name === topHero.name)?.quotes?.[0]) || "여러분 오늘 밤 10시까지 각자 맡은 파트 초안 공유 부탁드립니다! 제가 취합해서 양식 맞출게요."
              },
              {
                sender: topVillain.name,
                time: "오후 10:15",
                roleTag: isVillainMildMode ? "🌱 소통이 필요한 잠수러" : "🐛 무임승차 버러지",
                text: (currentData.members.find(m => m.name === topVillain.name)?.quotes?.[0]) || "아 넵!! 좋습니다 ㅎㅎ 조장님 의견대로 하시죠!"
              }
            ]
          },
          {
            title: `${topVillain.name}님의 마감 직전 회피 vs 팀 피드백 요청 대화`,
            badge: "실제 대화 증거 #2",
            verdict: `자료 마감 직전 확인 요청에 대해 구체적인 작업물 링크 없이 모호한 답변으로 책임을 미루는 양상이 포착되었습니다.`,
            messages: [
              {
                sender: topHero.name,
                time: "오후 11:30",
                roleTag: "👑 하드캐리 총대장",
                text: "혹시 맡으신 파트 자료 어디까지 작성되셨을까요? 파일 첨부 부탁드립니다!"
              },
              {
                sender: topVillain.name,
                time: "다음날 오전 1:20",
                roleTag: isVillainMildMode ? "🌱 소통이 필요한 잠수러" : "🐛 무임승차 버러지",
                text: "지금 거의 다 해가는데 밖이라 집 가서 바로 올릴게요 ㅠㅠ 죄송합니다!"
              }
            ]
          }
        ];

    const roleCodeMap = {
      LEADER: "👑 하드캐리 총대장",
      ACE: "⚡ 칼답 실무 에이스",
      SUPPORT: "🤝 든든 조원",
      NENE: isVillainMildMode ? "🦜 영혼 없는 네무새 요정" : "🦜 영혼 없는 네무새",
      VILLAIN: isVillainMildMode ? "🌱 소통이 필요한 잠수러" : "🐛 무임승차 빌런",
      GHOST: isVillainMildMode ? "👻 응답 대기 잠수러" : "👻 연락두절 잠수충"
    };

    const evidenceCardsHtml = evidenceLogs.map((ev) => {
      const msgs = Array.isArray(ev.messages)
        ? ev.messages
        : [{ sender: ev.sender || ev.speaker || topVillain.name, time: "", roleTag: ev.role || "대화 기록", text: ev.quote || "" }];

      const msgRowsHtml = msgs.map(m => {
        const speakerName = m.sender || m.speaker || topVillain.name;
        let resolvedRoleTag = m.roleTag || roleCodeMap[m.role] || "";
        if (isVillainMildMode && resolvedRoleTag) {
          resolvedRoleTag = resolvedRoleTag
            .replace(/네무새 버러지/g, "네무새 요정")
            .replace(/무임승차 버러지/g, "소통이 필요한 잠수러")
            .replace(/무임승차 빌런/g, "소통이 필요한 잠수러")
            .replace(/버러지/g, "잠수러")
            .replace(/빌런/g, "잠수러");
        }
        const isVillainMsg = resolvedRoleTag.includes("무임승차") || resolvedRoleTag.includes("네무새") || resolvedRoleTag.includes("빌런") || resolvedRoleTag.includes("잠수") || m.role === "VILLAIN" || m.role === "NENE" || speakerName === topVillain.name;
        return `
          <div class="p-4 rounded-2xl ${isVillainMsg ? "bg-rose-500/[0.08] border border-rose-500/30" : "bg-emerald-500/[0.07] border border-emerald-400/25"} space-y-1.5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="text-sm sm:text-base font-black text-[#f4f4f6]">${speakerName}</span>
                ${resolvedRoleTag ? `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${isVillainMsg ? "bg-rose-500 text-white" : "bg-emerald-400 text-[#060608]"}">${resolvedRoleTag}</span>` : ""}
              </div>
              <span class="text-xs text-[#8e929f]">${m.time || ev.date || ""}</span>
            </div>
            <p class="text-xs sm:text-sm font-semibold text-[#f4f4f6] leading-relaxed break-keep">"${m.text}"</p>
          </div>
        `;
      }).join("");

      const verdictNote = ev.verdict || ev.academicNote || ev.analysis || "";

      return `
        <div class="p-5 sm:p-6 rounded-3xl bg-[#090a0f] border border-white/[0.08] space-y-4 flex flex-col justify-between">
          <div class="space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
              <h5 class="text-base sm:text-lg font-black text-[#f4f4f6]">${ev.title || ev.role || "단톡방 실제 대화 증거"}</h5>
              <span class="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 shrink-0">${ev.badge || ev.date || "증거 채증 완료"}</span>
            </div>
            <div class="space-y-3">
              ${msgRowsHtml}
            </div>
          </div>
          ${verdictNote ? `
            <p class="text-xs sm:text-sm font-bold text-amber-300 bg-white/[0.03] px-4 py-3 rounded-xl border border-white/[0.06] break-keep mt-2">
              📌 ${verdictNote}
            </p>
          ` : ""}
        </div>
      `;
    }).join("");

    // 탭 3 하단: 아르곤 정밀 채증 - 놓치지 않은 작은 티(Micro-Signals) 섹션 빌드
    const microEvidenceList = [];
    profiles.forEach(p => {
      if (Array.isArray(p.microEvidences) && p.microEvidences.length > 0) {
        p.microEvidences.forEach(me => {
          microEvidenceList.push({
            name: p.name,
            grade: p.grade,
            type: me.type,
            badge: me.badge,
            quote: me.quote,
            time: me.time
          });
        });
      }
    });

    const microEvidenceRowsHtml = microEvidenceList.length > 0 ? microEvidenceList.map(me => `
      <div class="p-4 rounded-2xl bg-[#140c11] border border-rose-500/25 flex flex-col justify-between gap-3">
        <div class="space-y-1 min-w-0">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="text-sm font-black text-[#f4f4f6]">${me.name}</span>
              <span class="px-2 py-0.5 rounded text-[11px] font-black bg-rose-500 text-white">${me.badge}</span>
            </div>
            <span class="text-xs text-[#8e929f]">${me.time}</span>
          </div>
          <p class="text-xs sm:text-sm font-semibold text-rose-200 mt-1 break-keep">"${me.quote}"</p>
        </div>
        <div class="flex justify-end pt-1">
          <span class="text-[11px] font-bold text-amber-300 bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.08]">
            🔍 미세 회피 패턴 감지
          </span>
        </div>
      </div>
    `).join("") : `
      <div class="col-span-full p-6 rounded-2xl bg-[#140c11]/60 border border-white/[0.06] text-center text-xs text-[#8e929f]">
        대화 내에서 심각한 미세 회피 신호(핑계·책임전가·숟가락얹기)가 채증되지 않았습니다. 비교적 양호한 소통 환경입니다.
      </div>
    `;

    subTabBodyHtml = `
      <div class="rounded-[32px] p-6 sm:p-8 bg-[#0d0f16]/90 border border-white/[0.07] space-y-6">
        <div>
          <h4 class="text-xl sm:text-2xl font-black text-[#f4f4f6] flex items-center gap-2">
            <i class="fa-solid fa-file-shield text-rose-400"></i> 단톡방 실제 빌런 대화 증거 모음
          </h4>
          <p class="text-xs sm:text-sm text-[#8e929f] mt-1">과제를 이끈 조원의 발언과 무임승차·영혼 없는 대답 패턴을 실제 대화로 비교했습니다.</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
          ${evidenceCardsHtml}
        </div>

        <!-- 🔍 아르곤 정밀 채증: 놓치지 않은 작은 티 (Micro-Signals) -->
        <div class="pt-6 border-t border-white/[0.08] space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h5 class="text-lg font-black text-[#f4f4f6] flex items-center gap-2">
                <i class="fa-solid fa-microscope text-amber-300"></i> 아르곤 정밀 채증: 놓치지 않은 작은 티 (Micro-Signals)
              </h5>
              <p class="text-xs text-[#8e929f] mt-0.5">대놓고 안 하겠다고 말하지 않고 교묘하게 빠져나가려던 미세 발언(쿠션어, 핑계, 가짜 진행, 뒷북 질문)을 전수 포착했습니다.</p>
            </div>
            <span class="px-3 py-1 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/35">
              총 ${microEvidenceList.length}건 적발
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
            ${microEvidenceRowsHtml}
          </div>
        </div>
      </div>
    `;
  } else {
    // 탭 4: 🥊 빌런 참교육 샌드백 게임 (Hit the Villain!)
    const targetProfile = profiles.find(p => p.name === villainGameTargetName) || topVillain;
    const tChar = getCharData(targetProfile.cti);
    const memberObj = (currentData.members || []).find(m => m.name === targetProfile.name);
    const realQuote = (memberObj && memberObj.quotes && memberObj.quotes[0]) || "아 넵!! 저는 다 좋습니다 ㅎㅎ";
    const activeWeapon = VILLAIN_WEAPONS[villainGameWeaponIdx] || VILLAIN_WEAPONS[0];

    const initialSpeech = villainGameHp > 70
      ? `"${realQuote}" (아직 정신 못 차리고 뻔뻔하게 변명 중!)`
      : villainGameHp > 35
      ? `"잠깐만요!! 지금 노트북 켜고 있어요!! 진짜 오늘 밤까지 올릴게요 ㅠㅠ"`
      : villainGameHp > 0
      ? `"살려주세요!! PPT 발표자 명단에서 제 이름만은 빼지 말아 주세요 ㅠㅠ 제발!!"`
      : `💀 [참교육 완료] "제가 잘못했습니다... 지금 당장 결론 장표 30페이지 밤새서 만들겠습니다!!"`;

    subTabBodyHtml = `
      <div class="rounded-[32px] p-6 sm:p-8 bg-gradient-to-br from-[#1a0d14] via-[#0e1018] to-[#08090d] border-2 border-rose-500/40 space-y-6 shadow-[0_25px_60px_rgba(0,0,0,0.75)]">
        <!-- 상단 타이틀 & 타겟 선택 칩 -->
        <div class="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
          <div>
            <span class="px-3 py-1 rounded-full text-xs font-black bg-rose-500 text-white">🥊 HIT THE VILLAIN • 스트레스 풀기 미니게임</span>
            <h4 class="text-2xl sm:text-3xl font-black text-[#f4f4f6] mt-2">
              무임승차 빌런 참교육 샌드백!
            </h4>
            <p class="text-xs sm:text-sm text-[#8e929f] mt-1">아래에서 참교육할 무기를 고르고 전신 래그돌 캐릭터를 마구 클릭(연타)해 팀플 스트레스를 날려버리세요!</p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button id="villainSoundToggleBtn" onclick="toggleVillainGameSound(event)" class="px-3.5 py-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] text-xs font-black text-[#f4f4f6] flex items-center gap-1.5 cursor-pointer transition">
              ${villainGameSoundEnabled
                ? '<i class="fa-solid fa-volume-high text-amber-300"></i> <span>타격음 ON</span>'
                : '<i class="fa-solid fa-volume-xmark text-[#8e929f]"></i> <span>타격음 OFF</span>'}
            </button>
            <button onclick="resetVillainGame()" class="px-4 py-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] text-xs font-black text-[#f4f4f6] flex items-center gap-2 cursor-pointer transition">
              <i class="fa-solid fa-rotate-right text-emerald-400"></i> 🔄 풀피로 부활시켜서 다시 패기
            </button>
          </div>
        </div>

        <!-- 샌드백 타겟 조원 변경 바 -->
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-black text-rose-300 mr-1">🎯 참교육 타겟 선택:</span>
          ${villainSorted.map(p => {
            const isSelected = p.name === targetProfile.name;
            return `
              <button onclick="selectVillainGameTarget('${p.name}')" class="px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? "bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                  : "bg-[#141722] text-[#8e929f] hover:text-white border border-white/[0.08]"
              }">
                <span>${p.name}</span>
                <span class="text-[10px] opacity-85">(학점 ${p.grade})</span>
              </button>
            `;
          }).join("")}
        </div>

        <!-- HP 게이지 & 콤보 카운터 -->
        <div class="p-4 sm:p-5 rounded-3xl bg-[#090a0f]/95 border border-white/[0.08] space-y-2.5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-lg text-xs font-black bg-rose-500 text-white">학점 ${targetProfile.grade}</span>
              <span class="text-base sm:text-lg font-black text-[#f4f4f6]">${targetProfile.name}의 뻔뻔함 멘탈 게이지</span>
            </div>
            <div class="flex items-center gap-3">
              <span id="villainComboBadge" class="px-3 py-0.5 rounded-full text-xs font-black bg-amber-400 text-[#060608] transition-opacity ${villainGameCombo > 0 ? "" : "opacity-0"}">🔥 ${villainGameCombo} COMBO!</span>
              <span id="villainHitCount" class="text-xs font-bold text-[#8e929f]">${villainGameHits}회 타격</span>
              <span id="villainHpText" class="text-sm sm:text-base font-black text-rose-400">${villainGameHp <= 0 ? "0% (참교육 K.O.!)" : `${villainGameHp}%`}</span>
            </div>
          </div>
          <div class="w-full h-4 rounded-full bg-white/[0.07] overflow-hidden p-0.5 border border-white/[0.08]">
            <div id="villainHpBar" class="h-full rounded-full transition-all duration-200 ${
              villainGameHp > 60 ? "bg-gradient-to-r from-rose-500 to-amber-400" : villainGameHp > 25 ? "bg-gradient-to-r from-amber-500 to-orange-500" : "bg-rose-600"
            }" style="width: ${villainGameHp}%"></div>
          </div>
        </div>

        <!-- 중앙 샌드백 아레나 (Hit the Boss 스타일 전신 관절형 래그돌 • 마우스 커서 무기화 & 클릭 시 발사 타격!) -->
        <div id="villainArenaBox" onclick="hitVillainTarget(event)" onmousemove="moveVillainWeaponCursor(event)" onmouseleave="hideVillainWeaponCursor()" style="cursor: ${getVillainWeaponCursorUrl(activeWeapon.icon)};" class="relative rounded-[32px] p-6 sm:p-10 bg-gradient-to-b from-[#161019] to-[#09060a] border-2 border-dashed border-rose-500/35 hover:border-rose-400/70 flex flex-col items-center justify-center text-center select-none overflow-hidden min-h-[450px] group">
          <!-- 마우스 커서를 따라다니며 발사 준비하는 무기 커서 팔로워 -->
          <div id="villainFloatingWeaponCursor" class="pointer-events-none absolute z-50 opacity-0 transition-opacity duration-100" style="left:50%;top:50%;transform:translate(10px, 10px);">
            <div id="villainFloatingWeaponCursorInner" class="text-3xl sm:text-4xl drop-shadow-[0_6px_14px_rgba(0,0,0,0.95)] transition-transform duration-100" style="transform: rotate(-12deg);">${activeWeapon.icon}</div>
          </div>

          <!-- 실시간 말풍선 -->
          <div id="villainSpeechBubble" class="relative z-20 max-w-xl mb-5 px-5 py-3 rounded-2xl bg-[#1f131b] border border-rose-400/40 text-xs sm:text-sm font-bold text-rose-100 shadow-lg break-keep transition-transform duration-150">
            ${initialSpeech}
          </div>

          <!-- Hit the Boss 스타일 전신 사람 모양 관절형 래그돌 (머리 + 얼굴 대형 이름 + 과잠/정장 몸통 + 양팔 + 양다리) -->
          <div id="villainSandbagBox" class="relative z-10 flex flex-col items-center justify-center pt-2 pb-4 px-8 transition-transform duration-150" style="transform-origin: center bottom; ${villainGameHp <= 0 ? "transform: translateY(26px) rotate(-78deg) scale(1.06, 0.78); filter: grayscale(0.55) contrast(1.2);" : ""}">
            <!-- 1. 머리 (CTI 아바타 헤드 + 얼굴 정면 대형 이름표 + 실시간 표정/데미지 오버레이) -->
            <div id="villainRagdollHead" class="relative z-20 w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-[#1c1116] p-2.5 border-4 border-rose-500 shadow-[0_10px_30px_rgba(244,63,94,0.45)] flex items-center justify-center transition-transform duration-150" style="transform-origin: bottom center; ${villainGameHp <= 0 ? "transform: rotate(-32deg) translateY(8px);" : ""}">
              <img src="${tChar.img}" alt="${targetProfile.name}" class="w-full h-full object-contain pointer-events-none opacity-85">
              <!-- 얼굴 한가운데에 큼직하고 선명하게 박힌 타겟 이름 배지 -->
              <div class="pointer-events-none absolute inset-x-1 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center">
                <span class="px-2.5 py-1 rounded-xl bg-black/80 border-2 border-amber-300 text-lg sm:text-2xl font-black text-white tracking-tight shadow-[0_4px_16px_rgba(0,0,0,0.95)] break-keep leading-none">
                  ${targetProfile.name}
                </span>
              </div>
              <div id="villainDamageOverlay" class="absolute inset-0 pointer-events-none z-20">
                ${getVillainDamageOverlayHtml(villainGameHp)}
              </div>
            </div>

            <!-- 목 연결부 -->
            <div class="w-5 h-3 -mt-1 bg-[#2b1d24] border-x-2 border-rose-500/40 z-10"></div>

            <!-- 2. 상체 (양팔 관절 + 과잠/정장 토르소 몸통) -->
            <div class="relative flex items-start justify-center -mt-0.5 z-10">
              <!-- 왼팔 (관절형 래그돌 파츠) -->
              <div id="villainArmLeft" class="w-6 sm:w-7 h-24 sm:h-28 -mr-2 mt-1 rounded-full bg-gradient-to-b from-rose-500/90 to-[#251621] border-2 border-rose-300/60 shadow-md flex flex-col items-center justify-end pb-1.5 transition-transform duration-150 origin-top" style="transform: ${villainGameHp <= 0 ? "rotate(128deg)" : "rotate(16deg)"};">
                <div class="w-5 h-5 rounded-full bg-[#fde0c8] border border-rose-400/50 shadow-inner flex items-center justify-center text-[10px]">✊</div>
              </div>

              <!-- 몸통 (대학 과잠/팀플 정장 스타일 + 이름표 & 학점 배지) -->
              <div class="relative w-28 sm:w-32 h-28 sm:h-32 rounded-[26px] bg-gradient-to-b from-[#281524] via-[#1b121c] to-[#110c14] border-2 border-rose-500/70 shadow-[0_12px_30px_rgba(0,0,0,0.65)] flex flex-col items-center justify-between p-2.5 overflow-hidden">
                <!-- 과잠 V넥 칼라 장식 -->
                <div class="w-12 h-3 rounded-b-full border-b-2 border-x-2 border-amber-300/60 bg-black/30 -mt-2.5"></div>

                <!-- 가슴 명찰 & 추천 학점 -->
                <div class="w-full px-2 py-1.5 rounded-xl bg-black/55 border border-white/15 text-center space-y-0.5">
                  <div class="text-[9px] font-extrabold text-rose-300 tracking-wider uppercase">TEAM PROJECT TARGET</div>
                  <div class="text-xs sm:text-sm font-black text-white truncate">${targetProfile.name}</div>
                </div>

                <!-- 하단 학점 직인 & CTI 뱃지 -->
                <div class="flex items-center justify-between w-full px-1">
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-500/25 text-rose-200 border border-rose-400/40">${targetProfile.cti}</span>
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-600 text-white shadow">학점 ${targetProfile.grade}</span>
                </div>
              </div>

              <!-- 오른팔 (관절형 래그돌 파츠) -->
              <div id="villainArmRight" class="w-6 sm:w-7 h-24 sm:h-28 -ml-2 mt-1 rounded-full bg-gradient-to-b from-rose-500/90 to-[#251621] border-2 border-rose-300/60 shadow-md flex flex-col items-center justify-end pb-1.5 transition-transform duration-150 origin-top" style="transform: ${villainGameHp <= 0 ? "rotate(-128deg)" : "rotate(-16deg)"};">
                <div class="w-5 h-5 rounded-full bg-[#fde0c8] border border-rose-400/50 shadow-inner flex items-center justify-center text-[10px]">🤚</div>
              </div>
            </div>

            <!-- 3. 하체 (양다리 관절형 래그돌 파츠 + 신발) -->
            <div class="flex items-start justify-center gap-3 -mt-2 z-0">
              <!-- 왼다리 -->
              <div id="villainLegLeft" class="w-7 sm:w-8 h-20 sm:h-24 rounded-b-2xl rounded-t-lg bg-gradient-to-b from-[#1e2436] to-[#0f131f] border-2 border-white/20 shadow-md flex flex-col items-center justify-end transition-transform duration-150 origin-top" style="transform: ${villainGameHp <= 0 ? "rotate(42deg)" : "rotate(4deg)"};">
                <div class="w-9 sm:w-10 h-4 -mb-1 rounded-full bg-rose-500 border border-white/40 shadow text-[9px] font-black text-white flex items-center justify-center">👟</div>
              </div>
              <!-- 오른다리 -->
              <div id="villainLegRight" class="w-7 sm:w-8 h-20 sm:h-24 rounded-b-2xl rounded-t-lg bg-gradient-to-b from-[#1e2436] to-[#0f131f] border-2 border-white/20 shadow-md flex flex-col items-center justify-end transition-transform duration-150 origin-top" style="transform: ${villainGameHp <= 0 ? "rotate(-48deg)" : "rotate(-4deg)"};">
                <div class="w-9 sm:w-10 h-4 -mb-1 rounded-full bg-rose-500 border border-white/40 shadow text-[9px] font-black text-white flex items-center justify-center">👟</div>
              </div>
            </div>

            <!-- 바닥 그림자 -->
            <div class="w-36 h-4 mt-1 rounded-full bg-black/60 blur-sm pointer-events-none"></div>

            <!-- 누적 반창고/F학점 도장 레이어 (전신 위에 찍힘) -->
            <div id="villainStampsLayer" class="absolute inset-0 pointer-events-none z-30">
              ${villainGameStamps.map(s => `
                <span class="pointer-events-none absolute px-1.5 py-0.5 rounded text-xs sm:text-sm font-black ${
                  s.label.includes("[") ? "bg-rose-600 text-white border border-white/60 shadow-lg" : "text-lg sm:text-xl"
                }" style="top:${s.top}%;left:${s.left}%;transform:translate(-50%,-50%) rotate(${s.rot}deg);">${s.label}</span>
              `).join("")}
            </div>
          </div>

          <!-- K.O. 처형 완료 도장 배너 -->
          <div id="villainKoBanner" class="${villainGameHp <= 0 ? "" : "hidden"} mt-3 z-20 px-6 py-2 rounded-2xl bg-rose-600 text-white font-black text-sm sm:text-lg border-2 border-amber-300 shadow-[0_0_30px_rgba(244,63,94,0.7)]">
            💀 [참교육 완료 • 교수님 직권 F학점 &amp; 발표자 명단 제외 처형!]
          </div>

          <span id="villainCurrentWeaponHint" class="mt-3 text-xs font-extrabold text-rose-300/90 group-hover:text-amber-300 transition">
            👆 전신 캐릭터를 클릭(터치)해서 참교육 타격을 날리세요! (현재 무기: ${activeWeapon.icon} ${activeWeapon.name})
          </span>
        </div>

        <!-- 하단 5종 참교육 무기 슬롯 -->
        <div class="space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="text-xs sm:text-sm font-black text-[#f4f4f6]">🛠️ 참교육 무기 고르기 (클릭 시 무기 변경)</span>
            <span class="text-xs text-[#8e929f]">무기마다 데미지와 찍히는 도장이 달라집니다</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            ${VILLAIN_WEAPONS.map((w, idx) => {
              const isSelected = idx === villainGameWeaponIdx;
              return `
                <button onclick="selectVillainWeapon(${idx})" class="p-3.5 rounded-2xl text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-gradient-to-br from-rose-500/30 to-amber-500/20 border-2 border-amber-300 shadow-[0_8px_20px_rgba(245,183,61,0.25)]"
                    : "bg-[#121520] hover:bg-[#191d2b] border border-white/[0.08]"
                }">
                  <div class="flex items-center justify-between">
                    <span class="text-2xl">${w.icon}</span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-black ${isSelected ? "bg-amber-300 text-[#060608]" : "bg-white/[0.07] text-[#8e929f]"}">DMG ${w.dmg}</span>
                  </div>
                  <div class="mt-2">
                    <div class="text-xs sm:text-sm font-black text-[#f4f4f6] break-keep">${w.name}</div>
                    <div class="text-[11px] font-bold ${w.color} mt-0.5">${w.badge}</div>
                  </div>
                </button>
              `;
            }).join("")}
          </div>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="space-y-6">
      ${spiceToggleBarHtml}
      ${topSummaryStripHtml}
      ${subTabNavHtml}
      ${subTabBodyHtml}
    </div>
  `;
}

// 탭 1: 대화방 참여자 원형 포트레이트 라인업 (사각 박스 안의 사각 표 제거!)
function renderOverviewMembers() {
  const container = document.getElementById("overviewMemberGrid");
  if (!container) return;
  container.innerHTML = "";

  currentData.members.forEach((m, idx) => {
    const charInfo = getCharData(m.cti);
    const isMe = Boolean(myMemberId && (m.id === myMemberId || m.name === myMemberId));
    const card = document.createElement("div");
    card.className = `rounded-[28px] p-5 bg-[#0e1017]/80 hover:bg-[#141722] border ${isMe ? "border-[#f5b73d] shadow-[0_0_25px_rgba(245,183,61,0.2)]" : "border-white/[0.07] hover:border-white/[0.18]"} cursor-pointer transition-all duration-300 hover:-translate-y-1 flex flex-col items-center text-center group`;
    card.onclick = () => {
      selectFocusMember(m.id || m.name);
      openReportDetail("tabCharacters", idx);
    };
    card.innerHTML = `
      <div class="relative mb-3">
        <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-b from-[#1a1d28] to-[#0b0d13] p-2 border border-white/[0.12] group-hover:border-[#f5b73d]/50 shadow-inner overflow-hidden group-hover:scale-105 transition-transform">
          <img src="${charInfo.img}" alt="${m.name}" class="w-full h-full object-contain">
        </div>
        <div class="absolute -bottom-1.5 left-1/2 -translate-x-1/2">
          ${getCtiBadgeHtml(m.cti, "text-[10px] px-2 py-0.5 shadow-md")}
        </div>
      </div>

      <div class="mt-1 space-y-0.5">
        <div class="flex items-center justify-center gap-1.5">
          <h5 class="text-base font-black text-[#f4f4f6] group-hover:text-[#f5b73d] transition-colors truncate">${m.name}</h5>
          ${isMe ? '<span class="text-[9px] px-1.5 py-0.5 rounded-full bg-[#f5b73d] text-[#060608] font-black">나</span>' : ''}
        </div>
        <p class="text-xs text-[#f5b73d]/90 font-semibold truncate">${m.title || charInfo.name}</p>
      </div>

      <div class="mt-3 pt-2.5 border-t border-white/[0.06] w-full flex items-center justify-center gap-3 text-[11px] text-[#8e929f]">
        <span>지분 <strong class="text-[#f4f4f6]">${m.msgRatio}%</strong></span>
        <span>•</span>
        <span>호흡 <strong class="text-[#f4f4f6]">${m.avgLen}자</strong></span>
        <span>•</span>
        <span>선톡 <strong class="text-[#f5b73d]">${m.starters}</strong></span>
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
        <span class="text-[#8e929f] font-medium">${label}</span>
        <span class=" font-bold text-[#f4f4f6]">${value}<span class="text-[9px] text-[#8e929f]">/100</span></span>
      </div>
      <div class="w-full bg-[#12141a] h-1.5 rounded-full overflow-hidden border border-white/[0.05]">
        <div class="${colorClass} h-full rounded-full transition-all duration-500" style="width: ${Math.min(100, Math.max(5, value))}%"></div>
      </div>
    </div>
  `;
}

// 탭 2: 인물별 CTI 팩폭 카드 (카드 덱 넘기기 시스템)
let currentCharDeckIndex = 0;
let isRoastRevealed = false;

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

  isRoastRevealed = false; // 카드 전환 시 팩폭 기본 블러 유지
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

function revealRoastFeedback() {
  isRoastRevealed = true;
  const blurBox = document.getElementById("roastBlurContent");
  const overlay = document.getElementById("roastRevealOverlay");
  if (blurBox) {
    blurBox.classList.remove("blur-md", "select-none");
  }
  if (overlay) {
    overlay.classList.add("hidden");
  }
}

function renderCurrentDeckCard() {
  const container = document.getElementById("characterCardDeckView");
  if (!container || !currentData || !currentData.members) return;

  const totalMembers = currentData.members.length;
  const m = currentData.members[currentCharDeckIndex];
  if (!m) return;

  // 상단 카운터 및 빠른 멤버 선택 바 렌더링
  const counterEl = document.getElementById("charDeckCounterBadge");
  if (counterEl) {
    counterEl.innerText = `${currentCharDeckIndex + 1} / ${totalMembers}`;
  }
  const memberBarEl = document.getElementById("charDeckMemberBar");
  if (memberBarEl) {
    memberBarEl.innerHTML = "";
    currentData.members.forEach((memberItem, idx) => {
      const isSelected = idx === currentCharDeckIndex;
      const isItemMe = Boolean(myMemberId && (memberItem.id === myMemberId || memberItem.name === myMemberId));
      const itemChar = getCharData(memberItem.cti);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 border whitespace-nowrap cursor-pointer ${
        isSelected
          ? "bg-[#f5b73d] text-[#060608] border-[#f5b73d] shadow-[0_4px_14px_rgba(245,183,61,0.3)] font-black"
          : "bg-[#12141a] text-[#f4f4f6] hover:bg-[#191c24] border-white/[0.08]"
      }`;
      btn.innerHTML = `
        <img src="${itemChar.img}" class="w-4 h-4 object-contain shrink-0">
        <span>${memberItem.name}</span>
        ${isItemMe ? '<i class="fa-solid fa-crown text-[9px] text-amber-400"></i>' : ''}
      `;
      btn.onclick = () => selectCharCardIndex(idx);
      memberBarEl.appendChild(btn);
    });
  }

  const isMe = Boolean(myMemberId && (m.id === myMemberId || m.name === myMemberId));

  const signaturesHtml = (m.signatures || []).map(s => `
    <span class="px-3 py-1 rounded-full bg-[#12141a] border border-white/[0.08] text-[#f4f4f6] text-[11px] whitespace-nowrap">#${s}</span>
  `).join("");

  // Phase 3-3: CTI 4대 지표(E/I, L/S, F/T, A/R) 양극단 산출 비율 계산
  const ctiCode = String(m.cti || "ELFA").toUpperCase();
  const calcAxisPct = (isLeftDominant, rawVal) => {
    const raw = Number(rawVal) || 50;
    if (isLeftDominant) {
      return Math.min(94, Math.max(54, Math.round(52 + Math.abs(raw - 35) * 0.58)));
    }
    return Math.max(8, Math.min(46, Math.round(46 - Math.abs(65 - raw) * 0.52)));
  };
  const ePct = calcAxisPct(ctiCode[0] === "E", m.radar?.initiative);
  const iPct = 100 - ePct;
  const lPct = calcAxisPct(ctiCode[1] === "L", m.radar?.length);
  const sPct = 100 - lPct;
  const fPct = calcAxisPct(ctiCode[2] === "F", m.radar?.emotion);
  const tPct = 100 - fPct;
  const aPct = calcAxisPct(ctiCode[3] === "A", m.radar?.assertiveness);
  const rPct = 100 - aPct;

  const ctiAxes = [
    {
      title: "발화 에너지",
      leftCode: "E", leftLabel: "외향·수다", leftPct: ePct,
      rightCode: "I", rightLabel: "내향·경청", rightPct: iPct,
      activeLeft: ctiCode[0] === "E",
      barColor: "from-amber-400 to-orange-500",
      textColor: "text-amber-400"
    },
    {
      title: "문장 호흡",
      leftCode: "L", leftLabel: "장문·서사", leftPct: lPct,
      rightCode: "S", rightLabel: "단문·속사포", rightPct: sPct,
      activeLeft: ctiCode[1] === "L",
      barColor: "from-sky-400 to-cyan-500",
      textColor: "text-sky-400"
    },
    {
      title: "공감·리액션",
      leftCode: "F", leftLabel: "감성·공감", leftPct: fPct,
      rightCode: "T", rightLabel: "팩트·용건", rightPct: tPct,
      activeLeft: ctiCode[2] === "F",
      barColor: "from-emerald-400 to-teal-500",
      textColor: "text-emerald-400"
    },
    {
      title: "대화 주도성",
      leftCode: "A", leftLabel: "직진·주도", leftPct: aPct,
      rightCode: "R", rightLabel: "수용·호응", rightPct: rPct,
      activeLeft: ctiCode[3] === "A",
      barColor: "from-purple-400 to-pink-500",
      textColor: "text-purple-400"
    }
  ];

  const ctiAxisBarsHtml = `
    <div class="theme-sub-card p-3.5 sm:p-4 rounded-2xl space-y-2.5">
      <div class="flex items-center justify-between">
        <span class="text-xs font-black text-[#f4f4f6] flex items-center gap-1.5">
          <i class="fa-solid fa-dna text-[#f5b73d]"></i> CTI 4대 지표 산출 비율 (${ctiCode} 도출 근거)
        </span>
        <span class="text-[11px] font-semibold text-[#8e929f]">양극단 백분율 비교</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        ${ctiAxes.map(ax => `
          <div class="p-2.5 rounded-xl bg-[#0b0d13]/70 border border-white/[0.06] space-y-1.5">
            <div class="flex items-center justify-between text-[11px] font-bold">
              <span class="${ax.activeLeft ? ax.textColor + ' font-black' : 'text-[#8e929f]'}">
                ${ax.leftCode} (${ax.leftLabel}) ${ax.leftPct}%
              </span>
              <span class="text-[10px] text-[#8e929f] font-semibold">${ax.leftCode} ${ax.leftPct}% ↔ ${ax.rightCode} ${ax.rightPct}%</span>
              <span class="${!ax.activeLeft ? ax.textColor + ' font-black' : 'text-[#8e929f]'}">
                ${ax.rightCode} (${ax.rightLabel}) ${ax.rightPct}%
              </span>
            </div>
            <div class="w-full h-2 rounded-full bg-white/[0.08] overflow-hidden flex">
              <div class="h-full bg-gradient-to-r ${ax.barColor} transition-all duration-500" style="width: ${ax.leftPct}%"></div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  container.innerHTML = `
    <div class="theme-card tilt-card-3d ${isMe ? 'ring-2 ring-[#f5b73d]' : ''} rounded-[36px] p-6 sm:p-7 space-y-6 relative overflow-hidden transition-all duration-300">
      <div class="tilt-glare"></div>
      <!-- 카드 상단 프로필 -->
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="flex items-center gap-3.5 min-w-0">
          <div class="w-16 h-16 rounded-2xl bg-[#12141a] border border-white/[0.1] flex items-center justify-center p-1.5 shadow-inner shrink-0 relative">
            <div class="absolute inset-0 bg-[#f5b73d]/10 rounded-2xl blur-md pointer-events-none"></div>
            <img src="${getCharData(m.cti).img}" class="relative z-10 w-full h-full object-contain filter drop-shadow">
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h4 class="text-xl sm:text-2xl font-black text-[#f4f4f6] flex items-center gap-2 whitespace-nowrap">
                <span>${m.name}</span>
                ${isMe ? '<span class="text-xs px-2.5 py-0.5 rounded-full bg-[#f5b73d] text-[#060608] font-black flex items-center gap-1 shadow-sm whitespace-nowrap"><i class="fa-solid fa-crown text-[10px]"></i> 내 카드</span>' : ''}
              </h4>
              ${getCtiBadgeHtml(m.cti)}
              ${!isMe ? `
                <button onclick="setMyMember('${m.id || m.name}')" class="text-xs px-2.5 py-1 rounded-full bg-[#12141a] hover:bg-[#f5b73d] text-[#8e929f] hover:text-[#060608] border border-white/[0.1] hover:border-[#f5b73d] font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap">
                  <i class="fa-solid fa-user-check text-[10px]"></i> '나'로 지정
                </button>
              ` : ''}
            </div>
            <p class="text-xs font-bold text-[#f5b73d] mt-1 whitespace-nowrap">${m.title}</p>
          </div>
        </div>
        <span class="text-xs font-bold text-[#f4f4f6] theme-sub-card px-3.5 py-1.5 rounded-full whitespace-nowrap shrink-0">
          대화 지분 ${m.msgRatio}%
        </span>
      </div>

      <!-- Phase 3-3: CTI 4대 지표(E/I, L/S, F/T, A/R) 양극단 백분율 바 -->
      ${ctiAxisBarsHtml}

      <!-- 레이더 차트 및 5대 지표 수치 진단 섹션 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-center theme-sub-card p-4 sm:p-5 rounded-2xl">
        <div class="h-56 relative flex items-center justify-center">
          <canvas id="activeRadarChart"></canvas>
        </div>
        <div class="space-y-2.5">
          <div class="flex items-center justify-between pb-1.5 border-b border-white/[0.08]">
            <span class="text-xs font-bold text-[#f4f4f6] flex items-center gap-1.5">
              <i class="fa-solid fa-sliders text-[#f5b73d]"></i> 5대 성향 수치 진단
            </span>
            <span class="text-[10px] text-[#8e929f]">전수 분석 통계</span>
          </div>
          ${renderStatGauge("⚡ 점화력 (화제 개시)", m.radar.initiative, "bg-[#f5b73d]")}
          ${renderStatGauge("📏 문장 길이 (호흡)", m.radar.length, "bg-[#38bdf8]")}
          ${renderStatGauge("💬 감정 / 드립 (공감)", m.radar.emotion, "bg-emerald-400")}
          ${renderStatGauge("🎯 직진 / 도발 (단도직입)", m.radar.assertiveness, "bg-purple-400")}
          ${renderStatGauge("🤣 유머 감각 (티키타카)", m.radar.humor, "bg-[#f5b73d]")}
        </div>
      </div>

      <!-- 기본 대화 집계 통계 4칸 -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
        <div class="theme-sub-card p-3.5 rounded-xl">
          <span class="text-[11px] text-[#8e929f] block mb-0.5 font-medium">총 발화량</span>
          <strong class="text-sm text-[#f4f4f6] font-bold">${m.totalMsgs.toLocaleString()}건</strong>
        </div>
        <div class="theme-sub-card p-3.5 rounded-xl">
          <span class="text-[11px] text-[#8e929f] block mb-0.5 font-medium">평균 글자 수</span>
          <strong class="text-sm text-[#f4f4f6] font-bold">${m.avgLen}자</strong>
        </div>
        <div class="theme-sub-card p-3.5 rounded-xl">
          <span class="text-[11px] text-[#8e929f] block mb-0.5 font-medium">대화 점화 (선톡)</span>
          <strong class="text-sm text-[#f5b73d] font-bold">${m.starters}회</strong>
        </div>
        <div class="theme-sub-card p-3.5 rounded-xl">
          <span class="text-[11px] text-[#8e929f] block mb-0.5 font-medium">웃음 / 질문</span>
          <strong class="text-sm text-[#f4f4f6] font-bold">${m.laughs.toLocaleString()} / ${m.questions}</strong>
        </div>
      </div>

      <!-- 시그니처 키워드 -->
      <div class="space-y-2">
        <p class="text-xs font-bold text-[#f4f4f6]">시그니처 키워드</p>
        <div class="flex flex-wrap gap-1.5">${signaturesHtml}</div>
      </div>

      <!-- 뼈 때리는 팩폭 피드백 (기본 블러 처리 및 가운데 열기 버튼) -->
      <div class="relative rounded-2xl p-4 sm:p-5 bg-[#f5b73d]/[0.08] border border-[#f5b73d]/25 overflow-hidden">
        <div id="roastBlurContent" class="${isRoastRevealed ? '' : 'filter blur-md select-none'} transition-all duration-300 space-y-2">
          <div class="flex items-center gap-2 text-[#f5b73d] text-xs font-bold">
            <i class="fa-solid fa-skull-crossbones"></i> 뼈 때리는 팩폭 피드백
          </div>
          <p class="text-xs sm:text-sm text-[#f4f4f6] leading-relaxed font-medium">${m.savage}</p>
          <div class="pt-1.5 text-xs text-[#8e929f] flex items-center gap-1.5 border-t border-white/[0.08]">
            <i class="fa-solid fa-lightbulb text-[#f5b73d]"></i> 조언: ${m.advice}
          </div>
        </div>
        <div id="roastRevealOverlay" class="${isRoastRevealed ? 'hidden' : 'flex'} absolute inset-0 items-center justify-center bg-[#060608]/55 backdrop-blur-[2px]">
          <button type="button" onclick="revealRoastFeedback()" class="px-5 py-2.5 rounded-full bg-[#f5b73d] hover:bg-[#e5a229] text-[#060608] font-black text-xs sm:text-sm shadow-lg hover:scale-105 active:scale-95 transition flex items-center gap-2 cursor-pointer">
            <i class="fa-solid fa-fire"></i> 팩폭 피드백 보기
          </button>
        </div>
      </div>
    </div>
  `;

  // 레이더 차트 렌더링
  setTimeout(renderActiveRadarChart, 30);
}

// 현재 활성화된 1장의 카드에 레이더 차트 렌더링 (Phase 2-1 & 2-2: 라이트/다크 모드별 명암비 분기)
function renderActiveRadarChart() {
  if (!currentData || !currentData.members) return;
  const m = currentData.members[currentCharDeckIndex];
  if (!m) return;

  const canvas = document.getElementById("activeRadarChart");
  if (!canvas) return;

  if (radarCharts['active']) {
    radarCharts['active'].destroy();
  }

  const isLight = document.body.classList.contains("light-mode");
  const polyFill = isLight ? "rgba(217, 119, 6, 0.34)" : "rgba(245, 183, 61, 0.30)";
  const polyStroke = isLight ? "#d97706" : "#f5b73d";
  const pointBg = isLight ? "#b45309" : "#f5b73d";
  const pointBorder = isLight ? "#ffffff" : "#f6f8fa";
  const gridColor = isLight ? "rgba(15, 23, 42, 0.14)" : "rgba(255, 255, 255, 0.12)";
  const labelColor = isLight ? "#1e293b" : "#d4d8e2";

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
        backgroundColor: polyFill,
        borderColor: polyStroke,
        borderWidth: isLight ? 3 : 2.5,
        pointBackgroundColor: pointBg,
        pointBorderColor: pointBorder,
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
          grid: { color: gridColor },
          angleLines: { color: gridColor },
          pointLabels: {
            color: labelColor,
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
    { rankBadge: "🥇 1위 영혼의 단짝", glow: "shadow-[0_8px_30px_rgba(245,183,61,0.18)]" },
    { rankBadge: "🥈 2위 찰떡 콤비", glow: "shadow-[0_8px_30px_rgba(203,213,225,0.12)]" },
    { rankBadge: "🥉 3위 티키타카 메이트", glow: "shadow-[0_8px_30px_rgba(180,83,9,0.12)]" }
  ];

  top3Pairs.forEach((p, idx) => {
    const style = medalStyles[idx] || medalStyles[2];
    const isMyPair = Boolean(targetName && p.pair.includes(targetName));
    const card = document.createElement("div");
    card.className = `theme-card ${style.glow} rounded-[32px] p-5 space-y-4 relative flex flex-col justify-between`;
    
    card.innerHTML = `
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-black px-3 py-1 rounded-full theme-sub-card text-[#f6f8fa]">
            ${style.rankBadge}
          </span>
          <span class="text-xs font-black px-2.5 py-0.5 rounded-full bg-[#f5b73d] text-[#030708]">
            ${p.score}점 (${p.grade}급)
          </span>
        </div>

        <div class="text-center py-2 space-y-2">
          <!-- 듀오 캐릭터 썸네일 -->
          <div class="flex items-center justify-center gap-3">
            <div class="w-14 h-14 rounded-2xl bg-[#12141a] border border-white/[0.1] p-1 flex items-center justify-center shrink-0 shadow-inner">
              <img src="${getCharData(p.types[0]).img}" alt="${p.pair[0]}" class="w-full h-full object-contain">
            </div>
            <span class="text-xl animate-pulse">❤️</span>
            <div class="w-14 h-14 rounded-2xl bg-[#12141a] border border-white/[0.1] p-1 flex items-center justify-center shrink-0 shadow-inner">
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

        <div class="theme-sub-card p-3 rounded-2xl text-center">
          <p class="text-xs font-bold text-[#f5b73d]">${p.badge}</p>
          <p class="text-[11px] text-white/80 mt-1">${p.summary}</p>
        </div>
      </div>

      <div class="flex items-center justify-between pt-2 border-t border-white/[0.06] text-[11px] text-white/70">
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
    card.className = "theme-card rounded-[24px] p-4 space-y-3 transition hover:scale-[1.01] flex flex-col justify-between";

    let gradeColor = "text-[#f5b73d] bg-[rgba(234,164,58,0.15)]";
    if (p.grade.includes("SS")) gradeColor = "text-[#f5b73d] bg-[rgba(245, 183, 61,0.15)]";
    else if (p.grade === "A") gradeColor = "text-emerald-400 bg-emerald-950/60";
    else if (p.grade === "B+") gradeColor = "text-[#38bdf8] bg-[rgba(56, 189, 248,0.15)]";

    card.innerHTML = `
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="w-6 h-6 rounded-full theme-sub-card text-white/80 flex items-center justify-center font-bold text-xs shrink-0">
            ${p.rank}
          </span>
          <div class="flex items-center -space-x-1.5 shrink-0">
            <div class="w-7 h-7 rounded-lg bg-[#12141a] border border-white/[0.1] p-0.5 overflow-hidden">
              <img src="${getCharData(p.types[0]).img}" class="w-full h-full object-contain">
            </div>
            <div class="w-7 h-7 rounded-lg bg-[#12141a] border border-white/[0.1] p-0.5 overflow-hidden">
              <img src="${getCharData(p.types[1]).img}" class="w-full h-full object-contain">
            </div>
          </div>
          <span class="text-sm font-bold text-[#f6f8fa] truncate">${p.pair[0]} ↔ ${p.pair[1]}</span>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${gradeColor}">${p.grade}급 (${p.score}점)</span>
        </div>
      </div>
      <div class="theme-sub-card p-2.5 rounded-xl flex items-center justify-between gap-3 text-[11px]">
        <span class="text-white/80 flex-1 min-w-0 truncate">${p.summary}</span>
        <span class="text-[#f5b73d] shrink-0">티키타카 ${p.replies.toLocaleString()}건</span>
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
        tagClass += "text-sm font-black bg-[#f5b73d] text-[#060608] border-transparent shadow-sm";
      } else if (idx < 3) {
        tagClass += "font-bold bg-[rgba(234,164,58,0.18)] text-[#f5b73d] border-[rgba(234,164,58,0.4)]";
      } else if (idx < 8) {
        tagClass += "font-semibold bg-[rgba(56, 189, 248,0.15)] text-[#38bdf8] border-[rgba(56, 189, 248,0.35)]";
      } else if (idx < 15) {
        tagClass += "font-medium bg-[#12141a] text-[#f6f8fa] border-white/[0.08]";
      } else {
        tagClass += "bg-[#060608] text-[#848c96] border-white/[0.06]";
      }
      tag.className = tagClass;
      tag.innerHTML = `<span>#${kw.word}</span> <span class="opacity-75 text-[10px]">(${kw.count}회)</span>`;
      kwContainer.appendChild(tag);
    });
  }

  const catchContainer = document.getElementById("memberCatchphraseGrid");
  if (catchContainer) {
    catchContainer.innerHTML = "";
    currentData.members.forEach(m => {
      const card = document.createElement("div");
      card.className = "theme-card rounded-[24px] p-4 space-y-3 shadow-[0_4px_20px_rgba(0,0,0,0.2)] transition hover:scale-[1.01] flex flex-col justify-between";
      
      const wordsList = (m.topWords || []).map((w, i) => `
        <div class="flex items-center justify-between text-xs py-1 border-b border-white/[0.05] last:border-none">
          <span class="text-[#f6f8fa] font-medium"><strong class="text-[#f5b73d] mr-1.5">${i + 1}.</strong> #${w.word}</span>
          <span class="text-[11px] text-white/80 theme-sub-card px-2 py-0.5 rounded-full">${w.count}회</span>
        </div>
      `).join("");

      card.innerHTML = `
        <div class="space-y-3">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-9 h-9 rounded-xl bg-[#12141a] border border-white/[0.1] p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                <img src="${getCharData(m.cti).img}" alt="${m.name}" class="w-full h-full object-contain">
              </div>
              <div class="min-w-0">
                <h5 class="text-sm font-bold text-[#f6f8fa] truncate">${m.name}</h5>
                <div class="mt-0.5">${getCtiBadgeHtml(m.cti)}</div>
              </div>
            </div>
            <span class="text-[11px] px-2.5 py-1 rounded-full theme-sub-card text-[#f6f8fa] font-medium shrink-0">
              ${m.timePersona || "활동가"}
            </span>
          </div>
          <div class="pt-1 space-y-1">
            <p class="text-[11px] text-white/70 font-bold uppercase tracking-wider">자주 쓰는 말버릇 TOP 5</p>
            <div class="theme-sub-card rounded-xl p-2.5 space-y-0.5">
              ${wordsList || "<p class='text-xs text-white/60 py-1'>단어 분석 중</p>"}
            </div>
          </div>
        </div>
        ${m.quotes && m.quotes[0] ? `
          <div class="pt-1 text-[11px] text-white/80 italic theme-sub-card p-2 rounded-xl truncate" title="${m.quotes[0].replace(/"/g, '&quot;')}">
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

  const isLight = document.body.classList.contains("light-mode");
  const tickColor = isLight ? "#475569" : "#9aa3ae";
  const gridColor = isLight ? "rgba(15, 23, 42, 0.08)" : "rgba(255, 255, 255, 0.05)";

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
            grid: { color: gridColor },
            ticks: { color: tickColor, font: { size: 10, family: "Pretendard Variable" } }
          },
          y: {
            grid: { color: gridColor },
            ticks: { color: tickColor, font: { size: 10, family: "Pretendard Variable" } }
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
            ticks: { color: tickColor, font: { size: 10, family: "Pretendard Variable" } }
          },
          y: {
            grid: { color: gridColor },
            ticks: { color: tickColor, font: { size: 10, family: "Pretendard Variable" } }
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
    <div class="flex items-center justify-between border-b border-white/[0.06] pb-3 gap-2">
      <div class="flex items-center gap-3 min-w-0">
        <div class="flex items-center -space-x-2 shrink-0">
          <div class="w-11 h-11 rounded-2xl bg-[#12141a] p-1 border border-white/[0.12] shadow-inner">
            <img src="${c1.img}" class="w-full h-full object-contain">
          </div>
          <div class="w-11 h-11 rounded-2xl bg-[#12141a] p-1 border border-white/[0.12] shadow-inner">
            <img src="${c2.img}" class="w-full h-full object-contain">
          </div>
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
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
      <span class="text-sm font-black text-[#f5b73d] shrink-0">${chem.grade}급 (${chem.score}점)</span>
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
    card.className = "theme-card rounded-[28px] p-5 space-y-3 cursor-pointer transition hover:-translate-y-1 shadow-[0_4px_20px_rgba(0,0,0,0.2)] flex flex-col justify-between group";
    card.onclick = () => openTypeDetailModal(code);

    card.innerHTML = `
      <div class="space-y-2.5">
        <div class="flex items-center justify-between">
          ${getCtiBadgeHtml(item.code)}
          <span class="text-[10px] text-white/60 group-hover:text-[#f5b73d] transition-colors">클릭하여 상세</span>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-b from-[#1c2734] to-[#0c131a] p-1 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
            <img src="${charInfo.img}" alt="${charInfo.name}" class="w-full h-full object-contain">
          </div>
          <div class="min-w-0">
            <h5 class="text-sm font-black text-[#f6f8fa] truncate group-hover:text-[#f5b73d] transition-colors">${item.title}</h5>
            <p class="text-xs text-[#f5b73d] font-bold mt-0.5 truncate">${charInfo.name}</p>
            <p class="text-[10px] text-white/70 line-clamp-1 mt-0.5">${item.sub}</p>
          </div>
        </div>
        <p class="text-xs text-white/80 line-clamp-2 leading-relaxed pt-1 border-t border-white/[0.06]">${item.desc}</p>
      </div>
      <div class="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[11px]">
        <span class="text-[#f5b73d] font-medium">💖 ${item.bestMatch}</span>
        <span class="text-white/70 font-medium">⚡ ${item.worstMatch}</span>
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
    card.className = "bento-card border border-white/[0.08] hover:border-[#f5b73d]/50 rounded-[28px] p-4 space-y-3 cursor-pointer transition hover:-translate-y-1 flex flex-col justify-between group";
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
      <div class="text-xs text-[#f6f8fa] bg-[#060608] p-2.5 rounded-xl border border-white/[0.08]">
        ${item.tag}
      </div>
      <div class="bg-[rgba(245,183,61,0.1)] border border-[rgba(245,183,61,0.3)] rounded-2xl p-3 space-y-1">
        <p class="text-xs text-[#f5b73d] font-bold">🔥 뼈 때리는 팩폭</p>
        <p class="text-xs text-[#f6f8fa] leading-relaxed">${item.savage}</p>
        <p class="text-[11px] text-[#848c96] pt-1">💡 성찰 조언: ${item.advice}</p>
      </div>
      <div class="grid grid-cols-2 gap-3 pt-2 text-xs">
        <div class="p-3 rounded-xl bg-[#060608] border border-white/[0.08]">
          <span class="text-[#848c96]">💖 찰떡궁합</span>
          <p class="text-base font-bold text-[#f5b73d] mt-1">${item.bestMatch}</p>
        </div>
        <div class="p-3 rounded-xl bg-[#060608] border border-white/[0.08]">
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

  isNameMasked = !isNameMasked;
  isAnonymized = isNameMasked;

  // 미니게임 타겟 이름도 마스킹/실명 상태에 맞춰 동기화
  let targetMemberIdx = -1;
  if (villainGameTargetName && originalDataCache.members) {
    targetMemberIdx = originalDataCache.members.findIndex(
      m => m.name === villainGameTargetName || formatName(m.name, true) === villainGameTargetName || formatName(m.name, false) === villainGameTargetName
    );
  }

  currentData = buildDisplayDataFromCache(originalDataCache);

  if (targetMemberIdx !== -1 && currentData.members && currentData.members[targetMemberIdx]) {
    villainGameTargetName = currentData.members[targetMemberIdx].name;
  }

  updateAnonymizeButtonText();
  renderCurrentData();

  // 포토카드 모달이 열려 있다면 즉시 동기화
  const shareModal = document.getElementById("shareCardModal");
  if (shareModal && !shareModal.classList.contains("hidden")) {
    const select = document.getElementById("cardMemberSelect");
    if (select && currentData.members) {
      const prevIdx = currentCardMemberIndex;
      select.innerHTML = "";
      currentData.members.forEach((m, idx) => {
        const opt = document.createElement("option");
        opt.value = idx;
        const isMe = Boolean(myMemberId && (m.id === myMemberId || m.name === myMemberId));
        opt.innerText = `${m.name} (${m.cti || 'CTI'})${isMe ? ' 👑(나)' : ''}`;
        select.appendChild(opt);
      });
      select.value = prevIdx;
    }
    renderShareCard();
  }

  showToast(
    isNameMasked
      ? "🕵️ 이름 가리기 모드가 적용되었습니다 (예: 김○지, 서○)"
      : "🕵️ 실명 표시 모드로 복구되었습니다",
    "info"
  );
}

function updateAnonymizeButtonText() {
  const textEl = document.getElementById("anonymizeText");
  if (textEl) {
    textEl.innerText = isNameMasked ? "실명 모드로 복구" : "이름 가리기 모드";
  }
}

function captureCurrentTab() {
  const reportView = document.getElementById("reportView");
  if (!reportView) return;

  const isLight = document.body.classList.contains("light-mode");
  showToast("리포트 화면 이미지를 생성하는 중입니다...", "loading");

  html2canvas(reportView, {
    backgroundColor: isLight ? "#f8fafc" : "#060608",
    scale: 2
  }).then(canvas => {
    const link = document.createElement("a");
    link.download = `CTI_단톡방_리포트_${new Date().toISOString().slice(0,10)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    showToast("화면 캡처 이미지가 저장되었습니다", "success");
  }).catch(err => {
    showToast("캡처에 실패했습니다: " + err.message, "error");
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

  const btnPersonal = document.getElementById("btnCardModePersonal");
  const btnGroup = document.getElementById("btnCardModeGroup");
  if (btnPersonal && btnGroup) {
    if (selectedAnalysisMode === "romance") {
      btnPersonal.innerHTML = `<i class="fa-solid fa-heart"></i> 개인 연애·썸 카드`;
      btnGroup.innerHTML = `<i class="fa-solid fa-hearts"></i> 1:1 애정도 종합 카드`;
    } else if (selectedAnalysisMode === "villain") {
      btnPersonal.innerHTML = `<i class="fa-solid fa-id-badge"></i> 조원 성적표 카드`;
      btnGroup.innerHTML = `<i class="fa-solid fa-trophy"></i> 조별과제 시상식 카드`;
    } else {
      btnPersonal.innerHTML = `<i class="fa-solid fa-user-astronaut"></i> 개인 캐릭터 카드`;
      btnGroup.innerHTML = `<i class="fa-solid fa-users"></i> 단톡방 종합 리포트`;
    }
  }

  // 멤버 선택 셀렉트 옵션 채우기
  const select = document.getElementById("cardMemberSelect");
  if (select && currentData.members) {
    select.innerHTML = "";

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

  const canvasEl = document.getElementById("shareCardCanvas");
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
  const cardHeroGlow = document.getElementById("cardHeroGlow");

  // 캔버스 배경/텍스트 컬러를 인라인으로 강제 고정 (화이트 모드 및 캡처 시 깨짐 원천 차단)
  if (canvasEl) {
    if (selectedAnalysisMode === "romance") {
      canvasEl.style.background = "linear-gradient(165deg, #1b0c18 0%, #100812 52%, #09060c 100%)";
      canvasEl.style.borderColor = "rgba(244, 63, 94, 0.35)";
    } else if (selectedAnalysisMode === "villain") {
      canvasEl.style.background = "linear-gradient(165deg, #0b1815 0%, #090f14 52%, #12080c 100%)";
      canvasEl.style.borderColor = "rgba(52, 211, 153, 0.35)";
    } else {
      canvasEl.style.background = "linear-gradient(165deg, #0f1722 0%, #090e13 55%, #06090d 100%)";
      canvasEl.style.borderColor = "rgba(245, 183, 61, 0.3)";
    }
    canvasEl.style.color = "#f6f8fa";
  }

  const getCharDataLocal = (ctiCode) => {
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
    } else if (window.CTI_AVATARS && window.CTI_AVATARS["ELFA"]) {
      base.img = window.CTI_AVATARS["ELFA"];
    }
    return base;
  };

  const m = (currentData.members && currentData.members[currentCardMemberIndex])
    ? currentData.members[currentCardMemberIndex]
    : (currentData.members ? currentData.members[0] : null);

  // ==================== 모드 2: 💘 썸·연인 1:1 애정도 전용 포토카드 템플릿 ====================
  if (selectedAnalysisMode === "romance") {
    const acadRom = (currentData.academicMetrics && currentData.academicMetrics.romance) || {};
    const mA = acadRom.mA || (currentData.members && currentData.members[0]) || m;
    const mB = acadRom.mB || (currentData.members && currentData.members[1]) || mA;
    const loveScore = acadRom.loveScore || 88;
    const pushPullText = acadRom.pushPullText || "서로 호감 신호를 주고받는 달달한 관계";

    if (currentCardMode === "personal" && m) {
      const charInfo = getCharDataLocal(m.cti);
      const isMoreInLove = acadRom.moreInLove && acadRom.moreInLove.name === m.name;
      const myAffection = (mA && m.name === mA.name) ? (acadRom.affectionA || 85) : (acadRom.affectionB || 82);
      const myReply = (mA && m.name === mA.name) ? (acadRom.replyA || 5) : (acadRom.replyB || 7);

      if (categoryTag) {
        categoryTag.innerText = "ROMANCE AFFECTION CARD";
        categoryTag.style.color = "#fb7185";
      }
      if (subHeader) subHeader.innerText = `${currentData.roomName || '1:1 대화방'} • 썸·연인 분석`;
      if (badgeRight) {
        badgeRight.innerText = `호감도 ${myAffection}%`;
        badgeRight.style.backgroundColor = "rgba(244,63,94,0.2)";
        badgeRight.style.color = "#fda4af";
        badgeRight.style.borderColor = "rgba(244,63,94,0.4)";
      }

      if (heroSection) heroSection.classList.remove("hidden");
      if (charImg) {
        charImg.src = charInfo.img;
        charImg.alt = m.name;
      }
      if (heroName) {
        heroName.innerText = m.name;
        heroName.style.color = "#ffffff";
      }
      if (heroCti) {
        heroCti.innerText = isMoreInLove ? "💘 더 반한 쪽" : "💞 설렘 유발자";
        heroCti.style.backgroundColor = "#f43f5e";
        heroCti.style.color = "#ffffff";
      }
      if (heroTitle) {
        heroTitle.innerText = `${m.title || charInfo.name} (${m.cti})`;
        heroTitle.style.color = "#fda4af";
      }
      if (heroSub) {
        const quote = (m.quotes && m.quotes[0]) ? m.quotes[0] : "우리 지금 꽤 달달한 것 같은데?";
        heroSub.innerText = `"${quote}"`;
        heroSub.style.color = "#e2e8f0";
      }
      if (cardHeroGlow) {
        cardHeroGlow.style.background = "radial-gradient(circle, rgba(244,63,94,0.35) 0%, transparent 70%)";
      }

      if (bodySection) {
        bodySection.innerHTML = `
          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;text-align:left;">
            <div style="background:#140913;border:1px solid rgba(244,63,94,0.28);border-radius:14px;padding:10px;">
              <span style="font-size:9px;color:#fda4af;font-weight:700;display:block;">💗 내 애정 표현 지수</span>
              <p style="font-size:13px;font-weight:900;color:#ffffff;margin-top:2px;">${myAffection}점 <span style="font-size:10px;color:#fb7185;">(대화 ${m.msgRatio}%)</span></p>
            </div>
            <div style="background:#140913;border:1px solid rgba(244,63,94,0.28);border-radius:14px;padding:10px;">
              <span style="font-size:9px;color:#fda4af;font-weight:700;display:block;">⚡ 평균 답장 속도</span>
              <p style="font-size:13px;font-weight:900;color:#ffffff;margin-top:2px;">${myReply}분 <span style="font-size:10px;color:#f5b73d;">(선톡 ${m.starters || 0}회)</span></p>
            </div>
          </div>
          <div style="background:#140913;border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:10px;text-align:left;">
            <span style="font-size:9px;font-weight:800;color:#fb7185;display:block;margin-bottom:4px;">💌 대화 속 호감 시그널 진단</span>
            <p style="font-size:11px;color:#f8fafc;line-height:1.45;font-weight:600;word-break:keep-all;">
              ${pushPullText}
            </p>
          </div>
          <div style="background:linear-gradient(90deg,rgba(244,63,94,0.18),rgba(245,183,61,0.14));border:1px solid rgba(244,63,94,0.35);border-radius:14px;padding:10px;text-align:left;">
            <span style="font-size:9px;font-weight:900;color:#fda4af;display:block;margin-bottom:3px;">🌡️ 두 사람의 종합 설렘 온도</span>
            <p style="font-size:12px;color:#ffffff;font-weight:800;">💘 종합 썸·연애 케미 ${loveScore}% • ${acadRom.stageLabel || "핑크빛 기류 폭발"}</p>
          </div>
        `;
      }
    } else {
      // 모드 2 종합 카드: 두 사람의 1:1 커플/썸 매치업 리포트
      const charA = getCharDataLocal(mA ? mA.cti : "ELFA");
      const charB = getCharDataLocal(mB ? mB.cti : "ILFR");
      if (categoryTag) {
        categoryTag.innerText = "COUPLE & SOME REPORT";
        categoryTag.style.color = "#fb7185";
      }
      if (subHeader) subHeader.innerText = `${mA ? mA.name : '나'} ❤️ ${mB ? mB.name : '상대방'} • 1:1 정밀 분석`;
      if (badgeRight) {
        badgeRight.innerText = `케미 ${loveScore}%`;
        badgeRight.style.backgroundColor = "rgba(244,63,94,0.2)";
        badgeRight.style.color = "#fda4af";
      }
      if (heroSection) heroSection.classList.add("hidden");

      if (bodySection) {
        bodySection.innerHTML = `
          <div style="display:flex;flex-direction:column;gap:8px;text-align:left;">
            <div style="background:#160a14;border:1px solid rgba(244,63,94,0.32);border-radius:16px;padding:12px;display:flex;align-items:center;justify-content:space-between;gap:8px;">
              <div style="display:flex;flex-direction:column;align-items:center;flex:1;min-width:0;">
                <img src="${charA.img}" style="width:48px;height:48px;border-radius:9999px;background:#241120;padding:4px;border:2px solid #fb7185;object-fit:contain;">
                <span style="font-size:12px;font-weight:900;color:#ffffff;margin-top:4px;">${mA ? mA.name : '참여자 A'}</span>
                <span style="font-size:10px;color:#fda4af;font-weight:700;">호감 ${acadRom.affectionA || 86}%</span>
              </div>
              <div style="text-align:center;padding:0 4px;">
                <div style="font-size:18px;font-weight:900;color:#fb7185;">💘 ${loveScore}%</div>
                <span style="font-size:9px;color:#f5b73d;font-weight:800;display:block;margin-top:2px;">1:1 애정 지수</span>
              </div>
              <div style="display:flex;flex-direction:column;align-items:center;flex:1;min-width:0;">
                <img src="${charB.img}" style="width:48px;height:48px;border-radius:9999px;background:#241120;padding:4px;border:2px solid #f5b73d;object-fit:contain;">
                <span style="font-size:12px;font-weight:900;color:#ffffff;margin-top:4px;">${mB ? mB.name : '참여자 B'}</span>
                <span style="font-size:10px;color:#fde68a;font-weight:700;">호감 ${acadRom.affectionB || 82}%</span>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;">
              <div style="background:#120810;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:8px;">
                <span style="font-size:9px;color:#94a3b8;font-weight:700;display:block;">👑 더 많이 좋아하는 사람</span>
                <p style="font-size:12px;font-weight:900;color:#fda4af;margin-top:2px;">${acadRom.moreInLove ? acadRom.moreInLove.name : (mA ? mA.name : '동률')}</p>
              </div>
              <div style="background:#120810;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:8px;">
                <span style="font-size:9px;color:#94a3b8;font-weight:700;display:block;">⚡ 평균 답장 템포</span>
                <p style="font-size:12px;font-weight:900;color:#ffffff;margin-top:2px;">${acadRom.replyA || 5}분 vs ${acadRom.replyB || 7}분</p>
              </div>
              <div style="background:#120810;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:8px;">
                <span style="font-size:9px;color:#94a3b8;font-weight:700;display:block;">💬 총 대화 메시지</span>
                <p style="font-size:12px;font-weight:900;color:#ffffff;margin-top:2px;">${(currentData.totalMessages || 0).toLocaleString()}건</p>
              </div>
              <div style="background:#120810;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:8px;">
                <span style="font-size:9px;color:#94a3b8;font-weight:700;display:block;">🌙 심야 대화 골든타임</span>
                <p style="font-size:12px;font-weight:900;color:#fde68a;margin-top:2px;">${(currentData.activity && currentData.activity.peakHour) || "밤 22시-24시"}</p>
              </div>
            </div>

            <div style="background:linear-gradient(90deg,rgba(244,63,94,0.16),rgba(168,85,247,0.16));border:1px solid rgba(244,63,94,0.32);border-radius:12px;padding:10px;">
              <span style="font-size:9px;font-weight:900;color:#fda4af;display:block;margin-bottom:3px;">💞 AI 관계 총평</span>
              <p style="font-size:10.5px;color:#ffffff;line-height:1.45;font-weight:600;word-break:keep-all;">
                "${pushPullText}"
              </p>
            </div>
          </div>
        `;
      }
    }

    setShareRatio(currentShareRatio || "story");
    return;
  }

  // ==================== 모드 3: 🚨 조별과제 기여도 & 빌런 전용 포토카드 템플릿 ====================
  if (selectedAnalysisMode === "villain") {
    const acadVillain = (currentData.academicMetrics && currentData.academicMetrics.villain) || {};
    const profiles = acadVillain.profiles || [];
    const topHero = acadVillain.topHero || profiles[0];
    const topVillain = acadVillain.topVillain || profiles[profiles.length - 1];

    if (currentCardMode === "personal" && m) {
      const p = profiles.find(x => x.name === m.name) || profiles[0] || {
        name: m.name,
        cti: m.cti,
        grade: "B+",
        contributionScore: 70,
        loafingScore: 25,
        msgRatio: m.msgRatio || 20,
        workShareCount: 2,
        tokenRatio: 15,
        replySpeed: 10,
        roleBadge: "든든 조원"
      };
      const charInfo = getCharDataLocal(p.cti || m.cti);
      const isVillain = p.loafingScore >= 55 || p.grade === "F" || p.grade === "C-";

      if (categoryTag) {
        categoryTag.innerText = "TEAM PROJECT GRADE CARD";
        categoryTag.style.color = isVillain ? "#fb7185" : "#34d399";
      }
      if (subHeader) subHeader.innerText = `${currentData.roomName || '조별과제 단톡방'} • 기여도 성적표`;
      if (badgeRight) {
        badgeRight.innerText = `추천 학점 ${p.grade}`;
        badgeRight.style.backgroundColor = isVillain ? "rgba(244,63,94,0.22)" : "rgba(52,211,153,0.22)";
        badgeRight.style.color = isVillain ? "#fda4af" : "#6ee7b7";
      }

      if (heroSection) heroSection.classList.remove("hidden");
      if (charImg) {
        charImg.src = charInfo.img;
        charImg.alt = p.name;
      }
      if (heroName) {
        heroName.innerText = p.name;
        heroName.style.color = "#ffffff";
      }
      if (heroCti) {
        heroCti.innerText = `학점 ${p.grade}`;
        heroCti.style.backgroundColor = isVillain ? "#e11d48" : "#10b981";
        heroCti.style.color = "#ffffff";
      }
      if (heroTitle) {
        heroTitle.innerText = getVillainRoleBadgeText(p) || p.roleBadge || "조별과제 참여자";
        heroTitle.style.color = isVillain ? "#fda4af" : "#6ee7b7";
      }
      if (heroSub) {
        const quote = (m.quotes && m.quotes[0]) ? m.quotes[0] : "제가 자료 취합해서 공유할게요!";
        heroSub.innerText = `"${quote}"`;
        heroSub.style.color = "#e2e8f0";
      }
      if (cardHeroGlow) {
        cardHeroGlow.style.background = isVillain
          ? "radial-gradient(circle, rgba(244,63,94,0.38) 0%, transparent 70%)"
          : "radial-gradient(circle, rgba(16,185,129,0.38) 0%, transparent 70%)";
      }

      if (bodySection) {
        bodySection.innerHTML = `
          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;text-align:left;">
            <div style="background:#0a1412;border:1px solid rgba(52,211,153,0.28);border-radius:14px;padding:10px;">
              <span style="font-size:9px;color:#6ee7b7;font-weight:700;display:block;">🏆 과제 기여 점수</span>
              <p style="font-size:13px;font-weight:900;color:#ffffff;margin-top:2px;">${p.contributionScore}점 <span style="font-size:10px;color:#34d399;">(자료 ${p.workShareCount || 0}회)</span></p>
            </div>
            <div style="background:#170a0f;border:1px solid rgba(244,63,94,0.28);border-radius:14px;padding:10px;">
              <span style="font-size:9px;color:#fda4af;font-weight:700;display:block;">🚨 빌런 위험 지수</span>
              <p style="font-size:13px;font-weight:900;color:#ffffff;margin-top:2px;">${p.loafingScore}% <span style="font-size:10px;color:#fb7185;">(단답 ${p.tokenRatio}%)</span></p>
            </div>
          </div>
          <div style="background:#0c1118;border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:10px;text-align:left;">
            <span style="font-size:9px;font-weight:800;color:#f5b73d;display:block;margin-bottom:4px;">📊 실무 참여 핵심 수치</span>
            <p style="font-size:11px;color:#f8fafc;font-weight:700;">
              대화 지분 ${p.msgRatio}% · 먼저 의견 ${p.starters || 0}회 · 평균 답장 ${p.replySpeed}분
            </p>
          </div>
          <div style="background:linear-gradient(90deg,rgba(16,185,129,0.15),rgba(244,63,94,0.15));border:1px solid rgba(255,255,255,0.15);border-radius:14px;padding:10px;text-align:left;">
            <span style="font-size:9px;font-weight:900;color:#fde68a;display:block;margin-bottom:3px;">⚖️ AI 조별과제 최종 판정</span>
            <p style="font-size:10.5px;color:#ffffff;line-height:1.45;font-weight:600;word-break:keep-all;">
              ${getVillainDiagnosisText(p)}
            </p>
          </div>
        `;
      }
    } else {
      // 모드 3 종합 카드: 조별과제 기여도 시상식 & 성적표 요약
      if (categoryTag) {
        categoryTag.innerText = "TEAM PROJECT AWARDS";
        categoryTag.style.color = "#34d399";
      }
      if (subHeader) subHeader.innerText = `${currentData.roomName || '조별과제 단톡방'} • 최종 성적표`;
      if (badgeRight) {
        badgeRight.innerText = `${profiles.length}명 분석`;
        badgeRight.style.backgroundColor = "rgba(52,211,153,0.2)";
        badgeRight.style.color = "#6ee7b7";
      }
      if (heroSection) heroSection.classList.add("hidden");

      const sortedByContrib = [...profiles].sort((a, b) => b.contributionScore - a.contributionScore);
      const rowsHtml = sortedByContrib.slice(0, 5).map((p, idx) => {
        const isV = p.loafingScore >= 55 || p.grade === "F" || p.grade === "C-";
        return `
          <div style="display:flex;align-items:center;justify-content:space-between;background:${isV ? '#190b10' : '#0b1514'};border:1px solid ${isV ? 'rgba(244,63,94,0.3)' : 'rgba(52,211,153,0.25)'};border-radius:10px;padding:6px 10px;">
            <div style="display:flex;align-items:center;gap:6px;min-width:0;">
              <span style="font-size:10px;font-weight:900;color:${idx === 0 ? '#fde047' : '#94a3b8'};">${idx + 1}위</span>
              <span style="font-size:11px;font-weight:900;color:#ffffff;">${p.name}</span>
              <span style="font-size:9px;font-weight:900;padding:1px 5px;border-radius:5px;background:${isV ? '#e11d48' : '#10b981'};color:#ffffff;">${p.grade}</span>
            </div>
            <div style="font-size:10px;font-weight:800;color:#e2e8f0;white-space:nowrap;">
              기여 <strong style="color:#34d399;">${p.contributionScore}점</strong> · 위험 <strong style="color:#fb7185;">${p.loafingScore}%</strong>
            </div>
          </div>
        `;
      }).join("");

      if (bodySection) {
        bodySection.innerHTML = `
          <div style="display:flex;flex-direction:column;gap:8px;text-align:left;">
            <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;">
              <div style="background:#0a1714;border:1px solid rgba(52,211,153,0.35);border-radius:12px;padding:9px;">
                <span style="font-size:9px;color:#6ee7b7;font-weight:800;display:block;">👑 하드캐리 총대장 1위</span>
                <p style="font-size:13px;font-weight:900;color:#ffffff;margin-top:2px;">${topHero ? topHero.name : '-'} <span style="font-size:10px;color:#34d399;">(${topHero ? topHero.grade : 'A+'})</span></p>
                <span style="font-size:9px;color:#94a3b8;display:block;margin-top:1px;">기여 ${topHero ? topHero.contributionScore : 0}점 · 자료 ${topHero ? (topHero.workShareCount || 0) : 0}회</span>
              </div>
              <div style="background:#190a10;border:1px solid rgba(244,63,94,0.35);border-radius:12px;padding:9px;">
                <span style="font-size:9px;color:#fda4af;font-weight:800;display:block;">🚨 무임승차 주의 1위</span>
                <p style="font-size:13px;font-weight:900;color:#ffffff;margin-top:2px;">${topVillain ? topVillain.name : '-'} <span style="font-size:10px;color:#fb7185;">(${topVillain ? topVillain.grade : 'F'})</span></p>
                <span style="font-size:9px;color:#94a3b8;display:block;margin-top:1px;">위험도 ${topVillain ? topVillain.loafingScore : 0}% · 단답 ${topVillain ? topVillain.tokenRatio : 0}%</span>
              </div>
            </div>

            <div style="display:flex;flex-direction:column;gap:5px;">
              <span style="font-size:9px;font-weight:800;color:#94a3b8;">📋 조원별 핵심 기여도 & 학점 성적표</span>
              ${rowsHtml}
            </div>
          </div>
        `;
      }
    }

    setShareRatio(currentShareRatio || "story");
    return;
  }

  // ==================== 모드 1 (기본): 🔥 우리 단톡방 케미 & 권력 서열 포토카드 템플릿 ====================
  if (currentCardMode === "personal") {
    if (!m) return;

    const ctiDef = window.CTI_SYSTEM && window.CTI_SYSTEM.TYPES ? window.CTI_SYSTEM.TYPES[m.cti] : null;
    const charInfo = getCharDataLocal(m.cti);

    if (categoryTag) {
      categoryTag.innerText = "CTI PERSONAL IDENTITY";
      categoryTag.style.color = "#f5b73d";
    }
    if (subHeader) subHeader.innerText = `${currentData.roomName || '단톡방'} • ${currentData.dateRange || '최근 분석'}`;
    if (badgeRight) {
      badgeRight.innerText = `${m.msgRatio || 0}% 지분`;
      badgeRight.style.backgroundColor = "rgba(255,255,255,0.06)";
      badgeRight.style.color = "#f5b73d";
    }

    if (heroSection) heroSection.classList.remove("hidden");
    if (charImg) {
      charImg.src = charInfo.img;
      charImg.alt = charInfo.name;
    }
    if (heroName) {
      heroName.innerText = m.name;
      heroName.style.color = "#ffffff";
    }
    if (heroCti) {
      heroCti.innerText = m.cti || "CTI";
      heroCti.style.backgroundColor = charInfo.color || "#f5b73d";
      heroCti.style.color = "#030708";
    }
    if (heroTitle) {
      heroTitle.innerText = m.title || (ctiDef ? ctiDef.title : charInfo.name);
      heroTitle.style.color = charInfo.color || "#f5b73d";
    }
    if (heroSub) {
      const subText = (ctiDef && ctiDef.sub) ? ctiDef.sub : (m.quotes && m.quotes.length > 0 ? m.quotes[0] : charInfo.desc);
      heroSub.innerText = `"${subText}"`;
      heroSub.style.color = "#cbd5e1";
    }

    if (cardHeroGlow) {
      cardHeroGlow.style.background = `radial-gradient(circle, ${(charInfo.color || '#f5b73d')}44 0%, transparent 70%)`;
    }

    if (bodySection) {
      const sigs = (m.signatures || (m.topWords ? m.topWords.map(w => w.word) : [])).slice(0, 3);
      const sigPills = sigs.map(s => `<span style="padding:3px 9px;border-radius:9999px;font-size:10px;font-weight:700;background:#16202a;color:#f5b73d;border:1px solid rgba(245,183,61,0.3);white-space:nowrap;">#${s}</span>`).join(" ");

      const savageText = (ctiDef && ctiDef.savageShort)
        ? ctiDef.savageShort
        : (m.savage
            ? (m.savage.split(". ")[0] + (m.savage.includes(".") ? "." : ""))
            : "단톡방의 침묵을 깨고 활기를 불어넣는 텐션 메이커!");

      bodySection.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;text-align:left;">
          <div style="background:#090e13;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:10px;">
            <span style="font-size:9px;color:#848c96;font-weight:700;display:block;white-space:nowrap;">💬 총 발화량</span>
            <p style="font-size:12px;font-weight:900;color:#ffffff;margin-top:2px;white-space:nowrap;">
              ${(m.totalMsgs || 0).toLocaleString()}건 <span style="font-size:10px;color:#f5b73d;">(${m.msgRatio}%)</span>
            </p>
          </div>
          <div style="background:#090e13;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:10px;">
            <span style="font-size:9px;color:#848c96;font-weight:700;display:block;white-space:nowrap;">⚡ 평균 문장 길이</span>
            <p style="font-size:12px;font-weight:900;color:#ffffff;margin-top:2px;white-space:nowrap;">
              ${m.avgLen || 0}자 <span style="font-size:10px;color:#34d399;">(${m.avgLen > 10 ? '서사형' : '압축단답'})</span>
            </p>
          </div>
        </div>

        <div style="background:#090e13;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:10px;text-align:left;">
          <span style="font-size:9px;font-weight:700;color:#848c96;display:block;margin-bottom:4px;">🏷️ 입에 붙은 시그니처 말버릇</span>
          <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
            ${sigPills || '<span style="font-size:10px;color:#848c96;">#티키타카</span>'}
          </div>
        </div>

        <div style="background:linear-gradient(90deg,rgba(245,183,61,0.14),rgba(139,92,246,0.14));border:1px solid rgba(245,183,61,0.28);border-radius:14px;padding:10px;text-align:left;">
          <div style="font-size:9px;font-weight:900;color:#f5b73d;margin-bottom:3px;">💀 팩폭 리포트 요약</div>
          <p style="font-size:11px;color:#f6f8fa;line-height:1.4;font-weight:500;word-break:keep-all;">
            ${savageText}
          </p>
        </div>
      `;
    }
  } else {
    if (categoryTag) {
      categoryTag.innerText = "CTI GROUP REPORT";
      categoryTag.style.color = "#f5b73d";
    }
    if (subHeader) subHeader.innerText = `${currentData.roomName || '단톡방'} • ${currentData.dateRange || '전체 기간'}`;
    if (badgeRight) {
      badgeRight.innerText = `우정 ${currentData.groupGrade || 'S+'}`;
      badgeRight.style.backgroundColor = "rgba(255,255,255,0.06)";
      badgeRight.style.color = "#f5b73d";
    }

    if (heroSection) heroSection.classList.add("hidden");

    if (bodySection) {
      const topTalker = (currentData.members && currentData.members.length > 0) ? currentData.members[0] : null;
      const peakTime = (currentData.activity && currentData.activity.peakHour)
        ? `${currentData.activity.peakWeekday ? currentData.activity.peakWeekday + ' ' : ''}${currentData.activity.peakHour}`
        : (topTalker && topTalker.activeHours ? topTalker.activeHours : "심야 22시");
      const peace = currentData.peaceIndex !== undefined ? currentData.peaceIndex : 100;

      let hotKeywords = [];
      if (currentData.keywords && currentData.keywords.roomKeywords && currentData.keywords.roomKeywords.length > 0) {
        hotKeywords = currentData.keywords.roomKeywords.slice(0, 4).map(k => typeof k === 'string' ? k : k.word);
      } else {
        const wordMap = {};
        (currentData.members || []).forEach(mem => {
          (mem.signatures || []).forEach(s => { wordMap[s] = (wordMap[s] || 0) + 1; });
          (mem.topWords || []).forEach(w => { wordMap[w.word] = (wordMap[w.word] || 0) + (w.count || 1); });
        });
        hotKeywords = Object.entries(wordMap).sort((a, b) => b[1] - a[1]).slice(0, 4).map(x => x[0]);
      }
      const kwPills = hotKeywords.map(w => `<span style="padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:700;background:#16202a;color:#f5b73d;border:1px solid rgba(245,183,61,0.3);white-space:nowrap;">#${w}</span>`).join(" ");

      const topPair = (currentData.pairRankings && currentData.pairRankings.length > 0) ? currentData.pairRankings[0] : null;

      const memberChips = (currentData.members || []).slice(0, 4).map(mem => {
        const cInfo = getCharDataLocal(mem.cti);
        return `
          <div style="background:#0c1218;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:6px;display:flex;align-items:center;gap:6px;">
            <div style="width:32px;height:32px;border-radius:8px;background:#16202a;border:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;padding:2px;flex-shrink:0;overflow:hidden;">
              <img src="${cInfo.img}" style="width:100%;height:100%;object-fit:contain;">
            </div>
            <div style="min-width:0;flex-grow:1;text-align:left;">
              <div style="display:flex;align-items:center;gap:4px;">
                <span style="font-size:11px;font-weight:800;color:#ffffff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${mem.name}</span>
                <span style="font-size:8px;font-weight:900;padding:1px 4px;border-radius:4px;color:#030708;background-color:${cInfo.color || '#f5b73d'};">${mem.cti}</span>
              </div>
              <p style="font-size:9px;color:#848c96;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${mem.title || cInfo.name}</p>
            </div>
            <span style="font-size:9px;font-weight:800;color:#f5b73d;flex-shrink:0;">${mem.msgRatio}%</span>
          </div>
        `;
      }).join("");

      bodySection.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:8px;text-align:left;">
          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;">
            <div style="background:#090e13;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:8px;">
              <span style="font-size:9px;color:#848c96;font-weight:700;display:block;">💬 총 대화량</span>
              <p style="font-size:12px;font-weight:900;color:#ffffff;margin-top:2px;">${(currentData.totalMessages || 0).toLocaleString()}건</p>
            </div>
            <div style="background:#090e13;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:8px;">
              <span style="font-size:9px;color:#848c96;font-weight:700;display:block;">👑 최다 발화러</span>
              <p style="font-size:12px;font-weight:900;color:#ffffff;margin-top:2px;">${topTalker ? topTalker.name : '대화러'} <span style="font-size:10px;color:#f5b73d;">(${topTalker ? topTalker.msgRatio : 0}%)</span></p>
            </div>
            <div style="background:#090e13;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:8px;">
              <span style="font-size:9px;color:#848c96;font-weight:700;display:block;">⏰ 활성 골든타임</span>
              <p style="font-size:12px;font-weight:900;color:#ffffff;margin-top:2px;">${peakTime}</p>
            </div>
            <div style="background:#090e13;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:8px;">
              <span style="font-size:9px;color:#848c96;font-weight:700;display:block;">🌿 청정 평화지수</span>
              <p style="font-size:12px;font-weight:900;color:#34d399;margin-top:2px;">${peace}%</p>
            </div>
          </div>

          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
              <span style="font-size:9px;font-weight:700;color:#848c96;">👥 단톡방 CTI 페르소나 라인업</span>
              <span style="font-size:9px;color:#848c96;">${(currentData.members || []).length}명 분석</span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;">
              ${memberChips}
            </div>
          </div>

          <div style="background:#090e13;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:8px;">
            <span style="font-size:9px;font-weight:700;color:#848c96;display:block;margin-bottom:4px;">🔥 단톡방 최다 언급 핫토픽</span>
            <div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;">
              ${kwPills || '<span style="font-size:10px;color:#848c96;">#단톡방 #티키타카</span>'}
            </div>
          </div>

          ${topPair ? `
            <div style="background:linear-gradient(90deg,rgba(139,92,246,0.16),rgba(245,183,61,0.16));border:1px solid rgba(139,92,246,0.32);border-radius:12px;padding:8px;display:flex;align-items:center;justify-content:space-between;">
              <div style="display:flex;align-items:center;gap:6px;min-width:0;">
                <span style="font-size:14px;">🏆</span>
                <div style="min-width:0;text-align:left;">
                  <span style="font-size:10px;font-weight:900;color:#ffffff;">${topPair.pair[0]} ↔ ${topPair.pair[1]}</span>
                  <p style="font-size:9px;color:#94a3b8;">${topPair.summary || '환상의 티키타카 호흡'}</p>
                </div>
              </div>
              <span style="font-size:11px;font-weight:900;color:#f5b73d;">${topPair.score}점</span>
            </div>
          ` : ''}
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

  showToast("포토카드 이미지를 렌더링하는 중입니다...", "loading");

  try {
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

    const activeMode = typeof selectedAnalysisMode === "string" ? selectedAnalysisMode : "chemistry";
    const modeTag = activeMode === "romance" ? "연인포토카드" : activeMode === "villain" ? "조별과제포토카드" : "CTI_포토카드";
    const roomTitle = (currentData && currentData.roomName) ? currentData.roomName : "리포트";
    const prefix = currentCardMode === "personal" ? `[${modeTag}]_${currentMember}` : `[${modeTag}_종합]_${roomTitle}`;
    const safeTitle = prefix.replace(/[\\/:*?"<>|]/g, "_");

    // 2. html2canvas 정밀 캡처 (스크롤 오프셋 0 및 복제 엘리먼트 위치/테마 안정화)
    const canvas = await html2canvas(canvasTarget, {
      scale: 2.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#090e13",
      scrollX: 0,
      scrollY: 0,
      windowWidth: document.documentElement.offsetWidth,
      windowHeight: document.documentElement.offsetHeight,
      logging: false,
      onclone: (clonedDoc) => {
        if (clonedDoc.body) {
          clonedDoc.body.classList.remove("light-mode");
        }
        const clonedWrapper = clonedDoc.getElementById("shareCardWrapper");
        if (clonedWrapper) {
          clonedWrapper.style.transform = "none";
          clonedWrapper.style.transition = "none";
        }
        const clonedCard = clonedDoc.getElementById("shareCardCanvas");
        if (clonedCard) {
          clonedCard.style.margin = "0";
          clonedCard.style.transform = "none";
          clonedCard.style.boxShadow = "none";
          clonedCard.style.backgroundColor = "#111820";
          clonedCard.style.color = "#f6f8fa";
          clonedCard.style.fontFamily = "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif";
          clonedCard.style.letterSpacing = "normal";

          // 로컬 file:// 환경에서 base64가 아닌 이미지로 인한 Tainted Canvas 방지
          const imgs = clonedCard.querySelectorAll("img");
          imgs.forEach(imgEl => {
            const srcAttr = imgEl.getAttribute("src") || "";
            if (!srcAttr.startsWith("data:") && window.CTI_AVATARS && window.CTI_AVATARS["ELFA"]) {
              imgEl.src = window.CTI_AVATARS["ELFA"];
            }
          });

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
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerConfetti();
      showToast("포토카드 이미지가 저장되었습니다", "success");
    } catch (taintErr) {
      console.warn("toDataURL fallback triggered:", taintErr);
      canvas.toBlob((blob) => {
        if (!blob) {
          showToast("이미지 생성에 실패했습니다: " + taintErr.message, "error");
          return;
        }
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `${safeTitle}_${currentShareRatio}.png`;
        link.href = blobUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        triggerConfetti();
        showToast("포토카드 이미지가 저장되었습니다", "success");
      }, "image/png");
    }
  } catch (err) {
    console.error("Share card export error:", err);
    showToast("이미지 생성에 실패했습니다: " + err.message, "error");
  }
}

// 모바일 웹 공유 및 데스크톱 클립보드 복사 지원
async function shareOrCopyCard() {
  const canvasTarget = document.getElementById("shareCardCanvas");
  if (!canvasTarget) return;

  showToast("공유용 포토카드를 준비하는 중입니다...", "loading");

  try {
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch (e) {}
    }

    const currentMember = (currentData && currentData.members && currentData.members[currentCardMemberIndex]) 
      ? currentData.members[currentCardMemberIndex].name 
      : "포토카드";

    const activeMode = typeof selectedAnalysisMode === "string" ? selectedAnalysisMode : "chemistry";
    const modeTag = activeMode === "romance" ? "연인포토카드" : activeMode === "villain" ? "조별과제포토카드" : "CTI_포토카드";
    const roomTitle = (currentData && currentData.roomName) ? currentData.roomName : "리포트";
    const prefix = currentCardMode === "personal" ? `[${modeTag}]_${currentMember}` : `[${modeTag}_종합]_${roomTitle}`;
    const safeTitle = prefix.replace(/[\\/:*?"<>|]/g, "_");

    const canvas = await html2canvas(canvasTarget, {
      scale: 2.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#090e13",
      scrollX: 0,
      scrollY: 0,
      windowWidth: document.documentElement.offsetWidth,
      windowHeight: document.documentElement.offsetHeight,
      logging: false,
      onclone: (clonedDoc) => {
        if (clonedDoc.body) {
          clonedDoc.body.classList.remove("light-mode");
        }
        const clonedWrapper = clonedDoc.getElementById("shareCardWrapper");
        if (clonedWrapper) {
          clonedWrapper.style.transform = "none";
          clonedWrapper.style.transition = "none";
        }
        const clonedCard = clonedDoc.getElementById("shareCardCanvas");
        if (clonedCard) {
          clonedCard.style.margin = "0";
          clonedCard.style.transform = "none";
          clonedCard.style.boxShadow = "none";
          clonedCard.style.backgroundColor = "#111820";
          clonedCard.style.color = "#f6f8fa";
          clonedCard.style.fontFamily = "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif";
          clonedCard.style.letterSpacing = "normal";

          const imgs = clonedCard.querySelectorAll("img");
          imgs.forEach(imgEl => {
            const srcAttr = imgEl.getAttribute("src") || "";
            if (!srcAttr.startsWith("data:") && window.CTI_AVATARS && window.CTI_AVATARS["ELFA"]) {
              imgEl.src = window.CTI_AVATARS["ELFA"];
            }
          });

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
          showToast("포토카드 공유가 완료되었습니다", "success");
          return;
        } catch (shareErr) {
          if (shareErr.name === "AbortError") return;
        }
      }

      // 2. 데스크톱 클립보드 API 지원 시 이미지 또는 공유 링크 복사
      if (navigator.clipboard && window.ClipboardItem) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob })
          ]);
          triggerConfetti();
          showToast("공유 링크가 복사되었습니다 (클립보드 이미지 붙여넣기 가능)", "success");
          return;
        } catch (clipErr) {
          console.warn("Clipboard image copy failed, trying text link copy:", clipErr);
        }
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(window.location.href);
          triggerConfetti();
          showToast("공유 링크가 복사되었습니다", "success");
          return;
        } catch (textErr) {
          console.warn("Clipboard text copy failed:", textErr);
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