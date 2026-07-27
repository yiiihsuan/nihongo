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
    audio.preload = "none";
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
