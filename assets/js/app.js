const state = {
  levels: [],
  activeLevelId: "",
  activeLesson: 1
};

const lessonNav = document.getElementById("lessonNav");
const lessonTitle = document.getElementById("lessonTitle");
const lessonSubtitle = document.getElementById("lessonSubtitle");
const lessonContent = document.getElementById("lessonContent");
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
let activeRecognition = null;
let activePracticeControls = null;
let activePitchSession = null;

sidebarToggle.addEventListener("click", () => {
  sidebar.classList.toggle("open");
});

function pad2(num) {
  return String(num).padStart(2, "0");
}

function lessonFile(levelId, lessonNumber) {
  return `data/lessons/${levelId}/lesson-${pad2(lessonNumber)}.json`;
}

function renderSidebar() {
  lessonNav.innerHTML = "";

  state.levels.forEach((level, index) => {
    const details = document.createElement("details");
    details.className = "level";
    details.open = index === 0 || level.id === state.activeLevelId;

    const summary = document.createElement("summary");
    summary.textContent = level.name;
    details.appendChild(summary);

    const lessons = document.createElement("div");
    lessons.className = "lessons";

    for (let n = level.lessonStart; n <= level.lessonEnd; n += 1) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "lesson-btn";
      btn.dataset.levelId = level.id;
      btn.dataset.lesson = String(n);
      btn.textContent = `第 ${n} 課`;
      if (state.activeLevelId === level.id && state.activeLesson === n) {
        btn.classList.add("active");
      }
      btn.addEventListener("click", async () => {
        state.activeLevelId = level.id;
        state.activeLesson = n;
        setActiveButton();
        if (window.innerWidth <= 900) {
          sidebar.classList.remove("open");
        }
        await loadLesson(level.id, n);
      });
      lessons.appendChild(btn);
    }

    details.appendChild(lessons);
    lessonNav.appendChild(details);
  });
}

function setActiveButton() {
  document.querySelectorAll(".lesson-btn").forEach((btn) => {
    const isActive = btn.dataset.levelId === state.activeLevelId && Number(btn.dataset.lesson) === state.activeLesson;
    btn.classList.toggle("active", isActive);
  });
}

function createSentenceCard(item) {
  const card = document.createElement("article");
  card.className = "sentence-card";

  const textWrap = document.createElement("div");

  const jp = document.createElement("p");
  jp.className = "jp";
  jp.textContent = item.speaker ? `${item.speaker}: ${item.jp}` : item.jp || "";
  textWrap.appendChild(jp);

  if (item.reading) {
    const reading = document.createElement("p");
    reading.className = "reading";
    reading.textContent = item.reading;
    textWrap.appendChild(reading);
  }

  if (item.zh) {
    const zh = document.createElement("p");
    zh.className = "zh";
    zh.textContent = item.zh;
    textWrap.appendChild(zh);
  }

  const audioWrap = document.createElement("div");
  audioWrap.className = "audio-wrap";
  if (item.audio) {
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.preload = "metadata";
    audio.src = item.audio;
    audioWrap.appendChild(audio);
  } else {
    const noAudio = document.createElement("span");
    noAudio.className = "zh";
    noAudio.textContent = "尚未提供音檔";
    audioWrap.appendChild(noAudio);
  }

  card.appendChild(textWrap);
  card.appendChild(audioWrap);
  return card;
}

function renderVocabularyGroup(group) {
  const block = document.createElement("section");
  block.className = "vocab-group";

  const title = document.createElement("h4");
  title.className = "group-title";
  title.textContent = group.title;
  block.appendChild(title);

  const list = document.createElement("ul");
  list.className = "vocab-list";

  group.items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "vocab-item";
    li.textContent = typeof item === "string" ? item : item.jp;
    list.appendChild(li);
  });

  block.appendChild(list);
  return block;
}

