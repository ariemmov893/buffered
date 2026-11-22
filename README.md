# Buffered

A browser-based input lab for fighting game players on leverless controllers. It records what the
player's hands did and shows what a game's input system would make of it.

The first goal: a player does a motion and sees, frame by frame, why it did or did not count,
under Street Fighter 6's rules as best known.

The owner's original brief is in [docs/brief.md](docs/brief.md). It defines the fixed constraints
and the phases.

## Status: Phase 0 spike

The project is in Phase 0, a throwaway spike that answers three questions:

1. What does the owner's controller send?
2. How finely can a page time inputs?
3. Is anything better than reading the pad once per display frame available in this browser?

The spike is not finished. One real run is recorded (Firefox 160, 2026-11-19).
[docs/spike-findings.md](docs/spike-findings.md) has the results, what they mean for the design,
and what is still needed from the owner (section 8).

The spike lives in `spike/`. It is one unstyled page with no tests, and nothing in it is meant to
survive into the real app. There is no app yet.

## Run the spike

You need Node.js 22.12 or later. `.nvmrc` pins Node 24.

```
cd spike
npm ci
npm run dev
```

Open the address it prints (normally http://localhost:5173) in the browser under test. The
findings doc says what to do on the page (section 3) and what to report back (section 4).

To check the types, run `npm run typecheck` in `spike/`.

## License

License: [MIT](LICENSE)
