type AllKeys<T> = T extends unknown ? keyof T : never;
type Id<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;
type _ExclusifyUnion<T, K extends PropertyKey> =
    T extends unknown ? Id<T & Partial<Record<Exclude<K, keyof T>, never>>> : never;
export type ExclusifyUnion<T> = _ExclusifyUnion<T, AllKeys<T>>;

declare module 'eslint' {
  interface SourceCode {
    getText(node?: import('estree').Node | import('estree').Comment, beforeCount?: number, afterCount?: number): string;
  }

  namespace Rule {
    interface RuleFixer {
      remove(nodeOrToken: import('estree').Comment | import('estree').Node | AST.Token): Fix;
    }
  }
}

declare module 'estree' {
  interface BaseNode {
    loc: SourceLocation;
  }
}
