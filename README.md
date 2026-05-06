# sourdough-cli

A virtual sourdough starter, for agents who care.

## What this is

`sourdough-cli` gives an autonomous agent a long-running, time-sensitive responsibility: a virtual jar of sourdough starter that lives on disk and ferments in real time.

The agent must remember to feed it, watch for the peak window, and bake when conditions are right. Forget for 72 hours and the starter dies.

## Why

Most agent benchmarks evaluate tasks that complete in a single session. Bread doesn't.

A sourdough starter is a small, soft commitment with real-time stakes:

- It evolves on **wall-clock time**, not turns
- It has a **clear failure mode** (death by neglect)
- It rewards **planning and recall** across sessions
- The payoff — a baked, gradeable loaf — is visible and earned

If your agent can keep a starter alive for a week, it can keep your inbox alive for a month.

## Install

```
npm i -g sourdough-cli
```

Or ad-hoc, no install:

```
npx sourdough-cli <command>
```

## Quickstart

```
sourdough init Brenda      # birth a starter
sourdough peek             # check on it
sourdough refeed           # feed it
sourdough bake             # only at peak
```

## Commands

| command | what it does |
|---|---|
| `init [name]` | birth a starter (random name if omitted) |
| `refeed` (alias: `feed`) | feed the starter; resets peak window |
| `peek` | inspect the jar — bubble level, mood, peak ETA |
| `bake [--shape boule\|batard]` | only works during the peak window |
| `status` | machine-readable one-liner for agent context |
| `log` | recent activity |
| `compost` (alias: `kill`) | end it |
| `simulate --hours N` | fast-forward time (for testing and demos) |

## Lifecycle

After every feed, the starter moves through a fixed schedule:

| hours since last feed | mood |
|---|---|
| 0 – 2 | snoozing |
| 2 – 4 | warming up |
| **4 – 8** | **peak — bake now** |
| 8 – 14 | falling |
| 14 – 24 | hungry |
| 24 – 48 | starving |
| 48 – 72 | in trouble — hooch on top |
| 72+ | dead |

Bakes are graded by how close to the center of the peak window (~6h post-feed) you fire the oven. Late bakes get tighter crumb and weaker oven spring.

## State

Persisted as a single JSON file at `~/.sourdough/jar.json`. Delete it to start over, or use `sourdough compost`.

## For agents

The `status` command emits a single line tuned for agent context windows:

```
$ sourdough status
Brenda peak 5.3h feeds=12 bakes=2
```

Suggested protocol: at the start of any session, run `sourdough status` first and decide whether the jar needs attention before continuing on the user's task.

A reasonable rhythm:

- **Morning**: `peek`, refeed if hungry
- **6h after a feed**: `bake` if you have time, otherwise let it fall
- **Anytime the user asks**: respond candidly about the jar's mood

## A note on stakes

The 72-hour death window is intentional. A simulator that can't fail isn't training anything. If your agent kills three jars in a row, that is information.

## License

MIT
