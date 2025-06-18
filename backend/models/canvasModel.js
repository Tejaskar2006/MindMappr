const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const canvasSchema = new Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 1
    },
    elements: {
        type: [{ type: mongoose.Schema.Types.Mixed }]
    },
    shared_with: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users'
    }]
}, { timestamps: true });

canvasSchema.statics.getAllCanvas = async function (email) {
    const user = await mongoose.model('users').findOne({ email });
    if (!user) return [];

    const canvases = await this.find({
        $or: [{ owner: user._id }, { shared_with: user._id }]
    })
        .populate('owner', 'name email')
        .populate('shared_with', 'name email')
        .lean();

    return canvases.map(canvas => ({
        ...canvas,
        isShared: String(canvas.owner._id) !== String(user._id),
        shared_by: canvas.owner // Add owner as shared_by for frontend compatibility
    }));
};

canvasSchema.statics.createCanvas = async function (email, name) {
    const user = await mongoose.model('users').findOne({ email });
    if (!user) throw new Error('User not found');
    const canvas = await this.create({ owner: user._id, name, elements: [], shared_with: [] });
    return canvas;
};

canvasSchema.statics.loadCanvas = async function (email, id) {
    const user = await mongoose.model('users').findOne({ email });
    if (!user) throw new Error('User not found');
    return this.findOne({ _id: id, $or: [{ owner: user._id }, { shared_with: user._id }] });
};

canvasSchema.statics.updateCanvas = async function (email, id, elements) {
    const user = await mongoose.model('users').findOne({ email });
    if (!user) throw new Error('User not found');

    const canvas = await this.findOne({ _id: id, $or: [{ owner: user._id }, { shared_with: user._id }] });
    if (!canvas) throw new Error('Canvas not found');

    canvas.elements = elements;
    await canvas.save();

    console.log("Canvas updated successfully!");
    return canvas;
};

canvasSchema.statics.updateCanvasname = async function (email, id, name) {
    const user = await mongoose.model('users').findOne({ email });
    if (!user) throw new Error('User not found');

    const canvas = await this.findOne({
        _id: id,
        $or: [{ owner: user._id }, { shared_with: user._id }]
    });

    if (!canvas) {
        throw new Error('Canvas not found');
    }

    canvas.name = name;
    await canvas.save();
    return canvas;
};

canvasSchema.statics.shareCanvas = async function (email, canvasId, sharedWithEmail) {
    const user = await mongoose.model('users').findOne({ email });
    const sharedWithUser = await mongoose.model('users').findOne({ email: sharedWithEmail });
    if (!user || !sharedWithUser) throw new Error('User not found');
    if (user.email === sharedWithEmail) throw new Error('Cannot share with yourself');

    const canvas = await this.findOne({ _id: canvasId, owner: user._id })
        .populate('owner', 'name email')
        .populate('shared_with', 'name email');
    if (!canvas) throw new Error('Canvas not found or not owned by user');

    if (canvas.shared_with.some(u => u.email === sharedWithEmail)) {
        throw new Error('Canvas already shared with this user');
    }

    canvas.shared_with.push(sharedWithUser._id);
    const savedCanvas = await canvas.save();

    // Return canvas with shared_by for consistency
    return {
        ...savedCanvas.toObject(),
        isShared: false,
        shared_by: canvas.owner
    };
};
canvasSchema.statics.deleteCanvas = async function (email, id) {
    const user = await mongoose.model('users').findOne({ email });
    if (!user) throw new Error('User not found');

    const canvas = await this.findOneAndDelete({
        _id: id,
        owner: user._id
    });

    if (!canvas) throw new Error('Canvas not found or not owned by user');
    return canvas;
};

module.exports = mongoose.model('canvas', canvasSchema);