const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userID: {
        type: Number
    }, 
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
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', userSchema);