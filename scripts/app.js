const TOTAL_PAGES = 12;
const pageSources = Array.from({ length: TOTAL_PAGES }, (_, i) => {
  const pageNumber = i + 1;
  const padded = String(pageNumber).padStart(2, "0");
  return [
    `manga/page-${padded}.jpg`,
    `manga/page-${padded}.png`,
    `manga/page ${pageNumber}.png`,
    `manga/page ${pageNumber}.jpg`,
  ];
});
const SPREAD_COUNT = Math.ceil(TOTAL_PAGES / 2);

const bookEl = document.getElementById("book");
const bookShellEl = document.querySelector(".book-shell");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const prevZoneBtn = document.getElementById("prevZone");
const nextZoneBtn = document.getElementById("nextZone");
const pageSlider = document.getElementById("pageSlider");
const pageCounter = document.getElementById("pageCounter");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");

const gameArea = document.getElementById("gameArea");
const startGameBtn = document.getElementById("startGameBtn");
const resetGameBtn = document.getElementById("resetGameBtn");
const targetWordEl = document.getElementById("targetWord");
const progressWordEl = document.getElementById("progressWord");
const livesEl = document.getElementById("lives");
const gameMessage = document.getElementById("gameMessage");
const globalAffirmationsEl = document.getElementById("globalAffirmations");
const loveLetterSectionEl = document.getElementById("loveLetterSection");
const loveLetterEl = document.getElementById("loveLetter");

let currentSpread = 0;
let didSetPageRatio = false;
let touchStartX = 0;
let isTurning = false;
let wasInFinale = false;

let leftPageEl;
let rightPageEl;
let leftImgEl;
let rightImgEl;
let leftNumEl;
let rightNumEl;
let flipSheetEl;
let flipFrontImgEl;
let flipBackImgEl;
let flipFrontNumEl;
let flipBackNumEl;
let finaleEl;
let affirmationIntervalId = null;
let affirmationCursor = 0;
let affirmationsUnlocked = false;
let loveLetterInView = false;
let loveLetterObserver = null;

