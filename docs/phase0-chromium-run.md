# Phase 0: the Chrome or Edge run

One run on the owner's controller in Chrome or Edge closes the two questions the Firefox run of
2026-11-19 left open (`spike-findings.md`, section 8):

- **Is anything better than polling available?** Firefox has neither WebHID nor a gamepad event
  API, so only a Chromium browser can answer this for the controller.
- **What does a diagonal look like?** Run 1 recorded the resting value where down + right was
  expected. Section 6 says what the data shows happened. This run checks it on the hardware.

The run takes about ten minutes. Sections 1 to 4 are for the owner. Sections 5 to 8 are the
reasoning behind them.

## 1. Before you start

- **Put the controller in PS5 mode**, the mode run 1 was recorded in, before you open the page.
  Do not touch the mode switch again until you have pasted the report. To the browser, a
  controller that changes mode is a different controller.
- **Close Steam** completely (Exit from its tray icon). If you would rather leave it running, say
  so in your reply.
- Plug the controller in by USB.
- Use Google Chrome. Edge works the same way if you prefer it.
- Keep the tab visible and focused the whole time.

## 2. Steps

1. **Start the page.** In a terminal, from the repository folder:

   ```
   cd spike
   npm ci
   npm run dev
   ```

   Open http://localhost:5173 in Chrome.
2. **Wake the controller.** Click the page, then press any button on the controller. Section 1 of
   the page should list it. Wait ten seconds and check the name in the list does not change.
3. **Mapping, one input at a time.** Take your hands off the controller and click **Start
   mapping**. Follow the prompt: four directions, six attack buttons, then every other button one
   at a time, then click **Done with extra buttons**.
4. **Mapping, two directions.** Three prompts follow, each of the form "Hold X. Keep holding it
   and also press Y". The first is DOWN, then RIGHT. For each one:
   - press the first direction alone and wait about a second,
   - add the second direction and keep both down until the prompt says "Recorded",
   - let go of the second direction first, then the first, and wait for the next prompt.
5. **Idle timing.** Click **Reset timing stats**. Leave the mouse and the controller alone for 30
   seconds.
6. **WebHID.** Under "3. Other input paths", click **Choose a HID device...**. Chrome shows a list
   of devices. Pick the controller and click **Connect**. Press and release one button. The text
   under the button should now show "input reports received" with a number above zero. If the
   controller is not in Chrome's list, click **Cancel** and carry on.
7. **Fast poll.** Under "2. Timing", tick **Fast poll**. Leave it ticked.
8. **Tap test.** Click **Start tap test** and keep your hands off until the line under the buttons
   says GO. Then tap ONE attack button **exactly 10 times**, counting out loud, each tap as short
   as you can make it. Click **Stop**.
9. **The diagonal once more, into the report.** Hold DOWN, add RIGHT, and keep both held with one
   hand. With the other hand click **Copy report**. Then let go. If the page says copying was
   blocked, hold the two directions again, click **Build report**, let go, and copy the text from
   the box.
10. **Finish.** Untick **Fast poll** and paste the report into the chat.

## 3. What to send back

1. The pasted report, labelled with the browser ("Chrome" or "Edge").
2. Whether you made exactly 10 taps in step 8. If you lost count, say so.
3. Whether the mode switch stayed in PS5 mode from start to finish, and the controller's firmware
   version if you know it.
4. Whether Steam was running. A plain yes or no this time.
5. Anything that went wrong: the controller never appeared or changed name, it was not in
   Chrome's device list, the mapping got stuck or asked you to start again, the page stuttered.
6. One thing about the Firefox run on 2026-11-19, if you remember: in the "down + right" step,
   could you have been holding LEFT and RIGHT?

## 4. Optional extra runs

Each is worth its own report. Do the main run first.

**A 60 Hz display.** The owner's display runs at 500 Hz, so the main run cannot show what a
player on an ordinary screen gets.

1. Leave the page open after step 10. In Windows, open Settings, System, Display, Advanced
   display, and choose 60 Hz as the refresh rate.
2. Back on the page, repeat steps 5, 7 and 8: idle timing, Fast poll, tap test with exactly 10
   taps. The timing box should now say about 60 samples per second. If it still says about 500,
   reload the page and also repeat step 6.
