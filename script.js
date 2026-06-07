const difficultySettings = {
  easy: { label: "Easy", questionCount: 10, optionCount: 3 },
  medium: { label: "Medium", questionCount: 15, optionCount: 4 },
  hard: { label: "Hard", questionCount: 20, optionCount: 4 }
};

const QUIZ_ID = "world-flags";
const SESSION_STORAGE_KEY = `${QUIZ_ID}:active-session:v1`;
const ADAPTIVE_READY_TIMEOUT_MS = 3000;

const elements = {
  quizCard: document.querySelector("#quiz-card"),
  resultsCard: document.querySelector("#results-card"),
  questionLabel: document.querySelector("#question-label"),
  scoreValue: document.querySelector("#score-value"),
  scoreTotalValue: document.querySelector("#score-total-value"),
  progressBar: document.querySelector("#progress-bar"),
  flagImage: document.querySelector("#flag-image"),
  options: document.querySelector("#options"),
  feedback: document.querySelector("#feedback"),
  nextButton: document.querySelector("#next-button"),
  playAgainButton: document.querySelector("#play-again-button"),
  resultTitle: document.querySelector("#result-title"),
  resultMessage: document.querySelector("#result-message"),
  finalScore: document.querySelector("#final-score"),
  finalTotal: document.querySelector("#final-total"),
  finalPercent: document.querySelector("#final-percent"),
  resultGauge: document.querySelector("#result-gauge"),
  scoreGrade: document.querySelector("#score-grade"),
  reviewList: document.querySelector("#review-list")
};

const confusionGroups = [
  ["RO", "TD", "AD", "MD"],
  ["ID", "MC", "PL", "SG"],
  ["IE", "CI", "IT", "GN"],
  ["NL", "LU", "PY", "HR"],
  ["AU", "NZ", "FJ", "TV"],
  ["NO", "IS", "FI", "SE", "DK"],
  ["ML", "SN", "GN", "CM", "GH"],
  ["CO", "EC", "VE"],
  ["CR", "TH", "PY", "NL"],
  ["SY", "IQ", "EG", "YE", "SD"],
  ["SI", "SK", "RU", "RS", "HR"],
  ["HN", "SV", "NI", "GT"],
  ["QA", "BH", "KW", "AE"],
  ["LR", "MY", "US"],
  ["CU", "PR", "CL", "PA"],
  ["MA", "TN", "TR", "PK", "DZ"],
  ["JP", "BD", "PW", "LA"],
  ["CH", "DK", "NO", "IS", "GE"],
  ["AM", "CO", "VE", "EC"],
  ["LT", "BO", "GH", "ET"],
  ["EE", "BW", "LS"],
  ["BE", "DE", "UG", "AO"],
  ["AT", "LV", "LB", "PE"],
  ["NP", "BT", "LK", "MM"]
];

let countries = [];
let quiz = [];
let currentIndex = 0;
let score = 0;
let locked = false;
let answers = [];
let quizSettings = difficultySettings.medium;
let assignmentDifficulty = "medium";

const accessReady = window.QuizzesHubAccessReady || Promise.reject(new Error("Missing Quizzes Hub access guard."));
accessReady.then((access) => {
  assignmentDifficulty = normalizeDifficulty(access?.difficulty);
  quizSettings = difficultySettings[assignmentDifficulty];
  init();
}).catch(showAccessMessage);

async function init() {
  try {
    const response = await fetch("countries.json");
    countries = await response.json();
    await waitForAdaptiveReady();
    startQuiz();
  } catch (error) {
    elements.quizCard.innerHTML = "<p>Could not load the local country dataset. Please refresh the page.</p>";
    console.error(error);
  }
}

function showAccessMessage() {
  document.documentElement.dataset.quizAccess = "denied";
  elements.quizCard.innerHTML = "<p>Please open this quiz from Quizzes Hub.</p>";
}

function startQuiz() {
  if (restoreSession()) return;

  quiz = selectQuestionCountries().map(country => ({
    key: country.code,
    country,
    options: buildOptions(country)
  }));
  currentIndex = 0;
  score = 0;
  locked = false;
  answers = [];
  document.body.classList.add("quiz-active");
  elements.resultsCard.hidden = true;
  elements.quizCard.hidden = false;
  saveSession();
  renderQuestion();
}

function startNewQuiz() {
  clearSession();
  startQuiz();
}

function selectQuestionCountries() {
  const allQuestions = countries.map(country => ({ key: country.code, country }));
  const adaptiveQuestions = window.QuizzesHubAdaptive?.selectQuestions?.(allQuestions, quizSettings.questionCount);
  if (Array.isArray(adaptiveQuestions) && adaptiveQuestions.length > 0) {
    return adaptiveQuestions.map(question => question.country).filter(Boolean);
  }
  return shuffle([...countries]).slice(0, quizSettings.questionCount);
}

