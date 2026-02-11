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
  var screen = createElement("div", "screen landing active");
  var icon = createElement("div", "landing__icon", "🧠");
  var title = createElement("h1", "landing__title", UI_TEXTS.landing.heading);
  var subtitle = createElement("p", "landing__subtitle", UI_TEXTS.landing.description);

  var features = createElement("ul", "landing__features");
  for (var i = 0; i < UI_TEXTS.landing.details.length; i++) {
    var f = UI_TEXTS.landing.details[i];
    var li = createElement("li", "landing__feature");
    var fIcon = createElement("span", "landing__feature-icon", f.icon);
    var fText = createElement("span", "", f.text);
    li.appendChild(fIcon);
    li.appendChild(fText);
    features.appendChild(li);
  }

  var btn = createElement("button", "btn btn--primary", UI_TEXTS.landing.startButton);
  btn.addEventListener("click", function () {
    renderScreen("disclaimer");
  });

  screen.appendChild(icon);
  screen.appendChild(title);
  screen.appendChild(subtitle);
  screen.appendChild(features);
  screen.appendChild(btn);

  // Блок «На чём основан тест»
  screen.appendChild(createMethodologyBlock("landing"));

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

  // 9. Методология и источники
  screen.appendChild(createMethodologyBlock("results"));

  return screen;

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
  var wrapper = createElement("div", "results-actions");

  // --- Главные кнопки (PDF + Ссылка) ---
  var mainRow = createElement("div", "results-actions__main");

  var pdfBtn = createElement("button", "btn btn--primary", "📄 Сохранить как PDF");
  pdfBtn.addEventListener("click", openPrintableReport);
  mainRow.appendChild(pdfBtn);

  var linkBtn = createElement("button", "btn btn--primary", "🔗 Скопировать ссылку");
  linkBtn.addEventListener("click", function () {
    copyLink();
    linkBtn.textContent = "✅ Скопировано!";
    setTimeout(function () {
      linkBtn.textContent = "🔗 Скопировать ссылку";
    }, 2000);
  });
  mainRow.appendChild(linkBtn);

  wrapper.appendChild(mainRow);

  // --- Дополнительные варианты экспорта (раскрывающиеся) ---
  var extraToggle = createElement("button", "results-actions__extra-toggle", "▼ Другие варианты экспорта");
  var extraPanel = createElement("div", "results-actions__extra");

  extraToggle.addEventListener("click", function () {
    if (extraPanel.classList.contains("open")) {
      extraPanel.classList.remove("open");
      extraToggle.textContent = "▼ Другие варианты экспорта";
    } else {
      extraPanel.classList.add("open");
      extraToggle.textContent = "▲ Скрыть";
    }
  });

  var htmlBtn = createElement("button", "btn btn--secondary btn--full", "📋 Скачать отчёт (HTML-файл)");
  htmlBtn.addEventListener("click", downloadHtmlReport);
  extraPanel.appendChild(htmlBtn);

  var txtBtn = createElement("button", "btn btn--secondary btn--full", "📝 Скачать текстовый отчёт");
  txtBtn.addEventListener("click", downloadTextReport);
  extraPanel.appendChild(txtBtn);

  wrapper.appendChild(extraToggle);
  wrapper.appendChild(extraPanel);

  // --- Пройти заново ---
  var restartWrap = createElement("div", "results-actions__restart");
  var restartBtn = createElement("button", "btn btn--ghost", "🔄 Пройти заново");
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
  restartWrap.appendChild(restartBtn);
  wrapper.appendChild(restartWrap);

  return wrapper;
}
// ------------------------------------------------------------
// БЛОК МЕТОДОЛОГИИ И ИСТОЧНИКОВ
// ------------------------------------------------------------

