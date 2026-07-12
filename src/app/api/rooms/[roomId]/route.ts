// Next.js requires this exact file (route.ts) at this exact path to register the
// PATCH/DELETE /api/rooms/[roomId] handlers - see @/app/api/route-roomID.ts for the
// real code. Note: the real file's own RouteParams type was written against this
// exact folder's dynamic segment name ([roomId]), so this re-export only works
// because this shim lives at the same param path as the original route.
export { PATCH, DELETE } from "@/app/api/route-roomID";
