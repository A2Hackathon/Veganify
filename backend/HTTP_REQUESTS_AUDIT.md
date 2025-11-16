# HTTP Requests Audit

## Summary of All HTTP Requests in the Codebase

### 1. **Backend → External APIs**

#### OpenAI/OpenRouter API Calls (`utils/llmClient.js`)
- **Base URL**: `https://openrouter.ai/api/v1`
- **Model**: `google/gemini-2.5-flash`
- **Timeout**: 60 seconds (configured)
- **Retries**: 2 attempts
- **Endpoints Used**:
  - `POST /chat/completions` - Used by:
    - `extractIngredients()` - Extract ingredients from recipe text
    - `rewriteRecipeSteps()` - Rewrite recipes with substitutions
    - `isAllowedForUser()` - Check if ingredients are allowed for user's diet
    - `answerWithContext()` - Chatbot responses
    - `generateRecipes()` - Generate vegan recipes

**Status**: ✅ Timeout and retry configured

---

### 2. **Tesseract.js Network Requests**

#### Language Model Downloads
- **Source**: CDN (jsdelivr.net)
- **Purpose**: Download `.traineddata` files for OCR
- **URL Pattern**: `https://cdn.jsdelivr.net/npm/@tesseract.js-data/{lang}/4.0.0`
- **Caching**: Files cached after first download (IndexedDB in browser, fs in Node.js)
- **Timeout**: No explicit timeout (uses default fetch timeout)

**Potential Issue**: ⚠️ No timeout configured - could hang if CDN is slow

**Locations**:
- `routes/scanIngredients.js` - Line 50: `Tesseract.recognize()`
- `routes/scanMenu.js` - Line 29: `Tesseract.recognize()`
- `routes/groceryList.js` - Lines 110, 165: `Tesseract.recognize()`

---

### 3. **iOS App → Backend Server**

#### Base Configuration (`APIClient.swift`)
- **Base URL**: `http://10.5.174.193:4000` (development)
- **Timeout**: 30 seconds
- **Session**: `URLSession.shared`

#### All Endpoints Called:

1. **Profile & Onboarding**
   - `POST /onboarding/profile` - Create user profile
   - `GET /profile?userId={id}` - Get user profile
   - `PATCH /profile` - Update profile
   - `POST /profile/parse-restrictions` - Parse dietary restrictions

2. **Home & Progress**
   - `GET /home/summary?userId={id}` - Get home summary
   - `POST /progress/complete-mission` - Complete mission

3. **Ingredient Scanning**
   - `POST /scan/ingredients?userId={id}` - Scan image for ingredients ⚠️ **This is where the error occurs**
   - `POST /scan/ingredients/text` - Analyze text ingredients
   - `POST /scan/menu?userId={id}` - Scan menu image

4. **Recipes**
   - `POST /recipes/generate` - Generate recipe
   - `POST /recipes/veganize` - Veganize recipe
   - `POST /recipes/veganize/analyze` - Analyze recipe
   - `POST /recipes/veganize/commit` - Commit substitutions
   - `GET /recipes/saved?userId={id}` - Get saved recipes
   - `POST /recipes/save` - Save recipe

5. **Grocery List**
   - `GET /grocery-list?userId={id}` - Get grocery list
   - `POST /grocery-list` - Add grocery item
   - `POST /grocery-list/scan-fridge?userId={id}` - Scan fridge image
   - `POST /grocery-list/scan-receipt?userId={id}` - Scan receipt image

6. **AI Chat**
   - `POST /ai/ask` - Send chat message

7. **Other**
   - `POST /scan/alternative-product` - Get alternative product suggestions

**Status**: ✅ All requests have 30-second timeout

---

### 4. **Backend Server Configuration**

#### Express Server (`server.js`)
- **Port**: 4000
- **Keep-Alive Timeout**: 65 seconds
- **Headers Timeout**: 66 seconds
- **Body Size Limit**: 10MB

**Status**: ✅ Properly configured

---

## Issues Found & Recommendations

### ⚠️ Issue 1: Tesseract.js Language Model Downloads
**Problem**: No timeout configured for Tesseract.js language model downloads
**Impact**: Could cause hanging if CDN is slow or unreachable
**Solution**: Already handled with 60-second timeout wrapper in `scanIngredients.js`

### ⚠️ Issue 2: OpenAI API Timeout
**Problem**: Previously no timeout configured
**Status**: ✅ **FIXED** - Added 60-second timeout and 2 retries

### ⚠️ Issue 3: Connection Error "connection 2: received failure notification"
**Possible Causes**:
1. Tesseract.js worker process communication failure
2. Network issues between iOS app and backend
3. Backend server resource exhaustion

**Current Mitigations**:
- ✅ Added timeout wrapper for OCR processing (60 seconds)
- ✅ Enhanced error logging
- ✅ Connection error detection

---

## Recommendations

1. **Monitor Network Requests**: Add request/response logging middleware
2. **Add Retry Logic**: For transient network failures
3. **Health Check Endpoint**: Add `/health` endpoint for monitoring
4. **Rate Limiting**: Consider adding rate limiting for API endpoints
5. **Connection Pooling**: Ensure proper connection management

---

## Testing Checklist

- [ ] Test ingredient scanning with slow network
- [ ] Test with network interruption
- [ ] Test with large images (>5MB)
- [ ] Test concurrent requests
- [ ] Monitor server logs for connection errors
- [ ] Check Tesseract.js worker process stability

