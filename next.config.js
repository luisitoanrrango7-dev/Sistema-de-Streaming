/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },

  webpack: (config, { isServer }) => {
    // Regla para manejar archivos .node
    config.module.rules.push({
      test: /\.node$/,
      use: 'node-loader',
    });

    // Excluir 'undici' en el entorno del cliente
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        undici: false, // Excluir la dependencia 'undici'
      };
    }

    // Añadir reglas de Babel para transpilación en caso de necesitarlo
    config.module.rules.push({
      test: /node_modules\/undici\/lib\/.*\.js$/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env'],
        },
      },
    });

    return config;
  },
};

module.exports = nextConfig;
