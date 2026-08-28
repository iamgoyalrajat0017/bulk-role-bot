# BULK ROLE CREATION BOT

Multi-server Discord utility bot. All 9 commands below are already built into
`index.js`.

## Setup checklist

1. `index.js` top of file — `GUILD_IDS` array must list **every** server ID
   the bot is in (so commands appear instantly in each one).
2. Railway → Variables → `TOKEN` = your bot token.
3. Discord Developer Portal → Bot tab → **Server Members Intent** must be ON
   (required for `/listbots`, `/kickbots`, `/cleanupbotroles`,
   `/channelperms`).
4. The bot's own role must sit **above** any role/channel it needs to
   create, delete, reorder, or read permissions on.

## Commands

### `/bulkroles`
Bulk-create roles. One per line:
```
Name | #HEXCOLOR
Name | #HEXCOLOR | after:ExistingRoleName
```
- First line without `after:` and no anchor → goes to the **bottom** of the
  hierarchy.
- `after:RoleName` inserts the role right below that existing role.
- The anchor is **sticky** — every following line without its own `after:`
  keeps stacking under the same anchor. Write `after:none` (or `bottom` /
  `end`) to reset back to bottom-placement.
- Every created role is automatically **hoisted** (displayed separately)
  and **mentionable**.
- Invalid lines/hex codes are skipped and reported, not fatal.

### `/bulkdeleteroles`
Delete specific roles by exact name, one per line.

### `/deleteallroles confirm:CONFIRM`
Deletes every role the bot is able to manage (skips @everyone, managed/
integration roles, and anything above the bot's own role). Requires typing
`CONFIRM` to actually run.

### `/cleanupbotroles confirm:CONFIRM`
Deletes **duplicate-named roles** (e.g. 3 copies of "Wick") and **0-member
roles** — the leftover integration roles bots create/re-create. Skips the
Nitro Booster role and the bot's own role automatically.

### `/listbots`
Lists every bot currently in the server with its username and ID.

### `/kickbots`
Kick bots by username, one per line:
```
Xenon
Dank Memer
```
Skips anything not kickable (role above the bot's own role).

### `/copyroles target_server_id:<ID> confirm:CONFIRM`
Run this **in the source server**. Copies every role (name, color, hoist,
mentionable, exact permissions) into the target server, preserving relative
order. Skips roles that already exist by name in the target. Bot must be a
member of both servers, and both server IDs must be in `GUILD_IDS`.

### `/deletecategory categories:<list> confirm:CONFIRM`
Delete one or more categories **and every channel inside them**, one
category name/ID per line. Without `confirm:CONFIRM` it only shows a
preview — every category and every channel that would be deleted — so
nothing is touched until you confirm. Channels outside the listed
categories are never affected.

### `/channelperms target:<category or channel name/ID>`
Shows simplified permission overwrites:
- For a **category** — the category's own overwrites, then every child
  channel's overwrites (and whether each is synced to the category).
- For a **single channel** — just that channel's overwrites.
- Only non-default (explicitly allowed/denied) permissions are shown per
  role/member, so it stays readable instead of dumping the full permission
  list.

## Deploy (Railway, no PC needed)

1. Push all files to the root of your `bulk-role-bot` GitHub repo.
2. railway.app → Deploy from GitHub repo → select `bulk-role-bot`.
3. Variables tab → add `TOKEN`.
4. Logs should show `Logged in as...` and `Slash commands registered
   instantly for server <id>` for each ID in `GUILD_IDS`.
5. The bot also runs a tiny internal HTTP server (on `process.env.PORT`) so
   Railway's health check doesn't keep restarting it.
