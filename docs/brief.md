# The owner's original brief for Buffered, 2026-11-19

You are starting a new project called Buffered: a browser-based input lab
for fighting game players on leverless controllers. It records what the
player's hands did and shows what a game's input system would make of it.


## The idea
controller -> capture -> a frame-by-frame input timeline
           -> a game's input rules (a "profile") -> "this is what would come out"
First goal: a player does a motion and sees, frame by frame, why it did
or did not count, under Street Fighter 6's rules as best known.

## Fixed constraints
- Static site, no backend, no accounts, free to host. TypeScript.
- SOCD cleaning happens in controller firmware. Do not implement it.
- This is not the game. Every rule in a profile is stored with its source,
  the game version it was observed on, and a confidence level. Nothing is
  hardcoded as truth.
- Do not extract, unpack or read any game's files. Rules come from
  published sources and from the owner's own tests in training mode.
- The standard Gamepad API is polled once per display frame; inputs
  between polls can be missed. Treat timing as approximate and say so in
  the interface.

## Seed data for the SF6 profile (all unverified, sources attached)
- Most moves can be buffered up to 4 frames early.
  https://wiki.supercombo.gg/w/Street_Fighter_6/Game_Data
- Dash: first direction held at most 8 frames, at most 8 neutral frames
  before the second. https://wiki.supercombo.gg/w/Street_Fighter_6/Movement
- Motions: one report says each direction within 6 frames of the last;
  another gives quarter-circles an 11-frame window. These disagree. Record
  both and mark the conflict.
  https://www.eventhubs.com/news/2023/jul/14/input-requirements-command-grabs-sf6/
  https://www.electriccitymagazine.ca/heres-a-breakdown-of-why-players-are-having-trouble-with-street-fighter-6-input/
- Command grabs: four directions inside a 21-frame window (same EventHubs
  article).

## Phase 0: a throwaway spike. Do only this, then stop.
One unstyled page, run from a local dev server, that answers:
1. What does the owner's controller send? List connected pads; show every
   button and direction live; include a "press each direction and button"
   step that records the mapping.
2. How precisely can a page time inputs? Measure the real polling rate and
   show the gap between consecutive samples.
3. Is anything better available in this browser? Feature-detect an
   event-driven gamepad API and WebHID, and compare against keyboard
   events if the controller has a keyboard mode. Detect only; request no
   device without a click from the owner.
Write docs/spike-findings.md: what was measured, on which browser, and
what it means for the design. The owner has to press the buttons, so tell
them exactly what to do and what to report back. No tests, no styling,
no plan. Then stop and wait.

## Phase 1: only after the owner has read the findings
Ask the owner your open questions one at a time. Then write a design doc
(docs/superpowers/specs/) and wait for approval. Then an implementation
plan (docs/superpowers/plans/) with tests first. Build nothing in this
phase.

## Stop and ask when
The spike is done; anything needs a product decision; a source for a rule
cannot be found; you are tempted to add a feature not described here.
