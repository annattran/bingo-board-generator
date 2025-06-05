const path = require('path');

module.exports = {
    mode: 'production',
    target: 'node',
    context: path.resolve(__dirname, 'netlify-functions'),
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: (modulePath) => {
                    // Exclude all node_modules except specific ones
                    return /node_modules/.test(modulePath) &&
                        !/firebase-admin|google-logging-utils|@fastify\/busboy/.test(modulePath);
                },
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                        plugins: ['@babel/plugin-transform-optional-chaining']
                    }
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
    externals: {
        'node:stream': 'commonjs stream'
    }
};
