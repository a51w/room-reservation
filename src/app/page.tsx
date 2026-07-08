import Link from "next/link";

const NORMAL_USER_FEATURES = [
  "Book a room for a specific date and time, with automatic double-booking protection",
  "See a calendar of every room's bookings at a glance",
  "Check real-time room status — free or in use right now",
  "View and cancel your own bookings",
];

const ADMIN_FEATURES = [
  "Everything a normal user can do",
  "Add, edit, or remove meeting rooms",
  "Cancel any booking department-wide, not just your own",
];

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col bg-gray-50">
      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-blue-600">
          Computer Engineering Department · KMUTT
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-gray-900 sm:text-5xl">
          CPE Room Reservation
        </h1>
        <p className="mt-4 max-w-xl text-lg text-gray-600">
          A simple way to book CPE&apos;s meeting rooms without the double-booking
          chaos — see what&apos;s free, reserve a room in seconds, and keep track of
          every booking in one place.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-blue-700"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-6 py-3 text-base font-medium text-gray-900 transition-colors hover:bg-gray-100"
          >
            Create Account
          </Link>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-4xl gap-6 px-4 pb-20 sm:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">For anyone in the department</h2>
          <ul className="mt-4 space-y-2 text-sm text-gray-600">
            {NORMAL_USER_FEATURES.map((feature) => (
              <li key={feature} className="flex gap-2">
                <span className="text-blue-600">•</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">For room admins</h2>
          <ul className="mt-4 space-y-2 text-sm text-gray-600">
            {ADMIN_FEATURES.map((feature) => (
              <li key={feature} className="flex gap-2">
                <span className="text-blue-600">•</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