3. Click **Copy report**, untick **Fast poll**, and paste the report labelled "Chrome, 60 Hz".
4. Set the display back to 500 Hz.

**Chrome's experimental gamepad events.**

1. Close nothing. Press Win+R, paste this line and press Enter:

   ```
   chrome --user-data-dir="%TEMP%\buffered-flag" --enable-blink-features=GamepadRawInputChangeEvent http://localhost:5173
   ```

   A separate, empty Chrome window opens. Your normal Chrome profile is not changed.
2. Under "Feature detection" the page should say "Event-driven gamepad API: something is exposed".
   If it says nothing is exposed, stop here and say so.
3. In that window, do steps 2, 7, 8 and 10: wake the controller, tick Fast poll, run the tap test,
   copy the report. Label it "Chrome, raw events on".
4. Close that window.

## 5. What is known, and what these steps still assume

**Answered by the owner on 2026-11-22**, so no longer assumed:

- The controller is a Qanba Sapphire and was in PS5 mode during run 1.
- The pad showing up as `xinput`, vanishing and coming back as `2c22-2802-Qanba Sapphire` in the
  first 20 seconds of run 1 was the owner switching between PS5 and PC modes.
- SOCD cleaning is done in the controller's firmware, CAPCOM CPT legal: left + right gives
  neutral, up + down gives neutral.
- The display runs at 500 Hz. Run 1's roughly 500 reads a second were one read per display frame.

**Still assumed.** Each one is either recorded by the run or asked for in section 3, so a wrong
assumption shows up instead of spoiling the result.

1. **The mode stays PS5 for the whole run.** PS5 mode is the choice because run 1 used it, so the
   two runs can be compared, and because in that mode the controller is an ordinary HID device,
   which is what WebHID reads. If the mode changes after **Start mapping**, the page now stops
   recording and asks for the mapping to be started again.
2. **Chrome sees the PS5-mode controller the way Firefox did:** no standard layout, the
   directions on one hat axis. Chrome's source says it should (section 6). Not measured.
3. **Chrome lists the controller in its HID chooser and can open it.** Game controllers are not
   on WebHID's blocked list (section 7). Not measured.
4. **Steam is closed.** The owner thinks it was running during run 1 but is not sure. Section 6
   says why it is unlikely to have changed what run 1 recorded.
5. **Exactly 10 taps.** The page cannot know how many taps were made. Run 1 counted 21 and the
   owner cannot confirm the real number, so whether a tap was missed is still unknown.
6. **One free hand.** Step 9 needs two directions held with one hand while the other clicks.
7. **Firmware version.** Not reported. Nothing here depends on it yet.

Not covered by the main run: what a 60 Hz display gives. That is the first optional run.

## 6. The diagonal in run 1

### 6.1 The page did not decode the resting value as a direction

It has no decoder. Line numbers below are `spike/src/main.ts` at commit `81f75e8`, the version
the fixes after run 1 ended at.

- `sigOf` (lines 242 to 260) compares every axis with the value it had when **Start mapping** was
  clicked (`wiz.base`, line 407) and lists it only when it differs by more than `AXIS_EPS`, which
  is 0.1 (lines 234 and 254).
- A state prints as "(nothing: same as rest)" (line 276) only when no button and no axis differs.
- The two-direction steps start recording at the first read that differs from rest (lines 462 to
  468) and log every distinct state after it (lines 483 to 487).
- The one place that matches axis values to names is `namedHeld` (lines 536 to 553). It skips
  empty states and matches a recorded value within 0.1, so the resting value cannot match a
  direction there either.

