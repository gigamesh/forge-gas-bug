---
'@soundxyz/protocol': major
---

- Deprecating atArtistId in ArtistCreator.
- Removing artistId arg in Artist initialization.
- Changing metadata uri to use contractAddress instead of artistId.
- Create2 idempotency using contract bytecode and sender address as salt.

deeper explanation:
https://www.notion.so/soundxyz/CreateArtist-Idempotency-ca6c7b3a18c34eb49ede944bb1bc41be
