---
'@soundxyz/protocol': minor
---

- Moves the setup function from global config to helpers file and removes global config file. It's a
  more simple design and makes tests more explicitly atomic (ex: new ArtistCreator deployment for
  every test)
- Removes running the tests against the Artist implementation. We never use the implementation
  contract directly in prod, so it makes no sense to be testing it. I kept the
  deployArtistImplementation helper for edge cases in which it might be needed.