function renderSection(section) {
  const wrapper = document.createElement("section");
  wrapper.className = "section-card";

  const header = document.createElement("header");
  header.className = "section-header";

  const title = document.createElement("h3");
  title.textContent = section.title;
  header.appendChild(title);

  if (section.note) {
    const note = document.createElement("p");
    note.className = "section-note";
    note.textContent = section.note;
    header.appendChild(note);
  }

  wrapper.appendChild(header);

  const body = document.createElement("div");
  body.className = "section-body";

  if (Array.isArray(section.summary) && section.summary.length > 0) {
    const tbl = document.createElement("table");
    tbl.className = "summary-table";
    const thead = tbl.createTHead();
    const hrow = thead.insertRow();
    ["題號", "主題"].forEach((h) => {
      const th = document.createElement("th");
      th.textContent = h;
      hrow.appendChild(th);
    });
    const tbody = tbl.createTBody();
    section.summary.forEach((row) => {
      const tr = tbody.insertRow();
      const td1 = tr.insertCell();
      td1.textContent = row.no;
      const td2 = tr.insertCell();
      td2.textContent = row.topic;
    });
    body.appendChild(tbl);
  }

  if (Array.isArray(section.groups) && section.groups.length > 0) {
    section.groups.forEach((group) => {
      body.appendChild(renderVocabularyGroup(group));
    });
  } else if (Array.isArray(section.items) && section.items.length > 0) {
    section.items.forEach((item) => {
      if (typeof item === "string") {
        const line = document.createElement("p");
        line.className = "zh";
        line.textContent = item;
        body.appendChild(line);
        return;
      }
      body.appendChild(createSentenceCard(item));
    });
  } else {
    const empty = document.createElement("p");
    empty.className = "zh";
    empty.textContent = "尚未建立內容。";
    body.appendChild(empty);
  }

  wrapper.appendChild(body);
  return wrapper;
}

function normalizeText(value) {
  return (value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s　、。．,.\-—_!?！？・「」『』（）()\[\]【】:：;；/\\/]/g, "");
}

