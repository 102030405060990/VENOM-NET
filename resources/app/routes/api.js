const express = require('express');
const router = express.Router();

// Controllers
const aiController = require('../controllers/aiController');
const disksController = require('../controllers/disksController');
const browseController = require('../controllers/browseController');
const listController = require('../controllers/listController');
const staticController = require('../controllers/staticController');
const adsController = require('../controllers/adsController');
const { findFolderPoster, fileUrl } = require('../services/staticService');

// AI routes
router.post('/ai/chat', aiController.chat);

// Disks routes
router.get('/disks', disksController.getDisks);
router.post('/disks', disksController.saveDisks);

// Browse routes
router.get('/browse-roots', browseController.getRoots);
router.post('/browse-folder', browseController.browseFolder);

// List routes
router.post('/list', listController.list);

// Ads routes
router.get('/ads', adsController.getAds);
router.post('/ads', adsController.saveAds);
router.post('/ads/reset', adsController.resetAds);
router.post('/import-selected-file', adsController.importSelectedFile);

// Poster routes
router.post('/poster', (req, res) => {
	const folderPath = req.body?.path;
	if (!folderPath) return res.json({ poster: null });
	const posterPath = findFolderPoster(folderPath);
	return res.json({ poster: posterPath ? fileUrl(posterPath) : null });
});

// Static file routes
router.get(/\/static\/(.*)/, staticController.serveStatic);

module.exports = router;