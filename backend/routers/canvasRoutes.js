const express = require('express');
const authenticationMiddleware = require('../middlewares/authenticationMiddleware');
const {
    getAllCanvas,
    createCanvas,
    loadCanvas,
    updateCanvas,
    updateCanvasname,
    shareCanvas,
    deleteCanvas
} = require('../controllers/canvasControllers');

const router = express.Router();

router.get('/', authenticationMiddleware, getAllCanvas);
router.post('/', authenticationMiddleware, createCanvas);
router.get('/load/:id', authenticationMiddleware, loadCanvas);
router.put('/:id', authenticationMiddleware, updateCanvas);
router.put('/updatename/:id', authenticationMiddleware, updateCanvasname);
router.put('/share/:id', authenticationMiddleware, shareCanvas);
router.delete('/:id', authenticationMiddleware, deleteCanvas);

module.exports = router;