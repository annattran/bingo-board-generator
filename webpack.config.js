const path = require('path');

module.exports = {
    mode: 'production',
    target: 'node',
    context: path.resolve(__dirname, 'netlify-functions'),
    module: {
        rules: [
            {
                test: /\.js$/,
                // Exclude node_modules except for packages that need transpiling
                exclude: /node_modules\/(?!(firebase-admin|google-logging-utils|@fastify\/busboy)\/).*/,
                use: {
                    loader: 'babel-loader'
                    // Babel will use your babel.config.js or .babelrc automatically
                }
            }
        ]
    },
    resolve: {
        alias: {
            'node:events': 'events',
            'node:util': 'util',
            'node:process': 'process',
            'node:stream': 'stream'
        },
        extensions: ['.js']
    },
    // Mark built‑in Node modules as external so they aren't bundled
    externals: {
        'node:stream': 'commonjs stream'
    }
};
