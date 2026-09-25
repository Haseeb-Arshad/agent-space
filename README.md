# Agent Space

Agent Space is an early prototype for an AI front desk that helps a business turn its website knowledge into a helpful customer-facing agent.

## Current scope

The first onboarding flow covers:

1. Create an agent with a company website, name, and role.
2. Preview the company discovery experience with clearly labeled sample findings.
3. Review, edit, verify, remove, and add knowledge items and FAQs. TXT and CSV files can be previewed locally in the browser.

This is a browser-only prototype. The sample scan does not fetch a website, the chat preview is not connected to an AI model, and workspace state is stored in the current browser with `localStorage`. PDF/DOCX extraction, external knowledge integrations, and server-side persistence are not connected.

## Run locally

```sh
npm install
npm run dev
```

Create a production build with:

```sh
npm run build
```
