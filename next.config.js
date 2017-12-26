const isProd = process.env.NODE_ENV === `production`;

module.exports = {
  exportPathMap() {
    return {
      "/": { page: `/` }
    };
  },
  assetPrefix: isProd ? `/portal` : ``
};
