module.exports = {
  exportPathMap() {
    return {
      "/": { page: `/` },
      "/orders": { page: `/orders` },
      "/trading": { page: `/trading` },
      "/lending": { page: `/lending` },
      "/bounties": { page: `/bounties` }
    };
  }
};
