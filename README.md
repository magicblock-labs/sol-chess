<p align="center">
  <img src=https://i.imgur.com/SYBlC49.jpg>
</p>

<h1 align="center">Solana Chess</h1>
<p align="center"><strong>Chess Engine written in Anchor Framework</strong></p>

<div align="center">

  <a href="https://opensource.org/licenses/MIT">![License](https://img.shields.io/badge/License-MIT-yellow.svg)</a>  

</div>

## Installation

```sh
anchor build
anchor deploy
```

## Testing

```sh
anchor test
// OR
cargo run ./client/
```

## Note 

This fork uses the commit [68d5034abf0e0365f98726a63bf0bcace454b403](https://github.com/vicyyn/sol-chess/tree/68d5034abf0e0365f98726a63bf0bcace454b403) from the sol-chess repository, which was used in the [Solana-Unity-Chess](https://github.com/magicblock-labs/Solana-Unity-Chess) example.

## Program

The sol-chess program and the IDL is deployed in Devnet at [ChessfTT9XpWA9WxrSSLMnCseRqykb9LaMXKMhyWEiR4](https://explorer.solana.com/address/ChessfTT9XpWA9WxrSSLMnCseRqykb9LaMXKMhyWEiR4?cluster=devnet). If you want to intereact with the [React UI](https://chess.vicyyn.com/) by vicyyn use instead [CCdU3zmYqPZaR2twy5hqcJmFV36tRpFC81seKUE8HVwX](https://explorer.solana.com/address/CCdU3zmYqPZaR2twy5hqcJmFV36tRpFC81seKUE8HVwX?cluster=devnet) as program ID.

## Features
|         Feature         | Implemented |
|-------------------------|:-----------:|
| Check Legal Moves       |      ✅     |
| Checkmate               |      ✅     |
| Enpassant               |      ✅     |
| Castling                |      ✅     |
| Promotion               |      ✅     |
| Elo                     |      ✅     |
| Time Control            |      ❌     |