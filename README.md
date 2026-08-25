# BULK ROLE CREATION BOT

Temporary Discord bot with one slash command, `/bulkroles`, that bulk-creates
roles with exact hex colors and preserves your input order in the role
hierarchy (first line = highest role).

## Usage

`/bulkroles list:` then paste (multi-line paste works fine on mobile):

```
Owner | #ff0000
Co-Owner | #ff7700
Admin | #00ff00
Moderator | #00ffff
VIP | #9b59ff
Member | #5865F2
```

- Requires **Manage Roles** for the user running the command.
- Requires **Manage Roles** for the bot.
- **The bot's own highest role must be positioned above where you want the
  new roles to land**, or Discord will block/limit reordering. In Server
  Settings → Roles, drag the bot's role above the top of where these new
  roles should sit before running the command.

## Deploy (no PC needed — Railway, free/temporary)

1. Push these 4 files to the root of your `bulk-role-bot` GitHub repo.
2. Go to railway.app on your phone browser → sign in with GitHub.
3. New Project → Deploy from GitHub repo → select `bulk-role-bot`.
4. In the Railway project → **Variables** tab → add:
   - `TOKEN` = your bot token
5. Railway auto-detects Node, runs `npm install` then `npm start`.
6. Once logs show "Slash command registered.", go to Discord and run
   `/bulkroles`.
7. When done, delete the Railway project (or just leave it — it's fine to
   stop it since this was only needed once).

## Run locally instead (optional)

```
npm install
npm start
```

Set the `TOKEN` environment variable in whatever way your host provides —
never write it into the code.
