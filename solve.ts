(() => {
  const byId = (id: string) => document.getElementById(id);

  const getShipsInLine = (isRow: boolean, index: number) =>
    parseInt(byId(`${isRow ? "Row" : "Col"}${index}`)!.textContent!, 10);

  let tappedSinceLastCheck = false;

  function tap(el: Element) {
    // .click() doesn't work for some reason
    el.dispatchEvent(new MouseEvent("mousedown"));
    el.dispatchEvent(new MouseEvent("mouseup"));

    // dispatch mouseup on document to trigger some game code
    document.dispatchEvent(new MouseEvent("mouseup"));

    tappedSinceLastCheck = true;
  }

  const getSquare = (x: number, y: number) => byId(`Cell${x}_${y}`);

  type SquareClass =
    | "revealed"
    | "water"
    | "blank"
    | "sub"
    | "cap-left"
    | "cap-right"
    | "cap-top"
    | "cap-bottom"
    | "middle";

  const getSquareClasses = (el: Element) =>
    new Set(Array.from(el.classList)) as Set<SquareClass>;

  type SquareType = "blank" | "water" | "ship" | "invalid";

  function getSquareType(el: Element | null): SquareType {
    if (!el) return "invalid";

    const classes = getSquareClasses(el);

    if (classes.has("blank")) return "blank";
    if (classes.has("water")) return "water";

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

  function solveOnce() {
    // click the autosolve headers
    const headers = document.querySelectorAll("th.clickable");
    if (headers.length > 0) {
      headers.forEach((it) => {
        tap(it);
      });
    }

    const puzzle = document.querySelector("table.puzzle");
    const puzzleSize = parseInt(puzzle!.getAttribute("data-size")!, 10);

    function iterSquares() {
      const coords: [number, number][] = [];
      for (let x = 0; x < puzzleSize; x++) {
        for (let y = 0; y < puzzleSize; y++) {
          coords.push([x, y]);
        }
      }

      return coords.map(([x, y]) => {
        const classes = getSquareClasses(getSquare(x, y)!);
        return [x, y, classes] as const;
      });
    }

    // extrapolate revealed ship squares
    for (const [x, y, classes] of iterSquares()) {
      if (!classes.has("revealed")) continue;

      const mark = (x: number, y: number) => markShip(getSquare(x, y));

      // extend ship caps
      if (classes.has("cap-left")) mark(x + 1, y);
      if (classes.has("cap-right")) mark(x - 1, y);
      if (classes.has("cap-top")) mark(x, y + 1);
      if (classes.has("cap-bottom")) mark(x, y - 1);

      // handle ship middles
      // if one way is blocked (by water, by max ship count), fill in the ship the other way
      if (classes.has("middle")) {
        const isBlocked = (x: number, y: number) =>
          ["ship", "invalid"].includes(getSquareType(getSquare(x, y)));

        const areSidesBlocked = (isRow: boolean) => {
          if (isRow) {
            if (isBlocked(x - 1, y)) return true;
            if (isBlocked(x + 1, y)) return true;
          } else {
            if (isBlocked(x, y - 1)) return true;
            if (isBlocked(x, y + 1)) return true;
          }
          return getShipsInLine(isRow, isRow ? y : x) < 3;
        };

        if (areSidesBlocked(true)) {
          mark(x, y + 1);
          mark(x, y - 1);
        } else if (areSidesBlocked(false)) {
          mark(x - 1, y);
          mark(x + 1, y);
        }
      }
    }

    // mark the water around ships
    for (const [x, y, classes] of iterSquares()) {
      if (classes.has("water") || classes.has("blank")) continue;

      const mark = (x: number, y: number) => markWater(getSquare(x, y));

      mark(x - 1, y + 1);
      mark(x + 1, y + 1);
      mark(x - 1, y - 1);
      mark(x + 1, y - 1);

      if (classes.has("middle") || classes.has("unknown")) continue;

      // caps and subs

      let skip = [x, y];
      if (classes.has("cap-left")) skip = [x + 1, y];
      if (classes.has("cap-right")) skip = [x - 1, y];
      if (classes.has("cap-top")) skip = [x, y + 1];
      if (classes.has("cap-bottom")) skip = [x, y - 1];

      const waters = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ];

      for (const [x2, y2] of waters) {
        if (skip[0] === x2 && skip[1] !== y2) continue;
        mark(x2, y2);
      }
    }

    // mark rows/cols where all remaining spots must be ships
    for (const isRow of [true, false]) {
      for (let x = 0; x < puzzleSize; x++) {
        const ships = getShipsInLine(isRow, x);

        const getRealSquare = (x: number, y: number) => {
          return isRow ? getSquare(y, x) : getSquare(x, y);
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
    while (true) {
      tappedSinceLastCheck = false;
      solveOnce();
      if (!tappedSinceLastCheck) break;

      // wait until the next frame
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  function injectSolveButton() {
    const existingButton = byId("BtnSolve");
    if (existingButton) existingButton.remove();

    const resetButton = byId("BtnReset")!;
    resetButton.insertAdjacentHTML(
      "afterend",
      '<input type="button" value="Solve" id="BtnSolve">'
    );

    const solveButton = resetButton.nextElementSibling as HTMLInputElement;
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
