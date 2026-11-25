# Sprout Backend Server

## What is this?

This is the **Express.js Node.js server** that handles all API requests from your iOS app. It's NOT MongoDB - it's a web server that:
- Receives requests from your iOS app
- Stores data in JSON files (no MongoDB needed!)
- Processes AI chat requests
- Handles recipes, profiles, grocery lists, etc.

## How to Start the Server

1. Open a terminal/command prompt
2. Navigate to the backend folder:
   ```bash
   cd backend
   ```
3. Start the server:
   ```bash
   npm start
   ```
   
   Or for development (auto-restarts on changes):
   ```bash
   npm run dev
   ```

4. You should see:
   ```
   ✅ Express app created
   ✅ Using JSON file storage (MongoDB removed)
   ✅ Server listening on http://localhost:4000
   ✅ Server ready to accept connections!
   ```

## Testing the Server

Open your browser and go to: `http://localhost:4000`

You should see: `{"ok":true,"msg":"Veganify backend (Albert focus) running"}`

## Data Storage

All data is stored in JSON files in the `backend/data/` folder:
- `users.json` - User profiles
- `userImpact.json` - XP, coins, streaks
- `recipes.json` - Saved recipes
- `groceryItems.json` - Grocery lists

**No MongoDB needed!** Everything is stored in simple JSON files.

## Important Notes

- The server must be running for your iOS app to work
- The server runs on port 4000 by default
- **Cross-Platform Setup**: If your iOS app runs on a MacBook and the server runs on a Windows laptop:
  - The Windows laptop must run `npm start` in the backend folder
  - The MacBook iOS app must connect to the Windows laptop's IP address
  - Find the Windows laptop's IP: Run `ipconfig` on Windows, look for "IPv4 Address" under "Wi-Fi" or "Ethernet"
  - Update `ios/APIClient.swift` to use `http://[WINDOWS_IP]:4000` (e.g., `http://10.5.174.193:4000`)
- If using iOS Simulator on MacBook: use the Windows laptop's IP address (e.g., `http://10.5.174.193:4000`)
- If using physical iOS device: use the Windows laptop's IP address (e.g., `http://10.5.174.193:4000`)

## Multi-Developer Setup

Each developer needs to:
1. Run `npm start` on their own Windows laptop (where the server will run)
2. Find their Windows laptop's IP address using `ipconfig`
3. Update `ios/APIClient.swift` with their Windows laptop's IP address
4. Make sure both the Windows laptop and MacBook are on the same network (Wi-Fi)
5. **Configure Windows Firewall** to allow port 4000 (see `FIREWALL_SETUP.md` for detailed instructions)

## Firewall Configuration

If your MacBook cannot connect to the Windows server, you may need to configure Windows Firewall to allow connections on port 4000.

**Quick Steps:**
1. Open Windows Defender Firewall with Advanced Security (`wf.msc`)
2. Create a new **Inbound Rule** for **TCP port 4000**
3. Allow the connection for **Private** networks
4. Repeat for **Outbound Rules**

See `FIREWALL_SETUP.md` for detailed step-by-step instructions.



## Storage verification and limits

The active server uses JSON collections in `backend/data`; the older MongoDB
helpers are not the active persistence layer. Run the storage
regressions with Node.js 24:

```sh
npm test --prefix backend  # from the repository root
```

Tests create temporary collections, inject partial-write and replacement errors,
and verify successful mutations in a fresh process. They never use production
files, MongoDB, OCR or model APIs. CI also checks application JavaScript syntax.
This suite does not establish complete server, iOS, OCR or model correctness.

Malformed, unreadable or non-array collection files now reject the operation.
Do not replace a damaged collection with an empty array to make a request pass;
recover a validated backup. Writes serialize to a unique sibling file, flush its
contents and rename it over the collection only after writing succeeds. Errors
propagate to callers instead of returning unsaved records. New files use owner
read/write permissions. A failed write/rename keeps the old collection available.

