const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
    },
    dietLevel: {
        type: String,
        enum: ['vegan', 'vegetarian', 'pescatarian', 'ovo', 'lacto', 'lacto_ovo', 'flexitarian'],
        default: ""
    },
    extraForbiddenTags: { // include allergies
        type: [String],
        default: []
    }, 
    preferredCuisines: {
        type: [String], 
        default: []
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', userSchema);