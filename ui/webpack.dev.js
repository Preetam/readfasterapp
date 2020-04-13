module.exports = {
    mode: "development",
    entry: __dirname + "/src/index.js",
    output: {
        path: __dirname + '/public/js',
        filename: "app.js"
    },
    module: {
        rules: [{
            test: /\.css$/i,
            use: ['style-loader', 'css-loader'],
        }],
    },
}
