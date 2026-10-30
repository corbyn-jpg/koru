# Koru: My Individual Contribution Log

Koru started as a group LMS project. This log records what I changed afterwards to make it my own:
the problems I found, what I did about each, and why. The work is split across three git branches so
each area can be reviewed on its own.

| Branch | Focus | Commits |
|---|---|---|
| `feature/frontend-polish` | Look, feel, accessibility, speed, missing features | 7 |
| `feature/backend-improvements` | Security, data integrity, database setup | 1 |
| `chore/code-cleanup` | Removing code that wasn't needed | 2 |

**Overall:** 180 files changed, 3,175 lines added, 14,860 lines removed.

---

## 1. Audit: where the project stood

Before changing anything I ran the project and read through all of it.

- **The app couldn't start.** The shared cloud database had been deleted, and the database setup code
  crashed on an empty database, so nobody could set Koru up from scratch.
- **There was no real login security.** Logging in returned the user's details but no proof of identity.
  The API didn't check who was calling, so anyone could create an **admin** account, change anyone's
  password, or delete any user.
- **Students could give themselves full marks.** Quizzes were marked in the student's own browser, which then
  posted the score, and the answer key was sent to the browser to do that.
- **Some features were fake.** Clicking a link or attachment in a course module showed a pop-up saying
  "Opening link…" and did nothing; those items had nowhere to store a URL.
- **Data bugs:** Analytics showed "0 students" on every course, and the onboarding role buttons had an invalid colour.
- **Accessibility:** keyboard focus outlines were switched off for the whole app, and scrollbars were hidden.
- **Tests:** the backend test project didn't compile.

## 2. Research: what an LMS needs

I compared Koru against LMS feature checklists and South African POPIA guidance for schools and universities.

| Expected in an LMS | Koru before | Now |
|---|---|---|
| Secure, role-based login | Roles only checked in the browser | Server-side tokens and role rules |
| Course content: pages, links, files | Links and files didn't open | Working links and file uploads |
| Assignments, quizzes, auto-marking | Marked in the student's browser | Marked on the server |
| Gradebook export | CSV without protection | CSV hardened (see 3.4) |
| POPIA right of access | Missing | "Download my data" in Settings |
| Accessibility (keyboard, reduced motion) | Focus hidden, no reduced-motion support | Both supported |
| Discussion forums, messaging | Missing | Not done yet (see section 6) |
| Password reset by email | Missing | Not done yet |
| Rubric grading | Missing | Not done yet |

