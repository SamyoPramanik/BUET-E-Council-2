const express = require('express');
const app = express();
const router = express.Router();
router.use((req, res, next) => {
    console.log("Middleware params:", req.params);
    console.log("Middleware path:", req.path);
    next();
});
router.put('/:id', (req, res) => {
    res.send("OK");
});
app.use('/agendas', router);
const request = require('supertest');
request(app).put('/agendas/123').end((err, res) => {
    if (err) throw err;
    process.exit(0);
});
