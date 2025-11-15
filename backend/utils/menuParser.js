function menuParser(menuText) {
    if (!menuText || typeof menuText !== 'string') return [];

    const lines = menuText.split('\n'); // Split by new line
    const result = [];

    for (let line of lines) {
        line = line.trim();
        if (!line) continue; // skip empty lines

        // Split into dish name and ingredient list
        const parts = line.split(':');
        if (parts.length < 2) continue; // skip malformed lines

        const dishName = parts[0].trim();
        const ingredients = parts[1]
            .split(',')               // split by comma
            .map(ing => ing.trim())   // remove whitespace
            .filter(ing => ing.length > 0); // remove empty strings

        result.push({
            name: dishName,
            ingredients
        });
    }

    return result;
}

module.exports = menuParser;
