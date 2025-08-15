## Architecture overview
## Important files
## Questions
- [ ] why does src/services/spaces.ts use spreading and overriding on id?
- [ ] why are the types not shared between functions and callers?
- [ ] How does secret management work? what is public, and what is secret? where is everything stored, and how is it accessed when needed?
- [ ] Is it good that we define cloud functions in the same repo as the next app?
- [ ] What are PWA, SSR, Next.js? How are we using them?

## Backend Tasks
- [V] Check if cors: true is not required (defaults to true for callable)
- [ ] HTTPS only
- [ ] Automate deploymetns
- [ ] Security audit
- [ ] Cloudflare proxied DNS
- [ ] Change project name and repo to driftlog (from drift-log)
- [ ] CI/CD
- [ ] Update functions dependencies
- [ ] IAC?

## App Tasks
- [V] Add names to month/day views in cards
- [ ] Return edit/delete functionality on entired (swipe gestures?)
- [ ] Add remaining daily budget
- [ ] pre-fill amount in entry form with last entered amount (cache)
- [ ] Improve space management
- [ ] Custom categories. Perhaps per space? and let edit in space managemnet

## Brainstorming
- Perhaps we can add future expenses (just selecting a future date)
- This will affect the monthly balance
- Crazy idea: Instead of budgeting and expected expenses, we can just add a utility screen / form section in entry creation for recurring:
- - let's say you want to add rent, you select all the normal fields, and then recurrence settings (set date per month, more advanced times in the future)
- - the expenses will be pre-set. it just can't be infinite (kinda like google calendar meetings?)