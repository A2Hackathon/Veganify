// Mapping between Swift EatingStyle and backend dietLevel

/**
 * Convert Swift EatingStyle rawValue to backend dietLevel
 */
export function swiftToBackendDietLevel(swiftStyle) {
    const mapping = {
        "Vegan": "vegan",
        "Ovo-vegetarian": "ovo",
        "Lacto-vegetarian": "lacto",
        "Lacto-ovo vegetarian": "lacto_ovo",
        "Pescatarian": "pescatarian",
        "Flexitarian": "flexitarian"
    };
    return mapping[swiftStyle] || "flexitarian";
}

/**
 * Convert backend dietLevel to Swift EatingStyle rawValue
 */
export function backendToSwiftDietLevel(backendLevel) {
    const mapping = {
        "vegan": "Vegan",
        "ovo": "Ovo-vegetarian",
        "lacto": "Lacto-vegetarian",
        "lacto_ovo": "Lacto-ovo vegetarian",
        "pescatarian": "Pescatarian",
        "flexitarian": "Flexitarian"
    };
    return mapping[backendLevel?.toLowerCase()] || "Flexitarian";
}

/**
 * Map ingredient status from LLM output to Swift IngredientStatus
 */
export function mapIngredientStatus(llmStatus) {
    const val = (llmStatus || "").toLowerCase();
    if (val.includes("not")) return "not_allowed";
    if (val.includes("ambig")) return "ambiguous";
    return "allowed";
}

