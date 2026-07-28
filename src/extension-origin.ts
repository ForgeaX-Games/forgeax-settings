export type ExtensionOrigin = 'builtin' | 'user' | 'project';
export type WritableExtensionOrigin = Exclude<ExtensionOrigin, 'builtin'>;

export function extensionOriginLabel(origin: ExtensionOrigin): string {
  switch (origin) {
    case 'builtin':
      return 'built-in';
    case 'user':
      return 'user-installed';
    case 'project':
      return 'project-specific';
  }
}
