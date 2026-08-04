# AEM QA Framework 🚀

> **Automated 52-Point Quality Assurance Engine & Analytics Dashboard for Adobe Experience Manager (AEM)**

[![Stack](https://img.shields.io/badge/Stack-Vanilla%20JS%20%7C%20Node.js-blue.svg)](#-technology-stack)
[![Dependencies](https://img.shields.io/badge/Dependencies-Zero%20(0)-brightgreen.svg)](#-key-features)
[![Deploy](https://img.shields.io/badge/Deployment-Local%20%7C%20Vercel%20Serverless-orange.svg)](#-deployment--hosting)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](#-license)

The **AEM QA Framework** is a zero-dependency, browser-native QA automation platform designed specifically for Adobe Experience Manager (AEM as a Cloud Service, AEM 6.5, Author Preview, Stage, and Production environments). It enables QA engineers, content authors, and release managers to run **52 automated checks across 4 quality pillars in under 15 seconds** directly inside active browser sessions.

---

## ⚡ Quick Links & Navigation

- 👔 [**Non-Technical Stakeholder & Executive QA Overview**](./STAKEHOLDER_QA_OVERVIEW.md)
- 📖 [**QA Framework Technical Architecture Guide**](./QA_FRAMEWORK_DOCUMENTATION.md)
- 📗 [**AEM QA Framework Comprehensive Implementation Guide**](./AEM_QA_FRAMEWORK_GUIDE.md)
- 📊 [**Sprint Demo Presentation Guide**](./SPRINT_DEMO_PRESENTATION_GUIDE.md)
- 📜 [**Prototype Walkthrough**](./walkthrough.md)

---

## 💡 Why AEM QA Framework?

Testing AEM authoring preview URLs (`author-pXXXX-eYYYY.adobeaemcloud.com`) with traditional headless test suites (Playwright, Cypress, Selenium, Lighthouse CLI) is difficult because Adobe IMS authentication walls block unauthenticated requests. 

```
❌ Traditional CLI / Playwright → Hits Adobe IMS login wall (401/302)
❌ External CORS Fetch          → Blocked by Cross-Origin Security Policies
✅ AEM QA Bookmarklet Engine   → Executes natively inside browser context (Inherits IMS session & cookies)
```

The AEM QA Framework executes **inside your active, authenticated browser tab**, bypassing authentication barriers while auditing live DOM structures, links, accessibility, responsive rules, and AEM-specific component bugs.

---

## ✨ Key Features

- 🛡️ **Zero Third-Party npm Dependencies**: 100% pure Vanilla JS and native Node.js APIs for ultimate security, portability, and zero supply chain vulnerabilities.
- 🔑 **Adobe IMS Auth Native**: Operates within your active browser tab, inheriting author cookies, SAML session tokens, and preview permissions.
- 🎯 **52-Point 4-Pillar Inspection Engine**:
  - **Metadata & SEO Audit** (Title, Description, Canonical, OpenGraph, Twitter Cards, Robots).
  - **Content & Component Integrity** (H1-H6 hierarchy, raw `/content/` paths, AEM author/stage leaks, broken links, image alt attributes).
  - **Responsive Layout & Visual Checks** (Viewport configuration, mobile touch targets, viewport overflows, flex/grid wrap rules).
  - **Accessibility (a11y) & ARIA Compliance** (Color contrast, landmark regions, form labeling, focus indicators, keyboard traps).
- ⚡ **Asynchronous Link & CTA Verification**: Batch-checks link health via background `HEAD`/`GET` requests with configurable concurrency limits and timeouts.
- 🎨 **Floating Dark Mode QA Side Panel**: Renders immediate weighted scores, PASS/WARN/FAIL statuses, and P1 Hard Blocker alerts without disturbing page layout.
- 📊 **Centralized Quality Dashboard**: Includes an interactive Web UI (`public/index.html`) for multi-page report aggregation, trend analysis, and defect inspection.
- ☁️ **Dual Server Operating Mode**: Runs as a local HTTP report server (`aem-qa-tool/server.local.js`) or deploys serverlessly to Vercel (`api/report.js`).

---

## 🛠️ Project Architecture & Directory Map

```
QA/
├── README.md                          ← Main Project Entry Point
├── QA_FRAMEWORK_DOCUMENTATION.md      ← Full Architecture & Technical Reference
├── AEM_QA_FRAMEWORK_GUIDE.md          ← Exhaustive Implementation Blueprint
├── SPRINT_DEMO_PRESENTATION_GUIDE.md  ← Executive & Sprint Presentation Walkthrough
├── STAKEHOLDER_QA_OVERVIEW.md         ← Non-Technical Stakeholder Overview
├── walkthrough.md                     ← Prototype Walkthrough & Verification Steps
├── package.json                       ← Root NPM scripts
├── vercel.json                        ← Vercel Serverless Deployment Manifest
├── .vercelignore                      ← Files excluded from Vercel deployments
├── api/
│   └── report.js                      ← Vercel Serverless API Endpoint (/api/report)
├── public/                            ← Dashboard Web Application Assets (deployed root)
│   ├── index.html                     ← Dashboard UI (Dark-mode SPA)
│   ├── style.css                      ← Design System & Dashboard Styles
│   ├── app.js                         ← Dashboard Client Logic & Fetching
│   └── bookmarklet.js                 ← Generated: engine served to the cloud loader
└── aem-qa-tool/                       ← Core QA Engine & Build Scripts
    ├── bookmarklet.js                 ← Master QA Engine (Source of Truth)
    ├── build-bookmarklet.js           ← Minifier & Bookmarklet Encoder
    ├── build-cloud-bookmarklet.js     ← Cloud-ready Bookmarklet Generator
    ├── build-standalone.js            ← Offline Self-contained Bookmarklet Generator
    ├── server.local.js                ← Local Zero-Dependency HTTP Server (Port 3500)
    ├── AEM_QA_BOOKMARK.txt            ← Generated: inline engine payload
    ├── AEM_QA_BOOKMARK_CLOUD.txt      ← Generated: remote <script> loader stub
    ├── AEM_QA_BOOKMARK_LOCAL.txt      ← Generated: payload posting to localhost:3500
    └── AEM_QA_BOOKMARK_STANDALONE.txt ← Generated: payload posting to Vercel
```

> **Note:** `public/bookmarklet.js` and the four `AEM_QA_BOOKMARK*.txt` files are **build
> outputs** generated from `aem-qa-tool/bookmarklet.js`. Edit the engine, then re-run the
> build scripts — do not edit the generated files by hand.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v14.x or higher (v18+ recommended).
- Modern web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, or Apple Safari).

---

### 2. Option A: Running the Local Server & Dashboard

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd QA
   ```

2. **Start the local server & central dashboard**:
   ```bash
   npm start
   ```
   *Alternative directly from the `aem-qa-tool` subdirectory:*
   ```bash
   node aem-qa-tool/server.local.js
   ```

3. **Access the Central QA Dashboard**:
   Open your browser to [`http://localhost:3500`](http://localhost:3500).

---

### 3. Option B: Installing the Browser Bookmarklet (One-Time Setup)

To audit any live page or AEM author/stage preview:

1. Open one of the compiled bookmarklet text files depending on your setup:
   - **Cloud/Vercel Mode**: Open [`AEM_QA_BOOKMARK.txt`](./aem-qa-tool/AEM_QA_BOOKMARK.txt)
   - **Local Mode**: Open [`AEM_QA_BOOKMARK_LOCAL.txt`](./aem-qa-tool/AEM_QA_BOOKMARK_LOCAL.txt)
2. Copy the entire contents of the text file (starts with `javascript:`).
3. In your Web Browser:
   - Open Bookmarks Manager (`Ctrl+Shift+O` or `Cmd+Option+B`).
   - Add a new Bookmark.
   - Set **Name**: `AEM QA Engine`.
   - Set **URL**: Paste the copied `javascript:...` payload.
4. Drag `AEM QA Engine` to your Bookmarks Bar for 1-click access.

---

### 4. Running a Page Audit

1. Navigate to any live website, AEM preview link, or author page (e.g., `https://author-pXXXX-eYYYY.adobeaemcloud.com/content/...html?wcmmode=disabled`).
2. Click **`AEM QA Engine`** in your browser bookmarks bar.
3. The interactive dark side panel will appear on the right side of the screen:
   - Executes DOM checks in ~50ms.
   - Batch-tests all page links & CTAs asynchronously in 5–10s.
   - Displays weighted score, pass/fail badges, and P1 Hard Blockers.
4. Click **`📡 Send to Server`** to push the audit results to your dashboard.

---

## 🏛️ The 4 QA Audit Pillars

| Pillar | Weight | Description | Key Checks |
|---|---|---|---|
| **Metadata & SEO** | 25% | Validates indexability, social sharing tags, and head structure | Title length, Meta Description, Canonical URL, OpenGraph tags, Hreflang, Robots tag |
| **Content & Components** | 35% | Verifies DOM integrity, AEM author leaks, and link health | Heading order (H1-H6), Raw `/content/` paths, Stage/Dev domain leaks, Broken links, Image alt text |
| **Responsive Layout** | 15% | Ensures multi-device usability and layout stability | Viewport meta, Mobile touch targets (min 44px), Horizonal scroll overflow, Grid/Flex wrap rules |
| **Accessibility (a11y)** | 25% | Checks WCAG 2.1 AA compliance and ARIA patterns | Color contrast ratios, Form field labels, ARIA landmarks, Focus ring visibility, Keyboard access |

---

## ☁️ Deployment & Hosting (Vercel Serverless)

The project includes a production-ready configuration for Vercel deployment:

- **Static Frontend**: Serves [`public/index.html`](./public/index.html) as the global dashboard.
- **Serverless API**: Routes `/api/report`, `/api/reports`, and `/api/report-details` to [`api/report.js`](./api/report.js).

To deploy to Vercel:
```bash
npx vercel
```
Or connect your Git repository to Vercel using the provided [`vercel.json`](./vercel.json).

---

## 🛠️ Building & Re-compiling Bookmarklets

If you modify [`bookmarklet.js`](./aem-qa-tool/bookmarklet.js), re-generate the bookmarklet payloads using the build scripts:

```bash
# Build cloud bookmarklet
node aem-qa-tool/build-cloud-bookmarklet.js

# Build local bookmarklet
node aem-qa-tool/build-bookmarklet.js

# Build standalone offline bookmarklet
node aem-qa-tool/build-standalone.js
```

---

## 📑 Complete Documentation Suite

For detailed technical guides and architecture blueprints, refer to the project documentation files:

1. 📘 [**QA Framework Technical Architecture Guide**](./QA_FRAMEWORK_DOCUMENTATION.md): Complete architecture breakdown, 52-check reference matrix, server endpoints, and customizing checks.
2. 📗 [**AEM QA Framework Implementation Guide**](./AEM_QA_FRAMEWORK_GUIDE.md): Deep-dive reference code and step-by-step framework build manual.
3. 📙 [**Sprint Demo Presentation Guide**](./SPRINT_DEMO_PRESENTATION_GUIDE.md): Slide deck structure and live demonstration script.

---

## 📜 License

This project is released under the **MIT License**.
