(() => {
  function getPuzzleSize() {
    const puzzle = document.querySelector("table.puzzle");
    return parseInt(puzzle?.getAttribute("data-size") ?? "0", 10);
  }

  function getShipsInRow(row: number) {
    const th = document.getElementById(`Row${row}`);
    return parseInt(th!.textContent!, 10);
  }

  function getShipsInColumn(col: number) {
    const th = document.getElementById(`Col${col}`);
    return parseInt(th!.textContent!, 10);
  }

  let tappedSinceLastCheck = false;

  function tap(el: Element) {
    // .click() doesn't work for some reason
    el.dispatchEvent(new MouseEvent("mousedown"));
    el.dispatchEvent(new MouseEvent("mouseup"));

    // dispatch mouseup on document to trigger some game code
    document.dispatchEvent(new MouseEvent("mouseup"));

    tappedSinceLastCheck = true;
  }

  const getSquare = (x: number, y: number) =>
    document.getElementById(`Cell${x}_${y}`);

  // square types: water blank sub cap-left cap-right cap-top cap-bottom middle
  const getSquareClasses = (el: Element) => new Set(Array.from(el.classList));

  type SquareType = "blank" | "water" | "ship" | "invalid";

  function getSquareType(el: Element | null): SquareType {
    if (!el) return "invalid";

    const classes = getSquareClasses(el);
    if (classes.has("blank")) {
      return "blank";
    }
    if (classes.has("water")) {
      return "water";
    }
    return "ship";
  }

  const squareOrder: SquareType[] = ["blank", "water", "ship"];

  function markSquare(square: Element | null, newType: SquareType) {
    if (!square) return;

    const type = getSquareType(square);
    if (type === "invalid" || newType === "invalid") return;

    const index = squareOrder.indexOf(type);
    const newIndex = squareOrder.indexOf(newType);

    const diff = (newIndex - index + squareOrder.length) % squareOrder.length;
    for (let i = 0; i < diff; i++) {
      tap(square);
    }
  }

  const markWater = (square: Element | null) => markSquare(square, "water");

  const markShip = (square: Element | null) => markSquare(square, "ship");

  function isShip(x: number, y: number) {
    const square = getSquare(x, y);
    if (!square) return false;
    return getSquareType(square) === "ship";
  }

  function solveOnce() {
    // click the autosolve headers
    const headers = document.querySelectorAll("th.clickable");
    if (headers.length > 0) {
      headers.forEach((it) => {
        tap(it);
      });
    }

    const puzzleSize = getPuzzleSize();

    function iterSquares() {
      const ret: [number, number, Element][] = [];
      for (let x = 0; x < puzzleSize; x++) {
        for (let y = 0; y < puzzleSize; y++) {
          ret.push([x, y, getSquare(x, y)!]);
        }
      }
      return ret;
    }

    // extrapolate revealed ship squares
    for (const [x, y, square] of iterSquares()) {
      const classes = getSquareClasses(square);
      if (!classes.has("revealed")) continue;

      // extend ship caps
      if (classes.has("cap-left")) markShip(getSquare(x + 1, y));
      if (classes.has("cap-right")) markShip(getSquare(x - 1, y));
      if (classes.has("cap-top")) markShip(getSquare(x, y + 1));
      if (classes.has("cap-bottom")) markShip(getSquare(x, y - 1));

      // handle ship middles
      // if one way is blocked (by water, by max ship count), fill in the ship the other way
      if (classes.has("middle")) {
        // true = check if blocked columnwise, false = check rowwise
        for (const transp of [true, false]) {
          const getNeighbor = (dx: number, dy: number) => {
            return transp
              ? getSquare(x + dy, y + dx)
              : getSquare(x + dx, y + dy);
          };

          const isBlocked = () => {
            for (const dx of [-1, 1]) {
              const neighbor = getNeighbor(dx, 0);
              if (!neighbor) return true;
              if (getSquareType(neighbor) === "water") return true;
            }

            const ships = transp ? getShipsInColumn(x) : getShipsInRow(y);
            if (ships < 3) return true;

            return false;
          };

          if (!isBlocked()) continue;

          markShip(getNeighbor(0, -1));
          markShip(getNeighbor(0, +1));
        }
      }
    }

    // mark the water around ships
    for (const [x, y, square] of iterSquares()) {
      const classes = getSquareClasses(square);

      if (classes.has("water") || classes.has("blank")) continue;

      const _markWater = (x, y) => {
        const square = getSquare(x, y);
        if (square) markWater(square);
      };

      _markWater(x - 1, y + 1);
      _markWater(x + 1, y + 1);
      _markWater(x - 1, y - 1);
      _markWater(x + 1, y - 1);

      if (classes.has("cap-left")) {
        _markWater(x - 1, y);
        _markWater(x, y - 1);
        _markWater(x, y + 1);
      }
      if (classes.has("cap-right")) {
        _markWater(x + 1, y);
        _markWater(x, y - 1);
        _markWater(x, y + 1);
      }
      if (classes.has("cap-top")) {
        _markWater(x, y - 1);
        _markWater(x - 1, y);
        _markWater(x + 1, y);
      }
      if (classes.has("cap-bottom")) {
        _markWater(x, y + 1);
        _markWater(x - 1, y);
        _markWater(x + 1, y);
      }
      if (classes.has("sub")) {
        _markWater(x, y - 1);
        _markWater(x - 1, y);
        _markWater(x + 1, y);
        _markWater(x, y + 1);
      }
      if (classes.has("middle") || classes.has("unknown")) {
        if (isShip(x - 1, y) || isShip(x + 1, y)) {
          _markWater(x, y + 1);
          _markWater(x, y - 1);
        }
        if (isShip(x, y - 1) || isShip(x, y + 1)) {
          _markWater(x - 1, y);
          _markWater(x + 1, y);
        }
      }
    }

    // mark rows/cols where all remaining spots must be ships
    for (const transp of [true, false]) {
      for (let x = 0; x < puzzleSize; x++) {
        const ships = transp ? getShipsInRow(x) : getShipsInColumn(x);

        const getRealSquare = (x, y) => {
          return transp ? getSquare(y, x) : getSquare(x, y);
        };

        const squares: [number, SquareType][] = [];
        for (let y = 0; y < puzzleSize; y++) {
          squares.push([y, getSquareType(getRealSquare(x, y))]);
        }

        let nonWater = 0;
        for (const [, type] of squares) {
          if (type !== "water") {
            nonWater++;
          }
        }

        if (nonWater === ships) {
          for (const [y, type] of squares) {
            if (type === "blank") {
              markShip(getRealSquare(x, y));
            }
          }
        }
      }
    }
  }

  async function solve() {
    let solves = 0;
    while (true) {
      tappedSinceLastCheck = false;
      solveOnce();
      if (!tappedSinceLastCheck) break;
      solves++;

      // wait until the next frame
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    if (solves > 0) {
      console.log(`performed ${solves} solve steps`);
    }
  }

  function injectSolveButton() {
    const existingButton = document.getElementById("BtnSolve");
    if (existingButton) {
      existingButton.remove();
    }

    const resetButton = document.getElementById("BtnReset");
    if (!resetButton) {
      console.error("unable to insert button");
      return;
    }

    resetButton.insertAdjacentHTML(
      "afterend",
      '<input type="button" value="Solve" id="BtnSolve">'
    );

    const solveButton = resetButton.nextElementSibling as HTMLInputElement;
    if (!solveButton) {
      console.error("unable to insert button");
      return;
    }

    solveButton.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      solve();
    };
  }

  function injectAutoSolve() {
    document.addEventListener("click", () => setTimeout(solve, 0));
    document.addEventListener("contextmenu", () => setTimeout(solve, 0));
  }

  (window as any).injectAutoSolve = injectAutoSolve;
  (window as any).injectSolveButton = injectSolveButton;
})();
