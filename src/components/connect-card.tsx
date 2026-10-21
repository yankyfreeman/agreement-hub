import { CopyLink } from "./ui";

const MCP_PATH = "/api/mcp";

/** How to connect Claude to Agreement Hub over MCP, so it can publish and manage documents. */
export function ConnectCard() {
  return (
    <section className="space-y-4 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Optional</p>
        <h2 className="text-lg font-semibold">Let Claude publish and manage it</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Connect Agreement Hub to Claude and it can publish your scope document, tell you what the
          client said, reply, and apply updates, without you opening this site. No account
          needed: each document&apos;s private developer link is its key.
        </p>
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <p className="font-medium">Claude app (web or desktop)</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-zinc-600 dark:text-zinc-400">
            <li>Go to Customize → Connectors and add a custom connector.</li>
            <li>Name it Agreement Hub and paste this URL. Choose no sign-in.</li>
          </ol>
          <div className="mt-2">
            <CopyLink path={MCP_PATH} label="Copy URL" />
          </div>
        </div>
        <div>
          <p className="font-medium">Claude Code</p>
          <div className="mt-2">
            <CopyLink
              path={MCP_PATH}
              prefix="claude mcp add --transport http agreement-hub "
              label="Copy command"
            />
          </div>
        </div>
      </div>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Then ask: <em>&quot;Publish this to Agreement Hub&quot;</em>,{" "}
        <em>&quot;What did the client say?&quot;</em> or{" "}
        <em>&quot;Update section 4 and send it to the client.&quot;</em>
      </p>
    </section>
  );
}
