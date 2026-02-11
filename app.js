// ============================================================
// app.js — Логика приложения СОНВ-112
// ============================================================

// ------------------------------------------------------------
// 1. СОСТОЯНИЕ ПРИЛОЖЕНИЯ
// ------------------------------------------------------------

const STATE = {
  currentScreen: "landing",    // landing | disclaimer | instructions | question | confirm | results
  currentQuestion: 0,          // индекс текущего вопроса (0-111)
  answers: {},                 // { questionId: value }
  results: null,               // результаты подсчёта
  startTime: null,             // время начала теста
  theme: "auto"                // auto | light | dark
};

// ------------------------------------------------------------
// 2. ИНИЦИАЛИЗАЦИЯ
// ------------------------------------------------------------

document.addEventListener("DOMContentLoaded", function () {
  initTheme();
  checkUrlHash();
  checkSavedProgress();
  renderScreen(STATE.currentScreen);
  setupKeyboardNav();
});

function initTheme() {
  const saved = localStorage.getItem("sonv112_theme");
  if (saved) {
    STATE.theme = saved;
    applyTheme(saved);
  }
}

function applyTheme(theme) {
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else if (theme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  let next;
  if (current === "dark") {
    next = "light";
  } else {
    next = "dark";
  }
  STATE.theme = next;
  localStorage.setItem("sonv112_theme", next);
  applyTheme(next);
  updateThemeButton();
}

function updateThemeButton() {
  const btn = document.getElementById("themeToggle");
  if (!btn) return;
  const isDark = document.documentElement.getAttribute("data-theme") === "dark" ||
    (STATE.theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  btn.textContent = isDark ? "☀️" : "🌙";
}

function checkUrlHash() {
  const hash = window.location.hash;
  if (hash && hash.startsWith("#r=")) {
    const encoded = hash.substring(3);
    if (encoded.length === 112) {
      STATE.answers = decodeAnswers(encoded);
      STATE.results = calculateResults(STATE.answers);
      STATE.currentScreen = "results";
    }
  }
}

function checkSavedProgress() {
  if (STATE.currentScreen === "results") return;
  const saved = localStorage.getItem("sonv112_progress");
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data._lastUpdated) {
        const hoursAgo = (Date.now() - data._lastUpdated) / 3600000;
        if (hoursAgo < 24 && data.answers && Object.keys(data.answers).length > 0) {
          const count = Object.keys(data.answers).length;
          if (confirm(`У вас есть незаконченный тест (${count}/112 вопросов). Продолжить?`)) {
            STATE.answers = {};
            for (const [k, v] of Object.entries(data.answers)) {
              STATE.answers[parseInt(k)] = v;
            }
            STATE.currentQuestion = data.currentQuestion || 0;
            STATE.currentScreen = "question";
            STATE.startTime = Date.now() - (data.elapsed || 0);
          } else {
            localStorage.removeItem("sonv112_progress");
          }
        }
      }
    } catch (e) {
      localStorage.removeItem("sonv112_progress");
    }
  }
}

// ------------------------------------------------------------
// 3. ПЕРЕКЛЮЧЕНИЕ ЭКРАНОВ
// ------------------------------------------------------------

function renderScreen(screenName) {
  STATE.currentScreen = screenName;
  const app = document.getElementById("app");
  app.innerHTML = "";

  // Шапка (всегда)
  app.appendChild(createHeader());

  // Контент экрана
  let screen;
  switch (screenName) {
    case "landing":
      screen = createLanding();
      break;
    case "disclaimer":
      screen = createDisclaimer();
      break;
    case "instructions":
      screen = createInstructions();
      break;
    case "question":
      screen = createQuestionScreen();
      break;
    case "confirm":
      screen = createConfirmScreen();
      break;
    case "results":
      screen = createResultsScreen();
      break;
  }

  if (screen) {
    app.appendChild(screen);
  }

  // Футер (кроме вопросов)
  if (screenName !== "question") {
    app.appendChild(createFooter());
  }

  // Скролл вверх
  window.scrollTo(0, 0);

  // Обновить кнопку темы
  updateThemeButton();
}

// ------------------------------------------------------------
// 4. ШАПКА
// ------------------------------------------------------------

function createHeader() {
  const header = createElement("header", "header");
  const logoWrap = createElement("div");
  const logo = createElement("span", "header__logo", UI_TEXTS.title);
  const version = createElement("span", "header__version", "v" + UI_TEXTS.version);
  logoWrap.appendChild(logo);
  logoWrap.appendChild(version);

  const controls = createElement("div", "header__controls");
  const themeBtn = createElement("button", "theme-toggle", "🌙");
  themeBtn.id = "themeToggle";
  themeBtn.title = "Переключить тему";
  themeBtn.addEventListener("click", toggleTheme);
  controls.appendChild(themeBtn);

  header.appendChild(logoWrap);
  header.appendChild(controls);
  return header;
}

// ------------------------------------------------------------
// 5. ЛЕНДИНГ
// ------------------------------------------------------------

function createLanding() {
  const screen = createElement("div", "screen landing active");
  const icon = createElement("div", "landing__icon", "🧠");
  const title = createElement("h1", "landing__title", UI_TEXTS.landing.heading);
  const subtitle = createElement("p", "landing__subtitle", UI_TEXTS.landing.description);

  const features = createElement("ul", "landing__features");
  for (const f of UI_TEXTS.landing.details) {
    const li = createElement("li", "landing__feature");
    const fIcon = createElement("span", "landing__feature-icon", f.icon);
    const fText = createElement("span", "", f.text);
    li.appendChild(fIcon);
    li.appendChild(fText);
    features.appendChild(li);
  }

  const btn = createElement("button", "btn btn--primary", UI_TEXTS.landing.startButton);
  btn.addEventListener("click", function () {
    renderScreen("disclaimer");
  });

  screen.appendChild(icon);
  screen.appendChild(title);
  screen.appendChild(subtitle);
  screen.appendChild(features);
  screen.appendChild(btn);
  return screen;
}

// ------------------------------------------------------------
// 6. ДИСКЛЕЙМЕР
// ------------------------------------------------------------

function createDisclaimer() {
  const screen = createElement("div", "screen disclaimer active");
  const card = createElement("div", "disclaimer__card");
  const icon = createElement("div", "disclaimer__icon", "⚠️");
  const title = createElement("h2", "disclaimer__title", UI_TEXTS.disclaimer.heading);
  const text = createElement("p", "disclaimer__text", UI_TEXTS.disclaimer.text);

  const checkboxes = createElement("div", "disclaimer__checkboxes");
  const cbStates = [false, false, false];

  UI_TEXTS.disclaimer.checkboxes.forEach(function (labelText, i) {
    const label = createElement("label", "checkbox-label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.addEventListener("change", function () {
      cbStates[i] = input.checked;
      continueBtn.disabled = !cbStates.every(Boolean);
    });
    const span = createElement("span", "", labelText);
    label.appendChild(input);
    label.appendChild(span);
    checkboxes.appendChild(label);
  });

  const continueBtn = createElement("button", "btn btn--primary btn--full", UI_TEXTS.disclaimer.continueButton);
  continueBtn.disabled = true;
  continueBtn.addEventListener("click", function () {
    renderScreen("instructions");
  });

  card.appendChild(icon);
  card.appendChild(title);
  card.appendChild(text);
  card.appendChild(checkboxes);
  card.appendChild(continueBtn);
  screen.appendChild(card);
  return screen;
}

