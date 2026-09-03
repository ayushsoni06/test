# Math Alarm

An iOS alarm clock you can only turn off by solving math problems.

The alarm rings on the Lock Screen through **AlarmKit**, so it breaks through
Silent Mode and Focus at full alarm volume. The alert's only button opens the
app on a math challenge — it does not silence anything. The alarm keeps ringing
until you solve every problem in a row, and if it is stopped any other way the
app immediately re-arms it.

## Requirements

- **iPhone running iOS 26 or later** (AlarmKit does not exist before iOS 26)
- **Xcode 26 or later** on a Mac
- A free Apple ID is enough — no paid developer account needed

## Run it on your phone (about 5 minutes)

1. Plug your iPhone into your Mac and unlock it. Tap **Trust** if asked.
2. Open `MathAlarm/MathAlarm.xcodeproj`.
3. Select the target **MathAlarm** → **Signing & Capabilities** tab:
   - Check **Automatically manage signing**
   - **Team**: pick your Apple ID (add it under Xcode → Settings → Accounts)
   - **Bundle Identifier**: change `com.example.MathAlarm` to something unique,
     e.g. `com.yourname.MathAlarm`
4. In the toolbar's run destination menu, pick your iPhone.
5. Press **⌘R**.
6. First launch only: on the iPhone go to **Settings → General → VPN & Device
   Management**, tap your Apple ID, and tap **Trust**. Then launch the app again.
7. Allow the alarm permission prompt when the app opens.

## Try it immediately

Tap the **•••** button in the top-left → **Test Alarm in 10s**, then lock your
phone. It will ring full-screen in about ten seconds.

## How it works

| File | Purpose |
| --- | --- |
| `Sources/Services/AlarmStore.swift` | Saves alarms, schedules them with AlarmKit, runs the re-arm watchdog |
| `Sources/Intents/SolveToStopIntent.swift` | The Lock Screen button — opens the quiz instead of stopping the alarm |
| `Sources/Model/MathProblem.swift` | Problem generation for each difficulty |
| `Sources/Views/QuizView.swift` | Full-screen challenge with its own keypad |
| `Sources/Views/AlarmListView.swift` | Alarm list |
| `Sources/Views/AlarmEditorView.swift` | Time, difficulty, repeat days, label |

### Difficulty

| Level | Problems | Content |
| --- | --- | --- |
| Easy | 3 | Two-digit addition and subtraction |
| Medium | 4 | Multiplication and three-digit sums |
| Hard | 5 | Two-digit multiplication, mixed operations, exact division |

A wrong answer resets the whole streak with a fresh set of problems.

### Notes and limits

- Only Apple's own Clock app is completely un-killable. If you force-quit Math
  Alarm from the app switcher *while the challenge is on screen*, the app is no
  longer running to re-arm the alarm. Every other escape route — dismissing the
  alert, backgrounding the app, locking the phone — is covered by the watchdog
  in `AlarmStore`, which re-arms within about two seconds.
- Apps signed with a free Apple ID expire after 7 days. Re-run from Xcode to
  refresh, or join the Apple Developer Program for a one-year signature.
