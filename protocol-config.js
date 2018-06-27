module.exports = {
	"addresses": {
		"development": {
			"ZeroEx": {
				"ZRXToken": "0x1d7022f5b17d2f8b695918fb48fa1089c9f85401",
				"EtherToken": "0x871dd7c2b4b25e1aa18728e9d5f2af4c4e431f5c",
				"Exchange": "0x48bacb9266a570d521063ef5dd96e61686dbe788",
				"TokenRegistry": "0x0b1ba0af832d7c05fd64161e0db78e85978e8082",
				"TokenTransferProxy": "0x1dc4c1cefef38a777b15aa20260a54e584b16c48",
				"WETH9": "0x871dd7c2b4b25e1aa18728e9d5f2af4c4e431f5c"
			},
			"KyberContractAddress": "0x0000000000000000000000000000000000000000",
		},
		"ropsten": {
			"ZeroEx": {
				"ZRXToken": "0xa8e9fa8f91e5ae138c74648c9c304f1c75003a8d",
				"EtherToken": "0xc00fd9820cd2898cc4c054b7bf142de637ad129a",
				"Exchange": "0x479cc461fecd078f766ecc58533d6f69580cf3ac",
				"TokenRegistry": "0x6b1a50f0bb5a7995444bd3877b22dc89c62843ed",
				"TokenTransferProxy": "0x4e9aad8184de8833365fea970cd9149372fdf1e6",
				"WETH9": "0xc778417e063141139fce010982780140aa0cd5ab"
			},
			"KyberContractAddress": "0x2a21728dF01992cCEE34ad8f9c32A0a2AE1e181b", // old: "0xD19559B3121c1b071481d8813d5dBcDC5869e2e8", // old: "0x0a56d8a49E71da8d7F9C65F95063dB48A3C9560B", // Ropsten (https://ropsten.kyber.network)
			"B0XToken": "0x14823Db576c11e4a54Ca9E01Ca0b28b18D3d1187",
		},
		"kovan": {
			"ZeroEx": {
				"ZRXToken": "0x6ff6c0ff1d68b964901f986d4c9fa3ac68346570",
				"EtherToken": "0x05d090b51c40b020eab3bfcb6a2dff130df22e9c",
				"Exchange": "0x90fe2af704b34e0224bf2299c838e04d4dcf1364",
				"TokenRegistry": "0xf18e504561f4347bea557f3d4558f559dddbae7f",
				"TokenTransferProxy": "0x087eed4bc1ee3de49befbd66c662b434b15d49d4",
				"WETH9": "0xd0a1e359811322d97991e03f863a0c30c2cf029c"
			},
			"KyberContractAddress": "0x11542D7807DFb2B44937F756b9092c76e814F8eD", // Kovan
			"B0XToken": "0xe8b6a7FA1976bA6C2D3DD81F063Eb25d521186bb", // old: "0xd0c640eEd54c3877ABb958fa9753F50900325fC5",
		},		
		"rinkeby": {
			"ZeroEx": {
				"ZRXToken": "0x00f58d6d585f84b2d7267940cede30ce2fe6eae8",
				"EtherToken": "0xc778417e063141139fce010982780140aa0cd5ab",
				"Exchange": "0x1d16ef40fac01cec8adac2ac49427b9384192c05",
				"TokenRegistry": "0x4e9aad8184de8833365fea970cd9149372fdf1e6",
				"TokenTransferProxy": "0xa8e9fa8f91e5ae138c74648c9c304f1c75003a8d",
				"WETH9": "0xc778417e063141139fce010982780140aa0cd5ab"
			},
			"KyberContractAddress": "", // Rinkeby
			"B0XToken": "0xd0c640eEd54c3877ABb958fa9753F50900325fC5",
		},
		"mainnet": {
			"ZeroEx": {
				"ZRXToken": "",
				"EtherToken": "",
				"Exchange": "",
				"TokenRegistry": "",
				"TokenTransferProxy": "",
				"WETH9": ""
			},
			"KyberContractAddress": "0x964f35fae36d75b1e72770e244f6595b68508cf5", // Mainnet (https://kyber.network)
			"B0XToken": "",
		},
	}
}