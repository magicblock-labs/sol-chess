use {
    anchor_lang::{prelude::*, InstructionData},
    clockwork_client::{Client, ClientResult},
    solana_sdk::{
        instruction::Instruction, native_token::LAMPORTS_PER_SOL, signature::Keypair,
        system_program,
    },
};

pub mod contexts;
pub mod utils;

pub use contexts::*;
pub use utils::*;

fn main() -> ClientResult<()> {
    let payer = Keypair::new();
    let client = Client::new(payer, "http://localhost:8899".into());
    client.airdrop(&client.payer_pubkey(), 1 * LAMPORTS_PER_SOL)?;

    let user = sol_chess::User::pda(client.payer_pubkey()).0;
    let game = sol_chess::Game::pda(user.key(), 0).0;
    let is_rated = false;

    initialize_user(&client, user)?;
    initialize_game(&client, user, game, is_rated, Some(1000))?;

    deposit(&client, user, 100000)?;

    join_game(&client, user, game, sol_chess::Color::White)?;
    join_game(&client, user, game, sol_chess::Color::Black)?;
    let from = sol_chess::Square { file: 0, rank: 6 };
    let to = sol_chess::Square { file: 0, rank: 5 };
    move_piece(&client, user, game, from, to)?;
    resign(&client, user, user, game)?;

    Ok(())
}
