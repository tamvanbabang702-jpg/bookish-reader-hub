<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

Reader Hub remains offline-first: feature pages use the existing client-side store, with lightweight records in localStorage and images in IndexedDB, so reading data stays available without a network.

Use a stable empty server snapshot for the localStorage-backed external store so saved browser data appears after hydration without mismatching server-rendered content.