function levenshteinDistance(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

function scoreTranscript(expected, actual) {
  const left = normalizeText(expected);
  const right = normalizeText(actual);
  if (!left || !right) return 0;
  const distance = levenshteinDistance(left, right);
  const longest = Math.max(left.length, right.length);
  const score = Math.round((1 - distance / longest) * 100);
  return Math.max(0, Math.min(100, score));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function detectPitch(buffer, sampleRate) {
  let rms = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / buffer.length);
  if (rms < 0.01) return -1;

  let r1 = 0;
  let r2 = buffer.length - 1;
  const threshold = 0.2;
  for (let i = 0; i < buffer.length / 2; i += 1) {
    if (Math.abs(buffer[i]) < threshold) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < buffer.length / 2; i += 1) {
    if (Math.abs(buffer[buffer.length - i]) < threshold) {
      r2 = buffer.length - i;
      break;
    }
  }

  const trimmed = buffer.slice(r1, r2);
  const correlations = new Array(trimmed.length).fill(0);
  for (let lag = 0; lag < trimmed.length; lag += 1) {
    for (let i = 0; i < trimmed.length - lag; i += 1) {
      correlations[lag] += trimmed[i] * trimmed[i + lag];
    }
  }

  let dipIndex = 0;
  while (dipIndex < correlations.length - 1 && correlations[dipIndex] > correlations[dipIndex + 1]) {
    dipIndex += 1;
  }

  let maxCorrelation = -1;
  let maxIndex = -1;
  for (let i = dipIndex; i < correlations.length; i += 1) {
    if (correlations[i] > maxCorrelation) {
      maxCorrelation = correlations[i];
      maxIndex = i;
    }
  }
  if (maxIndex <= 0) return -1;
  return sampleRate / maxIndex;
}

function drawPitchCanvas(canvas, pitches) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  ctx.fillStyle = "#f7f9ff";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#d5def2";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

  if (!pitches.length) {
    ctx.fillStyle = "#7180a0";
    ctx.font = "12px sans-serif";
    ctx.fillText("尚未偵測到語調", 10, 22);
    return;
  }

  const minHz = Math.min(...pitches);
  const maxHz = Math.max(...pitches);
  const range = Math.max(1, maxHz - minHz);

  ctx.strokeStyle = "#4067d6";
  ctx.lineWidth = 2;
  ctx.beginPath();
  pitches.forEach((hz, index) => {
    const x = (index / Math.max(1, pitches.length - 1)) * (width - 12) + 6;
    const y = height - 8 - ((hz - minHz) / range) * (height - 16);
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();
}

function analyzePitchContour(pitches) {
  if (!pitches || pitches.length < 8) {
    return null;
  }
  const minHz = Math.round(Math.min(...pitches));
  const maxHz = Math.round(Math.max(...pitches));
  const range = maxHz - minHz;
  const coverage = clamp(pitches.length / 40, 0, 1);
  const variety = clamp(range / 120, 0, 1);
  const toneScore = Math.round((coverage * 0.4 + variety * 0.6) * 100);

  let advice = "語調起伏自然。";
  if (range < 35) advice = "語調偏平，可加大高低起伏。";
  if (range > 190) advice = "語調起伏較大，可放穩一點。";

  return {
    score: toneScore,
    minHz,
    maxHz,
    range,
    advice
  };
}

function stopPitchTracking() {
  if (!activePitchSession) return;
  const session = activePitchSession;
  activePitchSession = null;

  cancelAnimationFrame(session.rafId);
  if (session.mediaRecorder && session.mediaRecorder.state !== "inactive") {
    session.mediaRecorder.stop();
  }
  session.stream.getTracks().forEach((track) => track.stop());
  session.audioContext.close();

  drawPitchCanvas(session.pitchCanvas, session.pitches);
  const analysis = analyzePitchContour(session.pitches);
  if (!analysis) {
    session.toneScoreEl.textContent = "語調 —";
    session.toneStatusEl.textContent = "語調：未偵測到穩定語音。";
    return;
  }
  session.toneScoreEl.textContent = `語調 ${analysis.score}`;
  session.toneStatusEl.textContent = `語調：${analysis.minHz}-${analysis.maxHz}Hz（跨度 ${analysis.range}Hz）。${analysis.advice}`;
}

async function startPitchTracking(pitchLiveEl, pitchCanvas, toneScoreEl, toneStatusEl, recordedAudioEl, recordingStatusEl) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    toneStatusEl.textContent = "語調：此瀏覽器不支援麥克風擷取。";
    return false;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    toneStatusEl.textContent = "語調：此瀏覽器不支援音訊分析。";
    return false;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioContext = new AudioContextClass();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);

    const buffer = new Float32Array(analyser.fftSize);
    const pitches = [];
    let mediaRecorder = null;
    if (window.MediaRecorder) {
      const chunks = [];
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      mediaRecorder.onstop = () => {
        if (!chunks.length) {
          recordingStatusEl.textContent = "錄音失敗，請再試一次。";
          return;
        }
        const blob = new Blob(chunks, { type: "audio/webm" });
        const oldUrl = recordedAudioEl.dataset.objectUrl;
        if (oldUrl) {
          URL.revokeObjectURL(oldUrl);
        }
        const objectUrl = URL.createObjectURL(blob);
        recordedAudioEl.src = objectUrl;
        recordedAudioEl.dataset.objectUrl = objectUrl;
        recordedAudioEl.hidden = false;
        recordingStatusEl.textContent = "已錄音，可回放。";
      };
      mediaRecorder.start();
      recordingStatusEl.textContent = "錄音中...";
    } else {
      recordingStatusEl.textContent = "此瀏覽器不支援錄音回放。";
    }

    let rafId = 0;
    const capture = () => {
      analyser.getFloatTimeDomainData(buffer);
      const hz = detectPitch(buffer, audioContext.sampleRate);
      if (hz >= 80 && hz <= 500) {
        pitches.push(hz);
        pitchLiveEl.textContent = `即時音高：約 ${Math.round(hz)} Hz`;
      }
      rafId = requestAnimationFrame(capture);
    };
    capture();

    activePitchSession = {
      stream,
      audioContext,
      rafId,
      pitches,
      pitchCanvas,
      toneScoreEl,
      toneStatusEl,
      mediaRecorder
    };
    toneScoreEl.textContent = "語調 分析中";
    toneStatusEl.textContent = "語調：分析中...";
    return true;
  } catch (error) {
    toneStatusEl.textContent = "語調：無法啟用麥克風，請確認權限。";
    return false;
  }
}

