// utils/jsonStorage.js
// JSON file-based storage to replace MongoDB
import { readFileSync, writeFileSync, existsSync, openSync, closeSync, fsyncSync, renameSync, unlinkSync } from "fs";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, "../data");
const USERS_FILE = join(DATA_DIR, "users.json");
const USER_IMPACT_FILE = join(DATA_DIR, "userImpact.json");
const RECIPES_FILE = join(DATA_DIR, "recipes.json");
const GROCERY_ITEMS_FILE = join(DATA_DIR, "groceryItems.json");

// Ensure data directory exists
import { mkdirSync } from "fs";
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize empty files if they don't exist
function ensureFile(filePath, defaultValue = []) {
  try {
    writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), { encoding: "utf8", flag: "wx", mode: 0o600 });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
}

// Initialize all data files
ensureFile(USERS_FILE, []);
ensureFile(USER_IMPACT_FILE, []);
ensureFile(RECIPES_FILE, []);
ensureFile(GROCERY_ITEMS_FILE, []);

function readJSON(filePath) {
  const data = JSON.parse(readFileSync(filePath, "utf8"));
  if (!Array.isArray(data)) throw new Error("Storage collection must be an array");
  return data;
}

function writeJSON(filePath, data) {
  const serialized = JSON.stringify(data, null, 2);
  const temporary = `${filePath}.${randomUUID()}.tmp`;
  let descriptor;
  let created = false;
  try {
    // Publish a complete sibling file; failed writes never truncate live data.
    descriptor = openSync(temporary, "wx", 0o600);
    created = true;
    writeFileSync(descriptor, serialized, "utf8");
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(temporary, filePath);
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    if (created) {
      try { unlinkSync(temporary); }
      catch (error) { if (error.code !== "ENOENT") throw error; }
    }
  }
}

