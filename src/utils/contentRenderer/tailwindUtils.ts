
export class TailwindUtils {
  static getTailwindCSS(): string {
    return `
      /* Basic Tailwind reset and utilities */
      * { box-sizing: border-box; }
      .flex { display: flex; }
      .inline-flex { display: inline-flex; }
      .grid { display: grid; }
      .hidden { display: none; }
      .w-full { width: 100%; }
      .h-full { height: 100%; }
      .items-center { align-items: center; }
      .justify-center { justify-content: center; }
      .justify-between { justify-content: space-between; }
      .gap-2 { gap: 0.5rem; }
      .gap-4 { gap: 1rem; }
      .p-2 { padding: 0.5rem; }
      .p-4 { padding: 1rem; }
      .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
      .px-4 { padding-left: 1rem; padding-right: 1rem; }
      .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
      .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
      .text-sm { font-size: 0.875rem; }
      .text-lg { font-size: 1.125rem; }
      .font-medium { font-weight: 500; }
      .font-semibold { font-weight: 600; }
      .rounded { border-radius: 0.25rem; }
      .rounded-md { border-radius: 0.375rem; }
      .border { border-width: 1px; }
      .bg-primary { background-color: hsl(var(--primary)); }
      .bg-secondary { background-color: hsl(var(--secondary)); }
      .text-primary-foreground { color: hsl(var(--primary-foreground)); }
      .text-secondary-foreground { color: hsl(var(--secondary-foreground)); }
      .hover\\:bg-primary\\/90:hover { background-color: hsl(var(--primary) / 0.9); }
    `;
  }
}