This remains a single-process prototype: read/modify/write operations are
synchronous within one process, but multiple server processes can lose updates.
The rename is a single-file publication boundary, not a cross-collection
transaction. Directory metadata is not fsynced; power-loss durability is not
claimed. A killed process can leave an unused `.tmp` file for operator cleanup.
Backups, multi-process locking, authenticated user isolation and migration to a
transactional store remain separate work. Current routes still share one demo
profile; this repair does not make the service suitable for public deployment.


## Model credentials

Copy `.env.example` to `.env` in the backend directory and set
`OPENROUTER_API_KEY` before starting the server. The active model client uses
OpenRouter; older Gemini/Mongo setup instructions and `setup.js` do not configure
this client. Keep the key server-side and restart after changing it. Missing or
blank configuration prevents outbound model requests; existing route-specific
fallbacks still apply and are not evidence of successful model analysis.

A credential was previously committed in `utils/llmClient.js`. Its owner must
revoke/rotate that credential at the provider: removing the current literal does
not revoke it or remove repository history. This change does not alter provider
settings or secrets, rewrite history, or test whether the exposed credential works.
Configuration tests use a stub constructor and dummy values, with no network calls.


## Ingredient scan contract

Ingredient scans require 1–100 nonempty names, at most 200 characters per name
and 8,000 characters total. Invalid manual input returns 400; OCR that yields no
usable ingredient list returns 422 with `success: false` and `isConsumable: false`.
Exact duplicate input names are collapsed while preserving input order.

Every requested ingredient must have exactly one matching analysis record before
it can be marked `Allowed`. Names match after trimming, without fuzzy matching.
Missing or malformed records become `Ambiguous`; duplicate or unrequested model
records invalidate the response's analysis records. Status must be exactly
`Allowed`, `NotAllowed` or `Ambiguous`, reason must be bounded text, and suggestions
must be a bounded list of strings. Output preserves input order. Empty results
never imply consumability. An ambiguous result is not an approval.

Tests use real local HTTP requests with controlled user/model/OCR dependencies;
they do not validate real OCR, model accuracy, dietary suitability or allergen
safety. `isConsumable` is a legacy compatibility field summarizing these statuses,
not a safety certification. Verify dietary and allergen requirements independently.
Model and OCR failures, provider configuration, and human review remain distinct
from successful HTTP transport. Upload limits and OCR worker ownership are described below.


## Image upload boundary

Ingredient, menu, fridge and receipt scans accept one `image` file of at most
5 MiB. Multipart parsing also limits text fields (10), parts (11), field names
(100 bytes) and field values (8,192 bytes). File/value size errors return 413;
other malformed/excess multipart input returns 400 before the scan handler.
These limits apply to uploaded bytes, not decoded image dimensions.

Accepted image bytes are passed directly to Tesseract as a Buffer. Upload parsing
no longer creates `uploads/` files, including requests that exit early or fail
analysis. Existing files from older runs are not automatically deleted. Request
buffers become eligible for garbage collection once processing releases them;
immediate secure erasure or a measured process-memory bound is not claimed.

HTTP tests verify the exact 5 MiB boundary, oversized rejection before OCR,
multiple files, excess fields, field size, memory-only file metadata and recovery
on a later request. The ingredient route uses controlled OCR in these tests;
real image decoding, device uploads and provider quality remain unverified.
There is no process-wide upload/concurrency quota or decoded-pixel cap yet.
OCR execution is bounded as described below. Authentication and dependency
hardening remain separate unfinished work.


## OCR lifetime and admission

All four scan routes use the same process-local OCR service. It admits at most
two child processes, with no waiting queue; additional OCR work returns 503.
A 60-second deadline covers process startup, Tesseract/model initialization,
recognition and cleanup. A deadline returns 504 after the child has exited.
A disconnected HTTP client cancels OCR. Failed or malformed child results return
502, and extracted text is limited to 8,000 characters. Existing route error
bodies remain, with meaningful failure HTTP statuses.

