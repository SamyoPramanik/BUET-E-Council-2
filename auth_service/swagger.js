const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'BUET E-Council Auth Service API',
            version: '1.0.0',
            description: 'API documentation for the Authentication Service with robust session management.',
        },
        servers: [
            {
                url: 'http://localhost:8000/api/auth',
                description: 'Local Development Server',
            },
        ],
        components: {
            securitySchemes: {
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'session_token',
                    description: 'Session cookie generated on /signin',
                }
            }
        },
        security: [
            {
                cookieAuth: []
            }
        ]
    },
    apis: ['./routes.js'], // Ensure routes.js is in the same directory and contains annotations
};

const specs = swaggerJsdoc(options);

module.exports = specs;
