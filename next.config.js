const isProd = process.env.NODE_ENV === `production`;

module.exports = {
  exportPathMap() {
    return {
      "/": { page: `/` },
      "/orders": { page: `/orders` }
    };
  },
  assetPrefix: isProd ? `/portal` : ``
};
