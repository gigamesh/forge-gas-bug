---
'@soundxyz/protocol': minor
---

Cleans up Artist/upgrades so tests are more isolated and avoiding global state

- adds `deployArtistProxyPostUpgrade`
- replaces global `artistPreUpgradeProxy` & `artistPostUpgradeProxy` with local copies