Each child runs Tesseract, whose Node engine uses worker threads. The parent
terminates the child process after a result, error, deadline or cancellation,
and retains its capacity slot until process/IPC closure. This also covers a
worker stuck during initialization, before Tesseract exposes a worker handle.
Children exit if their parent IPC connection closes. Starting a process per
scan costs more than a warm pool; no throughput improvement is claimed.

Tests use real subprocesses and local HTTP with controlled worker scripts. They
verify successful cleanup, invalid results, early exits, a blocked initialization
deadline, capacity rejection/reuse, pre-abort and HTTP disconnect cancellation;
they check that child PIDs no longer exist. These tests do not run real OCR or
validate language-model downloads, image accuracy, memory bounds or iOS behavior.
The concurrency limit is per server process, applies after multipart parsing,
and is not a global upload quota or decoded-image memory cap. Operating-system
process termination is not a hard real-time guarantee. Later model requests and
storage writes have separate lifecycles and are not cancelled by this OCR helper.


## Reproducible backend environment

Use Node.js 24 and `npm ci --ignore-scripts` inside `backend` (or add
`--prefix backend` from the repository root). Dependencies are installed from
`package-lock.json`; generated `node_modules` is no longer tracked. CI installs
from an empty checkout, runs all tests and checks npm advisories. Direct runtime
versions are pinned; compatible transitive fixes and the lockfile are committed.
Run `npm run dev` for Node's built-in watch mode; nodemon is no longer required.
Unused Gemini/UUID dependencies and stale MongoDB/JWT lock entries were removed.
Legacy MongoDB helpers still exist but are not part of the active JSON backend.

The clean-install audit on 2026-11-04 initially reported 15 findings, including
stale lock entries; after reconciliation and updates it reported zero known
findings. This is registry advisory coverage at that time, not proof of absence
of vulnerabilities. Multer is now 2.5.0; exact-limit HTTP regressions verify its
changed file-size boundary behavior. Both fresh installation and the 21-test
suite pass. Startup coverage launches the actual application with temporary
storage and no provider credentials, including failed optional network-address
discovery. It verifies the health endpoint, not every API or real OCR/model work.

### Menu analysis contract
Menu scans accept up to 100 distinct OCR lines (200 characters per line, 8,000 total). Empty or excessive text returns HTTP 422 before inference. Model responses must contain exactly one recognized status and bounded suggestion for every requested dish; missing, duplicate, unknown or malformed records return HTTP 502 instead of fabricated modification advice. Modifiable dishes require a nonempty suggestion. Valid responses preserve menu order.

Controlled HTTP tests cover these contracts; they do not establish OCR accuracy or dietary safety. The existing shared demo profile and recipe-analysis contracts still need further work.

Recipe extraction and rewriting now reject provider/configuration failures and empty or oversized output. Callers return an error instead of reporting zero violations or saving the unchanged original as an adaptation. The isolated full-server test exercises all three affected HTTP paths without credentials and verifies that no recipe was persisted. Text shape validation does not establish ingredient completeness, successful substitution, or dietary safety; classification and recipe-generation validation remain follow-up work.

### Structured model responses
Dietary checks preserve every requested ingredient. Missing or invalid classifications become `Ambiguous`; provider failures no longer produce keyword-based dietary or substitution claims. This applies to both ingredient scans and recipe analysis.

Recipe generation requires the complete requested batch (at most three recipes), with bounded titles, tags, durations, ingredient fields and nonempty steps. The whole batch is validated before persistence or XP updates. Unsupported model fields, including IDs and image URLs, are discarded. Failed inference raises an error instead of returning an empty successful batch. Controlled parser tests and an isolated server test verify these contracts and no recipe/XP writes on provider-configuration failure. These checks do not establish dietary accuracy, ingredient completeness, atomic multi-recipe persistence, or real model quality.

Generated recipe batches now use one atomic replacement of `recipes.json`, so a write/rename failure cannot save only the first recipes in the batch. Storage tests inject replacement failure and verify the previous file remains unchanged, then verify the successful batch through a fresh Node process. This is single-process, single-file atomicity; it does not provide cross-file transactions, multiprocess coordination, directory-fsync power-loss durability, or request retry idempotency for unkeyed requests.