function placeholderImage(pageNumber) {
  const svg = `
  <svg xmlns='http://www.w3.org/2000/svg' width='1200' height='1700' viewBox='0 0 1200 1700'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='#fff7e8'/>
        <stop offset='100%' stop-color='#fde1bc'/>
      </linearGradient>
    </defs>
    <rect width='1200' height='1700' fill='url(#g)'/>
    <rect x='80' y='80' width='1040' height='1540' fill='none' stroke='#cf9c69' stroke-width='8' stroke-dasharray='16 12'/>
    <text x='600' y='760' text-anchor='middle' fill='#8a6039' font-size='78' font-family='Georgia, serif'>Page ${pageNumber}</text>
    <text x='600' y='860' text-anchor='middle' fill='#9c7046' font-size='40' font-family='Arial, sans-serif'>Drop your manga image in</text>
    <text x='600' y='920' text-anchor='middle' fill='#9c7046' font-size='40' font-family='Arial, sans-serif'>manga/page-${String(pageNumber).padStart(2, "0")}.jpg</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function heartPageImage() {
  const svg = `
  <svg xmlns='http://www.w3.org/2000/svg' width='1200' height='1700' viewBox='0 0 1200 1700'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='#fff2f5'/>
        <stop offset='100%' stop-color='#ffd7df'/>
      </linearGradient>
    </defs>
    <rect width='1200' height='1700' fill='url(#g)'/>
    <text x='600' y='720' text-anchor='middle' fill='#cf496d' font-size='140'>❤ ❤ ❤</text>
    <text x='600' y='900' text-anchor='middle' fill='#b63457' font-size='86' font-family='Georgia, serif'>I LOVE YOU SO MUCH</text>
    <text x='600' y='1020' text-anchor='middle' fill='#c14b6a' font-size='46' font-family='Arial, sans-serif'>Happy Birthday, My Love</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function buildBook() {
  bookEl.innerHTML = "";
  bookEl.classList.add("book-spread");

  ({ page: leftPageEl, img: leftImgEl, num: leftNumEl } = createSpreadPage("left"));
  ({ page: rightPageEl, img: rightImgEl, num: rightNumEl } = createSpreadPage("right"));

  flipSheetEl = document.createElement("article");
  flipSheetEl.className = "flip-sheet";
  const frontFace = document.createElement("div");
  frontFace.className = "flip-face flip-front";
  const backFace = document.createElement("div");
  backFace.className = "flip-face flip-back";
  ({ img: flipFrontImgEl, num: flipFrontNumEl } = createFaceContent(frontFace));
  ({ img: flipBackImgEl, num: flipBackNumEl } = createFaceContent(backFace));
  flipSheetEl.append(frontFace, backFace);

  finaleEl = document.createElement("div");
  finaleEl.className = "finale-overlay";
  finaleEl.innerHTML = `
    <p>I LOVE YOU SO MUCH</p>
    <small>Happy Birthday, My Love</small>
  `;

  bookEl.append(leftPageEl, rightPageEl, flipSheetEl, finaleEl);

  pageSlider.max = String(SPREAD_COUNT);
  setCurrentSpread(0);
}

function createSpreadPage(side) {
  const page = document.createElement("article");
  page.className = `spread-page ${side}`;

  const content = document.createElement("div");
  content.className = "spread-content";

  const img = document.createElement("img");
  img.loading = "lazy";
  img.alt = `${side} manga page`;

  const num = document.createElement("p");
  num.className = "spread-number";

  content.append(img, num);
  page.append(content);

  return { page, img, num };
}

function createFaceContent(face) {
  const content = document.createElement("div");
  content.className = "spread-content";

  const img = document.createElement("img");
  img.loading = "lazy";
  img.alt = "Turning page";

  const num = document.createElement("p");
  num.className = "spread-number";

  content.append(img, num);
  face.append(content);

  return { img, num };
}

function setImageWithFallback(img, pageIndex) {
  if (pageIndex < 0 || pageIndex >= TOTAL_PAGES) {
    img.src = placeholderImage(Math.max(1, pageIndex + 1));
    img.onload = null;
    img.onerror = null;
    return;
  }

  let attempt = 0;
  const candidates = pageSources[pageIndex];

  img.src = candidates[attempt];
  img.onload = () => {
    maybeSetPageRatioFromImage(img);
  };
  img.onerror = () => {
    attempt += 1;
    if (attempt < candidates.length) {
      img.src = candidates[attempt];
      return;
    }
    img.onerror = null;
    img.src = placeholderImage(pageIndex + 1);
  };
}

function maybeSetPageRatioFromImage(img) {
  if (didSetPageRatio) return;
  if (!img.naturalWidth || !img.naturalHeight) return;

  const rawRatio = img.naturalWidth / img.naturalHeight;
  const ratio = Math.max(0.45, Math.min(1.2, rawRatio));
  const spreadRatio = Math.max(0.9, Math.min(2.35, ratio * 2 * 0.96));

  document.documentElement.style.setProperty("--page-ratio", ratio.toFixed(4));
  document.documentElement.style.setProperty("--spread-ratio", spreadRatio.toFixed(4));
  didSetPageRatio = true;
}

function getSpreadLabel() {
  if (currentSpread >= SPREAD_COUNT) {
    return "I LOVE YOU SO MUCH";
  }

  const leftPage = currentSpread * 2 + 1;
  const rightPage = Math.min(leftPage + 1, TOTAL_PAGES);
  return rightPage <= TOTAL_PAGES
    ? `Pages ${leftPage}-${rightPage} of ${TOTAL_PAGES}`
    : `Page ${leftPage} of ${TOTAL_PAGES}`;
}

function renderSpread() {
  const spreadForImages = Math.min(currentSpread, SPREAD_COUNT - 1);
  const leftIndex = spreadForImages * 2;
  const rightIndex = leftIndex + 1;

  setImageWithFallback(leftImgEl, leftIndex);
  leftNumEl.textContent = leftIndex < TOTAL_PAGES ? String(leftIndex + 1) : "";

  if (rightIndex < TOTAL_PAGES) {
    setImageWithFallback(rightImgEl, rightIndex);
    rightNumEl.textContent = String(rightIndex + 1);
  } else {
    rightImgEl.src = placeholderImage(TOTAL_PAGES);
    rightNumEl.textContent = "";
  }

  const inFinale = currentSpread === SPREAD_COUNT;
  finaleEl.classList.toggle("show", inFinale);

  if (inFinale && !wasInFinale) {
    throwHeartConfetti();
  }
  wasInFinale = inFinale;

  pageCounter.textContent = getSpreadLabel();
  prevBtn.disabled = currentSpread === 0 || isTurning;
  nextBtn.disabled = currentSpread === SPREAD_COUNT || isTurning;
  pageSlider.value = String(currentSpread);
}

function setCurrentSpread(nextSpread) {
  if (isTurning) return;
  currentSpread = Math.max(0, Math.min(SPREAD_COUNT, nextSpread));
  renderSpread();
}

function turnNext() {
  if (isTurning || currentSpread >= SPREAD_COUNT) return;

  const rightIndex = currentSpread * 2 + 1;
  const nextLeftIndex = (currentSpread + 1) * 2;
  const goingToFinale = currentSpread + 1 === SPREAD_COUNT;

  setImageWithFallback(flipFrontImgEl, rightIndex);
  flipFrontNumEl.textContent = rightIndex < TOTAL_PAGES ? String(rightIndex + 1) : "";

  if (goingToFinale) {
    flipBackImgEl.src = heartPageImage();
    flipBackNumEl.textContent = "";
  } else {
    setImageWithFallback(flipBackImgEl, nextLeftIndex);
    flipBackNumEl.textContent = nextLeftIndex < TOTAL_PAGES ? String(nextLeftIndex + 1) : "";
  }

  isTurning = true;
  renderSpread();
  flipSheetEl.classList.add("active", "flip-next");

  setTimeout(() => {
    flipSheetEl.classList.remove("active", "flip-next");
    currentSpread += 1;
    isTurning = false;
    renderSpread();
  }, 950);
}

function turnPrev() {
  if (isTurning || currentSpread <= 0) return;
  currentSpread -= 1;
  renderSpread();
}

function wireBookControls() {
  prevBtn.addEventListener("click", turnPrev);
  nextBtn.addEventListener("click", turnNext);
  prevZoneBtn.addEventListener("click", turnPrev);
  nextZoneBtn.addEventListener("click", turnNext);

  bookShellEl.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest(".flip-zone")) return;

    const bounds = bookShellEl.getBoundingClientRect();
    const clickX = event.clientX - bounds.left;
    const isRightHalf = clickX >= bounds.width / 2;
    if (isRightHalf) turnNext();
    if (!isRightHalf) turnPrev();
  });

  pageSlider.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    setCurrentSpread(Number.parseInt(target.value, 10));
  });

  document.addEventListener("keydown", (event) => {
    if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName || "")) {
      return;
    }

    if (event.key === "ArrowRight") turnNext();
    if (event.key === "ArrowLeft") turnPrev();
  });

  bookShellEl.addEventListener(
    "touchstart",
    (event) => {
      touchStartX = event.changedTouches[0]?.clientX || 0;
    },
    { passive: true }
  );

  bookShellEl.addEventListener(
    "touchend",
    (event) => {
      const endX = event.changedTouches[0]?.clientX || 0;
      const deltaX = endX - touchStartX;
      if (Math.abs(deltaX) < 40) return;

      if (deltaX < 0) turnNext();
      if (deltaX > 0) turnPrev();
    },
    { passive: true }
  );
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

