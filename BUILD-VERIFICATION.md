# NDRAAAID Build Verification

## Production build command

```bash
npm install --no-audit --no-fund
npm run typecheck
npm run build
```

The project is configured for Next.js static export and GitHub Pages (`output: 'export'`).
The GitHub Actions workflow runs the TypeScript check and production build on every push to `main`, then verifies that `out/index.html` exists before deploying the `out` directory.

### Local environment note

The source package was syntax-checked before release. A complete `npm install` / `next build` could not be executed in the packaging environment because outbound DNS access to the npm registry is unavailable. The authoritative production build is therefore performed by GitHub Actions, which runs on a GitHub-hosted runner with npm registry access.

Do not treat a green ZIP integrity check as proof of a production build. The GitHub Actions run must be green for the final deployment.
