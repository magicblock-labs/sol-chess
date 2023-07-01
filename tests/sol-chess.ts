import * as anchor from "@project-serum/anchor";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";
import { SolChess } from "../target/types/sol_chess";
import { SessionTokenManager } from "@gumhq/sdk";

// Request air drop from Solana Faucet
async function requestAirdrop(
  provider: anchor.Provider,
  publicKey: anchor.web3.PublicKey,
  amount: number
) {
  // Request an airdrop for the user to pay for transactions.
  const airdropSig = await provider.connection.requestAirdrop(
    publicKey,
    LAMPORTS_PER_SOL * amount
  );

  return provider.connection.confirmTransaction(airdropSig);
}

describe("sol-chess", () => {
  const provider = anchor.getProvider();

  const program = anchor.workspace.SolChess as anchor.Program<SolChess>;

  const sessionManager = new SessionTokenManager(
    // @ts-ignore
    provider.wallet,
    provider.connection,
    "localnet"
  );

  const USER_SEED = Buffer.from("user");
  const GAME_SEED = Buffer.from("game");

  const whitePlayer = anchor.web3.Keypair.generate();
  const blackPlayer = anchor.web3.Keypair.generate();

  let whiteUser: anchor.web3.PublicKey;
  let blackUser: anchor.web3.PublicKey;
  let game: anchor.web3.PublicKey;

  before(async () => {
    await requestAirdrop(provider, whitePlayer.publicKey, 1);
    await requestAirdrop(provider, blackPlayer.publicKey, 1);

    // Create the User PDA
    const [_whiteUser, _nonce] = await anchor.web3.PublicKey.findProgramAddress(
      [USER_SEED, whitePlayer.publicKey.toBuffer()],
      program.programId
    );
    whiteUser = _whiteUser;

    const [_blackUser, _noncee] =
      await anchor.web3.PublicKey.findProgramAddress(
        [USER_SEED, blackPlayer.publicKey.toBuffer()],
        program.programId
      );
    blackUser = _blackUser;
  });

  // Test Initialize User
  it("should initialize user", async () => {
    await program.methods
      .initializeUser()
      .accounts({
        user: whiteUser,
        payer: whitePlayer.publicKey,
      })
      .signers([whitePlayer])
      .rpc();

    const userAccount = await program.account.user.fetch(whiteUser);
    expect(userAccount).to.be.ok;
  });

  it("should initialize game", async () => {
    const userAccount = await program.account.user.fetch(whiteUser);
    const seeds = [
      GAME_SEED,
      whiteUser.toBuffer(),
      userAccount.games.toArrayLike(Buffer, "be", 8),
    ];
    // Generate the Game PDA
    const [_game, _nonce] = await anchor.web3.PublicKey.findProgramAddress(
      seeds,
      program.programId
    );
    game = _game;

    await program.methods
      .initializeGame(null, false)
      .accounts({
        user: whiteUser,
        payer: whitePlayer.publicKey,
        game,
      })
      .signers([whitePlayer])
      .rpc();
    const gameAccount = await program.account.game.fetch(game);
    expect(gameAccount).to.be.ok;
  });

  // Test joining a game
  it("should join game", async () => {
    await program.methods
      .joinGame({ white: {} })
      .accounts({
        user: whiteUser,
        payer: whitePlayer.publicKey,
        game,
      })
      .signers([whitePlayer])
      .rpc();
    const gameAccount = await program.account.game.fetch(game);
    expect(gameAccount.white.toBase58()).to.equal(whiteUser.toBase58());
  });

  it("should set up a black player and join the game", async () => {
    await program.methods
      .initializeUser()
      .accounts({
        user: blackUser,
        payer: blackPlayer.publicKey,
      })
      .signers([blackPlayer])
      .rpc();

    await program.methods
      .joinGame({ black: {} })
      .accounts({
        user: blackUser,
        payer: blackPlayer.publicKey,
        game,
      })
      .signers([blackPlayer])
      .rpc();

    const gameAccount = await program.account.game.fetch(game);
    expect(gameAccount.black.toBase58()).to.equal(blackUser.toBase58());
  });

  it("should allow white to move a piece", async () => {
    await program.methods
      .movePiece({ file: 0, rank: 6 }, { file: 0, rank: 5 })
      .accounts({
        user: whiteUser,
        adversaryUser: blackUser,
        payer: whitePlayer.publicKey,
        game,
        sessionToken: null,
      })
      .signers([whitePlayer])
      .rpc();
    const gameAccount = await program.account.game.fetch(game);
    expect(gameAccount).to.be.ok;
  });

  it("should allow black to move a piece", async () => {
    await program.methods
      .movePiece({ file: 0, rank: 1 }, { file: 0, rank: 3 })
      .accounts({
        user: blackUser,
        adversaryUser: whiteUser,
        payer: blackPlayer.publicKey,
        game,
        sessionToken: null,
      })
      .signers([blackPlayer])
      .rpc();
    const gameAccount = await program.account.game.fetch(game);
    expect(gameAccount).to.be.ok;
  });

  it("should create a session token and allow white to move a piece", async () => {
    const sessionSigner = anchor.web3.Keypair.generate();

    const keys = await sessionManager.program.methods
      .createSession(true, null)
      .accounts({
        sessionSigner: sessionSigner.publicKey,
        authority: whitePlayer.publicKey,
        targetProgram: program.programId,
      })
      .signers([sessionSigner, whitePlayer])
      .rpcAndKeys();

    const sessionToken = keys.pubkeys.sessionToken as anchor.web3.PublicKey;

    await program.methods
      .movePiece({ file: 1, rank: 6 }, { file: 1, rank: 5 })
      .accounts({
        user: whiteUser,
        adversaryUser: blackUser,
        payer: sessionSigner.publicKey,
        game,
        sessionToken,
      })
      .signers([sessionSigner])
      .rpc();
    const gameAccount = await program.account.game.fetch(game);
    expect(gameAccount).to.be.ok;
  });

  it("should create a session token and allow black to move a piece", async () => {
    const sessionSigner = anchor.web3.Keypair.generate();

    const keys = await sessionManager.program.methods
      .createSession(true, null)
      .accounts({
        sessionSigner: sessionSigner.publicKey,
        authority: blackPlayer.publicKey,
        targetProgram: program.programId,
      })
      .signers([sessionSigner, blackPlayer])
      .rpcAndKeys();

    const sessionToken = keys.pubkeys.sessionToken as anchor.web3.PublicKey;

    await program.methods
      .movePiece({ file: 1, rank: 1 }, { file: 1, rank: 3 })
      .accounts({
        user: blackUser,
        adversaryUser: whiteUser,
        payer: sessionSigner.publicKey,
        game,
        sessionToken,
      })
      .signers([sessionSigner])
      .rpc();
    const gameAccount = await program.account.game.fetch(game);
    expect(gameAccount).to.be.ok;
  });

  it("should not allow an invalid session key", async () => {
    const sessionSigner = anchor.web3.Keypair.generate();

    const keys = await sessionManager.program.methods
      .createSession(true, null)
      .accounts({
        sessionSigner: sessionSigner.publicKey,
        authority: blackPlayer.publicKey,
        targetProgram: program.programId,
      })
      .signers([sessionSigner, blackPlayer])
      .rpcAndKeys();

    const sessionToken = keys.pubkeys.sessionToken as anchor.web3.PublicKey;

    try {
      await program.methods
        .movePiece({ file: 4, rank: 6 }, { file: 4, rank: 5 })
        .accounts({
          user: whiteUser,
          adversaryUser: blackUser,
          payer: sessionSigner.publicKey,
          game,
          sessionToken,
        })
        .signers([sessionSigner])
        .rpc();
    } catch (error) {
      error = anchor.AnchorError.parse(error.logs);
      expect(error.error.errorCode.code).to.equal("InvalidToken");
    }
  });
});