// ------------------------------------------------------------
// 7. ИНСТРУКЦИЯ
// ------------------------------------------------------------

function createInstructions() {
  const screen = createElement("div", "screen instructions active");
  const card = createElement("div", "instructions__card");
  const title = createElement("h2", "instructions__title", UI_TEXTS.instructions.heading);
  const text = createElement("p", "instructions__text", UI_TEXTS.instructions.text);

  const tips = createElement("ul", "instructions__tips");
  for (const tip of UI_TEXTS.instructions.tips) {
    const li = createElement("li", "instructions__tip", tip);
    tips.appendChild(li);
  }

  // Демо шкалы
  const demo = createElement("div", "answer-scale-demo");
  const demoTitle = createElement("div", "answer-scale-demo__title", "Шкала ответов:");
  demo.appendChild(demoTitle);
  const demoItems = createElement("div", "answer-scale-demo__items");
  for (const opt of ANSWER_OPTIONS) {
    const item = createElement("div", "answer-scale-demo__item");
    item.innerHTML = "<strong>" + opt.value + "</strong> — " + opt.label;
    demoItems.appendChild(item);
  }
  demo.appendChild(demoItems);

  const btn = createElement("button", "btn btn--primary btn--full", UI_TEXTS.instructions.startButton);
  btn.addEventListener("click", function () {
    STATE.startTime = Date.now();
    STATE.currentQuestion = 0;
    renderScreen("question");
  });

  card.appendChild(title);
  card.appendChild(text);
  card.appendChild(tips);
  card.appendChild(demo);
  card.appendChild(btn);
  screen.appendChild(card);
  return screen;
}

// ------------------------------------------------------------
// 8. ЭКРАН ВОПРОСОВ
// ------------------------------------------------------------

function createQuestionScreen() {
  const screen = createElement("div", "screen question-screen active");
  if (!STATE.startTime) STATE.startTime = Date.now();

  // Прогресс
  const progress = createProgressBar();
  screen.appendChild(progress);

  // Карточка вопроса
  const card = createQuestionCard();
  screen.appendChild(card);

  // Навигация
  const nav = createQuestionNav();
  screen.appendChild(nav);

  return screen;
}

function createProgressBar() {
  const progress = createElement("div", "progress");
  const info = createElement("div", "progress__info");
  const counter = createElement("span", "progress__counter",
    (STATE.currentQuestion + 1) + " " + UI_TEXTS.question.of + " " + QUESTIONS.length);

  const answered = Object.keys(STATE.answers).length;
  const remaining = QUESTIONS.length - answered;
  const minutesLeft = Math.max(1, Math.ceil(remaining * 0.15));
  const time = createElement("span", "progress__time",
    "~" + minutesLeft + " " + UI_TEXTS.question.minutesLeft);

  info.appendChild(counter);
  info.appendChild(time);
  progress.appendChild(info);

  const bar = createElement("div", "progress__bar");
  const fill = createElement("div", "progress__fill");
  fill.style.width = Math.round(((STATE.currentQuestion + 1) / QUESTIONS.length) * 100) + "%";
  bar.appendChild(fill);
  progress.appendChild(bar);
  return progress;
}

function createQuestionCard() {
  const question = QUESTIONS[STATE.currentQuestion];
  const card = createElement("div", "question-card");
  const text = createElement("div", "question-card__text", question.text);
  card.appendChild(text);

  const options = createElement("div", "answer-options");
  for (const opt of ANSWER_OPTIONS) {
    const option = createElement("div", "answer-option");
    option.tabIndex = 0;
    option.setAttribute("role", "button");
    option.setAttribute("aria-label", opt.value + " — " + opt.label);

    if (STATE.answers[question.id] === opt.value) {
      option.classList.add("selected");
    }

    const num = createElement("span", "answer-option__number", String(opt.value));
    const label = createElement("span", "answer-option__label", opt.label);
    option.appendChild(num);
    option.appendChild(label);

    option.addEventListener("click", function () {
      selectAnswer(question.id, opt.value);
    });

    option.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectAnswer(question.id, opt.value);
      }
    });

    options.appendChild(option);
  }

  card.appendChild(options);
  return card;
}

function createQuestionNav() {
  const nav = createElement("div", "question-nav");

  if (STATE.currentQuestion > 0) {
    const backBtn = createElement("button", "btn btn--ghost", UI_TEXTS.question.back);
    backBtn.addEventListener("click", function () {
      STATE.currentQuestion--;
      renderScreen("question");
    });
    nav.appendChild(backBtn);
  } else {
    nav.appendChild(createElement("div", "question-nav__spacer"));
  }

  // Кнопка "Далее" видна только если ответ уже выбран
  const question = QUESTIONS[STATE.currentQuestion];
  if (STATE.answers[question.id] !== undefined) {
    const nextLabel = STATE.currentQuestion < QUESTIONS.length - 1
      ? UI_TEXTS.question.next
      : "Завершить →";
    const nextBtn = createElement("button", "btn btn--primary", nextLabel);
    nextBtn.addEventListener("click", function () {
      goToNext();
    });
    nav.appendChild(nextBtn);
  } else {
    nav.appendChild(createElement("div", "question-nav__spacer"));
  }

  return nav;
}

function selectAnswer(questionId, value) {
  STATE.answers[questionId] = value;
  saveProgress();

  // Небольшая задержка перед переходом — чтобы было видно выбор
  setTimeout(function () {
    goToNext();
  }, 250);
}

function goToNext() {
  if (STATE.currentQuestion < QUESTIONS.length - 1) {
    STATE.currentQuestion++;
    renderScreen("question");
  } else {
    // Проверить, все ли вопросы отвечены
    const unanswered = QUESTIONS.filter(function (q) {
      return STATE.answers[q.id] === undefined;
    });

    if (unanswered.length > 0) {
      if (confirm("Вы пропустили " + unanswered.length + " вопрос(ов). Хотите вернуться к первому пропущенному?")) {
        const firstUnanswered = QUESTIONS.findIndex(function (q) {
          return STATE.answers[q.id] === undefined;
        });
        STATE.currentQuestion = firstUnanswered;
        renderScreen("question");
      } else {
        renderScreen("confirm");
      }
    } else {
      renderScreen("confirm");
    }
  }
}

function saveProgress() {
  const data = {
    answers: STATE.answers,
    currentQuestion: STATE.currentQuestion,
    elapsed: Date.now() - (STATE.startTime || Date.now()),
    _lastUpdated: Date.now()
  };
  localStorage.setItem("sonv112_progress", JSON.stringify(data));
}

// ------------------------------------------------------------
// 9. ПОДТВЕРЖДЕНИЕ
// ------------------------------------------------------------