A real down + right on this hat would read -0.143, which is 1.43 away from the resting 1.286. The
page would have listed it. So "same as rest" is what the browser delivered: axis 9 was within 0.1
of 1.286 while two buttons were held. Firefox passes hat values through unchanged (`ScaleAxis`,
and axes indexed by HID usage, in
[WindowsGamepad.cpp](https://github.com/mozilla-firefox/firefox/blob/101379eafc8a7f7e807b4c50d2ee5f0679675a95/dom/gamepad/windows/WindowsGamepad.cpp#L224)),
so it did not hide a diagonal either.

### 6.2 The same report shows which buttons were held

When run 1 was made, the page moved to the next step the instant a two-direction step ended (the
flaw fixed afterwards), so the first thing each following step recorded was the owner letting go:

| Step | Recorded | Reading |
| --- | --- | --- |
| down + right | right at 0 ms, rest from 18 ms to the end | right pressed, a second button added 18 ms later, and the pair reads as rest |
| left, then right added | **left at 0 ms, rest at 6 ms**, left at 925 ms, rest at 1868 ms | the first two entries are the previous step being let go: **left alone for 6 ms** |
| down, then up added | **left at 0 ms, rest at 39 ms**, down at 773 ms, rest at 1625 ms, down at 2671 ms | the first two entries are left + right being let go: left alone for 39 ms |

Letting go of down + right can show down alone or right alone. It cannot show left. Left alone is
what letting go of left + right shows when right goes first, and the step after it, where left +
right really was held, ends the same way. **So the step labelled down + right most likely recorded
left + right, which the controller's SOCD cleaning turns into neutral.** The owner has since
confirmed that setting: left + right gives neutral. The value was real; the pair was wrong.

This is the likeliest reading, not a proof. The other reading is that the owner released down +
right inside one 2 ms read, so nothing showed, and then pressed left and right 6 ms apart for the
next step. That needs a controller that sends neutral for down + right. CPT-legal cleaning only
touches opposite directions, and a controller that did it could not crouch-block in a game.

### 6.3 The resting value by mode, and with Steam

| Mode | What the browser gets | At rest | Down + right |
| --- | --- | --- | --- |
| PS5 (run 1) | a plain HID pad: directions on one hat axis, axis 9 | 1.286, which is hat position 8, outside the 0 to 7 range | -0.143 expected |
| PC | an Xbox-style pad. Firefox names it `xinput` and gives it the standard layout, which has no hat axis | the four direction buttons (12 to 15) are up | buttons 13 and 15 down together, unless the controller is set to send directions as a stick |

- **So the resting value does differ between the modes, in kind.** PS5 mode has a hat that rests
  out of range. PC mode has no hat axis at all, so there is no 1.286 to misread.
  Sources: Firefox's Xbox-style path
  ([WindowsGamepad.cpp, lines 76 to 79 and 487](https://github.com/mozilla-firefox/firefox/blob/101379eafc8a7f7e807b4c50d2ee5f0679675a95/dom/gamepad/windows/WindowsGamepad.cpp#L76-L79)),
  Microsoft's description of the direction bits
  ([XINPUT_GAMEPAD](https://learn.microsoft.com/en-us/windows/win32/api/xinput/ns-xinput-xinput_gamepad)),
  and the standard layout ([Gamepad specification](https://w3c.github.io/gamepad/#remapping)).
  PC mode itself has not been measured: run 1 only saw it for 1.9 seconds.
- **Run 1's diagonal step was recorded in PS5 mode, after the switching had ended.** The page
  takes its resting values once, at **Start mapping**, and the report prints them: ten axes
  ending in 1.286, which only the PS5-mode pad has. The connect and disconnect log has no entry
  after the pad came back at 20.0 seconds.
- **A mode switch could have broken the page, and now cannot.** The page kept its resting values
  by pad number only (lines 245 and 279 to 281 at `81f75e8`). A pad that changed mode after
  **Start mapping** kept its number, so its new resting values would have been compared with the
  old ones and read as held inputs. That is the suspected bug, a resting value taken for an
  input, but it is not what happened in run 1: its lines would then say "rest 0.000", and they
  say "rest 1.286". The page now also compares the pad's name, stops recording when it differs,
  and asks for the mapping to be started again.
- **Steam Input.** Valve's documentation says that on Windows the Steam Overlay hooks a game's
  input APIs and adds an emulated Xbox controller there
  ([Steamworks](https://partner.steamgames.com/doc/features/steam_controller/steam_input_gamepad_emulation_bestpractices)).
  A browser started normally has no Steam Overlay in it, and nothing found says Steam rewrites
  the controller's own report. If Steam were involved, the expected sign is a second, Xbox-style pad
  in the list, or key presses from Steam's desktop layout. Run 1 shows neither: one pad, hat
  resting at 1.286, no keys logged during the mapping. Not measured with Steam known to be on or
  off, which is why section 1 asks for it closed.

### 6.4 What real diagonals should look like

The hat reports one of eight positions, scaled to `2 * position / 7 - 1`, and rests at position 8:

| Direction | Position | Axis 9 |
| --- | --- | --- |
| up | 0 | -1.000 |
| up + right | 1 | -0.714 |
| right | 2 | -0.429 |
| down + right | 3 | -0.143 |
| down | 4 | 0.143 |
| down + left | 5 | 0.429 |
| left | 6 | 0.714 |
| up + left | 7 | 1.000 |
| nothing held | 8 | 1.286 |

Chrome scales a hat the same way and keeps the out-of-range resting value on purpose
([raw_input_gamepad_device_win.cc](https://github.com/chromium/chromium/blob/157.0.8103.80/device/gamepad/raw_input_gamepad_device_win.cc#L629-L637)),
and it has no special layout for this controller
([gamepad_id_list.cc](https://github.com/chromium/chromium/blob/157.0.8103.80/device/gamepad/gamepad_id_list.cc#L613-L615)
lists three other Qanba products, not `2802`). So in PS5 mode the run should show "down, then
right added" going from `0.143 [= down]` to `-0.143 [matches no single input recorded above]`, and
the report copied in step 9 should show `-0.143` as the last number of `axesNow`. If it shows the
resting value again, the "while letting go" part of the line will say which buttons were held.

## 7. What Chromium offers beyond polling

Checked on 2026-11-22 against the source of Chrome 157.0.8103.80, the version installed here.

**WebHID `inputreport` events. On by default.**

- Chrome and Edge 89 and later on desktop. Not in Firefox or Safari.
  [Chrome's guide](https://developer.chrome.com/docs/capabilities/hid),
  [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HIDDevice/inputreport_event),
  [specification](https://wicg.github.io/webhid/).
- One event for every report the controller sends, carrying the raw bytes. It is the only path
  here that does not pass through Chrome's gamepad code, so it is not held to that code's 4 ms
  step (below). How often the controller reports is what the run measures.
- It needs a click and Chrome's device chooser once for each device, on a secure page.
  `localhost` counts.
- Game controllers are not on the list of devices pages may not open
  ([blocklist](https://github.com/WICG/webhid/blob/main/blocklist.txt)).
- An event's time is set when the page's own thread receives the report, not when the controller
  sent it (the event is created with no time of its own:
  [hid_input_report_event.cc](https://github.com/chromium/chromium/blob/157.0.8103.80/third_party/blink/renderer/modules/hid/hid_input_report_event.cc#L13-L21)).
  A busy page delays it. Since Chrome 131 the events can also be received in a worker, away from
  the page's drawing ([status entry](https://chromestatus.com/feature/5077348995825664)). The
  spike does not try that.
- The bytes mean something different for every controller and mode, so an app has to learn them.

**An event-driven Gamepad API. Experimental, off by default.**

- The event is `gamepadrawinputchanged`, fired on `window`, with a snapshot of the pad and lists
  of what changed
  ([interface](https://github.com/chromium/chromium/blob/157.0.8103.80/third_party/blink/renderer/modules/gamepad/gamepad_raw_input_change_event.idl),
  [handler](https://github.com/chromium/chromium/blob/157.0.8103.80/third_party/blink/renderer/modules/gamepad/window_gamepad.idl#L10),
  [explainer](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/GamepadEventDrivenInputAPI/explainer.md)).
  Chrome's status entry calls it `rawgamepadinputchange`; neither browser here has that spelling.
  The spike listens for both.
- Its feature is marked "experimental" in Chrome 157
  ([runtime_enabled_features.json5](https://github.com/chromium/chromium/blob/157.0.8103.80/third_party/blink/renderer/platform/runtime_enabled_features.json5#L3505-L3510)),
  which means off in the released browser. Checked here in headless mode with no controller: with
  default settings neither Chrome 157 nor Edge 158 exposes it; with
  `--enable-blink-features=GamepadRawInputChangeEvent` both do.
- A site can get it through an origin trial, which ran from Chrome 149 to 154, was extended to
  157, and has a further extension to 163 recorded
  ([status entry](https://chromestatus.com/feature/5989275208253440),
  [intent to experiment](https://groups.google.com/a/chromium.org/g/blink-dev/c/pZZLH85rNP8)). The
  entry says the shape of the API is likely to change. Firefox and Safari have given no signal.
- The `chrome://flags/#gamepad-raw-input-change-event` switch named in `spike-findings.md`,
  section 3, step 9, is set to expire at Chrome 152
  ([flag-metadata.json](https://github.com/chromium/chromium/blob/157.0.8103.80/chrome/browser/flag-metadata.json#L5513-L5515)),
  and a switch more than two versions past that is hidden
  ([flag_expiry.md](https://github.com/chromium/chromium/blob/main/docs/flag_expiry.md)). Section 4
  uses the command-line switch instead.
- It is not finer than polling. Chrome looks for changes inside the same loop that refreshes what
  pages can read, every 4 ms
  ([gamepad_provider.cc, line 78 and lines 557 to 564](https://github.com/chromium/chromium/blob/157.0.8103.80/device/gamepad/gamepad_provider.cc#L78)).
  What it saves is the polling itself, and changes lost between two frames on a 60 Hz display.

**Polling more often than once a frame. Available everywhere, and what Fast poll does.**

- Because of that 4 ms loop, a Chrome page cannot see more than about 250 distinct pad states a
  second however often it reads. On the owner's 500 Hz display the ordinary frame reads already
  look twice as often as that, so Fast poll may show no gain there. On a 60 Hz display it should.
- `Gamepad.timestamp` is stamped when Chrome handles the controller's report
  ([raw_input_gamepad_device_win.cc, line 250](https://github.com/chromium/chromium/blob/157.0.8103.80/device/gamepad/raw_input_gamepad_device_win.cc#L250)),
  so it may place a change more finely than the read that saw it. The tap test's second row
  measures that.

**Older proposals.** Separate button and axis events (`gamepadbuttondown` and the like) were
proposed for Chromium earlier and went to a W3C design review in 2021
([intent](https://groups.google.com/a/chromium.org/g/blink-dev/c/VOM5imqAPlU),
[review](https://github.com/w3ctag/design-reviews/issues/662)). Chrome 157 has no such feature.
Firefox has them behind a preference that is off. The request itself is a long-standing open
issue on the Gamepad specification ([w3c/gamepad#4](https://github.com/w3c/gamepad/issues/4)).

**Verdict.** In Chromium, WebHID is the only thing better than polling that a public page can use
today, and the only one that can beat Chrome's 4 ms step. It costs a permission prompt, works in
Chrome and Edge only, and needs the controller's bytes to be learned. The event-driven Gamepad
API cannot be relied on: it is experimental, its shape is not settled, and it is no finer than a
fast poll. Polling with `Gamepad.timestamp` stays the baseline in every browser. Whether WebHID
is worth an optional input source depends on numbers only the owner's run can give: whether the
controller is listed, how often it reports, and whether its tap times are steadier than the
polled rows.

Not verified: no gamepad event and no WebHID report has been received from a real controller
here. Everything above about timing comes from reading Chrome's source.

## 8. What the spike gained for this run

No game rules, no SOCD cleaning, and still no device requested without a click.

- **One fix.** The page compared a pad with resting values kept by pad number only, so a mode
  switch after **Start mapping** would have read the new mode's resting values as inputs
  (section 6.3). It now checks the pad's name too, stops recording, and says to start again.
- The diagonal prompt asks for DOWN first and RIGHT second, like the two prompts after it, so the
  first state recorded names the direction that is really held.
- Every state in a two-direction step is labelled with the single inputs it matches, and the step
  also records what was seen while letting go and the page time it started at.
- The tap test asks for exactly 10 taps, a number that can be counted.
- The report keeps the Fast poll rate after the box is unticked.
- The report carries the raw WebHID bytes: the latest report, the resting one, and which bytes the
  tap test found moving by themselves. Changed reports are counted from the start of the last tap
  test, so a controller with a counter byte no longer swamps the count.
- The page says WebHID times are approximate too.

Checked against a simulated hat pad and a simulated HID device in headless Chrome 157, including
a simulated mode switch. Not checked with the real controller.
