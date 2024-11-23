class MemoryGame {
  static CHROMATIC_TONES = [
    "A",
    "A#/Bb",
    "B",
    "C",
    "C#/Db",
    "D",
    "D#/Eb",
    "E",
    "F",
    "F#/Gb",
    "G",
    "G#/Ab",
  ];

  static A3_FREQUENCY = 220;

  constructor({
    gridEl,
    cardTemplateEl,
    tonesEl,
    timeEl,
    resetEl,
    setupTones,
  }) {
    this.gridEl = gridEl;
    this.cardTemplateEl = cardTemplateEl;
    this.tonesEl = tonesEl;
    this.timeEl = timeEl;
    this.resetEl = resetEl;

    this.setupTones = setupTones ?? MemoryGame.CHROMATIC_TONES;

    this.setup();
    this.bindTonesClick();

    this.resetEl.onclick = () => {
      this.handleResetClick();
    };
  }

  setup() {
    const [rows, columns] = this.calculateSize();
    this.rows = rows;
    this.columns = columns;

    this.cardEls = [];
    this.cardValues = [];
    this.toneValues = [];
    this.guessedCards = new Array(this.setupTones.length * 2).fill(false);
    this.openedCard = null;
    this.wrongCards = null;
    this.tones = this.generateTones();
    this.isPlaying = false;
    this.startTime = null;
    this.intervalID = null;

    this.generateValues();
    this.setupGrid();
    this.redrawTones();
  }

  setupGrid() {
    this.gridEl.style.gridTemplateRows = `repeat(${this.rows}, var(--card-size))`;
    this.gridEl.style.gridTemplateColumns = `repeat(${this.columns}, var(--card-size))`;
    this.gridEl.innerHTML = "";

    for (let row = 0; row < this.rows; row++) {
      for (let column = 0; column < this.columns; column++) {
        const index = this.getCardIndex(row, column);
        if (index >= this.toneValues.length) {
          break;
        }

        const cardEl = this.createCard(index);

        this.gridEl.appendChild(cardEl);

        this.cardEls[index] = cardEl;
        cardEl.onclick = () => {
          this.handleCardClick(cardEl, index);
        };
      }
    }
  }

  createCard(index) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = this.cardTemplateEl.innerHTML.replace(
      "$NOTE",
      this.toneValues[index][0]
    );

    return wrapper.querySelector("div");
  }

  redrawTones() {
    this.getTonesEls().forEach((t) => {
      const hasTone = this.setupTones.includes(t.dataset.note);
      hasTone ? t.classList.remove("disabled") : t.classList.add("disabled");
    });
  }

  bindTonesClick() {
    this.getTonesEls().forEach((t) => {
      t.onclick = () => {
        this.handleToneClick(t);
      };
    });
  }

  handleCardClick(cardEl, index) {
    const tonesEls = this.getTonesEls();

    if (!this.isPlaying) {
      tonesEls.forEach((t) => t.classList.add("playing"));
      this.resetEl.classList.add("playing");

      this.isPlaying = true;
      this.startInterval();
    }

    if (this.guessedCards[index]) {
      return;
    }

    this.playSound(index);

    if (this.openedCard === index) {
      return;
    }

    if (this.openedCard === null) {
      this.resetWrongCards();
      this.openedCard = index;
      cardEl.classList.add("open");
      return;
    }

    if (
      this.openedCard !== null &&
      this.cardValues[index] === this.cardValues[this.openedCard]
    ) {
      cardEl.classList.add("open", "valid");
      this.cardEls[this.openedCard].classList.add("open", "valid");

      this.guessedCards[index] = this.guessedCards[this.openedCard] = true;
      this.openedCard = null;

      const toneEl = tonesEls.find(
        (t) => t.dataset.note === this.toneValues[index][0]
      );
      toneEl.classList.add("valid");

      if (this.gameHasEnded()) {
        this.isPlaying = false;
        this.stopInterval();
      }

      return;
    }

    cardEl.classList.add("open", "invalid");
    this.cardEls[this.openedCard].classList.add("open", "invalid");
    this.wrongCards = [index, this.openedCard];
    this.openedCard = null;

    setTimeout(() => this.resetWrongCards(), 1000);
  }

  handleToneClick(toneEl) {
    if (this.isPlaying) {
      return;
    }

    toneEl.classList.toggle("disabled");
    const enabledTonesEls = this.getTonesEls().filter(
      (t) => !t.classList.contains("disabled")
    );

    if (enabledTonesEls.length < 1) {
      toneEl.classList.remove("disabled");
      return;
    }

    this.setupTones = enabledTonesEls.map((t) => t.dataset.note);
    this.setup();
  }

  handleResetClick() {
    this.resetEl.classList.remove("playing");
    this.getTonesEls().forEach((t) => {
      t.classList.remove("playing");
      t.classList.remove("valid");
    });

    this.stopInterval();
    this.resetEl.innerText = "00:00.000";
    this.setup();
  }

  resetWrongCards() {
    if (!this.wrongCards || this.openedCard !== null) {
      return;
    }

    const [first, second] = this.wrongCards;
    this.cardEls[first].classList.remove("open", "invalid");
    this.cardEls[second].classList.remove("open", "invalid");
    this.wrongCards = null;
  }

  generateTones() {
    const entries = MemoryGame.CHROMATIC_TONES.map((note, i) => [
      note,
      i,
    ]).filter(([note, _]) => this.setupTones.includes(note));
    const tones = [];

    const indexes = new Set();

    for (let value = 0; value < this.setupTones.length; value++) {
      let index = null;

      while (index === null || indexes.has(index)) {
        index = this.getRandomNumber(0, entries.length);
      }

      tones.push(entries[index]);

      indexes.add(index);
    }

    return tones;
  }

  generateValues() {
    const len = this.setupTones.length * 2;
    const indexes = new Set();

    for (let value = 0; value < this.setupTones.length; value++) {
      let first = null;
      let second = null;

      while (
        first === null ||
        first === second ||
        indexes.has(first) ||
        indexes.has(second)
      ) {
        first = this.getRandomNumber(0, len);
        second = this.getRandomNumber(0, len);
      }

      this.cardValues[first] = this.cardValues[second] = value;

      indexes.add(first);
      indexes.add(second);
    }

    this.toneValues = this.cardValues.map((value) => this.tones[value]);
  }

  playSound(index) {
    const semitoneRatio = Math.pow(2, 1 / 12);
    const toneValue = this.toneValues[index][1];
    const frequency =
      MemoryGame.A3_FREQUENCY * Math.pow(semitoneRatio, toneValue);

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    const oscillator = audioCtx.createOscillator();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);

    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 1);
  }

  startInterval() {
    this.startTime = Date.now();
    this.intervalID = setInterval(() => {
      this.onIntervalTick();
    }, 10);
  }

  stopInterval() {
    clearInterval(this.intervalID);
    this.intervalID = null;
    this.startTime = null;
  }

  onIntervalTick() {
    const ms = Date.now() - this.startTime;
    const mins = Math.floor(ms / (1000 * 60));
    const secs = Math.floor(ms / 1000) - mins * 60;
    const msecs = ms - mins * 60 * 1000 - secs * 1000;

    const str = `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}.${msecs.toString().padStart(3, "0")}`;
    this.timeEl.innerText = str;
  }

  calculateSize() {
    const sizes = [
      null,
      [1, 2],
      [2, 2],
      [2, 3],
      [2, 4],
      [3, 4],
      [3, 4],
      [4, 4],
      [4, 4],
      [3, 6],
      [4, 5],
      [4, 6],
      [4, 6],
    ];

    return sizes[this.setupTones.length];
  }

  gameHasEnded() {
    return this.guessedCards.every((g) => g === true);
  }

  getCardIndex(row, column) {
    return this.columns * row + column;
  }

  getRandomNumber(from, to) {
    return Math.floor(Math.random() * (to - from)) + from;
  }

  getTonesEls() {
    return [...this.tonesEl.querySelectorAll(".tone")];
  }
}