function createConfirmScreen() {
  const screen = createElement("div", "screen confirm active");
  const icon = createElement("div", "confirm__icon", "✅");
  const title = createElement("h2", "confirm__title", UI_TEXTS.confirm.heading);

  const answered = Object.keys(STATE.answers).length;
  const total = QUESTIONS.length;
  const confirmText = answered < total
    ? "Отвечено на " + answered + " из " + total + " вопросов. Пропущенные будут засчитаны как 0."
    : UI_TEXTS.confirm.text;
  const text = createElement("p", "confirm__text", confirmText);

  const buttons = createElement("div", "confirm__buttons");

  const showBtn = createElement("button", "btn btn--primary btn--full", UI_TEXTS.confirm.showResults);
  showBtn.addEventListener("click", function () {
    STATE.results = calculateResults(STATE.answers);
    localStorage.removeItem("sonv112_progress");
    // Сохранить в URL
    const hash = encodeAnswers(STATE.answers);
    window.location.hash = "r=" + hash;
    renderScreen("results");
  });

  const backBtn = createElement("button", "btn btn--secondary btn--full", UI_TEXTS.confirm.backButton);
  backBtn.addEventListener("click", function () {
    renderScreen("question");
  });

  buttons.appendChild(showBtn);
  buttons.appendChild(backBtn);

  screen.appendChild(icon);
  screen.appendChild(title);
  screen.appendChild(text);
  screen.appendChild(buttons);
  return screen;
}

// ------------------------------------------------------------
// 10. ЭКРАН РЕЗУЛЬТАТОВ
// ------------------------------------------------------------

function createResultsScreen() {
  if (!STATE.results) return createElement("div");

  const screen = createElement("div", "screen results active");
  const results = STATE.results;
  const scales = results.scales;

  // Заголовок
  const title = createElement("h1", "results__title", UI_TEXTS.results.heading);
  screen.appendChild(title);

  const date = createElement("div", "results__date",
    "Дата: " + new Date().toLocaleDateString("ru-RU"));
  screen.appendChild(date);

  // 1. Контрольные параметры
  screen.appendChild(createControlSection(scales, results.validity));

  // 2. Если невалидно — предупреждение и стоп
  if (!results.validity.isValid) {
    const stopMsg = createElement("div", "results-section");
    const stopBody = createElement("div", "results-section__body");
    const stopText = createElement("p", "interp-block__text",
      "Из-за низкой достоверности ответов детальная интерпретация основных шкал не проводится. " +
      "Рекомендуется пройти тест повторно, отвечая максимально честно, или обратиться к специалисту для клинического интервью.");
    stopBody.appendChild(stopText);
    stopMsg.appendChild(stopBody);
    screen.appendChild(stopMsg);
    screen.appendChild(createResultsActions());
    return screen;
  }

  // 3. Радарная диаграмма
  screen.appendChild(createRadarSection(scales));

  // 4. Детализация по шкалам
  screen.appendChild(createScalesSection(scales));

  // 5. Интерпретация
  screen.appendChild(createInterpretationSection(results.interpretation, scales));

  // 6. Флаги
  if (results.flags.length > 0) {
    screen.appendChild(createFlagsSection(results.flags));
  }

  // 7. Рекомендации
  screen.appendChild(createRecommendationsSection(results.recommendations));

  // 8. Кнопки действий
  screen.appendChild(createResultsActions());

  return screen;
}

// --- Контрольные параметры ---

function createControlSection(scales, validity) {
  const section = createElement("div", "results-section");
  const header = createElement("div", "results-section__header", "⚙️ " + UI_TEXTS.results.controlHeading);
  const body = createElement("div", "results-section__body");

  const controlScales = ["L", "M", "K", "N"];
  for (const key of controlScales) {
    const s = scales[key];
    const param = createElement("div", "control-param");
    const name = createElement("span", "control-param__name", s.name);
    const value = createElement("span", "control-param__value");
    const icon = createElement("span", "", s.zone.icon);
    const label = createElement("span", "", s.zone.label);
    const score = createElement("span", "control-param__score", s.sum + "/" + s.max);
    value.appendChild(icon);
    value.appendChild(label);
    value.appendChild(score);
    param.appendChild(name);
    param.appendChild(value);
    body.appendChild(param);
  }

  // Предупреждения валидности
  if (validity.warnings.length > 0) {
    const warningsDiv = createElement("div");
    warningsDiv.style.marginTop = "16px";
    for (const w of validity.warnings) {
      const warning = createElement("div", "validity-warning validity-warning--" + w.type);
      const wIcon = createElement("span", "validity-warning__icon", w.icon);
      const wContent = createElement("div", "validity-warning__content");
      const wTitle = createElement("div", "validity-warning__title", w.title);
      const wText = createElement("div", "validity-warning__text", w.text);
      wContent.appendChild(wTitle);
      wContent.appendChild(wText);
      warning.appendChild(wIcon);
      warning.appendChild(wContent);
      warningsDiv.appendChild(warning);
    }
    body.appendChild(warningsDiv);
  }

  section.appendChild(header);
  section.appendChild(body);
  return section;
}

// --- Радарная диаграмма ---

function createRadarSection(scales) {
  const section = createElement("div", "results-section");
  const header = createElement("div", "results-section__header", "📊 " + UI_TEXTS.results.profileHeading);
  const body = createElement("div", "results-section__body");
  const container = createElement("div", "radar-container");

  const canvas = document.createElement("canvas");
  canvas.id = "radarChart";
  container.appendChild(canvas);
  body.appendChild(container);
  section.appendChild(header);
  section.appendChild(body);

  // Отрисовка после добавления в DOM
  setTimeout(function () {
    drawRadarChart(canvas, scales);
  }, 100);

  return section;
}

// --- Детализация по шкалам ---

function createScalesSection(scales) {
  const section = createElement("div", "results-section");
  const header = createElement("div", "results-section__header", "📋 " + UI_TEXTS.results.scalesHeading);
  const body = createElement("div", "results-section__body");

  const mainKeys = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
  for (const key of mainKeys) {
    const s = scales[key];
    body.appendChild(createScaleItem(s));
  }

  section.appendChild(header);
  section.appendChild(body);
  return section;
}

