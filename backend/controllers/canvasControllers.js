const mongoose = require('mongoose'); // Added to fix "mongoose is not defined"
const Canvas = require('../models/canvasModel');

const getAllCanvas = async (req, res) => {
    const email = req.user.email;
    try {
        const canvases = await Canvas.getAllCanvas(email);
        res.status(200).json(canvases);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const createCanvas = async (req, res) => {
    const email = req.user.email;
    const { name } = req.body;
    try {
        const canvas = await Canvas.createCanvas(email, name);
        res.status(201).json(canvas);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const loadCanvas = async (req, res) => {
    const email = req.user.email;
    const id = req.params.id;
    try {
        const canvas = await Canvas.loadCanvas(email, id);
        if (!canvas) throw new Error("Canvas not found");
        res.status(200).json(canvas);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const updateCanvas = async (req, res) => {
    const email = req.user?.email;
    const id = req.params.id;
    const { elements } = req.body;
    try {
        const canvas = await Canvas.updateCanvas(email, id, elements);
        res.status(200).json(canvas);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const updateCanvasname = async (req, res) => {
    const email = req.user.email;
    const id = req.params.id;
    const { name } = req.body;
    try {
        const canvas = await Canvas.updateCanvasname(email, id, name);
        res.status(200).json(canvas);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const shareCanvas = async (req, res) => {
    const email = req.user.email;
    const id = req.params.id;
    const { shared_with } = req.body;
    try {
        const canvas = await Canvas.shareCanvas(email, id, shared_with);
        res.status(200).json(canvas);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const deleteCanvas = async (req, res) => {
    const email = req.user.email;
    const id = req.params.id;
    try {
        const user = await mongoose.model('users').findOne({ email });
        if (!user) throw new Error('User not found');
        const canvas = await Canvas.findOneAndDelete({ _id: id, owner: user._id });
        if (!canvas) throw new Error('Canvas not found or not owned by user');
        res.status(200).json({ message: 'Canvas deleted successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    getAllCanvas,
    createCanvas,
    loadCanvas,
    updateCanvas,
    shareCanvas,
    updateCanvasname,
    deleteCanvas
};