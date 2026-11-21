# GitHub release checklist

## Repository About

**Description**

> Compare screenshots in your browser. Export pixel diffs and offline reports for GitHub pull requests.

**Topics**

`screenshot-diff`, `visual-testing`, `screenshot-comparison`, `image-diff`, `pixel-diff`, `code-review`, `react`, `typescript`

**Website**

Set the About website field to the verified Pages URL after deployment. The expected project URL is `https://ruslanty.github.io/visual-diff-studio/`.

## Social preview

Upload [social-preview.png](social-preview.png) under **Settings → General → Social preview**. The image is 1280 × 640. [GitHub social preview guide](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview)

## Publish

1. Push to `main` and confirm CI passes. Set repository visibility to public and fill in About, topics, and Social preview. [Repository visibility guide](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility)
2. In **Settings → Pages**, select **GitHub Actions** as the source. Run **Deploy to GitHub Pages** on `main` and use the URL reported by the workflow. [GitHub Pages workflow guide](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
3. Open the demo and repository as a signed-out visitor. Confirm that the example loads, both exports download, and the app's Star link opens the repository. Add the verified demo URL to About and near the top of the README.
4. Publish GitHub release `v0.1.0` from the verified commit using the notes below.

## Release notes for v0.1.0

Visual Diff Studio compares screenshots in the browser and creates reports you can attach to a pull request.

- Review changes with a before/after slider, side-by-side view, or pixel diff.
- Match screenshot batches by filename and see the percentage of pixels changed.
- Download a comparison PNG or an offline HTML report with all matched pairs.