function createMethodologyBlock(context) {
  var section = createElement("div", "methodology-section");

  // Кнопка-переключатель
  var toggleText = context === "landing"
    ? "📚 На чём основан этот тест"
    : "📚 Методология и источники";

  var toggle = createElement("button", "methodology-toggle", toggleText);
  var content = createElement("div", "methodology-content");

  toggle.addEventListener("click", function () {
    if (content.classList.contains("open")) {
      content.classList.remove("open");
      toggle.textContent = toggleText;
    } else {
      content.classList.add("open");
      toggle.textContent = "▲ Свернуть";
    }
  });

  // --- Наполнение ---

  // Описание
  var descTitle = createElement("h3", "", "Основа");
  var descP = createElement("p", "", METHODOLOGY.shortDescription);
  content.appendChild(descTitle);
  content.appendChild(descP);

  // Принципы
  var prinTitle = createElement("h3", "", "Принципы построения");
  content.appendChild(prinTitle);
  var prinList = createElement("ul", "");
  for (var i = 0; i < METHODOLOGY.principles.length; i++) {
    var prinLi = createElement("li", "", METHODOLOGY.principles[i]);
    prinList.appendChild(prinLi);
  }
  content.appendChild(prinList);

  // Таблица шкал — только в контексте "results"
  if (context === "results") {
    var tableTitle = createElement("h3", "", "Базис каждой шкалы");
    content.appendChild(tableTitle);

    var table = document.createElement("table");
    table.className = "methodology-scale-table";

    var thead = document.createElement("thead");
    var headRow = document.createElement("tr");
    var th1 = document.createElement("th");
    th1.textContent = "Шкала";
    var th2 = document.createElement("th");
    th2.textContent = "Опора";
    headRow.appendChild(th1);
    headRow.appendChild(th2);
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = document.createElement("tbody");
    for (var s = 0; s < METHODOLOGY.scalesBasis.length; s++) {
      var row = document.createElement("tr");
      var td1 = document.createElement("td");
      td1.textContent = METHODOLOGY.scalesBasis[s].scale;
      var td2 = document.createElement("td");
      td2.textContent = METHODOLOGY.scalesBasis[s].basis;
      row.appendChild(td1);
      row.appendChild(td2);
      tbody.appendChild(row);
    }
    table.appendChild(tbody);
    content.appendChild(table);
  }

  // Ограничения
  var limTitle = createElement("h3", "", "Ограничения");
  content.appendChild(limTitle);
  var limList = createElement("ul", "");
  for (var l = 0; l < METHODOLOGY.limitations.length; l++) {
    var limLi = createElement("li", "", METHODOLOGY.limitations[l]);
    limList.appendChild(limLi);
  }
  content.appendChild(limList);

  // Список литературы
  var refTitle = createElement("h3", "", "Список литературы");
  content.appendChild(refTitle);
  var refList = createElement("ul", "");
  for (var r = 0; r < METHODOLOGY.references.length; r++) {
    var refLi = createElement("li", "methodology-ref");
    var refNum = createElement("span", "methodology-ref-num", (r + 1) + ".");
    refLi.appendChild(refNum);
    refLi.appendChild(document.createTextNode(" " + METHODOLOGY.references[r]));
    refList.appendChild(refLi);
  }
  content.appendChild(refList);

  section.appendChild(toggle);
  section.appendChild(content);
  return section;
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
// 12. ЭКСПОРТ РЕЗУЛЬТАТОВ
// ------------------------------------------------------------

function openPrintableReport() {
  if (!STATE.results) return;

  var content = buildReportHtml();
  var win = window.open("", "_blank");

  if (!win) {
    showToast("Браузер заблокировал всплывающее окно. Разрешите и попробуйте снова.");
    return;
  }

  win.document.write(content);
  win.document.close();

  // Даём время на отрисовку, затем вызываем печать
  setTimeout(function () {
    win.print();
  }, 600);
}

function downloadHtmlReport() {
  if (!STATE.results) return;

  var content = buildReportHtml();
  var blob = new Blob([content], { type: "text/html;charset=utf-8" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "SONV-112_" + new Date().toISOString().split("T")[0] + ".html";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Отчёт сохранён. Откройте файл в браузере для просмотра.");
}

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

// ---- Построение полного HTML-документа отчёта ----

function buildReportHtml() {
  var R = STATE.results;
  var sc = R.scales;
  var interp = R.interpretation;
  var flags = R.flags;
  var recs = R.recommendations;
  var date = new Date().toLocaleDateString("ru-RU");

  // Собираем полный HTML-документ
  var doc = "";
  doc += "<!DOCTYPE html>\n";
  doc += '<html lang="ru">\n<head>\n';
  doc += '<meta charset="UTF-8">\n';
  doc += '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
  doc += "<title>СОНВ-112 — Результаты (" + date + ")</title>\n";
  doc += "<style>\n";
  doc += reportStyles();
  doc += "\n</style>\n";
  doc += "</head>\n<body>\n";

  // Кнопка печати (не будет видна при печати)
  doc += '<div class="no-print" style="text-align:center;margin-bottom:20px;padding:14px;background:#f0f5ff;border:1px solid #c0d0e8;border-radius:8px;">';
  doc += '<p style="margin:0 0 10px 0;font-size:14px;color:#555;">Для сохранения в PDF: нажмите кнопку ниже или Ctrl+P</p>';
  doc += '<button onclick="window.print()" style="padding:10px 28px;font-size:14px;font-weight:600;background:#4A6FA5;color:#fff;border:none;border-radius:6px;cursor:pointer;">Сохранить как PDF</button>';
  doc += '</div>\n';

  // ШАПКА
  doc += '<div class="report-header">';
  doc += '<div class="report-title">СОНВ-112</div>';
  doc += '<div class="report-subtitle">Скрининговый опросник нейроотличности для взрослых</div>';
  doc += '<div class="report-date">Дата: ' + date + '</div>';
  doc += '</div>\n';

  // Дисклеймер
  doc += '<div class="disclaimer-box">';
  doc += 'Результат скринингового опросника. Не является диагнозом. Интерпретация специалистом обязательна.';
  doc += '</div>\n';

  // КОНТРОЛЬНЫЕ ПАРАМЕТРЫ
  doc += sTitle("Контрольные параметры");
  doc += '<div class="card">';
  var ck = ["L", "M", "K", "N"];
  for (var i = 0; i < ck.length; i++) {
    var cs = sc[ck[i]];
    doc += '<div class="param-row' + (i < ck.length - 1 ? " bordered" : "") + '">';
    doc += '<span class="param-name">' + cs.name + '</span>';
    doc += '<span class="param-value">' + cs.zone.icon + ' ' + cs.zone.label;
    doc += ' <span class="param-score">(' + cs.sum + '/' + cs.max + ')</span></span>';
    doc += '</div>';
  }
  doc += '</div>\n';

  // Предупреждения
  var warnings = R.validity.warnings;
  for (var wi = 0; wi < warnings.length; wi++) {
    var w = warnings[wi];
    var wc = w.type === "critical" ? "#C75B5B" : "#E8C547";
    doc += '<div class="card" style="border-color:' + wc + ';">';
    doc += '<div class="warning-title">' + w.icon + ' ' + w.title + '</div>';
    doc += '<div class="small-text">' + w.text + '</div>';
    doc += '</div>';
  }

  // ШКАЛЫ
  doc += sTitle("Результаты по шкалам");
  var mk = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
  for (var mi = 0; mi < mk.length; mi++) {
    var ms = sc[mk[mi]];
    doc += '<div class="scale-card">';
    doc += '<div class="scale-name">' + ms.name + '</div>';
    doc += '<div class="scale-values">' + ms.percentage + '% (' + ms.sum + '/' + ms.max + ') — ' + ms.zone.icon + ' ' + ms.zone.label + '</div>';
    doc += '<div class="bar-bg"><div class="bar-fill" style="width:' + ms.percentage + '%;background:' + ms.zone.color + ';"></div></div>';
    var subKeys = Object.keys(ms.subscales);
    for (var si = 0; si < subKeys.length; si++) {
      var sub = ms.subscales[subKeys[si]];
      doc += '<div class="sub-scale">' + sub.name + ': ' + sub.percentage + '% (' + sub.sum + '/' + sub.max + ') ' + sub.zone.icon + '</div>';
    }
    doc += '</div>';
  }

  // ИНТЕРПРЕТАЦИЯ
  doc += '<div class="page-break"></div>';
  doc += sTitle("Интерпретация");

  // Сводка
  doc += '<div class="interp-card accent-border">';
  doc += '<div class="interp-title">Сводка</div>';
  doc += '<div class="interp-text" style="white-space:pre-line;">' + interp.summary + '</div>';
  doc += '</div>';

  // СДВГ
  if (interp.adhd && interp.adhd.title) {
    doc += iBlock(interp.adhd);
  }

  // РАС
  if (interp.asd && interp.asd.title) {
    doc += iBlock(interp.asd);
  }

  // Расстройства обучения
  if (interp.learning) {
    for (var li = 0; li < interp.learning.length; li++) {
      doc += iBlock(interp.learning[li]);
    }
  }

  // Коморбидность
  if (interp.comorbidity) {
    for (var ci = 0; ci < interp.comorbidity.length; ci++) {
      var combo = interp.comorbidity[ci];
      doc += '<div class="comorbidity-card">';
      doc += '<div class="comorbidity-title">' + combo.title + '</div>';
      doc += '<div class="small-text" style="margin-bottom:8px;">' + combo.text + '</div>';
      if (combo.interactions) {
        for (var ii = 0; ii < combo.interactions.length; ii++) {
          var inter = combo.interactions[ii];
          doc += '<div class="interaction">';
          doc += '<div class="interaction-title">' + inter.title + '</div>';
          doc += '<div class="interaction-text">' + inter.text + '</div>';
          doc += '</div>';
        }
      }
      doc += '</div>';
    }
  }

  // ФЛАГИ
  if (flags && flags.length > 0) {
    doc += sTitle("Обратите внимание");
    for (var fi = 0; fi < flags.length; fi++) {
      var flag = flags[fi];
      doc += '<div class="flag-card">';
      doc += '<div class="flag-title">' + flag.icon + ' ' + flag.title + '</div>';
      doc += '<div class="small-text">' + flag.text + '</div>';
      doc += '</div>';
    }
  }

  // РЕКОМЕНДАЦИИ
  doc += sTitle("Рекомендации");
  doc += '<div class="card">';
  for (var ri = 0; ri < recs.doList.length; ri++) {
    doc += '<div class="rec-item">' + recs.doList[ri] + '</div>';
  }
  doc += '<div style="height:10px;"></div>';
  for (var ri2 = 0; ri2 < recs.dontList.length; ri2++) {
    doc += '<div class="rec-item">' + recs.dontList[ri2] + '</div>';
  }
  if (recs.specialistNotes && recs.specialistNotes.length > 0) {
    doc += '<div class="specialist-box">';
    doc += '<div class="specialist-title">Заметки для специалиста</div>';
    for (var ni = 0; ni < recs.specialistNotes.length; ni++) {
      doc += '<div class="specialist-note">' + recs.specialistNotes[ni] + '</div>';
    }
    doc += '</div>';
  }
  doc += '</div>';

  // ФУТЕР
  doc += '<div class="report-footer">';
  doc += 'СОНВ-112 v1.0. Скрининговый инструмент, не заменяет клиническую диагностику.<br>';
  doc += 'Основан на DSM-5, ASRS, RAADS-R, CAT-Q, AQ-50.';
  doc += '</div>';

  doc += "\n</body>\n</html>";
  return doc;

  // --- Локальные хелперы ---

  function sTitle(text) {
    return '<div class="section-title">' + text + '</div>';
  }

  function iBlock(data) {
    var bc = data.present === false ? "#cccccc" : "#4A6FA5";
    var out = '<div class="interp-card" style="border-left-color:' + bc + ';">';
    out += '<div class="interp-title">' + data.title;
    if (data.confidence) {
      var colors = { high: "#7BAE7F", moderate: "#c8a820", low: "#D98C4A" };
      var c = colors[data.confidence] || "#999";
      out += ' <span class="confidence-badge" style="background:' + c + '20;color:' + c + ';">' + getConfidenceLabel(data.confidence) + '</span>';
    }
    out += '</div>';
    out += '<div class="interp-text">' + data.text + '</div>';
    if (data.details) {
      for (var d = 0; d < data.details.length; d++) {
        var det = data.details[d];
        out += '<div class="detail-box">';
        out += '<div class="detail-title">' + det.title + '</div>';
        out += '<div class="detail-text">' + det.text + '</div>';
        out += '</div>';
      }
    }
    out += '</div>';
    return out;
  }
}

// ---- CSS для отчёта (встроен в HTML) ----

function reportStyles() {
  return [
    "* { box-sizing: border-box; margin: 0; padding: 0; }",
    "body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.55; color: #222; max-width: 760px; margin: 0 auto; padding: 20px 24px; background: #fff; }",

    ".report-header { text-align: center; margin-bottom: 16px; }",
    ".report-title { font-size: 26px; font-weight: 700; color: #2D2D2D; }",
    ".report-subtitle { font-size: 13px; color: #777; margin-top: 2px; }",
    ".report-date { font-size: 11px; color: #999; margin-top: 4px; }",

    ".disclaimer-box { font-size: 10px; color: #888; text-align: center; padding: 8px 16px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 20px; background: #f9f9f7; }",

    ".section-title { font-size: 15px; font-weight: 700; color: #4A6FA5; border-bottom: 2px solid #4A6FA5; padding-bottom: 4px; margin: 22px 0 10px 0; }",

    ".card { margin-bottom: 14px; padding: 10px 14px; border: 1px solid #e8e8e4; border-radius: 6px; page-break-inside: avoid; }",

    ".param-row { display: flex; justify-content: space-between; padding: 5px 0; }",
    ".param-row.bordered { border-bottom: 1px solid #f0f0ec; }",
    ".param-name { color: #555; }",
    ".param-value { font-weight: 600; }",
    ".param-score { color: #999; font-weight: 400; font-size: 11px; }",

    ".warning-title { font-weight: 700; font-size: 12px; margin-bottom: 4px; }",

    ".small-text { font-size: 11px; color: #555; line-height: 1.6; }",

    ".scale-card { margin-bottom: 8px; padding: 8px 12px; border: 1px solid #eee; border-radius: 5px; page-break-inside: avoid; }",
    ".scale-name { font-weight: 600; font-size: 12px; color: #2D2D2D; margin-bottom: 3px; }",
    ".scale-values { font-size: 11px; color: #666; margin-bottom: 4px; }",
    ".bar-bg { width: 100%; height: 6px; background: #e8e8e4; border-radius: 3px; overflow: hidden; }",
    ".bar-fill { height: 100%; border-radius: 3px; }",
    ".sub-scale { margin: 4px 0 0 14px; padding: 2px 0 2px 10px; border-left: 2px solid #e0e0dc; font-size: 11px; color: #666; }",

    ".interp-card { margin-bottom: 12px; padding: 10px 14px; border-left: 3px solid #4A6FA5; background: #f5f7fa; border-radius: 0 6px 6px 0; page-break-inside: avoid; }",
    ".interp-card.accent-border { border-left-color: #4A6FA5; }",
    ".interp-title { font-weight: 700; font-size: 13px; color: #2D2D2D; margin-bottom: 5px; }",
    ".interp-text { font-size: 11px; color: #444; line-height: 1.65; margin-bottom: 6px; }",

    ".confidence-badge { font-size: 10px; padding: 1px 6px; border-radius: 3px; font-weight: 600; }",

    ".detail-box { margin-top: 6px; padding: 6px 10px; background: #eaecf0; border-radius: 4px; }",
    ".detail-title { font-weight: 700; font-size: 11px; color: #2D2D2D; margin-bottom: 2px; }",
    ".detail-text { font-size: 10.5px; color: #555; line-height: 1.5; }",

    ".comorbidity-card { margin-bottom: 12px; padding: 10px 14px; border: 1px solid #D98C4A; border-radius: 6px; background: #fdf8f0; page-break-inside: avoid; }",
    ".comorbidity-title { font-weight: 700; font-size: 13px; color: #D98C4A; margin-bottom: 6px; }",
    ".interaction { margin-bottom: 5px; padding: 5px 8px; background: #fff; border-radius: 4px; }",
    ".interaction-title { font-weight: 700; font-size: 11px; color: #2D2D2D; }",
    ".interaction-text { font-size: 10px; color: #555; }",

    ".flag-card { margin-bottom: 8px; padding: 8px 12px; border: 1px solid #e0e0dc; border-radius: 5px; page-break-inside: avoid; }",
    ".flag-title { font-weight: 700; font-size: 12px; color: #2D2D2D; margin-bottom: 3px; }",

    ".rec-item { font-size: 11px; color: #444; padding: 3px 0; line-height: 1.5; }",

    ".specialist-box { margin-top: 10px; padding: 8px 12px; background: #f0f0ec; border-radius: 5px; }",
    ".specialist-title { font-weight: 700; font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }",
    ".specialist-note { font-size: 11px; color: #555; padding: 2px 0; }",

    ".report-footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 9px; color: #aaa; text-align: center; line-height: 1.5; }",

    ".page-break { page-break-before: always; height: 0; margin: 0; padding: 0; }",

    "@media print { .no-print { display: none !important; } body { padding: 10px 16px; } }",
    "@media screen { body { box-shadow: 0 0 20px rgba(0,0,0,0.1); margin-top: 20px; margin-bottom: 40px; padding: 32px 36px; border-radius: 8px; } }"
  ].join("\n");
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




