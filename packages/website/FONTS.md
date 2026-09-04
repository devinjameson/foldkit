# Website | Fonts

## ABC Favorit

ABC Favorit is licensed for `foldkit.dev` and is not distributed in this
repository. Local development falls back to the system sans-serif stack when
the licensed files are absent.

License holders can place these files in `packages/website/public/fonts/` to
match production:

- `ABCFavorit-Book.woff2`
- `ABCFavorit-Light.woff2`

Production restores the files from encrypted GitHub Actions secrets by running
`scripts/restore-website-fonts.sh` before building the website.

## Paper Mono

Code is set in Paper Mono, which is free under the SIL Open Font License and
is checked in as `PaperMono-Variable.woff2` beside its license text,
`PaperMono-OFL.txt`. The variable file carries every weight, so the site picks
its code weights in `src/styles.css` without any further files.
