const dietLevels = require('../config/dietLevels.json'); // predefined forbidden tags per diet


function isAllowedForUser(user, ingredientTags = []) {
    const level = user.dietLevel.toLowerCase();
    const forbiddenTags = dietLevels[level]?.forbidden_tags || [];

    let allowed = true;
    const reasons = [];

    for (const tag of ingredientTags) {
        const upperTag = tag.toUpperCase();

        // Check diet-level restrictions
        if (forbiddenTags.includes(upperTag)) {
            allowed = false;
            reasons.push(`${upperTag} is forbidden for ${user.dietLevel.toUpperCase()}`);
        }

        // Check extra forbidden tags
        if (user.extra_forbidden_tags?.map(t => t.toUpperCase()).includes(upperTag)) {
            allowed = false;
            reasons.push(`${upperTag} is in your custom forbidden list`);
        }

        // Check allergies
        if (user.allergies?.map(t => t.toUpperCase()).includes(upperTag)) {
            allowed = false;
            reasons.push(`${upperTag} triggers an allergy`);
        }
    }

    return { allowed, reasons };
}

module.exports = isAllowedForUser;