function stopRecognition() {
  if (activeRecognition) {
    activeRecognition.stop();
    activeRecognition = null;
  }
  stopPitchTracking();
  if (activePracticeControls) {
    activePracticeControls.startBtn.disabled = false;
    activePracticeControls.stopBtn.disabled = true;
    activePracticeControls = null;
  }
}

function setPracticeScore(expected, transcriptEl, scoreEl, statusEl) {
  const transcript = transcriptEl.value.trim();
  if (!transcript) {
    scoreEl.textContent = "—";
    statusEl.textContent = "請先說話或輸入辨識文字。";
    return;
  }
  const score = scoreTranscript(expected, transcript);
  scoreEl.textContent = `${score} / 100`;
  statusEl.textContent = score >= 80 ? "很接近標準句。" : "可以再跟一次。";
}

async function startShadowing(item, transcriptEl, scoreEl, toneScoreEl, statusEl, toneStatusEl, pitchLiveEl, recordedAudioEl, recordingStatusEl, startBtn, stopBtn) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    statusEl.textContent = "此瀏覽器不支援語音辨識，可改用手動輸入後按「手動評分」。";
    return;
  }

  stopRecognition();

  const recognition = new Recognition();
  activeRecognition = recognition;
  activePracticeControls = { startBtn, stopBtn };
  recognition.lang = "ja-JP";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  statusEl.textContent = "請開始跟讀...";
  transcriptEl.value = "";
  scoreEl.textContent = "—";
  toneScoreEl.textContent = "語調 —";
  toneStatusEl.textContent = "語調：尚未分析";
  pitchLiveEl.textContent = "即時音高：—";
  recordingStatusEl.textContent = "尚未錄音";
  recordedAudioEl.hidden = true;
  startBtn.disabled = true;
  stopBtn.disabled = false;

  await startPitchTracking(
    pitchLiveEl,
    document.getElementById(`pitch-canvas-${item.practiceId}`),
    toneScoreEl,
    toneStatusEl,
    recordedAudioEl,
    recordingStatusEl
  );

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    transcriptEl.value = transcript;
    setPracticeScore(item.jp, transcriptEl, scoreEl, statusEl);
  };

  recognition.onerror = (event) => {
    if (event.error === "not-allowed") {
      statusEl.textContent = "未取得麥克風權限，請允許後再試。";
      return;
    }
    statusEl.textContent = `辨識失敗：${event.error}`;
  };

  recognition.onend = () => {
    if (activeRecognition === recognition) {
      activeRecognition = null;
      stopPitchTracking();
      startBtn.disabled = false;
      stopBtn.disabled = true;
      activePracticeControls = null;
    }
  };

  recognition.start();
}

