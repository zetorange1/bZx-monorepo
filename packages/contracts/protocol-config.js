module.exports = {
  addresses: {
    development: {
      ZeroEx: {
        ExchangeV1: "0xe86bb98fcf9bff3512c74589b78fb168200cc546",
        ExchangeV2: "0x48bacb9266a570d521063ef5dd96e61686dbe788",
        ERC20Proxy: "0x1dc4c1cefef38a777b15aa20260a54e584b16c48",
        ERC721Proxy: "0x1d7022f5b17d2f8b695918fb48fa1089c9f85401",
        ZRXToken: "0x871dd7c2b4b25e1aa18728e9d5f2af4c4e431f5c",
        AssetProxyOwner: "0x34d402f14d58e001d8efbe6585051bf9706aa064",
        TokenTransferProxy: "0xb69e673309512a9d726f87304c6984054f87a93b",
        WETH9: "0x0b1ba0af832d7c05fd64161e0db78e85978e8082"
      },
      KyberContractAddress: "0x0000000000000000000000000000000000000000",
      DAITokenAddress: "",
    },
    ropsten: {
      ZeroEx: {
        ZRXToken: "0xff67881f8d12f372d91baae9752eb3631ff0ed00",
        EtherToken: "0xc00fd9820cd2898cc4c054b7bf142de637ad129a",
        ExchangeV1: "0x479cc461fecd078f766ecc58533d6f69580cf3ac",
        TokenRegistry: "0x6b1a50f0bb5a7995444bd3877b22dc89c62843ed",
        TokenTransferProxy: "0x4e9aad8184de8833365fea970cd9149372fdf1e6",
        WETH9: "0xc778417e063141139fce010982780140aa0cd5ab",
        ExchangeV2: "0x4530c0483a1633c7a1c97d2c53721caff2caaaaf",
        ERC20Proxy: "0xb1408f4c245a23c31b98d2c626777d4c0d766caa",
        ERC721Proxy: "0xe654aac058bfbf9f83fcaee7793311dd82f6ddb4",
        AssetProxyOwner: "0xf5fa5b5fed2727a0e44ac67f6772e97977aa358b"
      },
      ENS: {
        Registry: "0x112234455c3a32fd11230c42e7bccd4a84e02010",
        Resolver: "0x9C4c3B509e47a298544d0fD0591B47550845e903"
      },
      OracleNotifier: "0xe09011af509f72c46312ebabceabc7c5ea7e6991",
      KyberContractAddress: "0x818E6FECD516Ecc3849DAf6845e3EC868087B755", // "0x2a21728dF01992cCEE34ad8f9c32A0a2AE1e181b", // old: "0xD19559B3121c1b071481d8813d5dBcDC5869e2e8", // old: "0x0a56d8a49E71da8d7F9C65F95063dB48A3C9560B", // Ropsten (https://ropsten.kyber.network)
      BZRXToken: "0xf8b0b6ee32a617beca665b6c5b241ac15b1acdd5", //"0x6f47868CCa96DFfFb6dE50Be22ee11aAADd96EF9", //"0xa890bbffea779fd4ff9d28469cfc8f2d35bc620d", //"0x14823Db576c11e4a54Ca9E01Ca0b28b18D3d1187",
      BZRXTokenSale: "0x450e617b88366fde63c18880acbdeb35a5812eee",
      BZxEther: "0xa3eBDf66e0292F1d5FD82Ae3fcd92551Ac9dB081",
      MultiSig: "0x35b94649Bd03D13eF08e999127351Cc52286473C",
      TokenizedRegistry: "0xd03eea21041a19672e451bcbb413ce8be72d0381", // old: "0xaa5c713387972841995553c9690459596336800b",
      DAITokenAddress: "0xad6d458402f60fd3bd25163575031acdce07538d", // Kyber DAI
      WBTCTokenAddress: "0x95cc8d8f29d0f7fcc425e8708893e759d1599c97" // Kyber ENG
    },
    kovan: {
      ZeroEx: {
        ZRXToken: "0x2002d3812f58e35f0ea1ffbf80a75a38c32175fa",
        EtherToken: "0x05d090b51c40b020eab3bfcb6a2dff130df22e9c",
        ExchangeV1: "0x90fe2af704b34e0224bf2299c838e04d4dcf1364",
        TokenRegistry: "0xf18e504561f4347bea557f3d4558f559dddbae7f",
        TokenTransferProxy: "0x087eed4bc1ee3de49befbd66c662b434b15d49d4",
        WETH9: "0xd0a1e359811322d97991e03f863a0c30c2cf029c",
        ExchangeV2: "0x35dd2932454449b14cee11a94d3674a936d5d7b2",
        ERC20Proxy: "0xf1ec01d6236d3cd881a0bf0130ea25fe4234003e",
        ERC721Proxy: "0x2a9127c745688a165106c11cd4d647d2220af821",
        AssetProxyOwner: "0x2c824d2882baa668e0d5202b1e7f2922278703f8"
      },
      ENS: {
        Registry: "0x9590A50Ee1043F8915FF72C0aCC2Dbc600080d36",
        Resolver: "0x44b92B8F27abAC2ebc9d0C4fa6fF0EEd4E98ba79"
      },
      OracleNotifier: "0xc406f51A23F28D6559e311010d3EcD8A07696a45",
      KyberContractAddress: "0x692f391bCc85cefCe8C237C01e1f636BbD70EA4D", // Kovan
      BZRXToken: "0xe3e682A8Fc7EFec410E4099cc09EfCC0743C634a",
      BZxEther: "0xd0a1e359811322d97991e03f863a0c30c2cf029c",
      MultiSig: "",
      TokenizedRegistry: "0xF1C87dD61BF8a4e21978487e2705D52AA687F97E",
      LoanTokenSettings: "0x6eb52a9366527a62dc4acddab97fb170e50f77c4",
      DAITokenAddress: "0xC4375B7De8af5a38a93548eb8453a498222C4fF2",
      KNCTokenAddress: "0xad67cB4d63C9da94AcA37fDF2761AaDF780ff4a2",
    },
    rinkeby: {
      ZeroEx: {
        ZRXToken: "0x2727e688b8fd40b198cd5fe6e408e00494a06f07",
        EtherToken: "0xc778417e063141139fce010982780140aa0cd5ab",
        ExchangeV1: "0x1d16ef40fac01cec8adac2ac49427b9384192c05",
        TokenRegistry: "0x4e9aad8184de8833365fea970cd9149372fdf1e6",
        TokenTransferProxy: "0xa8e9fa8f91e5ae138c74648c9c304f1c75003a8d",
        WETH9: "0xc778417e063141139fce010982780140aa0cd5ab",
        ExchangeV2: "0x22ebc052f43a88efa06379426120718170f2204e",
        ERC20Proxy: "0x3e809c563c15a295e832e37053798ddc8d6c8dab",
        ERC721Proxy: "0x8e1ff02637cb5e39f2fa36c14706aa348b065b09",
        AssetProxyOwner: "0x1da52d1d3a3acfa0a1836b737393b4e9931268fc"
      },
      KyberContractAddress: "0x39CC6802cF1625C30548B57D885932CB381EB4a4",
      BZRXToken: "0xb70ce29af9de22e28509cdcf3e0368b5a550548a",
      BZxEther: "0xc778417e063141139fce010982780140aa0cd5ab",
      MultiSig: "",
      DAITokenAddress: "0x55080ac40700bde5725d8a87f48a01e192f660af", // KNC (no DAI on Kovan Rinkeby)
    },
    mainnet: {
      ZeroEx: {
        ZRXToken: "0xe41d2489571d322189246dafa5ebde1f4699f498",
        EtherToken: "0x2956356cd2a2bf3202f771f50d3d14a367b48070",
        ExchangeV1: "0x12459c951127e0c374ff9105dda097662a027093",
        TokenRegistry: "0x926a74c5c36adf004c87399e65f75628b0f98d2c",
        TokenTransferProxy: "0x8da0d80f5007ef1e431dd2127178d224e32c2ef4",
        WETH9: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        ExchangeV2: "0x080bf510fcbf18b91105470639e9561022937712",
        ERC20Proxy: "0x95e6f48254609a6ee006f7d493c8e5fb97094cef",
        ERC721Proxy: "0xefc70a1b18c432bdc64b596838b4d138f6bc6cad",
        AssetProxyOwner: "0xdffe798c7172dd6deb32baee68af322e8f495ce0"
      },
      ENS: {
        Registry: "0x314159265dd8dbb310642f98f50c066173c1259b",
        Resolver: "0xD3ddcCDD3b25A8a7423B5bEe360a42146eb4Baf3"
      },
      BZxVault: "0x8b3d70d628ebd30d4a2ea82db95ba2e906c71633",
      OracleNotifier: "0x6d20ea6fe6d67363684e22f1485712cfdccf177a",
      KyberContractAddress: "0x818e6fecd516ecc3849daf6845e3ec868087b755", // Mainnet (https://kyber.network/swap)
      KyberRegisterWallet: "0xECa04bB23612857650D727B8ed008f80952654ee",
      BZRXToken: "0x1c74cff0376fb4031cd7492cd6db2d66c3f2c6b9", //"0xe23d55af1646a65c1504f69e3d485c1d6da68e94", //"0x13939ac9F1e0F99872fA873B6E00DE9248ac95A0",
      BZRXTokenSale: "0x0b12cf7964731f7190b74600fcdad9ba4cac870c",
      BZxEther: "0x96CCe310096755f69594212d5D5fB5485577E7d1",
      MultiSig: "",
      TokenizedRegistry: "0xd8dc30d298ccf40042991cb4b96a540d8affe73a",
      LoanTokenSettings: "0x09b4611e07506468b398fabf2c271d97684b022d",
      BZxOraclePriceFeed: "0x61bd75708f516fb682ff1350390316268ddd5781",
      DAITokenAddress: "0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359",
      USDCTokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      WBTCTokenAddress: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
      BATTokenAddress: "0x0d8775f648430679a709e98d2b0cb6250d2887ef",
      KNCTokenAddress: "0xdd974d5c2e2928dea5f71b9825b8b646686bd200",
      MKRTokenAddress: "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2",
      REPTokenAddress: "0x1985365e9f78359a9b6ad760e32412f4a445e862",
      ZRXTokenAddress: "0xe41d2489571d322189246dafa5ebde1f4699f498",
      LINKTokenAddress: "0x514910771af9ca656af840dff83e8264ecf986ca"
    }
  }
};
