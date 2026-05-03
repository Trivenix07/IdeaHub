const mongoose = require('mongoose');


const userSchema = mongoose.Schema({
    username: String,
    name: String,
    age: Number,
    email: String,
    password: String,
        posts: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "post" // This must match the model name in post.js
        }
    ]
});

module.exports = mongoose.model('user', userSchema);
