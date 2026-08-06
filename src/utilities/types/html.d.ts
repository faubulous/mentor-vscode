declare module '*.html' {
  const content: string;
  export default content;
}

declare module '*.css' {
  const content: string;
  export default content;
}

declare module '*.ttl' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  /**
   * The asset as a data URI (esbuild `dataurl` loader), usable as an `img` src.
   */
  const content: string;
  export default content;
}