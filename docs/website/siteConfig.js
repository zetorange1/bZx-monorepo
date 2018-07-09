/**
 * Copyright (c) 2017-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// See https://docusaurus.io/docs/site-config.html for all the possible
// site configuration options.

/* List of projects/orgs using your project for the users page */
const users = [

];

const siteConfig = {
    title: 'bZx network' /* title for your website */,
    subTitle: 'Protocol contracts' /* subtitle for your website */,
    githubRepository: 'https://github.com/bZxNetwork/protocol_contracts' /*product repository */,
    githubCompanyRepository: 'https://github.com/bZxNetwork' /*company repository */,
    contactUs: 'https://bZx.network/' /* contact us */,
    medium: 'https://medium.com/@bZxNet' /* medium */,
    twitter: 'https://twitter.com/bZxNet' /* twitter */,
    stackoverflow: 'https://stackoverflow.com/search?q=protocol+contracts+solidity' /* stackoverflow tags */,
    tagline: 'Documentation for Protocol and Oracle Integration',

    url: 'https://bZxNetwork.github.io/protocol_contracts/' /* your website url */,
    baseUrl: '/protocol_contracts/' /* base url for your project */,
    projectName: 'protocol_contracts',

    // Used for publishing and more
    organizationName: 'bZxNetwork',

    // For top-level user or org sites, the organization is still the same.
    // e.g., for the https://JoelMarcey.github.io site, it would be set like...
    //   organizationName: 'JoelMarcey'

    // For no header links in the top nav bar -> headerLinks: [],
    headerLinks: [
        {doc: 'migrations_Migrations', label: 'Contracts Docs'}
    ],

    // If you have users set above, you add it here:
    users,

    /* path to images for header/footer */
    // headerIcon: 'img/docusaurus.svg',
    // footerIcon: 'img/docusaurus.svg',
    favicon: 'img/favicon.jpg',

    /* colors for website */
    colors: {
        primaryColor: '#2979ff',
        secondaryColor: '#FFFFFF',
    },

    /* custom fonts for website */
    /*fonts: {
      myFont: [
        "Times New Roman",
        "Serif"
      ],
      myOtherFont: [
        "-apple-system",
        "system-ui"
      ]
    },*/

    // This copyright info is used in /core/Footer.js and blog rss/atom feeds.
    copyright:
    'Copyright © ' +
    new Date().getFullYear() +
    ' bZx',

    highlight: {
        // Highlight.js theme to use for syntax highlighting in code blocks
        theme: 'default',
    },

    // Add custom scripts here that would be placed in <script> tags
    scripts: ['https://buttons.github.io/buttons.js'],

    /* On page navigation for the current documentation page */
    onPageNav: 'separate',

    /* Open Graph and Twitter card images */
    ogImage: 'img/docusaurus.png',
    twitterImage: 'img/docusaurus.png',

    // You may provide arbitrary config keys to be used as needed by your
    // template. For example, if you need your repo's URL...
    //   repoUrl: 'https://github.com/facebook/test-site',
};

module.exports = siteConfig;