### Shared demo access
All application routes require `Authorization: Bearer <VEGANIFY_API_TOKEN>` before body parsing. Set `VEGANIFY_API_TOKEN` locally to 32–128 random URL-safe characters (for example, generate locally with `openssl rand -hex 32`); keep the value out of source control and logs. Missing/invalid server configuration returns 503, missing/wrong credentials return 401. Only the minimal `GET /` health response remains public. The server binds to `127.0.0.1` by default; a remote or physical-device demo needs an operator-configured HTTPS reverse proxy. No deployment or secret provisioning is included.

This is one shared demo profile: every authorized client accesses the same data. It is not multi-user authentication, per-user authorization, or tenant isolation. Restart the server with a replacement token to rotate access. Previously exposed provider credentials still require revocation separately.

The shared HTTP error handler returns generic 400/413/415 responses for known JSON/body-size/encoding failures and a generic 500 for unexpected failures. It does not serialize parser payloads, exception messages or storage paths. Existing route-specific logging still needs a broader privacy review.

AI chat diagnostics now use fixed failure messages rather than logging questions, profile context, response snippets or provider exception objects. Context/storage failures return a generic HTTP error without the underlying exception message. Controlled provider and HTTP tests check private marker exclusion; the isolated application test checks captured process output. This is scoped to the chat path; other routes still require a logging review.

`POST /ai/ask` requires a nonblank string `question` of at most 4,000 characters. Invalid values return 400 before profile lookup or inference; valid surrounding whitespace is trimmed. This per-question bound is not a request-rate or model-concurrency limit.

### Retrying meal logging

`POST /impact/log-meal` accepts an optional `Idempotency-Key` header (1–128 ASCII
letters, digits, `.`, `_`, `:`, or `-`). Generate one key per intended meal and
reuse it with the same `userId` if the response is lost. Concurrent retries return
the original progress snapshot without awarding XP again, even after a server
restart. A different `userId` with the same retained key returns 409.

The receipt and XP/meal counters are written together in the impact JSON file.
Receipts expire after 24 hours according to server wall time, with at most 1,000
retained receipts per profile. At capacity, existing keys still replay; a new key
returns 503 without awarding XP. Retry with the same key later. An expired key is
a new operation, so do not retry old operations beyond that window.

This guarantee is limited to one server process using its persistent data volume.
It does not provide cross-process locking or protection after data loss. Requests
without a key retain the previous behavior and can award XP again on retry; the
mobile retry-key integration is not included in this change. Recipe generation
retry behavior is documented below. Tests exercise concurrent
route calls, replay after another award, restart in a child process, conflicts,
invalid keys and bounded receipt retention; they do not establish mobile or
network-disconnect end-to-end behavior.
### Scan upload admission

All image scan routes share a process-local admission limit of four requests.
Excess requests receive HTTP 503 with `Retry-After: 1` before multipart parsing;
there is no waiting queue. Each admitted file is still limited to 5 MiB.
A slot remains occupied until multipart parsing/cleanup and the response have
finished, including error and disconnect paths. OCR separately limits child
process concurrency to two.

This bounds admitted request concurrency, not total process memory. Multipart
copies, downstream work finishing cancellation, and decoded image dimensions
can consume additional memory. The limit is per Node process; it is not a
distributed quota.

Before starting an OCR child, the service checks PNG/JPEG headers and requires
positive dimensions no greater than 8192 pixels per side and 16 million pixels
in total. Other formats return 415; malformed dimension headers return 400;
images above the dimension/pixel limits return 413. The iOS client uploads JPEG.
Resize larger images before submitting them. Header inspection uses the pinned
`image-size` package and does not decode pixels or verify the complete image.
Malformed compressed data can still fail inside the isolated OCR child. These
checks are not a hard memory quota; process deadlines and child concurrency
limits remain necessary. Tests use controlled workers for admission checks and
do not establish live OCR quality or peak memory usage.

### Cook With This retries