function createScaleItem(s) {
  const item = createElement("div", "scale-item");

  // Заголовок
  const hdr = createElement("div", "scale-item__header");
  const name = createElement("span", "scale-item__name", s.name);
  const values = createElement("div", "scale-item__values");
  const pct = createElement("span", "scale-item__percentage", s.percentage + "%");
  pct.style.color = s.zone.color;
  const score = createElement("span", "scale-item__score", s.sum + "/" + s.max);
  const zone = createElement("span", "scale-item__zone scale-item__zone--" + s.zone.key, s.zone.icon + " " + s.zone.label);

  values.appendChild(pct);
  values.appendChild(score);
  values.appendChild(zone);
  hdr.appendChild(name);
  hdr.appendChild(values);
  item.appendChild(hdr);

  // Бар
  const bar = createElement("div", "scale-bar");
  const fill = createElement("div", "scale-bar__fill scale-bar__fill--" + s.zone.key);
  fill.style.width = s.percentage + "%";
  bar.appendChild(fill);
  item.appendChild(bar);

  // Суб-шкалы
  for (const [subKey, sub] of Object.entries(s.subscales)) {
    const subDiv = createElement("div", "subscale");
    const subHdr = createElement("div", "subscale__header");
    const subName = createElement("span", "subscale__name", "└─ " + sub.name);
    const subValues = createElement("span", "subscale__values");
    const subPct = createElement("span", "subscale__percentage", sub.percentage + "%");
    subPct.style.color = sub.zone.color;
    const subScore = createElement("span", "", sub.sum + "/" + sub.max);
    const subZone = createElement("span", "", sub.zone.icon);
    subValues.appendChild(subPct);
    subValues.appendChild(subScore);
    subValues.appendChild(subZone);
    subHdr.appendChild(subName);
    subHdr.appendChild(subValues);
    subDiv.appendChild(subHdr);

    const subBar = createElement("div", "scale-bar");
    const subFill = createElement("div", "scale-bar__fill scale-bar__fill--" + sub.zone.key);
    subFill.style.width = sub.percentage + "%";
    subBar.appendChild(subFill);
    subDiv.appendChild(subBar);
    item.appendChild(subDiv);
  }

  // Кнопка "Подробнее"
  const detailsId = "details-" + s.key;
  const toggleBtn = createElement("button", "scale-details-toggle", UI_TEXTS.results.moreDetails);
  toggleBtn.addEventListener("click", function () {
    const details = document.getElementById(detailsId);
    if (details.classList.contains("open")) {
      details.classList.remove("open");
      toggleBtn.textContent = UI_TEXTS.results.moreDetails;
    } else {
      details.classList.add("open");
      toggleBtn.textContent = UI_TEXTS.results.lessDetails;
    }
  });
  item.appendChild(toggleBtn);

  // Детали
  const details = createElement("div", "scale-details");
  details.id = detailsId;
  const descP = createElement("p", "scale-details__description", s.description);
  const basisP = createElement("p", "scale-details__basis", "Основа: " + s.basis);
  details.appendChild(descP);
  details.appendChild(basisP);

  // Список вопросов с баллами
  if (s.questionDetails && s.questionDetails.length > 0) {
    const qTitle = createElement("p", "scale-details__description");
    qTitle.style.marginTop = "12px";
    qTitle.style.fontWeight = "600";
    qTitle.textContent = "Ваши ответы (от наибольшего к наименьшему):";
    details.appendChild(qTitle);

    for (const qd of s.questionDetails) {
      const qLine = createElement("div", "scale-details__description");
      qLine.style.fontSize = "0.8rem";
      qLine.style.padding = "4px 0";
      const shortText = qd.text.length > 80 ? qd.text.substring(0, 80) + "…" : qd.text;
      qLine.innerHTML = "<strong>[" + qd.answer + "]</strong> " + shortText;
      details.appendChild(qLine);
    }
  }

  item.appendChild(details);
  return item;
}

// --- Интерпретация ---

function createInterpretationSection(interp, scales) {
  const section = createElement("div", "results-section");
  const header = createElement("div", "results-section__header", "🔍 " + UI_TEXTS.results.interpretationHeading);
  const body = createElement("div", "results-section__body");

  // Сводка
  const summaryBlock = createElement("div", "interp-block");
  summaryBlock.style.borderLeftColor = "var(--accent)";
  const summaryTitle = createElement("div", "interp-block__title", "Сводка");
  const summaryText = createElement("div", "summary-text", interp.summary);
  summaryBlock.appendChild(summaryTitle);
  summaryBlock.appendChild(summaryText);
  body.appendChild(summaryBlock);

  // СДВГ
  if (interp.adhd.title) {
    body.appendChild(createInterpBlock(interp.adhd, interp.adhd.present ? "var(--zone-orange)" : "var(--border)"));
  }

  // РАС
  if (interp.asd.title) {
    body.appendChild(createInterpBlock(interp.asd, interp.asd.present ? "var(--zone-red)" : "var(--border)"));
  }

  // Расстройства обучения
  for (const item of interp.learning) {
    body.appendChild(createInterpBlock(item, item.confidence !== "low" ? "var(--zone-yellow)" : "var(--border)"));
  }

  // Коморбидность
  for (const combo of interp.comorbidity) {
    const block = createElement("div", "comorbidity-block");
    const cTitle = createElement("div", "comorbidity-block__title", combo.title);
    const cText = createElement("div", "comorbidity-block__text", combo.text);
    block.appendChild(cTitle);
    block.appendChild(cText);

    if (combo.interactions) {
      for (const inter of combo.interactions) {
        const iDiv = createElement("div", "comorbidity-interaction");
        const iTitle = createElement("div", "comorbidity-interaction__title", "⚡ " + inter.title);
        const iText = createElement("div", "comorbidity-interaction__text", inter.text);
        iDiv.appendChild(iTitle);
        iDiv.appendChild(iText);
        block.appendChild(iDiv);
      }
    }

    body.appendChild(block);
  }

  section.appendChild(header);
  section.appendChild(body);
  return section;
}

function createInterpBlock(data, borderColor) {
  const block = createElement("div", "interp-block");
  block.style.borderLeftColor = borderColor;

  const titleWrap = createElement("div", "interp-block__title");
  titleWrap.textContent = data.title;
  if (data.confidence) {
    const badge = createElement("span", "interp-block__confidence confidence--" + data.confidence,
      getConfidenceLabel(data.confidence));
    titleWrap.appendChild(badge);
  }
  block.appendChild(titleWrap);

  const text = createElement("div", "interp-block__text", data.text);
  block.appendChild(text);

  if (data.details) {
    for (const detail of data.details) {
      const dDiv = createElement("div", "interp-detail");
      const dTitle = createElement("div", "interp-detail__title", detail.title);
      const dText = createElement("div", "interp-detail__text", detail.text);
      dDiv.appendChild(dTitle);
      dDiv.appendChild(dText);
      block.appendChild(dDiv);
    }
  }

  return block;
}

// --- Флаги ---

function createFlagsSection(flags) {
  const section = createElement("div", "results-section");
  const header = createElement("div", "results-section__header", "⚠️ " + UI_TEXTS.results.flagsHeading);
  const body = createElement("div", "results-section__body");

  for (const flag of flags) {
    const card = createElement("div", "flag-card");
    const icon = createElement("span", "flag-card__icon", flag.icon);
    const content = createElement("div", "flag-card__content");
    const title = createElement("div", "flag-card__title", flag.title);
    const text = createElement("div", "flag-card__text", flag.text);
    content.appendChild(title);
    content.appendChild(text);
    card.appendChild(icon);
    card.appendChild(content);
    body.appendChild(card);
  }

  section.appendChild(header);
  section.appendChild(body);
  return section;
}

// --- Рекомендации ---

