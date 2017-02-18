module.exports = {
    output: {
        filename: "bundle.js"
    },
    devtool: "source-map",
    resolve: {
        extensions: [".ts", ".tsx", ".js"],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: [/node_modules/],
                use: [
                    {
                        loader: "babel-loader",
                        options: {
                            presets: ['es2015'],
                            plugins: ['transform-runtime']
                        }
                    },
                    {
                        loader: "awesome-typescript-loader"
                    }
                ]
            }
        ]
    },
    externals: {
        "PIXI": "pixi"
    }
}