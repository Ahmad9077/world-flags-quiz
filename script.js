const QUESTION_COUNT = 15;

const elements = {
  quizCard: document.querySelector("#quiz-card"),
  resultsCard: document.querySelector("#results-card"),
  questionLabel: document.querySelector("#question-label"),
  scoreValue: document.querySelector("#score-value"),
  progressBar: document.querySelector("#progress-bar"),
  flagImage: document.querySelector("#flag-image"),
  options: document.querySelector("#options"),
  feedback: document.querySelector("#feedback"),
  nextButton: document.querySelector("#next-button"),
  restartButton: document.querySelector("#restart-button"),
  playAgainButton: document.querySelector("#play-again-button"),
  resultTitle: document.querySelector("#result-title"),
  resultMessage: document.querySelector("#result-message"),
  finalScore: document.querySelector("#final-score"),
  finalPercent: document.querySelector("#final-percent"),
  resultGauge: document.querySelector("#result-gauge"),
  scoreGrade: document.querySelector("#score-grade"),
  reviewList: document.querySelector("#review-list")
};

const feedbackImages = {
  happy: "assets/feedback/happy-boy.jpg",
  sad: "assets/feedback/sad-girl.jpg"
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

init();

async function init() {
  try {
    const response = await fetch("countries.json");
    countries = await response.json();
    startQuiz();
  } catch (error) {
    elements.quizCard.innerHTML = "<p>Could not load the local country dataset. Please refresh the page.</p>";
    console.error(error);
  }
}

function startQuiz() {
  quiz = shuffle([...countries]).slice(0, QUESTION_COUNT).map(country => ({
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
  renderQuestion();
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
    if (selected.size >= 4) break;
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
  locked = false;
  elements.questionLabel.textContent = `Question ${currentIndex + 1} of ${QUESTION_COUNT}`;
  elements.scoreValue.textContent = score;
  elements.progressBar.style.width = `${(currentIndex / QUESTION_COUNT) * 100}%`;
  elements.flagImage.src = item.country.flag;
  elements.flagImage.alt = `Flag for question ${currentIndex + 1}`;
  elements.feedback.hidden = true;
  elements.feedback.innerHTML = "";
  elements.nextButton.disabled = true;
  elements.nextButton.textContent = "Choose an answer";
  elements.options.innerHTML = "";

  item.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option-button";
    button.innerHTML = `<span class="option-text">${option.name}</span>`;
    button.dataset.code = option.code;
    button.setAttribute("aria-label", `Option ${index + 1}: ${option.name}`);
    button.addEventListener("click", () => chooseAnswer(option.code));
    elements.options.append(button);
  });
}

function chooseAnswer(selectedCode) {
  if (locked) return;
  locked = true;

  const item = quiz[currentIndex];
  const isCorrect = selectedCode === item.country.code;
  if (isCorrect) score += 1;

  answers.push({
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
      const image = document.createElement("img");
      image.className = "answer-face";
      image.src = isCorrect ? feedbackImages.happy : feedbackImages.sad;
      image.alt = isCorrect ? "Happy reaction for a correct answer" : "Sad reaction for a wrong answer";
      button.append(image);
    }
  });

  elements.scoreValue.textContent = score;
  elements.feedback.hidden = false;
  elements.feedback.innerHTML = isCorrect
    ? `<strong>Correct.</strong> ${item.country.fact}`
    : `<strong>Wrong.</strong> The correct answer is <strong>${item.country.name}</strong>. ${item.country.fact}`;
  elements.nextButton.disabled = false;
  elements.nextButton.textContent = currentIndex === QUESTION_COUNT - 1 ? "Show Results" : "Next Question";
  elements.progressBar.style.width = `${((currentIndex + 1) / QUESTION_COUNT) * 100}%`;
  elements.nextButton.focus();
}

function nextQuestion() {
  if (!locked) return;
  if (currentIndex === QUESTION_COUNT - 1) {
    showResults();
    return;
  }
  currentIndex += 1;
  renderQuestion();
}

function showResults() {
  const percent = Math.round((score / QUESTION_COUNT) * 100);
  elements.quizCard.hidden = true;
  elements.resultsCard.hidden = false;
  document.body.classList.remove("quiz-active");
  elements.resultTitle.textContent = `${score} out of ${QUESTION_COUNT}`;
  elements.finalScore.textContent = score;
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
elements.restartButton.addEventListener("click", startQuiz);
elements.playAgainButton.addEventListener("click", startQuiz);

document.addEventListener("keydown", event => {
  if (event.key >= "1" && event.key <= "4" && !locked) {
    const button = elements.options.children[Number(event.key) - 1];
    if (button) button.click();
  }
  if ((event.key === "Enter" || event.key === " ") && locked && !elements.nextButton.disabled) {
    elements.nextButton.click();
  }
});