async function downloadPdf() {
  const jsPDFRef = window.jspdf?.jsPDF;

  if (!jsPDFRef) {
    alert("PDF library is not loaded. Please check your internet connection and retry.");
    return;
  }

  downloadPdfBtn.disabled = true;
  const originalText = downloadPdfBtn.textContent;
  downloadPdfBtn.textContent = "Preparing PDF...";

  try {
    const pdf = new jsPDFRef({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    let added = 0;

    for (let i = 0; i < pageSources.length; i += 1) {
      let img;
      try {
        img = await loadFirstImage(pageSources[i]);
      } catch {
        continue;
      }

      if (added > 0) {
        pdf.addPage();
      }

      const ratio = Math.min(pageWidth / img.width, pageHeight / img.height);
      const drawWidth = img.width * ratio;
      const drawHeight = img.height * ratio;
      const offsetX = (pageWidth - drawWidth) / 2;
      const offsetY = (pageHeight - drawHeight) / 2;

      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");

      if (!ctx) continue;

      ctx.drawImage(img, 0, 0);
      const imageData = canvas.toDataURL("image/jpeg", 0.92);
      pdf.addImage(imageData, "JPEG", offsetX, offsetY, drawWidth, drawHeight);
      added += 1;
    }

    if (added === 0) {
      alert("No manga images found. Add files in manga/page-01.jpg to manga/page-12.jpg first.");
      return;
    }

    pdf.save("birthday-manga-book.pdf");
  } finally {
    downloadPdfBtn.disabled = false;
    downloadPdfBtn.textContent = originalText;
  }
}

async function loadFirstImage(candidates) {
  for (const src of candidates) {
    try {
      return await loadImage(src);
    } catch {
      // Continue trying naming variants.
    }
  }
  throw new Error("No source found");
}

const configuredWord = (targetWordEl?.textContent || "HAPPYBIRTHDAY")
  .replace(/[^a-zA-Z]/g, "")
  .toUpperCase();
const TARGET_WORD = configuredWord || "HAPPYBIRTHDAY";
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const AFFIRMATIONS = [
  "You are deeply loved.",
  "I am proud of you.",
  "You make life brighter.",
  "You are my favorite person.",
  "You are strong and kind.",
  "You are enough, always.",
  "I believe in you every day.",
  "You make my heart feel at home.",
  "Your smile is my peace.",
  "You are my best decision.",
  "You are my comfort and my joy.",
  "I choose you, every time.",
];

let game = {
  running: false,
  index: 0,
  lives: 3,
  timerId: null,
};

function renderGameState() {
  targetWordEl.textContent = TARGET_WORD;

  const revealed = TARGET_WORD.split("")
    .map((char, idx) => (idx < game.index ? char : "_"))
    .join(" ");

  progressWordEl.textContent = revealed;
  livesEl.textContent = String(game.lives);
}

function setGameMessage(text, type = "") {
  gameMessage.textContent = text;
  gameMessage.classList.remove("success", "error");
  if (type) gameMessage.classList.add(type);
}

function clearOrbs() {
  gameArea.querySelectorAll(".letter-orb").forEach((orb) => orb.remove());
}

function clearAffirmationNotes() {
  globalAffirmationsEl?.querySelectorAll(".affirmation-note").forEach((node) => node.remove());
}

function stopAffirmationSequence() {
  if (affirmationIntervalId) {
    clearInterval(affirmationIntervalId);
    affirmationIntervalId = null;
  }
}

function resetAffirmationSequence() {
  affirmationsUnlocked = false;
  loveLetterInView = false;
  stopAffirmationSequence();
  clearAffirmationNotes();
  if (loveLetterSectionEl) loveLetterSectionEl.hidden = true;
}

function spawnAffirmationNote() {
  if (!globalAffirmationsEl) return;

  const note = document.createElement("span");
  note.className = "affirmation-note";
  note.textContent = AFFIRMATIONS[affirmationCursor % AFFIRMATIONS.length];
  affirmationCursor += 1;

  note.style.left = `${8 + Math.random() * 72}%`;
  note.style.animationDuration = `${(4.8 + Math.random() * 2.4).toFixed(2)}s`;
  note.style.transform = `rotate(${(-5 + Math.random() * 10).toFixed(1)}deg)`;

  globalAffirmationsEl.append(note);
  note.addEventListener("animationend", () => note.remove());
}

function startAffirmationLoop() {
  if (!globalAffirmationsEl) return;
  if (affirmationIntervalId) return;

  affirmationCursor = Math.floor(Math.random() * AFFIRMATIONS.length);

  for (let i = 0; i < 5; i += 1) {
    setTimeout(spawnAffirmationNote, i * 180);
  }

  affirmationIntervalId = setInterval(spawnAffirmationNote, 520);
}

function syncAffirmationPlayback() {
  if (!affirmationsUnlocked) {
    stopAffirmationSequence();
    clearAffirmationNotes();
    return;
  }

  if (loveLetterInView) {
    stopAffirmationSequence();
    clearAffirmationNotes();
    return;
  }

  startAffirmationLoop();
}

function startAffirmationSequence() {
  affirmationsUnlocked = true;
  if (loveLetterSectionEl) loveLetterSectionEl.hidden = false;
  syncAffirmationPlayback();
}

function setupLoveLetterObserver() {
  if (!loveLetterSectionEl || typeof IntersectionObserver === "undefined") return;

  loveLetterObserver = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      loveLetterInView = Boolean(entry?.isIntersecting && entry.intersectionRatio > 0.2);
      syncAffirmationPlayback();
    },
    { threshold: [0, 0.2, 0.5] }
  );

  loveLetterObserver.observe(loveLetterSectionEl);
}