function createRecommendationsSection(recs) {
  const section = createElement("div", "results-section");
  const header = createElement("div", "results-section__header", "📌 " + UI_TEXTS.results.recommendationsHeading);
  const body = createElement("div", "results-section__body");

  // Что делать
  const doList = createElement("ul", "rec-list rec-list--do");
  for (const item of recs.doList) {
    const li = createElement("li", "rec-list__item");
    const icon = createElement("span", "rec-list__icon", "✅");
    const text = createElement("span", "", item);
    li.appendChild(icon);
    li.appendChild(text);
    doList.appendChild(li);
  }
  body.appendChild(doList);

  // Чего не делать
  const dontWrap = createElement("div", "rec-list--dont");
  const dontList = createElement("ul", "rec-list");
  for (const item of recs.dontList) {
    const li = createElement("li", "rec-list__item");
    const icon = createElement("span", "rec-list__icon", "❌");
    const text = createElement("span", "", item);
    li.appendChild(icon);
    li.appendChild(text);
    dontList.appendChild(li);
  }
  dontWrap.appendChild(dontList);
  body.appendChild(dontWrap);

  // Заметки для специалиста
  if (recs.specialistNotes.length > 0) {
    const specDiv = createElement("div", "rec-specialist");
    const specTitle = createElement("div", "rec-specialist__title", "Заметки для специалиста");
    specDiv.appendChild(specTitle);
    for (const note of recs.specialistNotes) {
      const noteP = createElement("div", "rec-specialist__item", note);
      specDiv.appendChild(noteP);
    }
    body.appendChild(specDiv);
  }

  section.appendChild(header);
  section.appendChild(body);
  return section;
}

// --- Кнопки действий ---

function createResultsActions() {
  const actions = createElement("div", "results-actions");

  // PDF
  const pdfBtn = createElement("button", "btn btn--primary", UI_TEXTS.results.downloadPdf);
  pdfBtn.addEventListener("click", downloadPdf);
  actions.appendChild(pdfBtn);

  // Копировать ссылку
  const linkBtn = createElement("button", "btn btn--secondary", UI_TEXTS.results.copyLink);
  linkBtn.addEventListener("click", copyLink);
  actions.appendChild(linkBtn);

  // Пройти заново
  const restartBtn = createElement("button", "btn btn--ghost", UI_TEXTS.results.restart);
  restartBtn.addEventListener("click", function () {
    if (confirm("Начать тест заново? Текущие результаты останутся доступны по ссылке.")) {
      STATE.answers = {};
      STATE.results = null;
      STATE.currentQuestion = 0;
      STATE.startTime = null;
      localStorage.removeItem("sonv112_progress");
      window.location.hash = "";
      renderScreen("landing");
    }
  });
  actions.appendChild(restartBtn);

  return actions;
}

// ------------------------------------------------------------
// 11. РАДАРНАЯ ДИАГРАММА (Canvas, адаптивная)
// ------------------------------------------------------------

