import "react";

/**
 * WebMCP's Declarative API annotates ordinary HTML forms, so the attributes
 * have to be spellable in JSX. Browsers without WebMCP ignore them and the
 * form stays a plain form, which is why no feature detection guards them.
 *
 * https://developer.chrome.com/docs/ai/webmcp/declarative-api
 */
declare module "react" {
  interface HTMLAttributes<T> {
    /** Names the tool the browser synthesises from this form. */
    toolname?: string;
    /** What the tool does. Removing it unregisters the tool. */
    tooldescription?: string;
    /** Lets an agent submit the form without the user pressing submit. */
    toolautosubmit?: boolean | "";
    /** Describes one field as a parameter in the synthesised JSON Schema. */
    toolparamdescription?: string;
  }
}
