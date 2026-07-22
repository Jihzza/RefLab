# RefLab — legal publication checklist

Status: **not approved for publication**. This document records the facts that
must be supplied and reviewed before replacing the placeholder Privacy Policy
and Terms of Service in the application. It is an implementation checklist,
not legal advice.

## 1. Facts the operator must confirm

Complete every field. Do not infer an answer from a personal GitHub, Netlify,
Google, Stripe, or Supabase account.

- Legal controller/operator name: `[REQUIRED]`
- Legal form, registration number and VAT/NIF, if applicable: `[REQUIRED]`
- Registered postal address and country: `[REQUIRED]`
- Public privacy email: `[REQUIRED AND TESTED]`
- Public support email: `[REQUIRED AND TESTED]`
- Data-protection representative or DPO, if applicable: `[DECISION REQUIRED]`
- Minimum user age and minors policy: `[DECISION REQUIRED]`
- Governing law and competent jurisdiction: `[LEGAL REVIEW REQUIRED]`
- Service/support owner and response target: `[REQUIRED]`
- Moderation/report owner and response target: `[REQUIRED FOR COMMUNITY]`
- Backup retention and restore owner: `[REQUIRED]`
- Account, report, message, log and backup retention periods: `[REQUIRED]`
- Whether public Community and Messages are enabled at launch: `[REQUIRED]`
- Whether paid plans are enabled: `NO for the first public launch`

## 2. Processing inventory verified in the current application

This inventory must be checked again immediately before publication.

| Area | Data currently processed | Purpose | Current implementation evidence |
| --- | --- | --- | --- |
| Account and authentication | Email, authentication identifiers, session state, last login, optional Google OAuth profile data | Create and secure an account | Supabase Auth and `profiles` |
| Public profile | Name, username and profile image | Identify the user inside RefLab | `profiles`, `public_profiles`, `profile-media` |
| Learning | Test attempts, answers, scores, topic accuracy, activity and progress | Deliver referee training and show progress | Test, question and activity tables |
| Community | Posts, comments, reactions, reposts, follows, blocks, reports and public media | User-generated community features | Social tables and public `post-media` bucket |
| Direct messages | Conversation membership, message text, timestamps and attachments | Private communication between users | Message tables; `message-media` becomes private in migration 0050 |
| Notifications and preferences | Notification events, interaction settings and privacy choices | Inform users and honour preferences | Notification and settings tables |
| Safety and account deletion | Blocks, reports, deletion checkpoints and limited tombstone data | Safety, abuse response and reliable deletion | Report tables and `account_deletion_jobs` after migration 0050 |
| Billing | Stripe customer, subscription and invoice identifiers when paid plans are enabled | Paid subscriptions | Edge Functions and Stripe; both paid launch switches must remain `false` |
| Technical operation | Infrastructure logs, request metadata and security events retained by providers | Reliability, fraud prevention and incident response | Supabase, Netlify and provider logs; exact retention still needs confirmation |

The frontend currently states that it does not initialise analytics or
advertising cookies. Do not claim automatic behavioural analytics unless a
verified implementation and consent/legal basis are added.

## 3. Providers and transfers to confirm

The final Privacy Policy must name each relevant category of recipient and
explain international-transfer safeguards where applicable.

- Supabase: database, authentication, storage and realtime. Current project
  region is EU West; confirm contracted entity, DPA, subprocessors, backups and
  log retention.
- Netlify: hosting, CDN and deployment. Confirm contracted entity, logs,
  subprocessors and transfer mechanism.
- Google: optional OAuth sign-in. Link Google's applicable privacy information.
- Stripe: billing only if paid plans are later enabled. It is disabled for the
  first public launch.
- Cloudflare R2 or the verified video provider: delivery of learning videos.
  Confirm whether request logs or identifiers are processed.
- Email provider/custom SMTP: `[PROVIDER NOT YET CONFIRMED]`.

## 4. Privacy Policy publication requirements

The final text must accurately cover at least:

1. Controller identity and usable contact details.
2. Data categories and source, including Google OAuth when selected.
3. Purpose and legal basis for every processing activity.
4. Recipients, processors and transfer safeguards.
5. Concrete retention criteria or periods.
6. Access, correction, deletion, restriction, objection, portability and
   complaint rights, including a usable request channel.
7. Whether providing each category of data is required and the consequence of
   not providing it.
8. Automated decision-making or a clear statement that it is not used.
9. Account deletion behaviour, including what is retained for the surviving
   participant in a direct conversation and what may remain temporarily in
   backups or for legal/security obligations.
10. Security/report handling and any age/minors conditions.

Primary references:

- GDPR Article 13: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679
- Portuguese data-subject rights guidance: https://www.cnpd.pt/cidadaos/direitos/

## 5. Terms of Service publication requirements

The final text must distinguish platform-owned material from user-generated
content. Users should retain ownership of their posts and messages while
granting only the licence required to host, display, moderate and operate the
service. Do not claim that RefLab exclusively owns all user content.

Cover at least account eligibility, acceptable use, intellectual property,
user-content licence, reporting/moderation, suspension/termination, service
availability, training-content disclaimer, liability language reviewed for the
chosen jurisdiction, changes to terms, contact details, and paid-plan terms
only when billing is enabled.

For Community, document the notice-and-action path, acknowledgement, decision
and appeal/escalation process before opening it to public users. Reference:

- Digital Services Act, including Article 16:
  https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R2065

## 6. Publication acceptance record

Before enabling public registrations, record:

- Reviewer name and authority: `[REQUIRED]`
- Approved Privacy Policy version/date: `[REQUIRED]`
- Approved Terms version/date: `[REQUIRED]`
- Approved Cookies notice version/date: `[REQUIRED]`
- Moderation runbook owner: `[REQUIRED IF COMMUNITY IS ENABLED]`
- Evidence that every published email receives mail: `[REQUIRED]`
- Evidence that password reset and OAuth redirects work: `[REQUIRED]`
- Evidence of a restorable production backup: `[REQUIRED]`
- Final go/no-go approver and timestamp: `[REQUIRED]`

No unchecked or placeholder field in this document may be represented as a
verified launch fact.
