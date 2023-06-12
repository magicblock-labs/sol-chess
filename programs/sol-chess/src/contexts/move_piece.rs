use gpl_session::SessionError;
use gpl_session::SessionToken;

use crate::*;
use anchor_lang::prelude::Result;

#[derive(Accounts)]
pub struct MovePiece<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub user: Account<'info, User>,

    #[account(mut)]
    pub adversary_user: Account<'info, User>,

    #[account(mut)]
    pub game: Account<'info, Game>,

    pub session_token: Option<Account<'info, SessionToken>>,
}

impl<'info> MovePiece<'info> {
    pub fn process(&mut self, from: Square, to: Square) -> Result<()> {
        let Self {
            user,
            game,
            adversary_user,
            session_token,
            payer,
            ..
        } = self;

        // BEGIN SessionToken Checks

        if let Some(_) = session_token {
            let target_program = crate::id();
            let local_session_token = session_token.clone().unwrap();
            let local_payer = payer.clone().key;

            require!(
                user.key() == User::pda(local_session_token.authority).0,
                SessionError::InvalidToken
            );

            let seeds = &[
                SessionToken::SEED_PREFIX.as_bytes(),
                target_program.as_ref(),
                local_payer.as_ref(),
                local_session_token.authority.as_ref(),
            ];

            let (pda, _) = Pubkey::find_program_address(seeds, &gpl_session::id());

            require_eq!(pda, local_session_token.key(), SessionError::InvalidToken);

            let now = Clock::get()?.unix_timestamp;
            require!(
                now < local_session_token.valid_until,
                SessionError::InvalidToken
            );
        } else {
            require!(
                user.key() == User::pda(self.payer.key()).0,
                CustomError::InvalidUser
            );
        }

        // END SessionToken Checks

        let color = game.get_current_player_color();

        require!(
            user.key() == game.get_current_player_pubkey(),
            CustomError::NotUsersTurn
        );

        require!(
            game.is_valid_move(color, from, to),
            CustomError::InvalidMove
        );

        game.move_piece(color, from, to);

        require!(game.not_in_check(color), CustomError::KingInCheck);

        game.next_turn();

        if game.in_checkmate(color.get_opposite()) {
            game.set_winner(color);
            if game.has_wager() {
                user.increase_balance(game.get_wager() * 2)
            }

            user.won_against(adversary_user.get_elo());
            adversary_user.lost_against(user.get_elo());
        }

        game.reset_draw_state();

        Ok(())
    }
}