function getRandomLetter(exclude) {
  let char = alphabet[Math.floor(Math.random() * alphabet.length)];
  while (char === exclude) {
    char = alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return char;
}

function spawnOrb() {
  if (!game.running) return;

  const needed = TARGET_WORD[game.index];
  const isHelpful = Math.random() < 0.58;
  const letter = isHelpful ? needed : getRandomLetter(needed);

  const orb = document.createElement("button");
  orb.type = "button";
  orb.className = "letter-orb";
  if (!isHelpful) orb.classList.add("wrong");
  orb.textContent = letter;

  const areaWidth = gameArea.clientWidth;
  const x = Math.max(0, Math.random() * (areaWidth - 56));
  const duration = (3.8 + Math.random() * 2.8).toFixed(2);

  orb.style.left = `${x}px`;
  orb.style.bottom = "-58px";
  orb.style.animationDuration = `${duration}s`;

  orb.addEventListener("click", () => {
    if (!game.running) return;

    if (letter === TARGET_WORD[game.index]) {
      game.index += 1;
      setGameMessage(`Nice! Next letter: ${TARGET_WORD[game.index] || "Done"}`);
    } else {
      game.lives -= 1;
      setGameMessage(`Oops. You need ${TARGET_WORD[game.index]}.`, "error");
    }

    orb.remove();
    renderGameState();

    if (game.index >= TARGET_WORD.length) {
      winGame();
      return;
    }

    if (game.lives <= 0) {
      loseGame();
    }
  });

  orb.addEventListener("animationend", () => {
    orb.remove();
  });

  gameArea.append(orb);
}

function throwConfetti() {
  const colors = ["#ff9f68", "#ffcf57", "#78d8b2", "#f26a68", "#6ea8ff"];
  const template = document.getElementById("confettiTemplate");

  for (let i = 0; i < 100; i += 1) {
    const node = template.content.firstElementChild.cloneNode(true);
    node.style.left = `${Math.random() * 100}vw`;
    node.style.background = colors[Math.floor(Math.random() * colors.length)];
    node.style.animationDelay = `${Math.random() * 0.25}s`;
    node.style.transform = `rotate(${Math.random() * 360}deg)`;
    document.body.append(node);

    setTimeout(() => node.remove(), 1700);
  }
}

function throwHeartConfetti() {
  const colors = ["#f04f78", "#ff7d9a", "#e13663", "#ff9bb2", "#c92d56"];
  for (let i = 0; i < 130; i += 1) {
    const heart = document.createElement("span");
    heart.className = "heart-piece";
    heart.textContent = Math.random() > 0.5 ? "❤" : "♥";
    heart.style.left = `${Math.random() * 100}vw`;
    heart.style.color = colors[Math.floor(Math.random() * colors.length)];
    heart.style.animationDelay = `${Math.random() * 0.25}s`;
    heart.style.transform = `rotate(${Math.random() * 360}deg)`;
    document.body.append(heart);
    setTimeout(() => heart.remove(), 2200);
  }
}

function stopGame() {
  game.running = false;
  if (game.timerId) {
    clearInterval(game.timerId);
    game.timerId = null;
  }
}

function winGame() {
  stopGame();
  clearOrbs();
  throwConfetti();
  startAffirmationSequence();
  setGameMessage("You cracked the code. Notes are flowing all around you. Scroll down for your letter.", "success");
}

function loseGame() {
  stopGame();
  clearOrbs();
  resetAffirmationSequence();
  setGameMessage("Game over. Hit Start and try again.", "error");
}

function startGame() {
  stopGame();
  clearOrbs();
  resetAffirmationSequence();

  game = {
    running: true,
    index: 0,
    lives: 3,
    timerId: null,
  };

  renderGameState();
  setGameMessage(`Catch letters in order. First up: ${TARGET_WORD[0]}`);

  game.timerId = setInterval(spawnOrb, 640);
}

function resetGame() {
  stopGame();
  clearOrbs();
  resetAffirmationSequence();

  game = {
    running: false,
    index: 0,
    lives: 3,
    timerId: null,
  };

  renderGameState();
  setGameMessage("Press Start when ready.");
}

function wireGameControls() {
  startGameBtn.addEventListener("click", startGame);
  resetGameBtn.addEventListener("click", resetGame);
}

function init() {
  buildBook();
  wireBookControls();

  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener("click", downloadPdf);
  }
  resetAffirmationSequence();
  setupLoveLetterObserver();

  renderGameState();
  wireGameControls();
}

init();

