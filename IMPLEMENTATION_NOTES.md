# Implementation Notes

## Created
- Next.js App Router project with TypeScript and Tailwind.
- `src/domain` with schema-accurate types and a starter validation helper.
- `src/lib` for future shared utilities.
- Diner routes: `/`, `/r/[restaurantId]`, `/m/[menuId]`, `/r/[restaurantId]/cart`, `/r/[restaurantId]/show`.
- Menu UI aligns with SPEC: inline expand, add-to-cart, dietary alerts in cart, show-to-server view.
- Cart demo stored in `localStorage` (client-only) until DB/APIs exist.

## Intentionally Not Implemented (Out of Scope for This Step)
- Database integration and data access.
- API routes, ChangeLog writer, or mutation logic.
- Auth, admin tooling, or review workflows.
- AI drafting or approval flows.
- Production UI beyond the MVP diner flow.
