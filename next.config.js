const isProd = process.env.NODE_ENV === `production`;

module.exports = {
  exportPathMap() {
    return {
      "/": { page: `/` },
      "/orders": { page: `/orders` },
      "/trading": { page: `/trading` },
      "/lending": { page: `/lending` },
      "/bounties": { page: `/bounties` }
    };
  },
  assetPrefix: isProd ? `/portal` : ``
};
