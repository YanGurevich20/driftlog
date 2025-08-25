## Tasks
### Architecture
- [x] Timezone-agnostic date storage (All dates are utc midnight)
- [ ] CI/CD pipeline
- [ ] Security audit
- [ ] Rename repo and firebase project to driftlog
- [ ] multi region deploy
### Bugs
- [X] Orphaned groups in db
- [X] Delete invites in db after acceptance

- [ ] Budget headroom settings
### Enhancements
- [x] Connections (replaces groups)
- [X] Verify indexes
- [X] Sort entries and categories by date in daily view, top one is expanded. currently not doing for simplicity
- [X] Add indicator when using fallback exchange rates (weekends/missing dates /future dates). currently not doing for simplicity
- [x] Three-dot menu for entries
- [x] Topology background globally
- [x] Default theme: system
- [X] User avatars
### Features
- [x] Email invitations with accept/reject
- [x] Multi-currency with live conversion
- [x] **Fixed historical exchange rates** (uses rates from entry date)
- [x] Daily budget calculation
- [x] Recurring entries

- [ ] **Tiered currency support**: Frankfurter API for free users (31 currencies, no costs), Exchange Rate API for paid users (170+ currencies)
- [ ] Custom categories per user - maybe
- [ ] Entry from photo
- [ ] Entry from audio
- [ ] entry from whatsapp message
- [ ] entry from telegram message
- [ ] Limit connection size (larger limits for paid users)
- [ ] Location tagging (city, country OR geopoint)

### Monetization ideas
- limit recurring entries count
- limit currencies to frankfurter api (31 currently)
- 2-3 plans max including free
- no ads (need to estimate average free user cost)
- AI features (entry generation)