function renderConversationSection(section) {
  const wrapper = document.createElement("section");
  wrapper.className = "section-card conversation-card";

  const header = document.createElement("header");
  header.className = "section-header";

  const title = document.createElement("h3");
  title.textContent = section.title;
  header.appendChild(title);

  if (section.note) {
    const note = document.createElement("p");
    note.className = "section-note";
    note.textContent = section.note;
    header.appendChild(note);
  }

  const toolbar = document.createElement("div");
  toolbar.className = "conversation-toolbar";

  if (section.audio) {
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.preload = "metadata";
    audio.src = section.audio;
    toolbar.appendChild(audio);

    const audioStatus = document.createElement("p");
    audioStatus.className = "practice-status";
    audioStatus.textContent = "音檔已載入。";
    audio.addEventListener("error", () => {
      audioStatus.textContent = "音檔載入失敗，請重新整理或確認網址。";
    });
    audio.addEventListener("loadedmetadata", () => {
      audioStatus.textContent = `音檔長度：約 ${Math.round(audio.duration)} 秒`;
    });
    toolbar.appendChild(audioStatus);
  }

  const hint = document.createElement("p");
  hint.className = "section-note";
  hint.textContent = "先播放原音，再按「開始跟讀」讓瀏覽器做簡易評分。";
  toolbar.appendChild(hint);

  wrapper.appendChild(header);
  wrapper.appendChild(toolbar);

  const list = document.createElement("div");
  list.className = "conversation-list";

  // Support both section.items and section.groups[].items
  const items = Array.isArray(section.items) && section.items.length > 0
    ? section.items
    : (Array.isArray(section.groups) ? section.groups.flatMap(g => g.items || []) : []);

  items.forEach((item, index) => {
    item.practiceId = `${section.title}-${index}`.replace(/\s+/g, "-");
    const row = document.createElement("article");
    row.className = "conversation-line";

    const speaker = document.createElement("div");
    speaker.className = "speaker";
    speaker.textContent = item.speaker || `句子 ${index + 1}`;

    const text = document.createElement("div");
    text.className = "conversation-text";

    const jp = document.createElement("p");
    jp.className = "jp";
    jp.textContent = item.jp;
    text.appendChild(jp);

    if (item.reading) {
      const reading = document.createElement("p");
      reading.className = "reading";
      reading.textContent = item.reading;
      text.appendChild(reading);
    }

    if (item.zh) {
      const zh = document.createElement("p");
      zh.className = "zh";
      zh.textContent = item.zh;
      text.appendChild(zh);
    }

    const actions = document.createElement("div");
    actions.className = "conversation-actions";

    const startBtn = document.createElement("button");
    startBtn.type = "button";
    startBtn.className = "practice-btn";
    startBtn.textContent = "開始跟讀";

    const stopBtn = document.createElement("button");
    stopBtn.type = "button";
    stopBtn.className = "practice-btn practice-btn-secondary";
    stopBtn.textContent = "停止";
    stopBtn.disabled = true;

    const score = document.createElement("span");
    score.className = "score-badge";
    score.textContent = "字詞 —";

    const toneScore = document.createElement("span");
    toneScore.className = "score-badge score-badge-tone";
    toneScore.textContent = "語調 —";

    const status = document.createElement("p");
    status.className = "practice-status";
    status.textContent = "尚未評分";

    const toneStatus = document.createElement("p");
    toneStatus.className = "practice-tone";
    toneStatus.textContent = "語調：尚未分析";

    const pitchLive = document.createElement("p");
    pitchLive.className = "practice-tone-live";
    pitchLive.textContent = "即時音高：—";

    const pitchCanvas = document.createElement("canvas");
    pitchCanvas.className = "pitch-canvas";
    pitchCanvas.width = 360;
    pitchCanvas.height = 90;
    pitchCanvas.id = `pitch-canvas-${item.practiceId}`;
    drawPitchCanvas(pitchCanvas, []);

    const recordingStatus = document.createElement("p");
    recordingStatus.className = "practice-recording";
    recordingStatus.textContent = "尚未錄音";

    const recordedAudio = document.createElement("audio");
    recordedAudio.className = "recorded-audio";
    recordedAudio.controls = true;
    recordedAudio.preload = "metadata";
    recordedAudio.hidden = true;

    const transcript = document.createElement("textarea");
    transcript.className = "practice-transcript";
    transcript.rows = 2;
    transcript.placeholder = "辨識結果會出現在這裡；也可手動貼上後評分。";

    startBtn.addEventListener("click", () => {
      startShadowing(
        item,
        transcript,
        score,
        toneScore,
        status,
        toneStatus,
        pitchLive,
        recordedAudio,
        recordingStatus,
        startBtn,
        stopBtn
      );
    });

    stopBtn.addEventListener("click", () => {
      status.textContent = "已手動停止跟讀。";
      stopRecognition();
    });

    const manualScoreBtn = document.createElement("button");
    manualScoreBtn.type = "button";
    manualScoreBtn.className = "practice-btn practice-btn-secondary";
    manualScoreBtn.textContent = "手動評分";
    manualScoreBtn.addEventListener("click", () => {
      setPracticeScore(item.jp, transcript, score, status);
    });

    actions.appendChild(startBtn);
    actions.appendChild(stopBtn);
    actions.appendChild(manualScoreBtn);
    actions.appendChild(score);
    actions.appendChild(toneScore);
    row.appendChild(speaker);
    row.appendChild(text);
    row.appendChild(actions);
    row.appendChild(status);
    row.appendChild(toneStatus);
    row.appendChild(pitchLive);
    row.appendChild(pitchCanvas);
    row.appendChild(recordingStatus);
    row.appendChild(recordedAudio);
    row.appendChild(transcript);
    list.appendChild(row);
  });

  wrapper.appendChild(list);
  return wrapper;
}

