# Agent Space

Agent Space is an early prototype for an AI front desk that helps a business turn its website knowledge into a helpful customer-facing agent.

## Current scope

The onboarding prototype currently covers the first six setup steps:

1. Create an agent with a company website, name, and role.
2. Preview the company discovery experience with clearly labeled sample findings.
3. Review, edit, verify, remove, and add knowledge items and FAQs. TXT and CSV files can be previewed locally in the browser.
4. Define the agent’s role, tone, languages, instructions, and boundaries.
5. Configure draft capabilities for lead capture, booking, support contact, and quote requests.
6. Customize the sample widget’s brand, avatar, colors, layout, font feel, welcome message, and suggested questions.

This is a browser-only prototype. The sample scan does not fetch a website, the chat preview is not connected to an AI model, and workspace state is stored in the current browser with `localStorage`. Capability settings do not collect visitor data, schedule meetings, send messages, call APIs, or connect to a CRM. Appearance changes only affect the sample preview; no widget is published or embedded. PDF/DOCX extraction, external knowledge integrations, and server-side persistence are not connected.

## Run locally

```sh
npm install
npm run dev
```

Create a production build with:

```sh
npm run build
```