function buildOptions(correct) {
  const selected = new Map([[correct.code, correct]]);
  const ranked = countries
    .filter(country => country.code !== correct.code)
    .map(country => ({
      country,
      score: distractorScore(correct, country) + Math.random() * 0.8
    }))
    .sort((a, b) => b.score - a.score);

  for (const item of ranked) {
    if (selected.size >= quizSettings.optionCount) break;
    selected.set(item.country.code, item.country);
  }

  return shuffle([...selected.values()]);
}

function distractorScore(correct, candidate) {
  let score = 0;
  if (candidate.subregion === correct.subregion) score += 9;
  if (candidate.region === correct.region) score += 5;

  const correctGroups = confusionGroups.filter(group => group.includes(correct.code));
  if (correctGroups.some(group => group.includes(candidate.code))) score += 14;

  const sameNameFamily = sharedWords(correct.name, candidate.name);
  score += sameNameFamily * 1.5;

  const sizeBias = Math.abs(candidate.name.length - correct.name.length) <= 5 ? 1.2 : 0;
  return score + sizeBias;
}

function renderQuestion() {
  const item = quiz[currentIndex];
  const savedAnswer = answers[currentIndex];
  locked = Boolean(savedAnswer);
  elements.questionLabel.textContent = `Question ${currentIndex + 1} of ${quizSettings.questionCount}`;
  elements.scoreValue.textContent = score;
  elements.scoreTotalValue.textContent = `/ ${quizSettings.questionCount}`;
  elements.progressBar.style.width = `${((currentIndex + (savedAnswer ? 1 : 0)) / quizSettings.questionCount) * 100}%`;
  elements.flagImage.src = item.country.flag;
  elements.flagImage.alt = `Flag for question ${currentIndex + 1}`;
  elements.feedback.hidden = true;
  elements.feedback.replaceChildren();
  elements.nextButton.disabled = !savedAnswer;
  elements.nextButton.textContent = savedAnswer
    ? currentIndex === quizSettings.questionCount - 1 ? "Show Results" : "Next Question"
    : "Choose an answer";
  elements.options.replaceChildren();

  item.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option-button";
    const label = document.createElement("span");
    label.className = "option-text";
    label.textContent = option.name;
    button.append(label);
    button.dataset.code = option.code;
    button.setAttribute("aria-label", `Option ${index + 1}: ${option.name}`);
    button.addEventListener("click", () => chooseAnswer(option.code));

    if (savedAnswer) {
      const isCorrectButton = option.code === item.country.code;
      const isChosenWrong = option.code === savedAnswer.selected.code && !savedAnswer.correct;
      button.disabled = true;
      if (isCorrectButton) button.classList.add("correct");
      if (isChosenWrong) button.classList.add("wrong");
      if (option.code === savedAnswer.selected.code) {
        button.setAttribute("aria-pressed", "true");
      }
    }

    elements.options.append(button);
  });

  if (savedAnswer) {
    renderFeedback(savedAnswer.correct, item.country);
  }
}

function chooseAnswer(selectedCode) {
  if (locked) return;
  locked = true;

  const item = quiz[currentIndex];
  const isCorrect = selectedCode === item.country.code;
  if (isCorrect) score += 1;

  answers.push({
    questionKey: item.key,
    country: item.country,
    selected: countries.find(country => country.code === selectedCode),
    correct: isCorrect
  });

  [...elements.options.children].forEach(button => {
    const isCorrectButton = button.dataset.code === item.country.code;
    const isChosenWrong = button.dataset.code === selectedCode && !isCorrect;
    button.disabled = true;
    if (isCorrectButton) button.classList.add("correct");
    if (isChosenWrong) button.classList.add("wrong");
    if (button.dataset.code === selectedCode) {
      button.setAttribute("aria-pressed", "true");
    }
  });

  elements.scoreValue.textContent = score;
  elements.feedback.hidden = false;
  renderFeedback(isCorrect, item.country);
  elements.nextButton.disabled = false;
  elements.nextButton.textContent = currentIndex === quizSettings.questionCount - 1 ? "Show Results" : "Next Question";
  elements.progressBar.style.width = `${((currentIndex + 1) / quizSettings.questionCount) * 100}%`;
  saveSession();
  elements.nextButton.focus();
}

function nextQuestion() {
  if (!locked) return;
  if (currentIndex === quizSettings.questionCount - 1) {
    showResults();
    return;
  }
  currentIndex += 1;
  saveSession();
  renderQuestion();
}

function showResults() {
  const percent = Math.round((score / quizSettings.questionCount) * 100);
  clearSession();
  elements.quizCard.hidden = true;
  elements.resultsCard.hidden = false;
  document.body.classList.remove("quiz-active");
  elements.resultTitle.textContent = `${score} out of ${quizSettings.questionCount}`;
  elements.finalScore.textContent = score;
  elements.finalTotal.textContent = quizSettings.questionCount;
  elements.finalPercent.textContent = `${percent}%`;
  elements.resultGauge.style.setProperty("--score-angle", `${percent * 3.6}deg`);
  elements.scoreGrade.textContent = getScoreGrade(percent);
  elements.resultMessage.textContent = getPerformanceMessage(percent);
  elements.reviewList.innerHTML = "";

  answers.forEach((answer, index) => {
    const row = document.createElement("article");
    row.className = "review-item";
    row.innerHTML = `
      <img src="${answer.country.flag}" alt="">
      <div>
        <strong>${index + 1}. ${answer.country.name}</strong>
        <span>Your answer: ${answer.selected.name}</span>
      </div>
      <div class="review-mark ${answer.correct ? "good" : "bad"}">${answer.correct ? "Correct" : "Wrong"}</div>
    `;
    elements.reviewList.append(row);
  });

  void recordCompletedQuiz(percent);
}

