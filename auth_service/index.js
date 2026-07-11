const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./swagger');
const authRoutes = require('./routes');

const app = express();
const port = process.env.PORT || 8000;

// Behind nginx (single reverse proxy hop) — trust its X-Forwarded-For/X-Real-IP
// so req.ip resolves to the actual client IP instead of the nginx container IP.
app.set('trust proxy', 1);

app.use(cors({ origin: true, credentials: true })); // Needs credentials for cookies
app.use(express.json());
app.use(cookieParser());

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Main Auth Routes
app.use('/api/auth', authRoutes);

// Swagger Documentation Route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Auth service running on port ${port}`);
    });
}

module.exports = app;
