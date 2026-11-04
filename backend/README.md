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
