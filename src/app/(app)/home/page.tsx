import Link from "next/link";

const ACTIONS = [
  {
    href: "/book",
    title: "Book a Room",
    description: "Reserve a meeting room for a specific date and time.",
  },
  {
    href: "/my-bookings",
    title: "My Bookings",
    description: "View and cancel your upcoming reservations.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Welcome</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="block rounded-lg bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <h2 className="text-lg font-medium text-gray-900">{action.title}</h2>
            <p className="mt-1 text-sm text-gray-500">{action.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
