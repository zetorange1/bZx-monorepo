import b0xJS from "../../core/__tests__/setup";

describe("addresses", () => {
  test("should return an object of addresses", async () => {
    expect(b0xJS.addresses).toMatchSnapshot();
  });
});