function drawRadarChart(canvas, scales) {
  var container = canvas.parentElement;
  var containerWidth = container.clientWidth;

  // Прямоугольный canvas — шире, чем выше, чтобы подписи помещались
  var canvasW = Math.min(containerWidth, 650);
  var canvasH = Math.round(canvasW * 0.82);

  // Retina: рисуем в 2x, показываем в 1x — чёткость
  var dpr = window.devicePixelRatio || 1;
  canvas.width = canvasW * dpr;
  canvas.height = canvasH * dpr;
  canvas.style.width = canvasW + "px";
  canvas.style.height = canvasH + "px";

  var ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);

  var centerX = canvasW / 2;
  var centerY = canvasH / 2;

  // Радиус полигона — оставляем щедрый запас для подписей
  var labelSpace = canvasW < 450 ? 80 : 100;
  var radius = Math.min(centerX, centerY) - labelSpace;
  if (radius < 60) radius = 60;

  // Укороченные подписи — помещаются гарантированно
  var radarItems = [
    { key: "A", lines: ["Невниматель-", "ность"] },
    { key: "B", lines: ["Гипер-", "активность"] },
    { key: "C", lines: ["Эмоц.", "дисрегул."] },
    { key: "D", lines: ["Соц.", "коммуник."] },
    { key: "E", lines: ["Паттерны"] },
    { key: "F", lines: ["Сенсорика"] },
    { key: "G", lines: ["Камуфляж"] },
    { key: "H", lines: ["Дислексия"] },
    { key: "I", lines: ["Дискаль-", "кулия"] },
    { key: "J", lines: ["Диспраксия"] }
  ];

  var n = radarItems.length;

  // Тема
  var isDark = document.documentElement.getAttribute("data-theme") === "dark" ||
    (STATE.theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  var gridColor = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.07)";
  var labelColor = isDark ? "#B0B0C0" : "#555555";
  var pctLabelColor = isDark ? "#888898" : "#999999";
  var dataFill = isDark ? "rgba(123,163,204,0.25)" : "rgba(74,111,165,0.18)";
  var dataStroke = isDark ? "rgba(123,163,204,0.85)" : "rgba(74,111,165,0.75)";
  var thresholdStroke = isDark ? "rgba(217,140,74,0.45)" : "rgba(217,140,74,0.35)";

  // Адаптивные шрифты
  var fontLabel = canvasW < 450 ? 10.5 : 13;
  var fontPct = canvasW < 450 ? 9.5 : 11.5;
  var fontGrid = canvasW < 450 ? 8.5 : 10;
  var lineH = fontLabel + 3;

  // Угол для индекса i
  function angleFor(i) {
    return (2 * Math.PI * i) / n - Math.PI / 2;
  }

  // Очистка
  ctx.clearRect(0, 0, canvasW, canvasH);

  // --- Сетка: концентрические многоугольники ---
  for (var level = 1; level <= 5; level++) {
    var r = (radius * level) / 5;
    ctx.beginPath();
    for (var i = 0; i < n; i++) {
      var a = angleFor(i);
      var x = centerX + r * Math.cos(a);
      var y = centerY + r * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Подписи процентов на сетке (только 40% и 80%)
  ctx.font = fontGrid + "px sans-serif";
  ctx.fillStyle = isDark ? "#505060" : "#C0C0C0";
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText("40%", centerX + 3, centerY - radius * 0.4 - 2);
  ctx.fillText("80%", centerX + 3, centerY - radius * 0.8 - 2);

  // --- Оси ---
  for (var i = 0; i < n; i++) {
    var a = angleFor(i);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + radius * Math.cos(a), centerY + radius * Math.sin(a));
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // --- Пороговая линия 60% (пунктир) ---
  ctx.beginPath();
  for (var i = 0; i < n; i++) {
    var a = angleFor(i);
    var r60 = radius * 0.6;
    var x = centerX + r60 * Math.cos(a);
    var y = centerY + r60 * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = thresholdStroke;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  // --- Данные: полигон ---
  ctx.beginPath();
  for (var i = 0; i < n; i++) {
    var sc = scales[radarItems[i].key];
    var val = sc.percentage / 100;
    var a = angleFor(i);
    var x = centerX + radius * val * Math.cos(a);
    var y = centerY + radius * val * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = dataFill;
  ctx.fill();
  ctx.strokeStyle = dataStroke;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // --- Точки на вершинах ---
  for (var i = 0; i < n; i++) {
    var sc = scales[radarItems[i].key];
    var val = sc.percentage / 100;
    var a = angleFor(i);
    var px = centerX + radius * val * Math.cos(a);
    var py = centerY + radius * val * Math.sin(a);
    ctx.beginPath();
    ctx.arc(px, py, 4.5, 0, 2 * Math.PI);
    ctx.fillStyle = sc.zone.color;
    ctx.fill();
    ctx.strokeStyle = isDark ? "#2A2A42" : "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // --- Подписи ---
  for (var i = 0; i < n; i++) {
    var sc = scales[radarItems[i].key];
    var a = angleFor(i);
    var cosA = Math.cos(a);
    var sinA = Math.sin(a);

    // Позиция подписи — за пределами полигона
    var gap = canvasW < 450 ? 14 : 18;
    var lx = centerX + (radius + gap) * cosA;
    var ly = centerY + (radius + gap) * sinA;

    // Выравнивание
    if (cosA > 0.25) {
      ctx.textAlign = "left";
    } else if (cosA < -0.25) {
      ctx.textAlign = "right";
    } else {
      ctx.textAlign = "center";
    }

    // Вертикальная коррекция для верха/низа
    if (sinA < -0.6) ly -= 4;
    if (sinA > 0.6) ly += 4;

    // Рисуем строки названия
    ctx.font = "600 " + fontLabel + "px sans-serif";
    ctx.fillStyle = labelColor;
    ctx.textBaseline = "middle";

    var textLines = radarItems[i].lines;
    var totalTextH = textLines.length * lineH;
    var startTextY = ly - totalTextH / 2 + lineH / 2;

    for (var li = 0; li < textLines.length; li++) {
      var drawX = lx;
      // Гарантия: текст не выходит за край canvas
      var measured = ctx.measureText(textLines[li]).width;
      if (ctx.textAlign === "left" && drawX + measured > canvasW - 4) {
        drawX = canvasW - measured - 4;
      }
      if (ctx.textAlign === "right" && drawX - measured < 4) {
        drawX = measured + 4;
      }
      if (ctx.textAlign === "center") {
        if (drawX + measured / 2 > canvasW - 4) drawX = canvasW - measured / 2 - 4;
        if (drawX - measured / 2 < 4) drawX = measured / 2 + 4;
      }
      ctx.fillText(textLines[li], drawX, startTextY + li * lineH);
    }

    // Процент (под названием)
    var pctY = startTextY + textLines.length * lineH + 1;
    ctx.font = "700 " + fontPct + "px sans-serif";
    ctx.fillStyle = sc.zone.color;

    var pctText = sc.percentage + "%";
    var pctMeasured = ctx.measureText(pctText).width;
    var pctX = lx;
    if (ctx.textAlign === "left" && pctX + pctMeasured > canvasW - 4) pctX = canvasW - pctMeasured - 4;
    if (ctx.textAlign === "right" && pctX - pctMeasured < 4) pctX = pctMeasured + 4;
    ctx.fillText(pctText, pctX, pctY);
  }
}

// ------------------------------------------------------------
// 12. PDF / ЭКСПОРТ
// ------------------------------------------------------------

function downloadPdf() {
  if (!STATE.results) return;

  // Проверяем, загрузилась ли библиотека
  if (typeof html2pdf === "undefined") {
    downloadHtmlReport();
    return;
  }

  var app = document.getElementById("app");

  // 1. Оверлей с сообщением
  var overlay = document.createElement("div");
  overlay.style.cssText = [
    "position:fixed", "top:0", "left:0", "right:0", "bottom:0",
    "background:rgba(255,255,255,0.97)", "z-index:100000",
    "display:flex", "align-items:center", "justify-content:center",
    "font-size:18px", "color:#333", "font-family:Arial,sans-serif"
  ].join(";");
  overlay.textContent = "⏳ Генерация PDF, подождите...";
  document.body.appendChild(overlay);

  // 2. Прячем приложение
  app.style.display = "none";

  // 3. Создаём элемент В ОБЫЧНОМ ПОТОКЕ (не fixed, не absolute)
  var pdfEl = document.createElement("div");
  pdfEl.style.cssText = [
    "width:760px", "margin:0 auto", "padding:24px 28px",
    "background:#ffffff", "color:#222222",
    "font-family:Arial,Helvetica,sans-serif",
    "font-size:13px", "line-height:1.5"
  ].join(";");

  try {
    pdfEl.innerHTML = buildPdfContent();
  } catch (err) {
    console.error("PDF build error:", err);
    cleanup();
    downloadHtmlReport();
    return;
  }

  // 4. Вставляем ПЕРЕД app (в обычный поток документа)
  document.body.insertBefore(pdfEl, app);

  // 5. Скролл наверх
  window.scrollTo(0, 0);

  // 6. Ждём полной отрисовки браузером, затем захватываем
  setTimeout(function () {
    try {
      html2pdf().set({
        margin: [8, 10, 8, 10],
        filename: "SONV-112_" + new Date().toISOString().split("T")[0] + ".pdf",
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          scrollX: 0,
          scrollY: 0,
          windowWidth: 810
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait"
        },
        pagebreak: {
          mode: ["css"],
          avoid: [".pb-avoid"]
        }
      }).from(pdfEl).save().then(function () {
        cleanup();
        showToast("PDF сохранён");
      }).catch(function (err) {
        console.error("html2pdf error:", err);
        cleanup();
        downloadHtmlReport();
      });
    } catch (err2) {
      console.error("html2pdf crash:", err2);
      cleanup();
      downloadHtmlReport();
    }
  }, 1200);

  function cleanup() {
    if (pdfEl && pdfEl.parentNode) pdfEl.parentNode.removeChild(pdfEl);
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    app.style.display = "";
    window.scrollTo(0, 0);
  }
}

// ---- Запасной вариант: красивый HTML-файл ----

function downloadHtmlReport() {
  if (!STATE.results) return;

  var content = buildPdfContent();

  var fullHtml = [
    "<!DOCTYPE html>",
    '<html lang="ru">',
    "<head>",
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    "<title>СОНВ-112 — Результаты</title>",
    "<style>",
    "  body { font-family: Arial, Helvetica, sans-serif; font-size: 13px;",
    "    line-height: 1.5; color: #222; max-width: 760px; margin: 0 auto;",
    "    padding: 24px 28px; background: #fff; }",
    "  .no-print { margin-bottom: 20px; padding: 12px 16px;",
    "    background: #f0f5ff; border: 1px solid #c0d0e8; border-radius: 8px;",
    "    text-align: center; }",
    "  .no-print button { padding: 10px 24px; font-size: 14px;",
    "    font-weight: 600; background: #4A6FA5; color: #fff;",
    "    border: none; border-radius: 6px; cursor: pointer; }",
    "  .no-print button:hover { background: #3A5F95; }",
    "  @media print { .no-print { display: none !important; } }",
    "  .pb-avoid { page-break-inside: avoid; }",
    "  .pdf-page-break-before { page-break-before: always; }",
    "</style>",
    "</head>",
    "<body>",
    '<div class="no-print">',
    "  <p>Чтобы сохранить как PDF: нажмите кнопку ниже или Ctrl+P → «Сохранить как PDF»</p>",
    "  <button onclick=\"window.print()\">🖨️ Печать / Сохранить PDF</button>",
    "</div>",
    content,
    "</body>",
    "</html>"
  ].join("\n");

  var blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "SONV-112_" + new Date().toISOString().split("T")[0] + ".html";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Отчёт сохранён как HTML. Откройте файл и нажмите «Печать» для PDF.");
}

// ---- Текстовый отчёт (последний запасной вариант) ----

function downloadTextReport() {
  if (!STATE.results) return;
  var text = generateProfileText(STATE.results);
  var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "SONV-112_" + new Date().toISOString().split("T")[0] + ".txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Текстовый отчёт сохранён");
}

// ---- Построение HTML-контента для PDF/HTML отчёта ----

function buildPdfContent() {
  var R = STATE.results;
  var sc = R.scales;
  var interp = R.interpretation;
  var flags = R.flags;
  var recs = R.recommendations;
  var date = new Date().toLocaleDateString("ru-RU");

  var h = "";

  // ШАПКА
  h += '<div style="text-align:center;margin-bottom:16px;">';
  h += '<div style="font-size:24px;font-weight:700;color:#2D2D2D;">СОНВ-112</div>';
  h += '<div style="font-size:13px;color:#777;">Скрининговый опросник нейроотличности для взрослых</div>';
  h += '<div style="font-size:11px;color:#999;margin-top:4px;">Дата: ' + date + '</div>';
  h += '</div>';

  h += '<div class="pb-avoid" style="font-size:10px;color:#888;text-align:center;padding:8px 16px;border:1px solid #ddd;border-radius:6px;margin-bottom:20px;background:#f9f9f7;">';
  h += 'Результат скринингового опросника. Не является диагнозом. Интерпретация специалистом обязательна.';
  h += '</div>';

  // КОНТРОЛЬНЫЕ ПАРАМЕТРЫ
  h += sectionTitle("Контрольные параметры");
  h += '<div class="pb-avoid" style="margin-bottom:16px;">';
  var ck = ["L", "M", "K", "N"];
  for (var i = 0; i < ck.length; i++) {
    var cs = sc[ck[i]];
    h += '<div style="display:flex;justify-content:space-between;padding:5px 8px;';
    if (i < ck.length - 1) h += 'border-bottom:1px solid #f0f0ec;';
    h += '">';
    h += '<span style="color:#555;">' + cs.name + '</span>';
    h += '<span style="font-weight:600;">' + cs.zone.icon + ' ' + cs.zone.label;
    h += ' <span style="color:#999;font-weight:400;">(' + cs.sum + '/' + cs.max + ')</span></span>';
    h += '</div>';
  }
  h += '</div>';

  // Предупреждения
  var warnings = R.validity.warnings;
  for (var wi = 0; wi < warnings.length; wi++) {
    var w = warnings[wi];
    var wc = w.type === "critical" ? "#C75B5B" : "#E8C547";
    h += '<div class="pb-avoid" style="margin-bottom:10px;padding:8px 12px;border:1px solid ' + wc + ';border-radius:6px;">';
    h += '<div style="font-weight:700;font-size:12px;margin-bottom:3px;">' + w.icon + ' ' + w.title + '</div>';
    h += '<div style="font-size:11px;color:#555;line-height:1.5;">' + w.text + '</div>';
    h += '</div>';
  }

  // ОСНОВНЫЕ ШКАЛЫ
  h += sectionTitle("Результаты по шкалам");
  var mk = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
  for (var mi = 0; mi < mk.length; mi++) {
    var ms = sc[mk[mi]];
    h += '<div class="pb-avoid" style="margin-bottom:8px;padding:7px 10px;border:1px solid #eee;border-radius:5px;">';
    h += '<div style="font-weight:600;font-size:12px;color:#2D2D2D;margin-bottom:3px;">' + ms.name + '</div>';
    h += '<div style="font-size:11px;color:#666;margin-bottom:4px;">';
    h += ms.percentage + '% (' + ms.sum + '/' + ms.max + ') — ' + ms.zone.icon + ' ' + ms.zone.label;
    h += '</div>';
    h += '<div style="width:100%;height:6px;background:#e8e8e4;border-radius:3px;overflow:hidden;">';
    h += '<div style="width:' + ms.percentage + '%;height:100%;background:' + ms.zone.color + ';border-radius:3px;"></div>';
    h += '</div>';
    var subKeys = Object.keys(ms.subscales);
    for (var si = 0; si < subKeys.length; si++) {
      var sub = ms.subscales[subKeys[si]];
      h += '<div style="margin:4px 0 0 14px;padding:2px 0 2px 10px;border-left:2px solid #e0e0dc;font-size:11px;color:#666;">';
      h += sub.name + ': ' + sub.percentage + '% (' + sub.sum + '/' + sub.max + ') ' + sub.zone.icon;
      h += '</div>';
    }
    h += '</div>';
  }

  // ИНТЕРПРЕТАЦИЯ
  h += '<div class="pdf-page-break-before"></div>';
  h += sectionTitle("Интерпретация");

  // Сводка
  h += '<div class="pb-avoid" style="margin-bottom:12px;padding:10px 14px;border-left:3px solid #4A6FA5;background:#f5f7fa;border-radius:0 6px 6px 0;">';
  h += '<div style="font-weight:700;font-size:13px;margin-bottom:4px;">Сводка</div>';
  h += '<div style="font-size:11px;color:#444;line-height:1.65;white-space:pre-line;">' + interp.summary + '</div>';
  h += '</div>';

  if (interp.adhd && interp.adhd.title) {
    h += interpBlock(interp.adhd);
  }
  if (interp.asd && interp.asd.title) {
    h += interpBlock(interp.asd);
  }
  if (interp.learning) {
    for (var li = 0; li < interp.learning.length; li++) {
      h += interpBlock(interp.learning[li]);
    }
  }

  // Коморбидность
  if (interp.comorbidity) {
    for (var ci = 0; ci < interp.comorbidity.length; ci++) {
      var combo = interp.comorbidity[ci];
      h += '<div class="pb-avoid" style="margin-bottom:12px;padding:10px 14px;border:1px solid #D98C4A;border-radius:6px;background:#fdf8f0;">';
      h += '<div style="font-weight:700;font-size:13px;color:#D98C4A;margin-bottom:6px;">' + combo.title + '</div>';
      h += '<div style="font-size:11px;color:#555;line-height:1.6;margin-bottom:8px;">' + combo.text + '</div>';
      if (combo.interactions) {
        for (var ii = 0; ii < combo.interactions.length; ii++) {
          var inter = combo.interactions[ii];
          h += '<div style="margin-bottom:5px;padding:5px 8px;background:#fff;border-radius:4px;">';
          h += '<div style="font-weight:700;font-size:11px;color:#2D2D2D;">' + inter.title + '</div>';
          h += '<div style="font-size:10px;color:#555;">' + inter.text + '</div>';
          h += '</div>';
        }
      }
      h += '</div>';
    }
  }

  // ФЛАГИ
  if (flags && flags.length > 0) {
    h += sectionTitle("Обратите внимание");
    for (var fi = 0; fi < flags.length; fi++) {
      var flag = flags[fi];
      h += '<div class="pb-avoid" style="margin-bottom:8px;padding:8px 12px;border:1px solid #e0e0dc;border-radius:5px;">';
      h += '<div style="font-weight:700;font-size:12px;color:#2D2D2D;margin-bottom:3px;">' + flag.icon + ' ' + flag.title + '</div>';
      h += '<div style="font-size:11px;color:#555;line-height:1.55;">' + flag.text + '</div>';
      h += '</div>';
    }
  }

  // РЕКОМЕНДАЦИИ
  h += sectionTitle("Рекомендации");
  h += '<div class="pb-avoid" style="margin-bottom:16px;">';
  for (var ri = 0; ri < recs.doList.length; ri++) {
    h += '<div style="font-size:11px;color:#444;padding:3px 0;line-height:1.5;">' + recs.doList[ri] + '</div>';
  }
  h += '<div style="height:10px;"></div>';
  for (var ri2 = 0; ri2 < recs.dontList.length; ri2++) {
    h += '<div style="font-size:11px;color:#444;padding:3px 0;line-height:1.5;">' + recs.dontList[ri2] + '</div>';
  }
  if (recs.specialistNotes && recs.specialistNotes.length > 0) {
    h += '<div style="margin-top:10px;padding:8px 12px;background:#f0f0ec;border-radius:5px;">';
    h += '<div style="font-weight:700;font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px;">Заметки для специалиста</div>';
    for (var ni = 0; ni < recs.specialistNotes.length; ni++) {
      h += '<div style="font-size:11px;color:#555;padding:2px 0;">' + recs.specialistNotes[ni] + '</div>';
    }
    h += '</div>';
  }
  h += '</div>';

  // ФУТЕР
  h += '<div style="margin-top:24px;padding-top:10px;border-top:1px solid #ddd;font-size:9px;color:#aaa;text-align:center;line-height:1.5;">';
  h += 'СОНВ-112 v1.0. Скрининговый инструмент, не заменяет клиническую диагностику.<br>';
  h += 'Основан на DSM-5, ASRS, RAADS-R, CAT-Q, AQ-50.';
  h += '</div>';

  return h;

  // --- Локальные хелперы ---

  function sectionTitle(text) {
    return '<div style="font-size:14px;font-weight:700;color:#4A6FA5;border-bottom:2px solid #4A6FA5;padding-bottom:4px;margin:20px 0 10px 0;">' + text + '</div>';
  }

  function interpBlock(data) {
    var bc = "#4A6FA5";
    if (data.present === false) bc = "#cccccc";
    var out = '<div class="pb-avoid" style="margin-bottom:12px;padding:10px 14px;border-left:3px solid ' + bc + ';background:#f5f7fa;border-radius:0 6px 6px 0;">';
    out += '<div style="font-weight:700;font-size:13px;color:#2D2D2D;margin-bottom:4px;">' + data.title;
    if (data.confidence) {
      var cc = { high: "#7BAE7F", moderate: "#E8C547", low: "#D98C4A" };
      var c = cc[data.confidence] || "#999";
      out += ' <span style="font-size:10px;padding:1px 6px;border-radius:3px;background:' + c + '22;color:' + c + ';font-weight:600;">' + getConfidenceLabel(data.confidence) + '</span>';
    }
    out += '</div>';
    out += '<div style="font-size:11px;color:#444;line-height:1.6;margin-bottom:6px;">' + data.text + '</div>';
    if (data.details) {
      for (var d = 0; d < data.details.length; d++) {
        var det = data.details[d];
        out += '<div style="margin-top:6px;padding:6px 10px;background:#eaecf0;border-radius:4px;">';
        out += '<div style="font-weight:700;font-size:11px;color:#2D2D2D;margin-bottom:2px;">' + det.title + '</div>';
        out += '<div style="font-size:10.5px;color:#555;line-height:1.5;">' + det.text + '</div>';
        out += '</div>';
      }
    }
    out += '</div>';
    return out;
  }
}

// ------------------------------------------------------------
// 13. КОПИРОВАНИЕ ССЫЛКИ
// ------------------------------------------------------------

function copyLink() {
  const url = window.location.href;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(function () {
      showToast("Ссылка скопирована в буфер обмена");
    }).catch(function () {
      fallbackCopy(url);
    });
  } else {
    fallbackCopy(url);
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
    showToast("Ссылка скопирована");
  } catch (e) {
    showToast("Не удалось скопировать. Скопируйте ссылку из адресной строки.");
  }
  document.body.removeChild(textarea);
}

// ------------------------------------------------------------
// 14. TOAST-УВЕДОМЛЕНИЯ
// ------------------------------------------------------------

function showToast(message) {
  // Удалить старый toast если есть
  const old = document.querySelector(".toast");
  if (old) old.remove();

  const toast = createElement("div", "toast", message);
  document.body.appendChild(toast);

  // Показать
  requestAnimationFrame(function () {
    toast.classList.add("visible");
  });

  // Скрыть через 3 секунды
  setTimeout(function () {
    toast.classList.remove("visible");
    setTimeout(function () {
      if (toast.parentNode) toast.remove();
    }, 400);
  }, 3000);
}

// ------------------------------------------------------------
// 15. КЛАВИАТУРНАЯ НАВИГАЦИЯ
// ------------------------------------------------------------

function setupKeyboardNav() {
  document.addEventListener("keydown", function (e) {
    if (STATE.currentScreen !== "question") return;

    // Цифры 0-4 для выбора ответа
    const num = parseInt(e.key);
    if (num >= 0 && num <= 4) {
      const question = QUESTIONS[STATE.currentQuestion];
      selectAnswer(question.id, num);
      return;
    }

    // Стрелки для навигации
    if (e.key === "ArrowLeft" && STATE.currentQuestion > 0) {
      STATE.currentQuestion--;
      renderScreen("question");
    }

    if (e.key === "ArrowRight") {
      const question = QUESTIONS[STATE.currentQuestion];
      if (STATE.answers[question.id] !== undefined) {
        goToNext();
      }
    }
  });
}

// ------------------------------------------------------------
// 16. ФУТЕР
// ------------------------------------------------------------

function createFooter() {
  const footer = createElement("footer", "footer");
  const text = createElement("div", "footer__text");
  text.innerHTML = UI_TEXTS.footer.disclaimer + "<br>" +
    UI_TEXTS.footer.basis + "<br>" +
    UI_TEXTS.footer.version;
  footer.appendChild(text);
  return footer;
}

// ------------------------------------------------------------
// 17. УТИЛИТЫ
// ------------------------------------------------------------

function createElement(tag, className, textContent) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (textContent) el.textContent = textContent;
  return el;
}

