# Phase 0 spike: findings

**Status, 2026-11-19: one real run recorded (Firefox 160, section 6). The spike is not finished.**
Three things are still open: what a diagonal looks like on this controller, whether WebHID works
with it, and a handful of facts only the owner knows. Section 8 lists them.

The spike lives in `spike/`. It is throwaway: one unstyled page, no tests, nothing meant to
survive into the real app. It applies no game rules and does no SOCD cleaning.

## 1. The three questions

1. What does the owner's controller send?
2. How finely can a page time inputs?
3. Is anything better than reading the pad once per display frame available in this browser?

## 2. How to run it

```
cd spike
npm ci
npm run dev
```

Open the address it prints (normally http://localhost:5173)
in the browser under test. Chrome or Edge is the one that can answer question 3, because WebHID
only exists there.

## 3. What to do

Before you start: plug the controller in, in the mode you use for Street Fighter 6 on PC. Close
Steam if you can, since Steam can change what other programs see from a controller. If you leave
it running, say so in your report. Keep the browser tab visible and focused the whole time.

1. **See the pad.** Click the page, press any button. Section 1 should list the controller. Press
   each button and direction and watch the "pressed now" and "axes" lines react.
2. **Mapping.** Hands off the controller. Click **Start mapping** and follow the prompt: four
   directions, six attack buttons, then every other button one at a time, then **Done with extra
   buttons**. The last three steps ask you to hold two directions at once for three seconds each.
   After each of those, let go and wait for the next prompt. Use **Skip this step** for anything
   you do not have. When it says finished, press a few things and check the "named inputs held"
   line shows the right names.
3. **Idle timing.** Click **Reset timing stats**, then leave the mouse and controller alone for 30
   seconds.
4. **WebHID** (Chrome or Edge only). Click **Choose a HID device...**. If the controller is in the
   browser's list, pick it and connect. Press and release one button. If it is not listed, cancel
   and note that.
5. **Tap test.** Tick **Fast poll** and leave it ticked. Click **Start tap test** and keep your
   hands off until the line under the buttons says GO. Then tap ONE button 20 times, each tap as
   short as you can make it. Count them. Click **Stop**. Untick **Fast poll**.
6. **Report.** Click **Copy report** and paste it into the chat. If copying is blocked, click
   **Build report** and copy the text from the box.

Optional, each worth a separate report:

7. **Keyboard mode.** If the controller has a keyboard mode, switch to it, reload the page, and
   repeat steps 2, 5 and 6. The mapping will record keys instead of pad buttons.
8. **A 60 Hz display.** Set the display to 60 Hz in Windows and repeat steps 3, 5 and 6. This shows
   what most players' screens would give.
9. **The experimental event API.** In Chrome, open `chrome://flags/#gamepad-raw-input-change-event`.
   If that flag exists, enable it, relaunch, and repeat steps 5 and 6.

## 4. What to report back

- The pasted report from each run, labelled (for example "Chrome, pad mode").
- The controller: make and model, firmware and version if you know it, which input mode it was in,
  and its SOCD setting.
- Your display's refresh rate as set in Windows.
- Whether Steam was running.
- How many taps you actually made in the tap test.
- Anything that went wrong: the pad never appeared, a button did not register, the mapping got
  stuck, the HID chooser did not list the controller, the page stuttered.

## 5. Measured without a controller

### 5.1 On a real browser

Google Chrome 157.0.8103.80 on Windows 11, headless, fresh profile, default flags:

| Check | Result |
| --- | --- |
| Reading the pad by polling (`navigator.getGamepads`) | available |
| Event-driven gamepad API | nothing exposed: none of the 8 event names probed, none of the 4 event interfaces |
| WebHID (`navigator.hid`) | available |
| Smallest step of the page clock (`performance.now`) | 0.1 ms |
| Cross-origin isolated | no |

Headless is not the owner's everyday browser. A real Chrome or Edge run replaces this table.

### 5.2 Checked with simulated devices (the page's logic only, not hardware)

These runs show the page works. They say nothing about any real controller.

- Mapping, against a simulated pad that reports all directions as one "hat" axis: every step
  recorded correctly, including the two-directions-at-once steps.
- Tap test, 20 simulated taps of 30 ms: counted 20 by frame reads, by fast poll and by keyboard
  events. A tap pressed and released between two reads was missed by both polling rows, as
  expected.
- WebHID, against a simulated device sending 250 reports a second with a free-running counter
  byte: the page learned to ignore the counter and counted every tap.

### 5.3 Not checked

- Microsoft Edge 157.0.4341.60 is installed here but was not measured. The headless run returned
  nothing.
- The code that listens for event-driven gamepad events has never received a real event, because
  no browser here exposes one.
- WebHID against a real controller.

## 6. Results from the owner's controller

### 6.1 Run 1: Firefox 160.0 on Windows, 2026-11-19

From the owner's pasted report. The controller's model, mode and SOCD setting, the display's
refresh rate and whether Steam was running have not been reported yet.

**The browser**

| Check | Result |
| --- | --- |
| Reading the pad by polling | available |
| Event-driven gamepad API | nothing exposed. Firefox's non-standard events are off in this install |
| WebHID | not available |
| Smallest step of the page clock | 1 ms |

**What the controller sends**

- It identifies as `2c22-2802-Qanba Sapphire`, with no standard layout, 15 buttons and 10 axes.
- It first appeared as `xinput`, vanished 1.9 seconds later, and came back 1.5 seconds after that
  under the name above. Whether the owner changed mode or the controller did this by itself is not
  known.
- **Directions arrive as one axis (axis 9), not as buttons.** Rest is 1.286. Up is -1.000, right
  is -0.429, down is 0.143, left is 0.714. Those are positions 0, 2, 4 and 6 on an eight-step
  scale with rest sitting outside it, which is how an eight-way hat switch is normally reported.
  By that scale the diagonals would be -0.714 (up-right), -0.143 (down-right), 0.429 (down-left)
  and 1.000 (up-left). **No diagonal value was seen in this run.** See below.
- Attack buttons: LP is button 0, MP 3, HP 5, LK 1, MK 2, HK 7.
- **Two buttons each move two signals.** HK moves button 7 and also swings axis 4 from -1 to 1.
  The fourth extra button moves button 6 and axis 3 the same way.
- Other buttons seen: 9, 8, 4, 6, 10, 11, 13. Buttons 12 and 14 were never pressed.

**Two directions at once**

| Step | What was recorded | Reading |
| --- | --- | --- |
| Down + right together | Right alone for 18 ms, then the resting value for the remaining 3 seconds | **Unexplained.** An eight-way hat should show -0.143. Either a different pair was held (left + right would give exactly this), or this controller in this mode reports rest for that diagonal. Needs a recheck |
| Left, then right added | Left, then the resting value once right was added | Left + right gives neutral |
| Down, then up added | Down, then the resting value, then down again. Up never appeared | Fits down + up giving neutral. Not proven: letting go of down and pressing it again would look the same |

The first entries recorded for the second and third steps were leftovers from letting go after
the step before, and are left out above. That was a flaw in the page, fixed since (section 10).

**Timing**

- **The page read the pad about 500 times a second.** Over 14,625 frames the gap between frames
  was 2 ms at the median, 2 ms at the 1st and 99th percentiles, 10 ms at worst. 21 frames (0.14%)
  ran long.
- That points to a 500 Hz display. The owner has not confirmed it. An automated check earlier the
  same day, in a different browser engine on the same machine, also ran 500 frames a second.
- Because Firefox's clock steps in whole milliseconds, single gaps read as 1, 2 or 3 ms.
- `Gamepad.timestamp` is filled in. A change was 0 to 3 ms old (1.1 ms on average) when a frame
  read first saw it. With a read every 2 ms that is what a true arrival time would give, so in
  Firefox the timestamp looks like when the browser received the change, not when the page read it.
- Fast poll was off during the tap test, so it was not measured.

**Tap test** (4.5 seconds, 21 taps counted)

- Both rows count 21. They are the same reads timed two different ways, so they cannot disagree
  on the count, and nothing else was active. **This run cannot say whether any tap was missed.**
  The owner has not said how many taps were made.
- The first tap began before the page's hands-off window ended, so the two rows measured it
  differently (16 ms and 63 ms). That was a flaw in the page, fixed since. It is left out below.
- The other 20 holds ran from 27 ms to 80 ms, median 65 ms. In game frames (16.7 ms each) that is
  1.6 to 4.8 frames, median 3.9.
- The two rows agree to within 2 ms on every one of those 20 holds.
- The shortest gaps between taps were 8, 13, 17 and 18 ms. An 8 ms gap is half a game frame. A page
  reading 60 times a second would catch a gap that short only about half the time.

**Incidental**

- Six key events from the owner's typing keyboard were logged. The page handled them 4 to 20 ms
  after the events' own timestamps. Too few to conclude anything, but if a keyboard path is ever
  built it should time inputs by the event's timestamp, not by when the handler ran.

**Not covered by this run**

WebHID and the event-driven API (Firefox has neither), fast poll, keyboard mode, Chrome or Edge,
and a 60 Hz display.

## 7. What it means for the design

### 7.1 Clear now

- **A display frame is not a game frame.** On this machine the page reads the pad about 500 times
  a second: roughly 8 reads per game frame. On a 60 Hz screen it would be roughly 1. The app
  cannot treat "one read" as "one frame". It has to record when each change was seen and then
  group those into 60ths of a second. Section 7.3 was a proposal before this run. It is now a
  requirement.
- **On this setup the read rate is not what limits precision.** What is left is the 1 ms clock in
  Firefox, the controller's own report rate (which Firefox cannot show), and the fact that the
  page's 60ths of a second are not lined up with the game's.
- **A controller binding cannot be "one signal per direction".** In this mode and browser all four
  directions share one axis. The binding has to map values of that axis to sets of directions.
- **A binding step must cope with one button moving two signals.** HK moved a button and an axis
  together. The step should keep the button and drop the axis that shadows it.
- **Bindings belong to a pad identity, and a pad can change identity.** The same controller showed
  up as `xinput` and then as `2c22-2802-Qanba Sapphire` within four seconds. The app must handle
  a pad vanishing and returning as something else, and must not reuse a binding across the two.
- **In Firefox, frame reads are the only path.** No WebHID, no event-driven API. Anything better
  can only be an optional extra for Chromium browsers.
- **Polling is the baseline everywhere.** Chrome 157 exposes no event-driven gamepad API by
  default either. Section 9 has what the published sources say.
- **The interface must say timing is approximate**, as the constraints already require.

### 7.2 Still depends on numbers we do not have

- **What a diagonal looks like.** The binding format depends on it. Until the recheck, the design
  can only assume the standard hat values.
- **How the same controller looks in Chrome or Edge.** Another browser may number the buttons
  differently or present the directions another way, in which case bindings are per browser too.
  Not measured.
- **WebHID.** If the controller is listed, opens, and reports several hundred times a second, it is
  worth designing an optional source around. The cost is that raw reports differ per controller
  and per mode. The spike finds button bytes by comparing against the resting report, which
  suggests the app could learn them from the same press-each-input step rather than carrying a
  table per controller.
- **What a 60 Hz display gives.** Whether frame reads miss short taps, whether `Gamepad.timestamp`
  recovers the lost precision, and whether fast poll is worth a busy CPU core, can only be seen on
  a screen that reads once per game frame. This machine reads eight times per game frame, so it
  hides all three.
- **Keyboard mode.** Key events carry their own timestamps and work in every browser. Whether to
  support or recommend that mode is a product decision for Phase 1, because it means playing in a
  different mode from the one used in the game.

### 7.3 The shape this points at (to settle in Phase 1)

One or more input sources that each produce a list of timestamped changes with a stated
uncertainty, and a separate step that turns that list into 60 per second frames for a profile to
read. Frame reads are the source every browser has. The others plug in where they exist.

## 8. Still needed from the owner

To close the spike's three questions:

1. **The diagonal.** Reload the page. In section 1, hold down + right and read the value of axis 9.
   Then try the other three diagonals. Or run the mapping again, which is fixed now.
2. **One run in Chrome or Edge**, steps 1 to 6, with the HID step and with Fast poll ticked for the
   tap test. This is the only way to answer question 3 for this controller.
3. **The facts in section 4**: controller model, mode and SOCD setting; display refresh rate;
   whether Steam was running; how many taps were made; and whether the owner changed mode in the
   first 20 seconds of run 1 or the controller re-identified itself. Mostly answered, see below.

Optional: a run with the display set to 60 Hz.

Steps for items 1 and 2, and what run 1's own data says about the diagonal: [phase0-chromium-run.md](phase0-chromium-run.md).

**The owner's answers, 2026-11-22** (item 3):

- **Controller:** Qanba Sapphire. It was in PS5 mode during run 1.
- **The identity change:** in the first 20 seconds of run 1 the owner was switching between PS5
  and PC modes. That is why the pad showed up as `xinput`, vanished, and came back as
  `2c22-2802-Qanba Sapphire`. The controller did not re-identify by itself.
- **SOCD:** CAPCOM CPT legal, done in the controller's firmware. Left + right gives neutral, up +
  down gives neutral.
- **Display:** 500 Hz. So the roughly 500 reads a second in run 1 were one read per display
  frame, and the 60 Hz case is still unmeasured on this machine.
- **Steam:** "was running, I think". Not certain.
- **Taps made in the tap test:** unknown. The owner cannot confirm the count, so run 1 still
  cannot say whether a tap was missed.

Still not reported: the controller's firmware version.

## 9. From published sources (not measured here)

- An event-driven gamepad API is being trialled in Chromium. A Chromium "Intent to Experiment"
  dated 2026-04-28 names the event `rawgamepadinputchange`, the flag
  `#gamepad-raw-input-change-event`, and a developer trial from Chrome 147.
  https://groups.google.com/a/chromium.org/g/blink-dev/c/pZZLH85rNP8
- The Microsoft Edge explainer for the same proposal describes an event on `window` carrying a
  snapshot of the pad and lists of what changed, sent for every change with no batching. Its
  sample code uses a different event name, `gamepadrawinputchanged`. **The sources disagree on the
  name**, so the spike listens for every spelling.
  https://microsoftedge.github.io/MSEdgeExplainers/GamepadEventDrivenInputAPI/explainer.html
- Microsoft's origin trial page for "Gamepad Raw Input Event" lists an expiry of 2026-10-20, which
  has passed. Whether it was extended or shipped was not confirmed.
  https://developer.microsoft.com/microsoft-edge/origin-trials/trials/4ecdb530-835b-447d-b27e-0b3be8e0412b
- Firefox has non-standard `gamepadbuttondown`, `gamepadbuttonup` and `gamepadaxismove` events
  behind the preference `dom.gamepad.non_standard_events.enabled`. Run 1 found them off in
  Firefox 160. https://bugzilla.mozilla.org/show_bug.cgi?id=857092

## 10. Limits of this spike, and flaws found in it

- One controller, one machine. Other controllers and other operating systems may behave
  differently.
- The tap test measures how long the page saw an input held. It cannot measure the delay between
  the finger and the page, because nothing here knows when the finger moved.
- Hold times from different rows use different ideas of "when": the time of the read, the
  browser's pad timestamp, or the event timestamp. Compare step sizes and counts, not absolute
  values.
- The WebHID tap row treats "any byte that differs from the resting report" as "held". Bytes that
  change by themselves during the hands-off window are ignored. A controller whose reports drift
  in other ways will give a wrong count, and pressing a button during the hands-off window would
  make the page ignore that button.

Two flaws showed up in run 1 and were fixed afterwards. Both fixes were rechecked with a simulated
pad, not with the real controller.

- **Mapping moved on too early.** When two held directions cancelled to the resting value, the
  page took that for "let go" and started the next step, which then recorded the tail of the
  release. After a two-direction step the page now waits for a full second of rest.
- **The tap test could cut the first tap short.** A press begun during the hands-off window was
  measured from the end of that window by one row and from its true start by the other. The page
  now shows WAIT until the pad is at rest and only then says GO.