function normalizeDifficulty(value) {
  return Object.prototype.hasOwnProperty.call(difficultySettings, value) ? value : "medium";
}

function renderFeedback(isCorrect, country) {
  elements.feedback.hidden = false;
  elements.feedback.replaceChildren();

  const status = document.createElement("strong");
  status.textContent = isCorrect ? "Correct." : "Wrong.";
  elements.feedback.append(status, " ");

  if (!isCorrect) {
    const countryName = document.createElement("strong");
    countryName.textContent = country.name;
    elements.feedback.append("The correct answer is ", countryName, ". ");
  }

  elements.feedback.append(country.fact);
}

async function recordCompletedQuiz(percent) {
  await waitForAdaptiveReady();

  let adaptiveRecorded = false;
  if (window.QuizzesHubAdaptive?.recordAttempt) {
    try {
      const result = await window.QuizzesHubAdaptive.recordAttempt(
        answers.map(answer => ({
          question: { key: answer.questionKey || answer.country.code },
          correct: answer.correct
        }))
      );
      adaptiveRecorded = Boolean(result?.ok);
    } catch (error) {
      console.warn("Adaptive recording failed", error);
    }
  }

  if (adaptiveRecorded) return;

  await window.QuizzesHubProgress?.record({
    quizId: QUIZ_ID,
    score,
    total: quizSettings.questionCount,
    level: getScoreGrade(percent),
    details: {
      difficulty: assignmentDifficulty,
      percent,
      answers: answers.map(answer => ({
        key: answer.questionKey || answer.country.code,
        prompt: answer.country.name,
        expected: answer.country.name,
        selected: answer.selected.name,
        correct: answer.correct
      }))
    }
  });
}

function waitForAdaptiveReady() {
  if (!window.QuizzesHubAdaptiveReady) return Promise.resolve(null);
  return Promise.race([
    window.QuizzesHubAdaptiveReady.catch(() => null),
    new Promise(resolve => setTimeout(() => resolve(null), ADAPTIVE_READY_TIMEOUT_MS))
  ]);
}

function restoreSession() {
  const session = loadSession();
  if (!session || session.assignmentDifficulty !== assignmentDifficulty) return false;
  if (!Array.isArray(session.quiz) || session.quiz.length === 0) return false;

  quiz = session.quiz;
  currentIndex = clampNumber(session.currentIndex, 0, quiz.length - 1);
  score = clampNumber(session.score, 0, quiz.length);
  answers = Array.isArray(session.answers) ? session.answers : [];
  locked = Boolean(answers[currentIndex]);

  document.body.classList.add("quiz-active");
  elements.resultsCard.hidden = true;
  elements.quizCard.hidden = false;
  renderQuestion();
  return true;
}

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function saveSession() {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
      version: 1,
      assignmentDifficulty,
      quiz,
      currentIndex,
      score,
      answers
    }));
  } catch {
    // Storage can be unavailable in private browsing; the quiz still works.
  }
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function getScoreGrade(percent) {
  if (percent === 100) return "A+";
  if (percent >= 80) return "A";
  if (percent >= 60) return "B";
  if (percent >= 40) return "C";
  return "Practice";
}

function getPerformanceMessage(percent) {
  if (percent === 100) return "Perfect round. You handled every close-call flag.";
  if (percent >= 80) return "Excellent score. Only the trickiest lookalikes slowed you down.";
  if (percent >= 60) return "Solid result. A few similar regional flags are worth another pass.";
  if (percent >= 40) return "Good start. The review list will help lock in the confusing pairs.";
  return "Tough round. Try again and watch for color order, emblems, and regional patterns.";
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sharedWords(a, b) {
  const wordsA = new Set(a.toLowerCase().split(/[^a-z]+/).filter(word => word.length > 3));
  return b.toLowerCase().split(/[^a-z]+/).filter(word => wordsA.has(word)).length;
}

elements.nextButton.addEventListener("click", nextQuestion);
elements.playAgainButton.addEventListener("click", startNewQuiz);

document.addEventListener("keydown", event => {
  if (event.key >= "1" && event.key <= "4" && !locked) {
    const button = elements.options.children[Number(event.key) - 1];
    if (button) button.click();
  }
  if ((event.key === "Enter" || event.key === " ") && locked && !elements.nextButton.disabled) {
    elements.nextButton.click();
  }
});