// Generate a simple ID (similar to MongoDB ObjectId format)
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// User storage operations
export const UserStorage = {
  async findById(id) {
    const users = readJSON(USERS_FILE);
    return users.find(u => u._id === id || u.id === id) || null;
  },

  async findOne(query) {
    const users = readJSON(USERS_FILE);
    return users.find(user => {
      return Object.keys(query).every(key => user[key] === query[key]);
    }) || null;
  },

  async create(userData) {
    const users = readJSON(USERS_FILE);
    
    // ENFORCE SINGLE USER: If any user exists, update the first one instead of creating new
    if (users.length > 0) {
      console.log("⚠️ User already exists. Updating existing user instead of creating new one.");
      const existingUser = users[0];
      const updatedUser = {
        ...existingUser,
        ...userData,
        _id: existingUser._id, // Keep existing ID
        id: existingUser._id || existingUser.id, // Keep existing ID
        sproutName: "Albert", // Always Albert
      };
      users[0] = updatedUser;
      writeJSON(USERS_FILE, users);
      return updatedUser;
    }
    
    // Only create if no users exist
    const newUser = {
      _id: generateId(),
      id: generateId(), // Also store as id for compatibility
      ...userData,
      sproutName: userData.sproutName || "Albert", // Always default to Albert
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    writeJSON(USERS_FILE, users);
    return newUser;
  },

  async findByIdAndUpdate(id, updateData) {
    const users = readJSON(USERS_FILE);
    const index = users.findIndex(u => u._id === id || u.id === id);
    if (index === -1) return null;
    
    users[index] = { ...users[index], ...updateData };
    writeJSON(USERS_FILE, users);
    return users[index];
  },

  async countDocuments() {
    const users = readJSON(USERS_FILE);
    return users.length;
  },
};

// UserImpact storage operations
export const UserImpactStorage = {
  async findOne(query) {
    const impacts = readJSON(USER_IMPACT_FILE);
    return impacts.find(impact => {
      return Object.keys(query).every(key => {
        const impactValue = impact[key];
        const queryValue = query[key];
        // Handle ObjectId comparison
        if (key === "user_id") {
          return impactValue === queryValue || 
                 impactValue?.toString() === queryValue?.toString() ||
                 impact.user_id === queryValue?.toString();
        }
        return impactValue === queryValue;
      });
    }) || null;
  },

  async create(impactData) {
    const impacts = readJSON(USER_IMPACT_FILE);
    const newImpact = {
      _id: generateId(),
      user_id: impactData.user_id?.toString() || impactData.user_id,
      xp: impactData.xp || 0,
      coins: impactData.coins || 0,
      streak_days: impactData.streak_days || 0,
      total_meals_logged: impactData.total_meals_logged || 0,
      forest_stage: impactData.forest_stage || "SEED",
      last_activity_date: impactData.last_activity_date || null,
    };
    impacts.push(newImpact);
    writeJSON(USER_IMPACT_FILE, impacts);
    return newImpact;
  },

  async save(impact) {
    const impacts = readJSON(USER_IMPACT_FILE);
    const index = impacts.findIndex(i => i._id === impact._id || i.user_id === impact.user_id);
    if (index === -1) {
      impacts.push(impact);
    } else {
      impacts[index] = { ...impacts[index], ...impact };
    }
    writeJSON(USER_IMPACT_FILE, impacts);
    return impact;
  },
};

// Recipe storage operations
export const RecipeStorage = {
  async find(query) {
    const recipes = readJSON(RECIPES_FILE);
    if (!query || Object.keys(query).length === 0) {
      return recipes;
    }
    return recipes.filter(recipe => {
      return Object.keys(query).every(key => {
        const recipeValue = recipe[key];
        const queryValue = query[key];
        if (key === "userId") {
          return recipeValue === queryValue || 
                 recipeValue?.toString() === queryValue?.toString();
        }
        return recipeValue === queryValue;
      });
    });
  },

  async create(recipeData) {
    const recipes = readJSON(RECIPES_FILE);
    const newRecipe = {
      _id: generateId(),
      ...recipeData,
      userId: recipeData.userId?.toString() || recipeData.userId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    recipes.push(newRecipe);
    writeJSON(RECIPES_FILE, recipes);
    return newRecipe;
  },

  async findById(id) {
    const recipes = readJSON(RECIPES_FILE);
    return recipes.find(r => r._id === id || r.id === id) || null;
  },
};

// GroceryItem storage operations
export const GroceryItemStorage = {
  async find(query) {
    const items = readJSON(GROCERY_ITEMS_FILE);
    if (!query || Object.keys(query).length === 0) {
      return items;
    }
    return items.filter(item => {
      return Object.keys(query).every(key => {
        const itemValue = item[key];
        const queryValue = query[key];
        if (key === "userId") {
          return itemValue === queryValue || 
                 itemValue?.toString() === queryValue?.toString();
        }
        return itemValue === queryValue;
      });
    });
  },

  async create(itemData) {
    const items = readJSON(GROCERY_ITEMS_FILE);
    const newItem = {
      _id: generateId(),
      ...itemData,
      userId: itemData.userId?.toString() || itemData.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    items.push(newItem);
    writeJSON(GROCERY_ITEMS_FILE, items);
    return newItem;
  },

  async findByIdAndUpdate(id, updateData) {
    const items = readJSON(GROCERY_ITEMS_FILE);
    const index = items.findIndex(i => i._id === id || i.id === id);
    if (index === -1) return null;
    
    items[index] = { ...items[index], ...updateData, updatedAt: new Date().toISOString() };
    writeJSON(GROCERY_ITEMS_FILE, items);
    return items[index];
  },

  async findByIdAndDelete(id) {
    const items = readJSON(GROCERY_ITEMS_FILE);
    const index = items.findIndex(i => i._id === id || i.id === id);
    if (index === -1) return null;
    
    const deleted = items.splice(index, 1)[0];
    writeJSON(GROCERY_ITEMS_FILE, items);
    return deleted;
  },
};

// Helper to convert JSON storage objects to lean format (for compatibility)
export function toLean(obj) {
  if (!obj) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => ({ ...item }));
  }
  return { ...obj };
}

