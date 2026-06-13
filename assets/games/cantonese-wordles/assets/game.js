(function bootstrapGame() {
  "use strict";

  const DIRECTIONS = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];

  const STORAGE_PREFIX = "cantonese-wordles";

  const elements = {
    gameDate: document.getElementById("game-date"),
    currentWord: document.getElementById("current-word"),
    grid: document.getElementById("grid"),
    gridShell: document.getElementById("grid-shell"),
    pathOverlay: document.getElementById("path-overlay"),
    clearButton: document.getElementById("clear-button"),
    submitButton: document.getElementById("submit-button"),
    foundList: document.getElementById("found-list"),
    unfoundList: document.getElementById("unfound-list"),
    tipsButton: document.getElementById("tips-button"),
    progressText: document.getElementById("progress-text"),
    progressBar: document.getElementById("progress-bar"),
    toast: document.getElementById("toast"),
    modal: document.getElementById("modal"),
    modalCharacter: document.getElementById("modal-character"),
    modalJyutping: document.getElementById("modal-jyutping"),
    modalDefinition: document.getElementById("modal-definition"),
    modalExample: document.getElementById("modal-example"),
    modalClose: document.getElementById("modal-close"),
    modalConfirm: document.getElementById("modal-confirm"),
  };

  const state = {
    puzzle: null,
    dateId: "",
    selectedPath: [],
    foundWords: new Set(),
    tipsUsed: 0,
    toastTimer: null,
    cellButtons: [],
  };

  /**
   * 生成北京时间日期字符串，确保全球访问时看到的是同一天题目。
   * @returns {string}
   */
  function getBeijingDateId() {
    const now = new Date();
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
    const beijingTime = new Date(utcTime + 8 * 60 * 60 * 1000);
    const year = String(beijingTime.getFullYear());
    const month = String(beijingTime.getMonth() + 1).padStart(2, "0");
    const day = String(beijingTime.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /**
   * 基于日期稳定选题，替代原来依赖服务端和数据库的每日出题流程。
   * @param {string} dateId
   * @returns {{grid: string[][], words: Array<{jyutping: string, character: string, definition: string, example: string}>}}
   */
  function getPuzzleForDate(dateId) {
    const puzzles = (window.CANTONESE_WORDLES_DATA && window.CANTONESE_WORDLES_DATA.puzzles) || [];
    if (!puzzles.length) {
      throw new Error("Puzzle data is missing.");
    }
    const numericDate = Number(dateId.replace(/-/g, ""));
    const index = numericDate % puzzles.length;
    return puzzles[index];
  }

  /**
   * 生成本地存储 key，用于保存单日游戏进度。
   * @param {string} dateId
   * @returns {string}
   */
  function getStorageKey(dateId) {
    return `${STORAGE_PREFIX}:${dateId}`;
  }

  /**
   * 从本地恢复当日进度，刷新页面后保持已找到单词和提示次数。
   * @param {string} dateId
   * @returns {{foundWords: string[], tipsUsed: number}}
   */
  function loadPersistedState(dateId) {
    try {
      const raw = window.localStorage.getItem(getStorageKey(dateId));
      if (!raw) {
        return { foundWords: [], tipsUsed: 0 };
      }
      const parsed = JSON.parse(raw);
      return {
        foundWords: Array.isArray(parsed.foundWords) ? parsed.foundWords : [],
        tipsUsed: Number.isInteger(parsed.tipsUsed) ? parsed.tipsUsed : 0,
      };
    } catch (error) {
      console.warn("Failed to load local progress:", error);
      return { foundWords: [], tipsUsed: 0 };
    }
  }

  /**
   * 保存当日进度到浏览器本地存储。
   */
  function persistState() {
    if (!state.dateId) {
      return;
    }
    const payload = {
      foundWords: Array.from(state.foundWords),
      tipsUsed: state.tipsUsed,
    };
    window.localStorage.setItem(getStorageKey(state.dateId), JSON.stringify(payload));
  }

  /**
   * 判断两个格子是否八方向相邻。
   * @param {{row: number, col: number}} first
   * @param {{row: number, col: number}} second
   * @returns {boolean}
   */
  function isAdjacent(first, second) {
    return DIRECTIONS.some(function matchDirection(direction) {
      return first.row + direction[0] === second.row && first.col + direction[1] === second.col;
    });
  }

  /**
   * 判断坐标是否已在当前路径中。
   * @param {number} row
   * @param {number} col
   * @returns {number}
   */
  function getSelectedIndex(row, col) {
    return state.selectedPath.findIndex(function findPosition(position) {
      return position.row === row && position.col === col;
    });
  }

  /**
   * 将当前路径拼成玩家正在提交的 Jyutping。
   * @returns {string}
   */
  function getCurrentWord() {
    if (!state.puzzle) {
      return "";
    }
    return state.selectedPath
      .map(function mapLetter(position) {
        return state.puzzle.grid[position.row][position.col];
      })
      .join("")
      .toLowerCase();
  }

  /**
   * 获取尚未找到的单词列表。
   * @returns {Array<{jyutping: string, character: string, definition: string, example: string}>}
   */
  function getUnfoundWords() {
    return state.puzzle.words.filter(function filterWord(word) {
      return !state.foundWords.has(word.jyutping);
    });
  }

  /**
   * 处理格子点击，支持起点选择、相邻扩展和回退路径。
   * @param {number} row
   * @param {number} col
   */
  function handleCellClick(row, col) {
    const nextPosition = { row: row, col: col };
    if (!state.selectedPath.length) {
      state.selectedPath = [nextPosition];
      render();
      return;
    }

    const existingIndex = getSelectedIndex(row, col);
    if (existingIndex >= 0) {
      state.selectedPath = state.selectedPath.slice(0, existingIndex + 1);
      render();
      return;
    }

    const lastPosition = state.selectedPath[state.selectedPath.length - 1];
    if (isAdjacent(lastPosition, nextPosition)) {
      state.selectedPath = state.selectedPath.concat(nextPosition);
      render();
      return;
    }

    state.selectedPath = [nextPosition];
    render();
  }

  /**
   * 清空当前选择路径，不影响已找到的结果。
   */
  function clearSelection() {
    state.selectedPath = [];
    render();
  }

  /**
   * 显示短提示消息，用于错误反馈和重复提交提醒。
   * @param {string} message
   */
  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(function hideToast() {
      elements.toast.classList.remove("is-visible");
    }, 1800);
  }

  /**
   * 触发输入错误的抖动反馈，帮助用户立即理解提交失败。
   */
  function flashInvalidState() {
    elements.currentWord.classList.remove("is-shaking");
    void elements.currentWord.offsetWidth;
    elements.currentWord.classList.add("is-shaking");
    window.setTimeout(function removeShakeClass() {
      elements.currentWord.classList.remove("is-shaking");
    }, 430);
  }

  /**
   * 打开成功弹窗，展示找到的汉字、释义和例句。
   * @param {{jyutping: string, character: string, definition: string, example: string}} word
   */
  function openModal(word) {
    elements.modalCharacter.textContent = word.character;
    elements.modalJyutping.textContent = word.jyutping;
    elements.modalDefinition.textContent = word.definition;
    elements.modalExample.textContent = `“${word.example}”`;
    elements.modal.classList.remove("hidden");
  }

  /**
   * 关闭成功弹窗。
   */
  function closeModal() {
    elements.modal.classList.add("hidden");
  }

  /**
   * 提交当前单词，命中则计入进度，未命中则给出反馈。
   */
  function submitCurrentWord() {
    const currentWord = getCurrentWord();
    if (!currentWord) {
      return;
    }

    const matchedWord = state.puzzle.words.find(function findWord(word) {
      return word.jyutping.toLowerCase() === currentWord;
    });

    if (!matchedWord) {
      flashInvalidState();
      showToast("That path is not a valid answer.");
      state.selectedPath = [];
      render();
      return;
    }

    if (state.foundWords.has(matchedWord.jyutping)) {
      flashInvalidState();
      showToast("You already found that word.");
      state.selectedPath = [];
      render();
      return;
    }

    state.foundWords.add(matchedWord.jyutping);
    state.selectedPath = [];
    persistState();
    render();
    openModal(matchedWord);
  }

  /**
   * 消耗一次提示，按顺序展示未找到单词的首字母和长度。
   */
  function revealTip() {
    const unfoundWords = getUnfoundWords();
    if (!unfoundWords.length) {
      return;
    }
    state.tipsUsed += 1;
    persistState();
    render();
  }

  /**
   * 计算所有格子的中心点，为路径连线提供定位。
   * @returns {Array<{x: number, y: number}>}
   */
  function getCellCenters() {
    const shellRect = elements.gridShell.getBoundingClientRect();
    return state.cellButtons.map(function mapButton(button) {
      const rect = button.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2 - shellRect.left,
        y: rect.top + rect.height / 2 - shellRect.top,
      };
    });
  }

  /**
   * 根据当前选择路径绘制 SVG 连线，降低用户对路径的记忆负担。
   */
  function renderPathOverlay() {
    elements.pathOverlay.innerHTML = "";
    if (state.selectedPath.length < 2) {
      return;
    }

    const centers = getCellCenters();
    const shellRect = elements.gridShell.getBoundingClientRect();
    elements.pathOverlay.setAttribute("viewBox", `0 0 ${shellRect.width} ${shellRect.height}`);

    state.selectedPath.slice(0, -1).forEach(function drawSegment(position, index) {
      const next = state.selectedPath[index + 1];
      const currentFlatIndex = position.row * 4 + position.col;
      const nextFlatIndex = next.row * 4 + next.col;
      const start = centers[currentFlatIndex];
      const end = centers[nextFlatIndex];
      if (!start || !end) {
        return;
      }

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", String(start.x));
      line.setAttribute("y1", String(start.y));
      line.setAttribute("x2", String(end.x));
      line.setAttribute("y2", String(end.y));
      line.setAttribute("stroke", "#E2383A");
      line.setAttribute("stroke-width", "4");
      line.setAttribute("stroke-linecap", "round");
      line.setAttribute("opacity", "0.35");
      elements.pathOverlay.appendChild(line);
    });
  }

  /**
   * 渲染字母盘，保持每个格子状态与当前路径同步。
   */
  function renderGrid() {
    const flatLetters = state.puzzle.grid.flat();

    state.cellButtons.forEach(function updateButton(button, index) {
      const row = Math.floor(index / 4);
      const col = index % 4;
      const selectedIndex = getSelectedIndex(row, col);
      button.textContent = flatLetters[index].toUpperCase();
      button.classList.toggle("is-selected", selectedIndex >= 0);
      button.innerHTML = flatLetters[index].toUpperCase();

      if (selectedIndex >= 0) {
        const badge = document.createElement("span");
        badge.className = "grid-cell__order";
        badge.textContent = String(selectedIndex + 1);
        button.appendChild(badge);
      }
    });
  }

  /**
   * 渲染顶部当前输入文本和按钮可用状态。
   */
  function renderCurrentWord() {
    const currentWord = getCurrentWord();
    elements.currentWord.textContent = currentWord || "· · ·";
    elements.currentWord.classList.toggle("is-active", Boolean(currentWord));
    elements.submitButton.disabled = !currentWord;
  }

  /**
   * 渲染已找到单词列表，直接反馈阶段性收获。
   */
  function renderFoundWords() {
    const foundWords = state.puzzle.words.filter(function filterWord(word) {
      return state.foundWords.has(word.jyutping);
    });

    elements.foundList.innerHTML = "";
    if (!foundWords.length) {
      const emptyState = document.createElement("p");
      emptyState.className = "tag-list__empty";
      emptyState.textContent = "No words found yet. Start connecting letters.";
      elements.foundList.appendChild(emptyState);
      return;
    }

    foundWords.forEach(function appendWord(word) {
      const tag = document.createElement("div");
      tag.className = "word-tag";
      tag.innerHTML =
        `<span class="word-tag__character">${word.character}</span>` +
        `<span class="word-tag__jyutping">${word.jyutping}</span>`;
      elements.foundList.appendChild(tag);
    });
  }

  /**
   * 渲染未找到单词区和提示效果，控制信息释放节奏。
   */
  function renderUnfoundWords() {
    const unfoundWords = getUnfoundWords();
    elements.unfoundList.innerHTML = "";
    elements.tipsButton.disabled = !unfoundWords.length;

    if (!unfoundWords.length) {
      const emptyState = document.createElement("p");
      emptyState.className = "hint-list__empty";
      emptyState.textContent = "All words found. You cleared today’s puzzle.";
      elements.unfoundList.appendChild(emptyState);
      return;
    }

    unfoundWords.forEach(function appendHint(word, index) {
      const row = document.createElement("div");
      const tipUnlocked = index < state.tipsUsed;
      const mask = "_".repeat(Math.max(word.jyutping.length - 1, 0));
      row.className = "hint-item";
      row.innerHTML =
        `<span class="hint-item__index">${index + 1}.</span>` +
        `<span class="hint-item__value">${
          tipUnlocked
            ? `<strong>${word.jyutping[0]}</strong>${mask} (${word.jyutping.length})`
            : "?".repeat(word.jyutping.length)
        }</span>`;
      elements.unfoundList.appendChild(row);
    });
  }

  /**
   * 渲染进度条和进度文本。
   */
  function renderProgress() {
    const total = state.puzzle.words.length;
    const found = state.foundWords.size;
    const progress = total ? (found / total) * 100 : 0;
    elements.progressText.textContent = `${found} / ${total}`;
    elements.progressBar.style.width = `${progress}%`;
  }

  /**
   * 渲染整个页面的交互状态。
   */
  function render() {
    renderCurrentWord();
    renderGrid();
    renderPathOverlay();
    renderFoundWords();
    renderUnfoundWords();
    renderProgress();
  }

  /**
   * 创建初始格子按钮，仅在首次加载时执行一次。
   */
  function buildGrid() {
    state.cellButtons = [];
    elements.grid.innerHTML = "";

    state.puzzle.grid.forEach(function appendRow(row, rowIndex) {
      row.forEach(function appendCell(letter, colIndex) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "grid-cell";
        button.setAttribute("role", "gridcell");
        button.setAttribute("aria-label", `Letter ${letter.toUpperCase()} at row ${rowIndex + 1} column ${colIndex + 1}`);
        button.addEventListener("click", function onCellClick() {
          handleCellClick(rowIndex, colIndex);
        });
        elements.grid.appendChild(button);
        state.cellButtons.push(button);
      });
    });
  }

  /**
   * 绑定页面级交互事件。
   */
  function bindEvents() {
    elements.clearButton.addEventListener("click", clearSelection);
    elements.submitButton.addEventListener("click", submitCurrentWord);
    elements.tipsButton.addEventListener("click", revealTip);
    elements.modalClose.addEventListener("click", closeModal);
    elements.modalConfirm.addEventListener("click", closeModal);
    elements.modal.addEventListener("click", function onBackdropClick(event) {
      if (event.target === elements.modal) {
        closeModal();
      }
    });
    window.addEventListener("resize", renderPathOverlay);
    window.addEventListener("keydown", function onKeyDown(event) {
      if (event.key === "Escape") {
        closeModal();
        clearSelection();
      }
      if (event.key === "Enter") {
        submitCurrentWord();
      }
      if (event.key === "Backspace") {
        state.selectedPath = state.selectedPath.slice(0, -1);
        render();
      }
    });
  }

  /**
   * 初始化静态游戏，替代原先的客户端拉接口和服务端生成逻辑。
   */
  function initializeGame() {
    state.dateId = getBeijingDateId();
    state.puzzle = getPuzzleForDate(state.dateId);
    const persistedState = loadPersistedState(state.dateId);
    state.foundWords = new Set(
      persistedState.foundWords.filter(function keepValidWord(word) {
        return state.puzzle.words.some(function matchPuzzleWord(puzzleWord) {
          return puzzleWord.jyutping === word;
        });
      })
    );
    state.tipsUsed = persistedState.tipsUsed;

    elements.gameDate.textContent = `${state.dateId} · Static GitHub Pages edition`;
    buildGrid();
    bindEvents();
    render();
  }

  initializeGame();
})();