Sources: [SchoolMaker LMS checklist 2026](https://schoolmaker.com/blog/lms-features-checklist),
[BenchPrep LMS features checklist](https://ai.benchprep.com/resources/lms-features-checklist-2026-a-comprehensive-guide-to-selecti),
[Afriwise: POPIA dos and don'ts for schools](https://www.afriwise.com/blog/back-to-school-popia-dos-and-donts),
[ENSafrica: POPIA compliance for schools, colleges and universities](https://www.ensafrica.com/news/detail/4287/popia-compliance-what-schools-colleges-and-un).

---

## 3. Frontend (`feature/frontend-polish`)

**Brief to myself:** keep Koru's look (the purple, Gabarito and Poppins fonts, the soft lavender
background, rounded cards) but remove the visual habits that make an interface look AI-generated,
and make it faster and more accessible.

### 3.1 A design system instead of hard-coded colours

The brand purple `#3C0078` was typed out **758 times**. I defined it once as a set of colour tokens
(`brand`, `brand-deep`, `ember`, `sky`, `mint`, `sunken`) plus a card-shadow token, and replaced the
hard-coded values. Changing a colour now means editing one line.

### 3.2 Removing AI-looking visual habits

| Before | After | Why |
|---|---|---|
| Five blurred glow orbs drifting behind every page forever | One static, softer glow | Animated glow orbs are a stock AI look, and blurring a layer bigger than the screen costs GPU time every frame |
| A spark burst on every click | Removed | Something that happens hundreds of times a day shouldn't be decoration |
| Frosted-glass blur on every panel | Kept only behind pop-up dialogs | Blur on a plain background was invisible but still cost performance |
| Uppercase labels with very wide letter-spacing (~430 places) | Spacing toned down | Over-spaced labels on every card are a common generated-UI tell |
| `transition-all` (300 places) | Animate only colour, shadow and size | `transition-all` also animates layout, which can stutter |
| Browser `alert()` / `confirm()` pop-ups (48) | In-app toasts and a confirm dialog | Native pop-ups block the whole window and look out of place |

### 3.3 Depth and readability (from my own review in the browser)

- Card borders made visible, then softened again once shadows did the separating.
- The dashboard panel is a touch darker than its white cards, and the cards have a small shadow, so they lift off the page.
- Content now fades out at the bottom of a scrolling panel instead of cutting off hard.
- The course flyout menu is now solid; it used to let the page show through.
- The calendar header no longer covers the month name on smaller windows.

### 3.4 Accessibility and polish

- Visible keyboard focus rings in the brand colour.
- Thin themed scrollbars, so people can see when a panel scrolls.
- Animations respect the operating system's "reduce motion" setting.
- Numbers line up in tables and stats (tabular figures).
- Text selection is tinted with the brand colour.
- Gradebook CSV export: names starting with `=`, `+`, `-` or `@` can't run as Excel formulas, and accented names display correctly in Excel.
- The "Add your Google Client ID…" developer message no longer shows to users.

### 3.5 Performance

- **First download: 2.48 MB to 499 KB (about 80% smaller).** Each page's code now loads only when that page is opened.

### 3.6 New and fixed features

- Course module links and attachments: teachers paste a URL or upload a file, and students can open it.
- **Download my data** (Settings, Password & Security): one file with everything Koru stores about you, as POPIA's right of access requires.
- Analytics shows real student counts per course.
- The login screen saves the sign-in token and every request sends it automatically (one wrapper instead of editing 150 requests).

---

## 4. Backend (`feature/backend-improvements`)

### 4.1 A database that sets itself up

I replaced 19 tangled migrations, plus about 60 lines of raw SQL that ran on every start, with one clean
migration generated from the data models. A fresh database now builds itself on first run and fills
with demo data.

### 4.2 Real authentication (JWT)

- Login, Google sign-in and 2FA return a signed token valid for 12 hours.
- **Every endpoint requires a valid token by default**; only login and its related endpoints are open.
- **Admins only:** creating, editing and deleting accounts.
- **Your own account only:** profile, password, 2FA settings, data export.
- **Teachers and admins only:** grades, feedback, assignments and announcements.

Tested against the running API:

| Request | Before | After |
|---|---|---|
| API call without signing in | 200 OK | **401** |
| Anyone creating an admin account | 201 Created | **401** |
| A teacher creating an admin account | 201 Created | **403** |
| A student posting their own grade | 201 Created | **403** |

### 4.3 Server-side quiz marking

A new endpoint marks a quiz from the answers saved with the submission. In my end-to-end test, a student
who answered 1 of 2 questions correctly on a 10-point quiz scored 5.0, and posting a score directly was refused.

### 4.4 Other improvements

- **Compressed responses:** the user list went from 119 KB to 28 KB (76% smaller).
- **POPIA data export endpoint:** students don't see marks the lecturer hasn't released yet.
- **Security advisory cleared:** updated the package that had a high-severity warning.
- **Config out of git:** `appsettings.json` is no longer tracked, and the example template documents every setting.
- **Tests:** 134 to 141, adding token, cross-account access, data export and quiz scoring tests.

---

## 5. Cleanup (`chore/code-cleanup`)

Rule: the best code is code you don't need. I removed what nothing used and kept everything that works.

- **Deleted 13 unused components and pages (~2,400 lines)**, including an 866-line timeline that was never shown and a sign-up page with no route.
- **Deleted the unused mock-data seeder** (314 lines) and unused images.
- **Fixed a React bug:** `CalendarDayView` called a hook after an early return, which can crash the view.
- **Removed a wasted request:** the admin dashboard fetched data on every course click and threw it away.
- **Removed about 20 unused variables, parameters and imports.**
- **Fixed lint false alarms:** ESLint was reporting `<motion.div>` and `<Icon />` as unused.
- **Fixed the Electron build:** its icon pointed at a file that didn't exist, and the app was still called "LearnOnline".
- **Lint problems: 141 to 37.**

**What went wrong and what I learned:** I removed some `Icon` variables because ESLint said they were
unused, but they were used as `<Icon />`. Clicking through every page afterwards caught the crash before
it shipped. I fixed it and changed the lint config so it can't happen again. Lesson: check tool warnings
against the running app, not just the tool.

---

## 6. Known gaps (next steps)

- The quiz answer key is still included when a student loads an assignment, even though marking now happens on the server.
- Analytics and grades track loading but don't show it, so numbers read 0 until the data arrives.
- Block background colours in the page editor aren't saved with the page.
- Missing LMS features: discussion forums and messaging, password reset by email, rubric grading, a notification centre, an audit log.
- 37 lint warnings remain, mostly the React Compiler's style advice.

## 7. How I verified everything

- Ran the full app on a local PostgreSQL database and clicked through every page as a teacher, checking for runtime errors.
- Scripted end-to-end checks against the API for login, roles, quiz marking and data export.
- Merged all three branches together; the frontend build succeeded, 82 of 82 frontend tests passed, and 141 of 141 backend tests passed.
