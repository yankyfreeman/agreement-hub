import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-xl font-semibold">Document not found</h1>
      <p className="mt-2 text-sm text-zinc-500">
        The link may be incomplete. Ask the person who shared it to send it again.
      </p>
      <Link href="/" className="mt-6 inline-block text-sm font-medium underline">
        Go to home page
      </Link>
    </main>
  );
}
