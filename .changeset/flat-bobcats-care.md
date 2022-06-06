---
'@soundxyz/protocol': minor
---

Test refactor

- Uses setUpContract function for all tests
- Removes deployArtistImplementation (not using it and probably won't ever need it)
- Uses single createEdition function (returned from setUpContract)
- Removes global scope and duplicate variables across test files
- Generally makes test details more explicit
