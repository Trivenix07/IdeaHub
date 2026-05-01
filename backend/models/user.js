const mongoose = require('mongoose');

mongoose.connect("mongodb://127.0.0.1:27017/hackathon1");

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
