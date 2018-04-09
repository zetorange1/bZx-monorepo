

// This script should be called with: truffle exec ./add_tokens.js --network ropsten

var TokenRegistry = artifacts.require("./TokenRegistry.sol");

const tokens = [
    {
        "address": "0x04A34c8f5101Dcc50bF4c64D1C7C124F59bb988c",
        "name": "Basic Attention Token",
        "symbol": "BAT",
        "decimals": "18",
        "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAhhJREFUeAGslgOsHVEQhqc24hsUUd3GqM3gmUHtNqpt27atoN6gtm3b1t+dZLOb033n3Znb+yff5ehozpJUSKOCSKHmSKQ5Lg6S6LrLR4/r/Bv/xzZsS2rZE0eQTHORSO9dIOQ9+7Bv7Il7UiEk0kiXTy6IEfYdybH0o06io8pkdjiWdDaQQjVch4fsGFc4ZhpVF4xcmVxfRMS+5tppzywBtImolyPHPeFtOKjYNglwVsUyGyNDU6/e7d0qAj9/AH/+AP1qqU+HsRTeOYeKM3vg69YpICmvyp9zBh1O12SAsYkIaU5H7Sy859zktVeISSsMPL+LkN69ALJLq4rg3OT1dohZNwxW7ZqhnYU5XIAjduhYHvj2Bb5ePwGe3oavXz+BnlU1BTjk3WQQcXQrDE3JAka2gqHzBzQ94ToX8FFkPKxpKJG1sPEp0gI+ygpIKQA8vApffP57VA7+71AW+PoJvp7fA9KLSIr4IFuCZb1haMv4sM2KfjC0bphoCaJvQu71Xz7A18sHQEaxnGfpwRX4+vaFZ0awCaMdQ2clDI1PttsOagBDhzcJjmFujah/bRjivv/gcq7wUTQ0uGGURmRrxdzbb5/Bf+veRSA5n7UV2y+jeV0QNy3sab2M7NcxO60bFrB2qMmaIf8w2GT1oID5Xe3Xsf6BJC78XRPlTTIEprhJRv9G6cA3ywe+Y0L/rtlQ6ZzSv3sOAIw+bOio9aIiAAAAAElFTkSuQmCC"
    },
    {
        "address": "0x7174FCb9C2A49c027C9746983D8262597b5EcCb1",
        "name": "AELF",
        "symbol": "ELF",
        "decimals": "18",
        "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAABGdBTUEAALGPC/xhBQAAAUFQTFRFAAAANWC/LF68K2G+K168VYDVLF+7K167LF+8K168SW3bLF67LF+7LF68K168LF68LWC7K1+8K167////9Pb7OWm/OGi/QG7B1N7x+fr93OX0v8/q1uDx9vj8NGS9/P3+U3zILmC8/f3+4ej1bpHQ3ub0L2G89ff7RXLD+/z9zdnvq7/kR3PELV+7V3/JgJ/WnbXf5uz3iKTYrsHlg6DX4Of1iKXZLF+7nLTfb5HQcJLRMmO9+Pn8aY3PwtDrSXXEXoXLTXfFP23BQm/ChqPY2OHy4+r2NWa+5+33vc3pOWi/6/D4RnLD6e74jKfaQW/C0NvwNma+la7d4un1t8joNGW+vMzplq/daIzOusvpztrvZorN/v7+objheZnUPmzBYIbMx9TtS3bFlK7cQ3DDucnomrLebZDQa47Ph6TYM2S9+vxWzgAAABJ0Uk5TABiVR4IGlvG/2Qf0x+PzLi3yF7FCfwAAAW1JREFUeF6Fk2WTgzAQhilQChXublN1dzl3d3d31///A45sM5DSzvB82dnZN9lkRbBwS6Kq6bqmipJb6MWleMDEo7hsYa/sgy58srfruB968HOXDASgD4FB8zwf5xUulp+7f3o8mEhbWTrvkMFikRAyZbkyJsD3T5yUzloAs4bgiPsLTaJQZ4wYjADkbjN3YbBQjPphfSapYOEZAFrA43ELEjqjhDIDjEgIGJIgom2goLaxvNIGKBryZBsQUVDRni4REp2bb9ZJvlpEcWwVA6qgQYe1dWr2Nre2dwiyiwFN0MHGB+mwj55uFxw0I0xwiP6QmSJ0TE22kgqdE+SCpVDRXl4RUrrO3sRrhfT9A41XquyRItpHQkk9QRkAXpL52OsbICIrVAEF78BIl4EhsVInaTwY7lNq1qxh1qzWZ6ZuaxZr93A0/pUD+La32z4wP4bglx8Y+8hBI5j440bOaWgdx955cZxXz3l5Hdf/H4Z3SS/niA4vAAAAAElFTkSuQmCC"
    },
    {
        "address": "0xd3c64BbA75859Eb808ACE6F2A6048ecdb2d70817",
        "name": "Eos",
        "symbol": "EOS",
        "decimals": "18",
        "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAA2VJREFUeAGs0y9oh0AUB/BZfjaz1axb70XQpj2KUSyaNByIHfF6t0cx2qN5Pcjs332RrWwI78QHHzgEz/fPN4N4UUgjLbTR14+NFhoppBc9Fi5p2glCO2ly6XbYpOgg3HSQIvtO1SvhIatJNz7oU3Jx13Xo+16YxHnnu6By2cd938c8z5imCUEQmCThXs5c2nbHcTAMA4qiQFmW55nPxOO42gklnWlVVUjTFFmWIc9zJEmCuq5NdkL9a71026MoQtu2sCzrN4Hz3DQN4jgW/x1/R6ElL3qeB601viUkJATmr1q16v/atWvBbEFBQbCckpISsY6YBuC0CjRWDYIofn8VgKSCCimFokgJKFSoQpQqlUApUKiCEhSqSilVIRQg9QA91L0PMNcZLInPurHanT1r59s5c2aEwsmIjEajofl8Tj6fj9cGg4EOhwMPo9HINq/XyxitVisrVqyYURmPl8slNRoNsQb5EI5YLEbtdlvY6/U6rVYr2VeIwoGtDBhM7/f7PHe5XPylPz8/PGazGacl9rrdLu12O1kHcDeKiDJQrVbT5XKh4/GIOcRHhAIDc9hUKhUwwCJkMg7gblQyZaDT6WTmdzodSiaTNBgMvjB4HewhRbEvKU64G+VUGZhIJCifz1M4HKbH40EWi+ULYzabeS8SiVA2m6VUKiXjwF8pB0A4v9/PTrxeL8T9CwPb8/mkQqHAIRHEVB5/pEKA/Eba7fd7Gg6H5PF4vjBut5tGoxET0GQy4V86BIok1Ov1nFbNZpOfFWlXq9W+cNVqleLxOPOg1WrRYrGA0zIkVE7DYDAInWcnfn9/SafT4UUgvwKD+Xa7hbPAQDOYjKFQSCoNFYWoVCrRZrOBI8I2Ho/J4XCItd1uR28g1oFAgM+Uy2UpIVKUYnzNdDr9sCEUxWJRrEHOdDr9gcGZ9XotI8XKxQg/xL9SqYiBCni/38X6drvB9oHBi+CnVIxkyjG+FBeg5iPHxTidTii/PM7n88cesDiDs0rlWLohgfAg7r1eTzAbYpPJZLgxyeVyokKiFgBrtVplGhL5lgxMj0ajyG/mgM1mo8lkghqAOWzYQ5oCK9GS/WdTisYDygiSvd9vul6vcAQ2NCqyTem/UdIsR9SAMGBiYkJhs5z+HRP6d82GSueU/t1zAHfXFzNtarKlAAAAAElFTkSuQmCC"
    },
    {
        "address": "0x6B07b8360832c6bBf05A39D9d443A705032bDc4d",
        "name": "Gifto",
        "symbol": "GTO",
        "decimals": "5",
        "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABGdBTUEAALGPC/xhBQAAAgJJREFUeAHNlwOMnFEUhSdqY6Oxa8duVLth7Qa1o9q2bdu2bdvGWt/+J2u897/lm5uc3Zm5Os/3RlxlTA0qjK1KozFVWDimKqcDPA3wPwP6zGnpZCPb8IjuiSsFgRcF+Du6CrhAtvKRb7ETz2tCxSDIuDFVibEks0K+iqFYRR91VS4rSGlAsZxnY0xNages38uxNKGY46pSy2G9SyG5hYRyGNfcNu2luRyF7gltFpvjpPrw4R78eAO7RhTUH5kCfz7D8/MwtnroTIwrMPVhu33/aHh3Czb2gbi/sHNYju7ELPj7BVZ3hm8vYUu/8NORZyl0ZsOmbmk7SIiBdd1hfQ+I/w+zGsCStpAYB4tbwaoOkBgLi1o67YdF2Tec6ZLZPRLe3IB3t4WM4GlpGUuRlAB/PsH/7xD/D97fgdQUkcmxf30Vdgy1XFa6MXV1mljG/MQqhyfBxZVYJfaXeRaUW9O/0GRwdCr8fKvNVTi2DoDDE836X+/h2DTrMiyM6BHRFx9QbhF4ajNKScYo2iMn52CUn+9CCTwVgf8eCfz3TeBfVCzBaY8ETmccQ08ElDvjIvJEQLmtV7EQ+8tO4NRcjPLpoWLYr+LQx+jm9uITkM7+GDk8xxPrZ5CI++NO4P8PuLACxtawP8eOBUnpQ7m8l2Rei1KvZbnXxsRraxa1zan39jwd5puxRXXhIWUAAAAASUVORK5CYII="
    },
    {
        "address": "0xE5585362D0940519d87d29362115D4cc060C56B3",
        "name": "KyberNetwork",
        "symbol": "KNC",
        "decimals": "18",
        "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAAXNSR0IArs4c6QAAARRQTFRFAAAAK6qqJJK2IJWVHI6THJCWGYyTGo2TGoyTGo2SGIyTGI2SGY2TGYySGI2SGIySGI2TGIyS////GIySxeLju93eyeTlKZSaTqerutze5fLz9fr6+Pv8/P39/f7+/v7+UqmtHI6UV6uvW62xXq+zY7G1ZbK2ZrO3abS4bLW5bra6cbi8dbq+eLu/eLy/e73BfL7BgL/DhMLFiMPHicTHisTHk8nMmMzOnc7QodDSpNHUp9PVstnbtdrcHo+UIJCVvN7fvd7gv9/hJ5OZxeLkGYyS0Ojp0+nq1Onq1urr2Ozt4vHx4/HyOZyh5/Pz6/X17fb27vb3O52i9vr79/v7QKCl+vz8+/39RqOnG42TT6esUaiswOaskwAAABJ0Uk5TAAYHGC0uR4KVlr/H2ePx8vP009oDlQAAAUpJREFUeF6F02V7hDAMAODCbdhxNy4Fzm3u7u7uLv//fwxrGsaeh3yEt0mbpkyGohmW7Ti2ZWgKy0bBLHOMsln4A1S9wlNR0dXU8iLPRJEkGSzxf6I0gOvl/69JKpIcKsm/4++ekCrxPnSOsQE+NHpS6FEBuf8VCAB01vt4lrCIiX4eIgBw/iyEyZiC/ZnoCgD3I6JjCtMwwQIk4Mm9WBUfNWYgmIrBg3sFsCyAwSwEvQA0N93r0C0KYDEbwV0AbteaEMasADZzEBxEJY5eQjAtgEMAfwwBHLYCMC7AECnBLyMA3jvAqCxhSeDFoOt9wLDcpCHBVgygU29/y2NqEswlANr1N2wUaTX/eU0A7NWw1fSy+FICtvfJZdHr5l4IWjOcXHd6YKoNH24+ycBkRq52elylI5cZWj52Roc2d+zzH07+08t/vLnP/xdtRUTru8qhgAAAAABJRU5ErkJggg=="
    },
    {
        "address": "0xf5E314c435B3B2EE7c14eA96fCB3307C3a3Ef608",
        "name": "MANA",
        "symbol": "MANA",
        "decimals": "18",
        "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAABGdBTUEAALGPC/xhBQAAAZ5QTFRFAAAAv7+1wLavwrewwLawwLawv7awwLawwLavwLax1dXVwLWwwLav27a2wLavwbWwwrexwLWwv7Wv9vX0wbex4d3a9fPy49/cx7657erp9PPy9/b16ufl8e/t19DN9PLxw7q08e/u1s/Lwrmz5uLg9fTzzcbB0MnEzcXA7+3swbey8O7txLu16+jm9vT03tnW5ODe39rX1M3Jy8O+wriz8/HwysK908zI5+Ph2NLP0MjE3NfUw7m0////6eXj1tDM9fPzxby33djV7+3rwLex1c7K+Pf2xLu24t3azMS/+vr519HOycC74t3b19HN5eHf8vHv6ebk083Jxbu24dzZ9/b229bT2tTRwriy0crF8vDv/fz81s/M4t7b+Pf30MnF8O7sxr24xLq11c/L2NLOzsfC3djU0cnFzcXB7uzq8/Lx7evpzMTA/Pv72tXR7Oro+fn4z8jD0svG/f396OTi/Pz8xby229bS5uLf1M7K7Ono3dfU4NvY0crGyL+63NbTz8fD7+zr4NzZ4NvZ0svH7Onn+Pj3wLaw+fj3+/r6csMgZQAAABJ0Uk5TABiWR/G/9MfjggaV2QfzLS7y8+DAxwAAAhhJREFUeF6FU2Vz21AQlO3YiSFuu2IwMzNDmJmZyszMDP+68ySN0iSd8X65m7l7bw/2qFM4LE6ry+12WZ0WB3URJnMfDPSZTefCg3YbzsBmHzzzvB8X0P/PJ5cH8B8MXDLo9Xh7SOFkmVOG2nqGSefX/h9vZdkoAzBRNtsa11i0OuwgGPFMxwXi+GOlq6xnBAR2lcCmxqVrY2LgNZAbXspUqjVOzbAREjPxGE/tUwHIxBYzDDAjlWselcVMUQ51Pi0W+Q/AaCNwAgALE2Bb6sQclEWtPxLCTkIoScIkCOZuIpRVe7FQTmK8LNJTjeN7N3BcBULhehNgvQDgpKzEKPEnhz6eeLcCL5OJVOctEFUAwEq5iOG2l0uhYeI1JyL0nYX9cCHJcADgotzEbGwm0hBv7zwN0hFfJ6VUZnyz12UAcGsJs2J+7uihXE/Iaf8r0Z9sKPD7HgPAFZ2ifFd8FENbug+06w86e/SuMK9SuvQicxF5L4xqEASrvm3EMk2tSL1Nurs89oyWnh+BKXT3X8jS5Oj0kNqmPqiNtfR6EMzn3TcVfv0wXIyU/bQ2KH3U78IgCHLvV6JxfumjiAN91MayigC2vkyFct2VryMQiil9Wca66UXgwPNt9QQE37PGug3BBPg1CEE+Jf/YnM8HDMGcSo5p/eTjv4Dk1u8/huTOidarSDQtKV5DtD1l3/twep9e7+Ptef5/AR1tahhjfmdgAAAAAElFTkSuQmCC"
    },
    {
        "address": "0x5b9a857e0C3F2acc5b94f6693536d3Adf5D6e6Be",
        "name": "OmiseGO",
        "symbol": "OMG",
        "decimals": "18",
        "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAAXNSR0IArs4c6QAAAUdQTFRFAAAAIFX0HVbxG1TxG1PxG1TxK1X/G1PxGlTwG1TwJG3/GlTwG1PxG1PwGlTwHFP0HFX0GlPwGlPw7fL9wtH7v8/6////7PD9IVjwnrb4H1fw4un9IlnwdJf1KV7xZYv0/v7+9vj+w9L7f5/22uP8RHLyN2nxJFvwq8D5XYX0k673Q3LyLmLxa5D14ej9/f3+c5b1IFfwp735+vv+/Pz++Pr+gaD21+H8QnHyusv68PT+z9v7JlzwP2/yfp72M2Xx7fH9KF3wlK74MmXxbpL1ztr73ub8UXzz8fT+QHDySHbzLGHxW4T0NGbxJ13w5ez9TXnzV4D0ZIr0tsj6wM/6r8P5pbv5g6H2G1TwmbL4t8n6e5z2xNP7mrP4VoDzHFXwPW3yY4r0I1rwK2DxwdD62+T84+r9XIT0fJ32ao/1ucv6gJ/2THjz/E7nqAAAABJ0Uk5TABhHldmCBpbxvwf0x+PzLi3y3veW/wAAAXhJREFUeF6F02WXnDAUx+EMMMMyMLT9wbi7rbu71t3d7fu/7m56Qpdy9vC8heQm/9wr/klpumW4rmHpWkpEJcwJAhNmQoSlkzYhdjIdWu4Q4Vza5FqGKDLXg/Xye1QmIaS0wxWcv+dIcqWkLGAjnfjruXM3mZyf9rL3AbAviphIU4216nIn92yvt/tlubo2MwWAKURK5sPd5j5QOPJ5vFEARqe3ZGIpoSEdLs0BfJu5szgEmFt6CIAmdKTtrwBs5Ya5MwDKbQB0YSHdbuwAzDY3m1WAg8YDACxhIJWOWzUY54u8yHeh1lopAWAIF4nxPe9la8GvUMku+I+88iqSG/zAZvvJ0/pzgHpx8L2PxA1VAvqvBsU6/zPUIVktX5TIVgiz1DVLK69r0M2/IUxXQb1V13xHiKaiDoJ6T0BGrR7rg4r6I5eZwXN/Wh8BhY3PKOq5VcP8WPw5+6vj9aINo1rud9abnp+MtFxM08a1ffzgxI9e/PDGjv8fx+1NdEK0K/QAAAAASUVORK5CYII="
    },
    {
        "address": "0x2C4EfAa21f09c3C6EEF0Edb001E9bffDE7127D3B",
        "name": "Power Ledger",
        "symbol": "POWR",
        "decimals": "6",
        "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAABGdBTUEAALGPC/xhBQAAAh9QTFRFAAAAC7+qBbyqBbypK9WqB76sBb2qBbypBrypBr2qBryrBbypBbypJNu2Bb2qBrysBsGqBb2qBbypa9fMbtjNW9PGDb6sWtLGht7VN8m6XtPHcNjOftzSKcW1w+7qgt3UF8CvddrPFcCuo+bfctnOb9jNX9TIc9nPEL+tserkWdLGR82/eNvQd9rQRs2/Ts/CqOfhqujhTM/BVdHEU9HDg93UE7+uYtTJHMKxQMy9s+rlZNXJbNfMfdzSDL6rIcOyMMe3YNTIHcKxp+fgkOHYFsCvRM2+KsW1UNDCfNzSNMi5JcS0OMm6iN/WGsGwQ8y+r+njC72rcdnOit/WEb+tLse3runjPcu8V9LFTc/BedvRkeHZK8a2renjvO3odtrQIMOyaNbLVtHELMa2adfLIsOzKMW1S87BBrypSs7AadbLSM7AP8u9ueznY9XJsurkwO7pj+HYD76sCr2rQsy+JMSzvu3otevl2PTxt+vme9vRzfHuPsu8tOvllOLanOTdgd3TjeDXJsS0xe/rx/DrRc2/uuznpObfyPDsuOzmZdXKyfDsB7yqm+Tc0vPvSc7AdNnPmuPczvLuoebeUdDDbdjNatfMxO/qpufghd7Vu+zngN3Twe7ppefgmOPbOcq7Osq7Dr6sI8SzFMCuluLaUtDDhN7UNci50fLvjODXCL2qid/W1PPwi9/XjuDYleLawu7q1/TxrOjituvmXNPHgUqhbgAAABJ0Uk5TABi/lQZHlvHZ44L0xwfzLi3yxwjaOwAAAk1JREFUeF6FU2OXJEEQ7B3v7O7cXTTGtta2bds2zrZt29YPvNfVcz2LDxNfut+LqozIrEgqCplcKlFpNCqJVC6jdiJOoYQIpSJuG52kTsAWJKiTtlxPxA4kbiqyK14kKrPE3/jdojzhZ1OygX5tpgtYTy8mJ+Ii+kJ9/fUzXj9bXW9IcxdYZgQVwYcaBHSN/SJ7/FDrtUxXT6obBGoiEPFvCtxeM+UAbcm6g05rpBdeRAFg4xwTGqjsYlB6+A3ALhywWt0zvA8FRcmUAFK6a26cKAG7b2O6fW8nA52OPe30AFDKKDkAdC73ni8BslcutKBlpQq0eVibMQoAckoKHu5wE5qZyb6l8UDBsf3lNB4ZGUJIKQn5tjbWect8yGhstg3Sr0BjoTaNEBJKBQBh05J2Fv42FwDM23xl4LLCpFUVpQHw9vHNI6WlR++kVYFvyXTXqNefTTacBKAhB0558lbz8nIKn3AAcPXZc1avv3T5ShOAPYLESHCoGNUT2YUAYBhNLUeP5ZaRSERMVmQkg3XAY+Z8uffgSBmh5ysEk2KbVtzPffCwKKcsf05r74Ld/r9NOZGlg0+naHCriyjxD08BZkv68joZlDDqF0MvDR069E4HmdeOBi3MobF6ZzoZtfBY3Dv3+6L8CSNgKxoE86GucM09zldQbHpunfPjp8XPgMf15WvBN/G5o4FhOjz9td+7U38wP9sbGDEw0cj1/dIa88fmGid/ey1/DGLkoqHl/uYCIZYPrS3gEEO7PfYDW2Ife3Fir17s5Y25/v8APd2EuLCY6pwAAAAASUVORK5CYII="
    },
    {
        "address": "0xa448cD1DB463ae738a171C483C56157d6B83B97f",
        "name": "Request",
        "symbol": "REQ",
        "decimals": "18",
        "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABGdBTUEAALGPC/xhBQAAAgRJREFUeAGsVkXaVEEMfCu4ApeAa3AY3N3ZwQqH7b9Flri7jPzu7u46SYopXF+edL6vRpNUXidd3VFSO4nGdTtQ3rxdC5e3SvHpVi22VjH/Da38jf/Rh75RKNuHxg3btHhlmxZmt0oBSUBfxjA2M/E2tK/frsXT1UQLTJoFjGUO5kr/1FJ4yyQhwFyJV2MHCpuqlfczMCSYcxfqNvpPnpfcKYIc/+153LLH2ZopRm0Zz3UMx6Xebcc/Z4LDEhfYZLP/RZvNYdxWQFs2wTlpji2CXP9aen/aHVyRdixYBYtVnJKG2N3xWyu4Z0P1+aK0gfZOJ7x5uPJD4RyRSY1hW8a0rbpiRe6I0hl62lttDqumrh+5I+p30K1WxbxVMGLLri+5Ix4iIQu4o/2g3dNh15fcEU+yEMSc+sc6AjPDhK1gr5TcGHKzgPm0ZJ90EmIG/QXfrc8WceKbGHkgd6YCjkgdVkxAoxCVbApPdRQ3pAPbU0lzYS5zC2596/UDv9dOCzIOIZ90wBbZCpyVxkwFkDvXNjwvLRw6tNt8pnhy5xai1zoOWo12p44ld24p3i9lCg/Bz37Mn1Ic4jCq0R7QXul44hhyBj2OOQdmxrlIdFklZ4oLiQ/uBO6IflvENseXXP6VLAOo/w91BDulmP5K9nn0b5QOfLOc/h2TodA1o3/ndMC75wAJe7FjuvGT8QAAAABJRU5ErkJggg=="
    },
    {
        "address": "0xF739577d63cdA4a534B0fB92ABf8BBf6EA48d36c",
        "name": "STATUS",
        "symbol": "SNT",
        "decimals": "18",
        "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAABGdBTUEAALGPC/xhBQAAAJlQTFRFAAAAgID/XW/xXG7wXG3vXG3vW23uYHX0XG/uXG7ubW3/XG7vXG7uXG7uXm/uXG7uYHHuXG7uW23u////mqX0YHLuZ3fvY3Tu9vf+7O79ZXbvg5Hy7vD9lKD0eYfx+fn+3OD75+r8c4LwusH33+L7qbL2oav1gI7x9PX9qrP2aXnvdoXwiZbyh5TyYnPu4+b8oqz1ZHXvZHXu7A3OTwAAABJ0Uk5TAAZHlb/Z8xiW8QeC9Mcu4y3yulKG2QAAAQpJREFUeF6F09dSxDAMBVCnls2Ghask23vvwP9/HLDxXI2HB59X2yPJkowKwihO0jSJozAwRFlegIo8M65e2YejX/ac5xX+qTJDbwOQGrzzPc9dg8zGr0CuqsujhGuyaWGVrwBO/sP9U0TGta3lL0gOhelMOnO85MYEBdRiKdYKL0VgQqivtVgyQic0EdRWaIdOZGJQMxI6oBObBHTk8ekMKzEpaHhp2uut/qzvD1hI9QIe99+z27VtLkPQh4Y4nxjhCEqY5EFo1IBilrkT2kJF/Cgtcf0NFfKrV2ItF1BFwGbNpTObQiHXdqMei8hzzxLZbh2YdjOBq/SOnG9ovWPvXxz/6vmX17v+P0lPO8OlQz9uAAAAAElFTkSuQmCC"
    }
];

module.exports = function(callback) {
    async function asyncFunc(accounts) {
        var registry = await TokenRegistry.deployed();

        for(var i = 0; i < tokens.length; i++) {
            try {
                console.log("Adding \""+tokens[i]["name"]+" ("+tokens[i]["symbol"]+")\"...");
                var tx = await registry.addToken(
                    tokens[i]["address"],
                    tokens[i]["name"],
                    tokens[i]["symbol"],
                    tokens[i]["decimals"],
                    tokens[i]["url"],
                    {from: accounts[0], gasPrice: 50000000000});
    
                console.log(tx);
            } catch(e) {
                console.log("Error adding \""+tokens[i]["name"]+" ("+tokens[i]["symbol"]+")\": "+e);
            }
        }
    };
    
    web3.eth.getAccounts(function(err, accounts) {
        asyncFunc(accounts);
    });
}