`POST /recipes/from-ingredients` accepts an optional `Idempotency-Key` with the
same 1–128 ASCII letter/digit/`._:-` syntax as meal logging. Reuse the key and
`user_id` after an uncertain response to replay the original recipes and progress.
Use a new key for an intentionally new generation, including after editing
groceries or preferences: a retained receipt replays before reading those values.
A changed `user_id` with the same retained key returns 409. The existing shared
Albert profile is still used; this is not multi-user isolation or authentication.

The response receipt and +5 XP award are committed in one atomic JSON replacement.
Concurrent completions recheck the receipt inside that synchronous mutation, so
only one awards XP. Completed receipts bypass inference, but simultaneous requests
can still perform duplicate inference before the first commits. Provider failures
can be retried; this does not guarantee one provider invocation or billing charge.

Receipts last 24 hours, with at most 100 per profile and 128 KiB per response.
New keys receive 503 at capacity; existing keys still replay. Oversized responses
receive 502 without awarding XP. Expired keys can create a new award. Requests
without a key keep their previous behavior. These guarantees require one Node
writer and retained storage; cross-process locking and mobile key persistence
remain separate work. Tests cover concurrent completion and actual HTTP response
loss followed by process restart using controlled inference, not live model E2E.

### Recipe generation retries and storage format

`POST /recipes/generate` accepts an optional `Idempotency-Key` using the same
syntax as meal logging. Reuse the key with the same normalized `userId`,
`ingredients` and `prompt` to replay the original recipe IDs and response.
A retained key with different normalized input returns 409. Completed receipts
bypass profile/grocery reads and inference. Use a new key when intentionally
regenerating after stored grocery or preference changes. Concurrent requests may
still perform duplicate inference before one batch commits.

Recipe records and their replay snapshot are published in one atomic replacement
of `recipes.json`; a failed replacement commits neither. The first keyed save
upgrades a legacy array to `{version: 1, recipes: [...], receipts: [...]}`. Existing
records remain intact, and ordinary saves preserve receipts. Older server versions
cannot read the new envelope: retain a backup before upgrading and account for
this format change when planning rollback. No separate receipt file is used.

Receipts are retained for 24 hours with a global limit of 100 and a maximum stored
batch snapshot of 128 KiB. New keys return 503 at capacity; oversized batches
return 502 without saving recipes. Expired keys may produce another batch.
Unkeyed requests retain their previous behavior. The guarantees require a single
Node writer and retained storage; they do not provide cross-process coordination
or guarantee one model invocation. The current iOS caller does not yet persist
retry keys. HTTP restart tests use controlled inference, not a live model.

### Real OCR smoke check

The ordinary test suite uses controlled workers to test admission and lifecycle
failures. `npm run test:ocr` additionally runs the real Tesseract worker against
`tests/fixtures/ocr-text.png`, a generated 600×150 white image with the text
“RICE AND BEANS” rendered using DejaVu Sans. It checks decoded text, a truncated
PNG reaching the decoder, recovery after that failure, cancellation after child
creation, recovery after cancellation, and a one-millisecond startup deadline.
It does not measure peak memory, throughput or accuracy on receipts/menus.

From the repository root, provision language data separately (no model is bundled):

```sh
mkdir -p /tmp/veganify-ocr-data
npm pack @tesseract.js-data/eng@1.0.0 --ignore-scripts --pack-destination /tmp/veganify-ocr-data
tar -xOf /tmp/veganify-ocr-data/tesseract.js-data-eng-1.0.0.tgz package/4.0.0_best_int/eng.traineddata.gz | gzip -d > /tmp/veganify-ocr-data/eng.traineddata
OCR_ENGLISH_DATA=/tmp/veganify-ocr-data/eng.traineddata npm run test:ocr --prefix backend
```

The smoke runner copies the supplied uncompressed model to a disposable working
directory, uses Tesseract's local cache, and removes it afterward. CI provisions
the pinned data package through npm; its download requires registry access, but
the decoder run does not need the default language-data CDN. Production OCR
configuration is unchanged. This check is decoder/service integration, not an
uploaded-photo-to-model or browser workflow test.
