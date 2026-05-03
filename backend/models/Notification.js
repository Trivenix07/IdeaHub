const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "post"
    },
    type: {
        type: String,
        default: "collab"
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending"
}
});

module.exports = mongoose.model("Notification", notificationSchema);