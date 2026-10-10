# apply_update

Decides whether a staff member's edit to a learning device is allowed,
and if so returns a fresh record with the version bumped. One pure
function, no server, no DB.

## Run it

From the project root, first change into the `src` folder, then run:

    cd src
    node -e "const {apply_update}=require('./apply-update'); console.log(apply_update({deviceId:'D01',siteId:'S01',version:3,settings:{language:'en',volume:2}}, {siteId:'S01',role:'editor'}, {deviceId:'D01',expectedVersion:3,settings:{volume:4}}))"

## Test it

    node --test tests/apply-update.test.js

## Time

About 50 minutes. Half on design and the rules table, half on the
function and four tests.

## Not finished

No logging of rejection reasons — `validateRequest` computes one
internally and then throws it away. Wiring it into a real logger is
a five-minute job. Everything else the brief asked for is here.

## Known limitation

This function only makes the *decision*; it doesn't make the decision
atomic. If two callers load the same record and both call this with the
same valid `expectedVersion`, both get a 200. Preventing that needs a
compare-and-swap in the storage layer, which is out of scope for a
60-minute exercise. Worth flagging because it's the difference between
"version check" and "real optimistic concurrency."

## Why it's built this way

**Pure, no shared state.** No `await`, no module-level variables. Two
concurrent calls with the same `current` can't interfere. (Small
correction to the brief's framing: JS is single-threaded per event loop,
so "thread safety" isn't quite the right term — the real risks are async
interleaving and reference leakage, and both are handled.)

**Inputs frozen, outputs frozen.** `current`, `actor`, and `request` are
never written to, and the returned record shares no references with
`current`, so nothing downstream can accidentally scribble back into
saved state. The tests freeze every input to prove it.

**Fixed check order.** Permission → shape → settings → device → version.
A request that breaks several rules still gets one deterministic answer.
The handout's three examples (200, 409, 403) are really testing this
order; tests 2 and 4 lock it in.

**One rules table.** Adding a new editable setting is a single entry in
`SETTINGS_RULES`. The validator loops over it and the merge is
key-driven, so both sides stay in sync without touching either.

**Small modules.** The brief excludes server/DB/UI and caps this at an
hour, so the implementation is split into a few focused modules under
`src/` and exposed through `src/index.js`.

## UI flow

- **The form is easy to use.** Every field has a clear label ("Language", "Volume"), you can move through them with Tab, and pressing Ctrl+S or clicking Save does the same thing.
- **The page keeps two versions of the record in mind:** what the server last confirmed, and what the person is currently typing. They are never mixed together.
- **While saving, the page says so.** The Save button greys out, a "Saving…" message appears, and a small note says "Unsaved changes" — so a slow connection never looks like a successful save.
- **If the person typed something invalid,** the error appears right next to the field (for example, "Volume must be 0 to 5"), the cursor jumps to the problem field, and their other edits are kept.
- **If someone else edited the same device first,** the page doesn't overwrite that work. It shows a banner: "This record changed on the server", with two choices — **Reload** (see the newer version, lose your edits) or **Reapply** (keep your edits, save them on top of the newer version).
- **If anything else goes wrong** — no permission, device not found, network drop — the edits stay on screen, the saved version is left alone, and a message invites the person to try again.
- **When the save succeeds,** the page updates to match what the server returned, the "Unsaved changes" note disappears, and a quiet confirmation is announced for screen readers.
- **The "Saved" badge only ever reflects what the server has confirmed.** Until then, the person sees their edits marked as *not yet saved* — so they're never told something is safe when it isn't.