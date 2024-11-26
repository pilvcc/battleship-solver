# Battleship Solitaire Solver

I'm a big fan of [Battleship Solitaire](https://lukerissacher.com/battleships).

![](screenshot.png)

The game is simple. You have to figure out where the battleships are. The
numbers on the sides tell you how many squares in each column/row are part of a
ship. Ships can't touch, not even diagonally.

The game reveals a few squares to get you going. Every puzzle has a unique
solution that can be arrived at logically from from the starting position.

## The Solver

This is more an assistant than a solver. It's possible (and not that hard) to
write a full solver, but the goal of this tool instead is to change the
character of the game.

The game has easy and hard puzzles. Easy puzzles can essentially be autosolved
by repeatedly applying a few rules:

- If a row has N boat squares, and all but N squares are water, the rest must be
  boats
- If a row has used up its boat squares, the rest must be water
- If you have a boat square, its corners must be water
- If you have a completed boat, its perimeter must be water

For hard puzzles, applying the rules isn't enough. You still end up getting
stuck. Then you have to play the "macro" game of enumerating the possible boat
configurations, exploring each possible path, and backtracking if it deadends.
The "micro" game within each path exploration is repeatedly applying the simple
rules and seeing if it leads to an invalid result.

Right now you spend an inordinate amount of time on the tedious but not
particularly difficult or interesting micro game. This tool automates the micro
so you can focus solely on the macro.

In a way I was inspired by Braid, a platformer that lets you rewind time instead
of dying, so that the game becomes more about the higher-level puzzle rather
than trying not to fall or get killed.

## Usage

Install Bun, then run:

```bash
bun run build
```

(It has to be Bun, not another package manager; the script itself uses Bun.)

This outputs the compiled code into solve.js. Paste that into your console.
There are two functions you can run:

- `installSolveButtion()` installs a Solve button in the toolbar that solves as
  far as it can on the current board.

- `installAutoSolve()` installs auto-solve, which solves on every click.
