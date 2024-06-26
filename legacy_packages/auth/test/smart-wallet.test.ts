import { LocalWallet, SmartWallet } from "@thirdweb-dev/wallets";
import { ThirdwebAuth } from "../src/core";
import { EthersWallet } from "@thirdweb-dev/wallets/evm/wallets/ethers";
import { Wallet } from "ethers";
import { describe, it, beforeEach, beforeAll, expect } from "vitest";

// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv-mono").load();

describe.runIf(process.env.TW_SECRET_KEY)(
  "Wallet Authentication - EVM - Smart Wallet",
  async () => {
    let adminWallet: any, signerWallet: any, attackerWallet: any;
    let auth: ThirdwebAuth;

    beforeAll(async () => {
      const factoryAddress = "0x7b5ba9D46b53aae55e2c2E9b38d9AfF9a0b158F8";
      const chain = 84532;
      const localWallet = new LocalWallet();
      await localWallet.generate();
      const smartWallet = new SmartWallet({
        chain: chain,
        factoryAddress: factoryAddress,
        gasless: true,
        secretKey: process.env.TW_SECRET_KEY,
      });
      await smartWallet.connect({ personalWallet: localWallet });

      adminWallet = new EthersWallet(Wallet.createRandom());
      signerWallet = smartWallet;
      attackerWallet = new EthersWallet(Wallet.createRandom());

      auth = new ThirdwebAuth(signerWallet, "thirdweb.com", {
        secretKey: process.env.TW_SECRET_KEY,
      });
    });

    beforeEach(async () => {
      auth.updateWallet(signerWallet);
    });

    it("Should verify logged in wallet", {
      timeout: 240000,
    }, async () => {
      const payload = await auth.login();

      auth.updateWallet(adminWallet);
      const address = await auth.verify(payload);

      expect(address).to.equal(await signerWallet.getAddress());
    });

    it("Should verify logged in wallet with chain ID and expiration", {
      timeout: 240000,
    }, async () => {
      const payload = await auth.login({
        expirationTime: new Date(Date.now() + 1000 * 60 * 5),
        chainId: "84532",
      });

      auth.updateWallet(adminWallet);
      const address = await auth.verify(payload, {
        chainId: "84532",
      });

      expect(address).to.equal(await signerWallet.getAddress());
    });

    it("Should verify payload with resources", {
      timeout: 240000,
    }, async () => {
      const payload = await auth.login({
        resources: ["https://example.com", "https://test.com"],
      });

      auth.updateWallet(adminWallet);
      const address = await auth.verify(payload, {
        resources: ["https://example.com", "https://test.com"],
      });

      expect(address).to.equal(await signerWallet.getAddress());
    });

    it("Should reject payload without necessary resources", {
      timeout: 240000,
    }, async () => {
      const payload = await auth.login({
        resources: ["https://example.com"],
      });

      auth.updateWallet(adminWallet);
      try {
        await auth.verify(payload, {
          resources: ["https://example.com", "https://test.com"],
        });
        expect.fail();
      } catch (err: any) {
        expect(err.message).to.equal(
          "Login request is missing required resources: https://test.com",
        );
      }
    });

    it("Should verify payload with customized statement", {
      timeout: 240000,
    }, async () => {
      const payload = await auth.login({
        statement: "Please sign!",
      });

      auth.updateWallet(adminWallet);
      const address = await auth.verify(payload, {
        statement: "Please sign!",
      });

      expect(address).to.equal(await signerWallet.getAddress());
    });

    it("Should reject payload with incorrect statement", {
      timeout: 240000,
    }, async () => {
      const payload = await auth.login({
        statement: "Please sign!",
      });

      auth.updateWallet(adminWallet);
      try {
        await auth.verify(payload, {
          statement: "Please sign again!",
        });
        expect.fail();
      } catch (err: any) {
        expect(err.message).to.include(
          "Expected statement 'Please sign again!' does not match statement on payload",
        );
      }
    });

    it("Should reject invalid nonce", {
      timeout: 240000,
    }, async () => {
      const payload = await auth.login();

      auth.updateWallet(adminWallet);
      try {
        await auth.verify(payload, {
          validateNonce: (nonce: string) => {
            if (nonce === payload.payload.nonce) {
              throw new Error();
            }
          },
        });
        expect.fail();
      } catch (err: any) {
        expect(err.message).to.equal("Login request nonce is invalid");
      }
    });

    it("Should accept valid nonce", {
      timeout: 240000,
    }, async () => {
      const payload = await auth.login();

      auth.updateWallet(adminWallet);
      const address = await auth.verify(payload, {
        validateNonce: (nonce: string) => {
          if (nonce !== payload.payload.nonce) {
            throw new Error();
          }
        },
      });

      expect(address).to.equal(await signerWallet.getAddress());
    });

    it("Should reject payload with incorrect domain", {
      timeout: 240000,
    }, async () => {
      const payload = await auth.login();

      auth.updateWallet(adminWallet);
      try {
        await auth.verify(payload, { domain: "test.thirdweb.com" });
        expect.fail();
      } catch (err: any) {
        expect(err.message).to.equal(
          "Expected domain 'test.thirdweb.com' does not match domain on payload 'thirdweb.com'",
        );
      }
    });

    it("Should reject expired login payload", {
      timeout: 240000,
    }, async () => {
      const payload = await auth.login({
        expirationTime: new Date(Date.now() - 1000 * 60 * 5),
      });

      auth.updateWallet(adminWallet);
      try {
        await auth.verify(payload);
        expect.fail();
      } catch (err: any) {
        expect(err.message).to.equal("Login request has expired");
      }
    });

    it("Should reject payload with incorrect chain ID", {
      timeout: 240000,
    }, async () => {
      const payload = await auth.login({
        chainId: "1",
      });

      auth.updateWallet(adminWallet);
      try {
        await auth.verify(payload, {
          chainId: "137",
        });
        expect.fail();
      } catch (err: any) {
        expect(err.message).to.equal(
          "Expected chain ID '137' does not match chain ID on payload '1'",
        );
      }
    });

    it("Should reject payload with incorrect signer", {
      timeout: 240000,
    }, async () => {
      const payload = await auth.login();
      payload.payload.address = await attackerWallet.getAddress();

      auth.updateWallet(adminWallet);
      try {
        await auth.verify(payload);
        expect.fail();
      } catch (err: any) {
        expect(err.message).to.contain("does not match payload address");
      }
    });

    it("Should generate valid authentication token", {
      timeout: 240000,
    }, async () => {
      const payload = await auth.login();

      auth.updateWallet(adminWallet);
      const token = await auth.generate(payload);
      const user = await auth.authenticate(token);

      expect(user.address).to.equal(await signerWallet.getAddress());
    });

    it("Should reject token with incorrect domain", {
      timeout: 240000,
    }, async () => {
      const payload = await auth.login();

      auth.updateWallet(adminWallet);
      const token = await auth.generate(payload);

      try {
        await auth.authenticate(token, { domain: "test.thirdweb.com" });
        expect.fail();
      } catch (err: any) {
        expect(err.message).to.contain(
          "Expected token to be for the domain 'test.thirdweb.com', but found token with domain 'thirdweb.com'",
        );
      }
    });

    it("Should reject token before invalid before", {
      timeout: 240000,
    }, async () => {
      const payload = await auth.login();

      auth.updateWallet(adminWallet);
      const token = await auth.generate(payload, {
        invalidBefore: new Date(Date.now() + 1000 * 60 * 5),
      });

      try {
        await auth.authenticate(token);
        expect.fail();
      } catch (err: any) {
        expect(err.message).to.contain("This token is invalid before");
      }
    });

    it("Should reject expired authentication token", {
      timeout: 240000,
    }, async () => {
      const payload = await auth.login();

      auth.updateWallet(adminWallet);
      const token = await auth.generate(payload, {
        expirationTime: new Date(Date.now() - 1000 * 60 * 5),
      });

      try {
        await auth.authenticate(token);
        expect.fail();
      } catch (err: any) {
        expect(err.message).to.contain("This token expired");
      }
    });

    it("Should reject if admin address is not connected wallet address", {
      timeout: 240000,
    }, async () => {
      const payload = await auth.login();

      auth.updateWallet(adminWallet);
      const token = await auth.generate(payload);

      auth.updateWallet(signerWallet);
      try {
        await auth.authenticate(token);
        expect.fail();
      } catch (err: any) {
        expect(err.message).to.contain(
          `The expected issuer address '${await signerWallet.getAddress()}' did not match the token issuer address '${await adminWallet.getAddress()}'`,
        );
      }
    });

    it("Should accept token with valid token ID", {
      timeout: 240000,
    }, async () => {
      const payload = await auth.login();

      auth.updateWallet(adminWallet);
      const token = await auth.generate(payload, {
        tokenId: "test",
      });

      const user = await auth.authenticate(token, {
        validateTokenId: (tokenId: string) => {
          if (tokenId !== "test") {
            throw new Error();
          }
        },
      });

      expect(user.address).to.equal(await signerWallet.getAddress());
    });

    it("Should reject token with invalid token ID", {
      timeout: 240000,
    }, async () => {
      const payload = await auth.login();

      auth.updateWallet(adminWallet);
      const token = await auth.generate(payload, {
        tokenId: "test",
      });

      try {
        await auth.authenticate(token, {
          validateTokenId: (tokenId: string) => {
            if (tokenId !== "invalid") {
              throw new Error();
            }
          },
        });
        expect.fail();
      } catch (err: any) {
        expect(err.message).to.contain("Token ID is invalid");
      }
    });

    it("Should propagate session on token", {
      timeout: 240000,
    },  async () => {
      const payload = await auth.login();

      auth.updateWallet(adminWallet);
      const token = await auth.generate(payload, {
        session: { role: "admin" },
      });

      const user = await auth.authenticate(token);

      expect(user.address).to.equal(await signerWallet.getAddress());
      expect(user.session).to.deep.equal({ role: "admin" });
    });

    it("Should call session callback function", {
      timeout: 240000,
    }, async () => {
      const payload = await auth.login();

      auth.updateWallet(adminWallet);
      const token = await auth.generate(payload, {
        session: (address: string) => {
          return { address, role: "admin" };
        },
      });

      const user = await auth.authenticate(token);

      expect(user.address).to.equal(await signerWallet.getAddress());
      expect(user.session).to.deep.equal({
        address: await signerWallet.getAddress(),
        role: "admin",
      });
    });

    it("Should authenticate with issuer address", {
      timeout: 240000,
    }, async () => {
      const payload = await auth.login();

      auth.updateWallet(adminWallet);
      const token = await auth.generate(payload);

      auth.updateWallet(attackerWallet);
      try {
        await auth.authenticate(token);
        expect.fail();
      } catch (err: any) {
        expect(err.message).to.contain("The expected issuer address");
      }

      const user = await auth.authenticate(token, {
        issuerAddress: await adminWallet.getAddress(),
      });
      expect(user.address).to.equal(await signerWallet.getAddress());
    });
  },
);