function toSections(data) {
  if (Array.isArray(data.sections) && data.sections.length > 0) {
    return data.sections;
  }
  if (Array.isArray(data.sentences)) {
    return [{ title: "內容", items: data.sentences }];
  }
  return [];
}

function renderLesson(data) {
  lessonTitle.textContent = data.title;
  lessonSubtitle.textContent = data.note || "";
  lessonContent.innerHTML = "";

  toSections(data).forEach((section) => {
    if ((section.practice === "shadowing" || section.title === "会話") && section.audio) {
      lessonContent.appendChild(renderConversationSection(section));
      return;
    }
    lessonContent.appendChild(renderSection(section));
  });
}

function renderEmptyLesson(levelId, lessonNumber) {
  const level = state.levels.find((item) => item.id === levelId);
  const displayTitle = `${level ? level.name : levelId} 第 ${lessonNumber} 課`;
  const filePath = lessonFile(levelId, lessonNumber);

  lessonTitle.textContent = displayTitle;
  lessonSubtitle.textContent = "這課還沒有建立內容，請建立對應 lesson JSON。";
  lessonContent.innerHTML = `
    <article class="empty-state">
      <p><strong>找不到檔案：</strong><code>${filePath}</code></p>
      <p>建立這個檔案後，重新整理頁面即可看到內容。</p>
      <pre class="code-sample">{
  "title": "${displayTitle}",
  "note": "",
  "sections": [
    {
      "title": "文型",
      "items": [
        {
          "jp": "ここは食堂です。",
          "reading": "koko wa shokudou desu.",
          "zh": "這裡是食堂。",
          "audio": "audio/${levelId}/lesson-${pad2(lessonNumber)}/001.mp3"
        }
      ]
    }
  ]
}</pre>
    </article>
  `;
}

async function loadLesson(levelId, lessonNumber) {
  try {
    const response = await fetch(lessonFile(levelId, lessonNumber));
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const lessonData = await response.json();
    renderLesson(lessonData);
  } catch (error) {
    renderEmptyLesson(levelId, lessonNumber);
  }
}

async function init() {
  const response = await fetch("data/levels.json");
  if (!response.ok) {
    throw new Error("無法讀取 data/levels.json");
  }
  const config = await response.json();
  state.levels = config.levels;
  state.activeLevelId = config.defaultLesson.levelId;
  state.activeLesson = config.defaultLesson.lessonNumber;

  renderSidebar();
  setActiveButton();
  await loadLesson(state.activeLevelId, state.activeLesson);
}

init().catch((error) => {
  lessonTitle.textContent = "載入失敗";
  lessonSubtitle.textContent = "請確認 data/levels.json 是否存在且格式正確。";
  lessonContent.innerHTML = `<article class="empty-state"><p>${error.message}</p></article>`;
});
