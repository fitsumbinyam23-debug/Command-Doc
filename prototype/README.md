# Mission Studio Home V2 Prototype

This is a standalone visual approval prototype for the Command Doctor Mission Studio Home experience.

It intentionally does not import or depend on the production application shell, runtime state, curriculum renderer, local storage, `lab.html`, `mission-studio.css`, or `app-release-21.js`.

## Files

- `mission-studio-home-v2.html`
- `mission-studio-home-v2.css`
- `mission-studio-home-v2.js`
- `assets/mission-studio-logo.svg`
- `assets/mission-hero-network.svg`
- `assets/home-icons.svg`

## Scope

- Desktop Home screen only.
- Mock data only.
- No production integration.
- No deployment behavior.

## Local Review

Open the HTML through any static file server rooted at this repository:

```text
prototype/mission-studio-home-v2.html
```

Primary review viewport: `1440 x 900`.

Secondary review viewport: `1280 x 800`.

## Visual Checklist

- Sidebar is deep navy, 240-260px wide, and includes the full product name, tagline, five destinations, original icons, selected state, and compact path summary.
- Main title is 36px.
- Body copy is at least 14px.
- Mission hero is the visual center of the page.
- Mission hero uses a large original network visual that occupies more than 42% of the hero width.
- Right rail has three distinct panels: learning progress, next checkpoint, and technician quick action.
- Lower content row includes recent activity, technician shortcuts, and journey preview.
- Prototype avoids the rejected admin-dashboard layout, tiny typography, small floating diagram, dense metadata grid, and empty navy hero space.
