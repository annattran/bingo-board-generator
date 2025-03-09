module.exports = {
    presets: [
        ['@babel/preset-env', { targets: { node: '18' } }]  // Update to Node 18 for compatibility with Netlify's Node version
    ],
    plugins: [
        '@babel/plugin-proposal-optional-chaining',
        '@babel/plugin-proposal-nullish-coalescing-operator'
    ]
};
